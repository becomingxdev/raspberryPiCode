"""model_adapter.py - Stable boundary interface for ML model.

Strictly adheres to 03_BACKEND_SPEC.md Section 6.
Rules:
- ModelAdapter is a Protocol.
- RawDetection holds label, confidence (0.0..1.0), optional class_id, and optional bbox (x, y, w, h).
- NotConfiguredAdapter returns status 'not_configured' and empty detections.
- No fake detections in normal operation.
"""
from dataclasses import dataclass
from typing import Protocol, Optional, Tuple, List
import numpy as np

@dataclass
class RawDetection:
    label: str
    confidence: float  # Range: 0.0 to 1.0 inclusive (validated)
    class_id: Optional[int] = None
    bbox: Optional[Tuple[float, float, float, float]] = None  # (x, y, width, height) in processed-frame pixels


@dataclass
class ModelStatus:
    state: str  # 'not_configured', 'loading', 'ready', 'error', 'disabled'
    name: Optional[str] = None
    error: Optional[dict] = None


class ModelAdapter(Protocol):
    def load(self) -> ModelStatus:
        ...

    def predict(self, frame_bgr: np.ndarray) -> List[RawDetection]:
        ...

    def status(self) -> ModelStatus:
        ...

    def close(self) -> None:
        ...


class NotConfiguredAdapter:
    """Default adapter active when no real trained model is configured."""
    def __init__(self):
        self._status = ModelStatus(state="not_configured", name=None, error=None)

    def load(self) -> ModelStatus:
        return self._status

    def predict(self, frame_bgr: np.ndarray) -> List[RawDetection]:
        return []

    def status(self) -> ModelStatus:
        return self._status

    def close(self) -> None:
        pass


class MockDiagnosticAdapter:
    """Diagnostic adapter used solely in automated unit tests. Excluded from production runs."""
    def __init__(self, detections: List[RawDetection] = None):
        self._detections = detections or []
        self._status = ModelStatus(state="ready", name="TestDiagnosticModel")

    def load(self) -> ModelStatus:
        return self._status

    def predict(self, frame_bgr: np.ndarray) -> List[RawDetection]:
        return self._detections

    def status(self) -> ModelStatus:
        return self._status

    def close(self) -> None:
        pass
