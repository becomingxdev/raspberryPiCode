"""app/__init__.py — Flask application factory with open CORS."""
import os
import time
import logging
from flask import Flask, jsonify
from flask_cors import CORS

from app.config import Config
from app.ml.model_adapter import NotConfiguredAdapter
from app.services.camera_service import CameraService
from app.services.inference_service import InferenceService
from app.services.detection_service import DetectionService
from app.services.pipeline import PipelineService


def create_app(config: Config = None) -> Flask:
    if config is None:
        config = Config()

    app = Flask(__name__)
    app.config_obj = config
    app.start_time = time.time()

    # ── Open CORS: allow all origins (laptop ↔ Raspberry Pi on same WiFi) ──
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # ── Logging ────────────────────────────────────────────────────────────
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] %(levelname)s %(name)s: %(message)s",
    )

    # ── ML Model ───────────────────────────────────────────────────────────
    if config.MODEL_ENABLED and config.MODEL_PATH and os.path.exists(config.MODEL_PATH):
        from app.ml.crop_adapter import CropDiseaseAdapter
        adapter = CropDiseaseAdapter(
            weights_path=config.MODEL_PATH,
            classes_path=config.MODEL_CLASSES_PATH,
            confidence_threshold=config.MODEL_CONFIDENCE_THRESHOLD,
        )
        adapter.load()
        app.logger.info(f"Model loaded: {config.MODEL_PATH}")
    else:
        adapter = NotConfiguredAdapter()
        app.logger.warning("Model not found or disabled — running without inference.")

    # ── Services ───────────────────────────────────────────────────────────
    app.camera_service    = CameraService(config)
    app.inference_service = InferenceService(adapter)
    app.detection_service = DetectionService(config)
    app.pipeline_service  = PipelineService(
        config,
        app.camera_service,
        app.inference_service,
        app.detection_service,
    )
    app.pipeline_service.start()

    # ── Blueprints ─────────────────────────────────────────────────────────
    from app.api.health    import health_bp
    from app.api.camera    import camera_bp
    from app.api.video     import video_bp
    from app.api.detection import detection_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(camera_bp)
    app.register_blueprint(video_bp)
    app.register_blueprint(detection_bp)

    @app.route("/")
    def index():
        return jsonify({
            "service": "AgreBot Backend",
            "status": "online",
            "message": "Backend is running. Access the frontend dashboard at http://localhost:3000",
            "endpoints": {
                "health": "/api/health",
                "camera_status": "/api/camera/status",
                "video_feed": "/api/video/feed",
                "latest_detection": "/api/detections/latest",
                "detection_history": "/api/detections"
            }
        })

    # ── Shutdown hook ──────────────────────────────────────────────────────
    import atexit
    atexit.register(lambda: app.pipeline_service.stop())

    return app
