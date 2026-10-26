"""api/camera.py — Connect / disconnect IP Webcam."""
from flask import Blueprint, request, jsonify, current_app

camera_bp = Blueprint("camera", __name__)


@camera_bp.post("/api/camera/connect")
def connect_camera():
    body = request.get_json(silent=True) or {}
    url = (body.get("url") or "").strip()
    if not url:
        return jsonify({"error": "url is required"}), 400

    current_app.camera_service.connect(url)
    return jsonify({"success": True, "message": f"Connecting to {url}"}), 200


@camera_bp.post("/api/camera/disconnect")
def disconnect_camera():
    current_app.camera_service.disconnect()
    return jsonify({"success": True}), 200


@camera_bp.get("/api/camera/status")
def camera_status():
    return jsonify(current_app.camera_service.get_status())
