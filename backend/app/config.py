"""config.py — Simplified backend configuration."""
import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

_THIS_FILE   = os.path.abspath(__file__)       # .../backend/app/config.py
_APP_DIR     = os.path.dirname(_THIS_FILE)      # .../backend/app/
_BACKEND_DIR = os.path.dirname(_APP_DIR)        # .../backend/
_PROJECT_DIR = os.path.dirname(_BACKEND_DIR)    # .../finalCodebase/
_WORKSPACE   = os.path.dirname(_PROJECT_DIR)    # .../full_app/

load_dotenv(os.path.join(_BACKEND_DIR, ".env"), override=False)


def _resolve_path(env_key: str, primary_rel: str, fallback_rel: str = "") -> str:
    raw = os.getenv(env_key)
    candidates = []
    if raw:
        if os.path.isabs(raw):
            return raw
        candidates.append(raw)
    candidates.extend([primary_rel, fallback_rel])

    for rel in candidates:
        if not rel:
            continue
        for base in (_BACKEND_DIR, _PROJECT_DIR, _WORKSPACE):
            cand = os.path.join(base, rel)
            if os.path.exists(cand):
                return os.path.abspath(cand)

    return os.path.abspath(os.path.join(_BACKEND_DIR, primary_rel))


@dataclass
class Config:
    HOST: str  = os.getenv("HOST", "0.0.0.0")
    PORT: int  = int(os.getenv("PORT", "5000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

    # Camera
    FRAME_MAX_WIDTH: int = int(os.getenv("FRAME_MAX_WIDTH", "640"))
    JPEG_QUALITY: int    = int(os.getenv("JPEG_QUALITY", "75"))
    STALE_FRAME_SECONDS: int = int(os.getenv("STALE_FRAME_SECONDS", "5"))
    RECONNECT_BACKOFF_MAX_SECONDS: int = int(os.getenv("RECONNECT_BACKOFF_MAX_SECONDS", "15"))
    DETECTION_COOLDOWN_SECONDS: float = float(os.getenv("DETECTION_COOLDOWN_SECONDS", "2.0"))

    # Inference pipeline
    INFERENCE_MAX_FPS: int  = int(os.getenv("INFERENCE_MAX_FPS", "2"))

    # Model — looks inside backend/models first, with fallback to Crop_model
    MODEL_ENABLED: bool = os.getenv("MODEL_ENABLED", "true").lower() in ("true", "1", "yes")
    MODEL_PATH: str = field(default_factory=lambda: _resolve_path(
        "MODEL_PATH",
        "models/combined/combined_model.pth",
        "Crop_model/models/combined/combined_model.pth"
    ))
    MODEL_CLASSES_PATH: str = field(default_factory=lambda: _resolve_path(
        "MODEL_CLASSES_PATH",
        "models/combined/class_names.json",
        "Crop_model/models/combined/class_names.json"
    ))
    MODEL_CONFIDENCE_THRESHOLD: float = float(os.getenv("MODEL_CONFIDENCE_THRESHOLD", "0.50"))
