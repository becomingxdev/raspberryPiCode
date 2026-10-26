"""crop_adapter.py - Adapter for the Crop & Disease ResNet-18 Classifier.

Implements ModelAdapter interface (03_BACKEND_SPEC.md Section 6).
Loads weights from AgreBot/ml/Crop_model/models/combined/combined_model.pth.
Handles label formatting, softmax confidence calculation, and graceful error isolation.
"""
import os
import json
import logging
from typing import List, Optional
import numpy as np
import cv2
from PIL import Image

from app.ml.model_adapter import ModelAdapter, RawDetection, ModelStatus

logger = logging.getLogger(__name__)

def parse_label(raw_label: str) -> str:
    """Format PlantVillage / custom dataset labels into human-friendly strings.
    
    e.g. 'Tomato___Late_blight' -> 'Tomato: Late Blight'
         'Apple___healthy' -> 'Apple: Healthy'
         'Almonds 1' -> 'Almonds'
    """
    raw_label = str(raw_label).strip()
    if "___" in raw_label:
        parts = raw_label.split("___")
        crop = parts[0].replace("_", " ").title()
        if len(parts) > 1:
            condition = parts[1].replace("_", " ").title()
            return f"{crop}: {condition}"
        return crop
    return raw_label.replace("_", " ").title()


class CropDiseaseAdapter:
    """Real PyTorch ResNet18 model adapter."""

    def __init__(
        self,
        weights_path: str,
        classes_path: str,
        confidence_threshold: float = 0.50,
        device_str: Optional[str] = None
    ):
        self.weights_path = weights_path
        self.classes_path = classes_path
        self.confidence_threshold = confidence_threshold
        self.device_str = device_str
        self._model = None
        self._transform = None
        self._classes: List[str] = []
        self._status = ModelStatus(state="not_configured", name="ResNet18-CropDisease")

    def load(self) -> ModelStatus:
        """Loads class names, constructs ResNet-18, and loads weights into evaluation mode."""
        self._status = ModelStatus(state="loading", name="ResNet18-CropDisease")

        # 1. Verify files exist
        if not os.path.exists(self.weights_path):
            err = {"code": "MODEL_FILE_NOT_FOUND", "message": f"Weights not found at {self.weights_path}"}
            logger.error(err["message"])
            self._status = ModelStatus(state="error", name="ResNet18-CropDisease", error=err)
            return self._status

        if not os.path.exists(self.classes_path):
            err = {"code": "CLASSES_FILE_NOT_FOUND", "message": f"Class names not found at {self.classes_path}"}
            logger.error(err["message"])
            self._status = ModelStatus(state="error", name="ResNet18-CropDisease", error=err)
            return self._status

        # 2. Load class labels
        try:
            with open(self.classes_path, "r", encoding="utf-8") as f:
                self._classes = json.load(f)
            num_classes = len(self._classes)
        except Exception as e:
            err = {"code": "CLASS_JSON_PARSE_ERROR", "message": str(e)}
            logger.error(f"Failed parsing class names: {e}")
            self._status = ModelStatus(state="error", name="ResNet18-CropDisease", error=err)
            return self._status

        # 3. Import torch and load model
        try:
            import torch
            import torch.nn as nn
            import torchvision.models as models
            import torchvision.transforms as transforms

            # Select device
            if self.device_str:
                device = torch.device(self.device_str)
            elif torch.cuda.is_available():
                device = torch.device("cuda")
            else:
                device = torch.device("cpu")
            self._device = device

            # Build ResNet-18 architecture with custom FC layer
            model = models.resnet18(weights=None)
            model.fc = nn.Linear(model.fc.in_features, num_classes)

            # Load checkpoint
            checkpoint = torch.load(self.weights_path, map_location=device)
            model.load_state_dict(checkpoint)
            model.to(device)
            model.eval()
            self._model = model

            # Define standard evaluation transform
            self._transform = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ])

            # Perform single warmup pass
            dummy_input = torch.zeros((1, 3, 224, 224), device=device)
            with torch.no_grad():
                _ = self._model(dummy_input)

            self._status = ModelStatus(state="ready", name="ResNet18-CropDisease")
            logger.info("ResNet-18 Crop & Disease model loaded and warmed up successfully.")
            return self._status

        except ImportError:
            err = {
                "code": "PYTORCH_NOT_INSTALLED",
                "message": "PyTorch / Torchvision not installed in current Python runtime."
            }
            logger.warning(err["message"])
            self._status = ModelStatus(state="error", name="ResNet18-CropDisease", error=err)
            return self._status
        except Exception as e:
            err = {"code": "MODEL_LOAD_FAILED", "message": str(e)}
            logger.error(f"Failed loading PyTorch model: {e}")
            self._status = ModelStatus(state="error", name="ResNet18-CropDisease", error=err)
            return self._status

    def predict(self, frame_bgr: np.ndarray) -> List[RawDetection]:
        """Runs image preprocessing and forward pass inference on a single BGR frame."""
        if self._model is None or self._status.state != "ready":
            return []

        try:
            import torch
            import torch.nn.functional as F

            # Convert BGR (OpenCV) -> RGB -> PIL Image
            rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb)

            # Preprocessing
            input_tensor = self._transform(pil_img).unsqueeze(0).to(self._device)

            with torch.no_grad():
                outputs = self._model(input_tensor)
                probs = F.softmax(outputs, dim=1)
                max_prob, predicted = torch.max(probs, dim=1)

                confidence = float(max_prob.item())
                class_idx = int(predicted.item())

            if confidence >= self.confidence_threshold and 0 <= class_idx < len(self._classes):
                raw_label = self._classes[class_idx]
                formatted_label = parse_label(raw_label)
                # Classifier produces frame-level classification (bbox=None)
                return [
                    RawDetection(
                        label=formatted_label,
                        confidence=confidence,
                        class_id=class_idx,
                        bbox=None
                    )
                ]

            return []

        except Exception as e:
            logger.error(f"Inference error in CropDiseaseAdapter: {e}")
            return []

    def status(self) -> ModelStatus:
        return self._status

    def close(self) -> None:
        self._model = None
        self._status = ModelStatus(state="disabled", name="ResNet18-CropDisease")
