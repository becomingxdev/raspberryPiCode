"""api/detection.py — Latest detection and paginated history."""
from flask import Blueprint, request, jsonify, current_app

detection_bp = Blueprint("detection", __name__)


@detection_bp.get("/api/detections/latest")
def latest_detection():
    return jsonify(current_app.detection_service.get_latest_payload())


@detection_bp.get("/api/detections")
def detection_history():
    limit  = min(int(request.args.get("limit",  25)), 200)
    offset = max(int(request.args.get("offset",  0)), 0)
    label  = request.args.get("label", "").strip()

    items, total = current_app.detection_service.get_history(
        limit=limit, offset=offset, label=label or None
    )
    return jsonify({"items": items, "total": total, "limit": limit, "offset": offset})


@detection_bp.get("/api/detections/labels")
def detection_labels():
    return jsonify({"labels": current_app.detection_service.get_distinct_labels()})
