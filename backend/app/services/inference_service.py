"""inference_service.py — Runs adapter, validates detections (no DB dependency)."""
import logging
import time
from typing import List, Tuple
import numpy as np
from app.ml.model_adapter import ModelAdapter, RawDetection, ModelStatus

logger = logging.getLogger(__name__)


class InferenceService:
    def __init__(self, adapter: ModelAdapter):
        self.adapter = adapter
        self.last_inference_ms: float = 0.0

    def predict(self, frame_bgr: np.ndarray) -> Tuple[List[RawDetection], float]:
        start = time.perf_counter()
        try:
            raw_dets = self.adapter.predict(frame_bgr)
            duration_ms = (time.perf_counter() - start) * 1000.0
            self.last_inference_ms = duration_ms

            h, w = frame_bgr.shape[:2]
            valid: List[RawDetection] = []
            for d in raw_dets:
                if not isinstance(d.label, str) or not d.label.strip():
                    continue
                if not (0.0 <= d.confidence <= 1.0):
                    continue
                valid.append(d)
            return valid, duration_ms
        except Exception as e:
            logger.error(f"Inference error: {e}", exc_info=True)
            return [], 0.0

    def get_status(self) -> ModelStatus:
        return self.adapter.status()
