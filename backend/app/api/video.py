"""api/video.py — MJPEG stream endpoint."""
import time
from flask import Blueprint, Response, current_app

video_bp = Blueprint("video", __name__)

BOUNDARY = b"--frame"


def _generate_mjpeg(camera_service, jpeg_quality: int):
    """Generator that yields annotated JPEG frames as an MJPEG stream."""
    while True:
        frame_bytes = camera_service.get_latest_frame_bytes(timeout=1.0)
        if frame_bytes is None:
            time.sleep(0.05)
            continue

        yield (
            BOUNDARY + b"\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + frame_bytes
            + b"\r\n"
        )
        time.sleep(0.03)  # ~30 fps ceiling for stream delivery


@video_bp.get("/api/video/feed")
def video_feed():
    cam = current_app.camera_service
    cfg = current_app.config_obj
    return Response(
        _generate_mjpeg(cam, cfg.JPEG_QUALITY),
        mimetype="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Access-Control-Allow-Origin": "*",
        },
    )
