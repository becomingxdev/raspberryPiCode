"""api/health.py — Health check endpoint."""
import time
from flask import Blueprint, jsonify, current_app

health_bp = Blueprint("health", __name__)


@health_bp.get("/api/health")
def health():
    uptime = round(time.time() - current_app.start_time, 1)
    cfg = current_app.config_obj
    cam = current_app.camera_service.get_status()
    model = current_app.inference_service.get_status()

    return jsonify({
        "status": "ok",
        "uptime_seconds": uptime,
        "camera": cam,
        "model": {
            "state": model.state,
            "name": model.name,
        },
    })
