"""annotate.py - Frame annotation and visual labeling.

Adheres strictly to 03_BACKEND_SPEC.md Section 7:
- Frame shown = frame inferred.
- Boxes (if present): rectangle + 'label confidence%' with one decimal place.
- No boxes (classifier): text banner at the top with top label(s) and confidence.
- Burn source watermark in top-left or corner: 'LIVE' or 'REPLAY'.
- No detections -> draw nothing extra (no 'no disease detected' claims).
"""
import cv2
import numpy as np
from typing import List
from app.ml.model_adapter import RawDetection

FONT = cv2.FONT_HERSHEY_SIMPLEX

def annotate_frame(
    frame_bgr: np.ndarray,
    detections: List[RawDetection],
    source_mode: str = "LIVE"
) -> np.ndarray:
    annotated = frame_bgr.copy()
    h, w = annotated.shape[:2]

    # 1. Burn source watermark in top-left corner
    watermark_text = source_mode.upper()
    color_bg = (0, 0, 0)
    color_fg = (255, 255, 255) if source_mode.upper() == "LIVE" else (0, 165, 255)  # Orange for replay

    cv2.rectangle(annotated, (10, 10), (90, 35), color_bg, -1)
    cv2.putText(annotated, watermark_text, (16, 28), FONT, 0.5, color_fg, 1, cv2.LINE_AA)

    if not detections:
        return annotated

    # Check if any detection has a bounding box
    has_boxes = any(d.bbox is not None for d in detections)

    if has_boxes:
        # 2. Draw bounding boxes
        for det in detections:
            if det.bbox is None:
                continue
            bx, by, bw, bh = det.bbox
            x1, y1 = max(0, int(bx)), max(0, int(by))
            x2, y2 = min(w, int(bx + bw)), min(h, int(by + bh))

            # Bounding box rectangle (Green)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)

            # Label + confidence banner
            label_text = f"{det.label} {det.confidence * 100:.1f}%"
            (tw, th), baseline = cv2.getTextSize(label_text, FONT, 0.5, 1)

            banner_y1 = max(0, y1 - th - baseline - 4)
            banner_y2 = y1
            cv2.rectangle(annotated, (x1, banner_y1), (x1 + tw + 6, banner_y2), (0, 255, 0), -1)
            cv2.putText(
                annotated,
                label_text,
                (x1 + 3, banner_y2 - baseline),
                FONT,
                0.5,
                (0, 0, 0),
                1,
                cv2.LINE_AA
            )
    else:
        # 3. Classifier mode (banner at top)
        # Sort by confidence descending
        top_dets = sorted(detections, key=lambda d: d.confidence, reverse=True)[:2]
        banner_strs = [f"{d.label}: {d.confidence * 100:.1f}%" for d in top_dets]
        banner_text = " | ".join(banner_strs)

        cv2.rectangle(annotated, (100, 10), (w - 10, 35), (40, 40, 40), -1)
        cv2.putText(annotated, banner_text, (105, 28), FONT, 0.5, (0, 255, 255), 1, cv2.LINE_AA)

    return annotated
