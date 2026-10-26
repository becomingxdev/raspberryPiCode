"""detection_service.py — In-memory detection store with cooldown (no DB dependency)."""
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any, Tuple
from app.config import Config
from app.ml.model_adapter import RawDetection


@dataclass
class DetectionEntry:
    id: str
    detected_at: str
    timestamp_ts: float
    label: str
    confidence: float
    class_id: Optional[int]
    bbox: Optional[Dict[str, Any]]
    source_mode: str
    persisted: bool


class DetectionService:
    def __init__(self, config: Config):
        self.config = config
        self._latest: Optional[DetectionEntry] = None
        self._history: List[Dict] = []          # newest-first, capped at 500
        self._last_saved: Dict[str, float] = {}  # label -> timestamp

    def process_detection(self, raw: RawDetection, source_mode: str = "live") -> DetectionEntry:
        now_ts  = time.time()
        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        det_id  = str(uuid.uuid4())

        bbox_dict = None
        if raw.bbox:
            bx, by, bw, bh = raw.bbox
            bbox_dict = {"x": float(bx), "y": float(by), "width": float(bw), "height": float(bh), "unit": "px"}

        last = self._last_saved.get(raw.label, 0.0)
        should_persist = (now_ts - last) >= self.config.DETECTION_COOLDOWN_SECONDS

        if should_persist:
            self._last_saved[raw.label] = now_ts
            record = {
                "id": det_id,
                "detected_at": now_utc,
                "label": raw.label,
                "confidence": round(raw.confidence, 4),
                "class_id": raw.class_id,
                "bbox": bbox_dict,
                "source_mode": source_mode,
                "session_id": None,
            }
            self._history.insert(0, record)
            if len(self._history) > 500:
                self._history = self._history[:500]

        entry = DetectionEntry(
            id=det_id,
            detected_at=now_utc,
            timestamp_ts=now_ts,
            label=raw.label,
            confidence=raw.confidence,
            class_id=raw.class_id,
            bbox=bbox_dict,
            source_mode=source_mode,
            persisted=should_persist,
        )
        self._latest = entry
        return entry

    def get_latest_payload(self) -> dict:
        if self._latest is None:
            return {"detection": None}
        age = round(time.time() - self._latest.timestamp_ts, 1)
        e = self._latest
        return {"detection": {
            "id": e.id,
            "session_id": None,
            "detected_at": e.detected_at,
            "label": e.label,
            "confidence": round(e.confidence, 4),
            "class_id": e.class_id,
            "bbox": e.bbox,
            "source_mode": e.source_mode,
            "persisted": e.persisted,
            "age_seconds": max(0.0, age),
        }}

    def get_history(
        self,
        limit: int = 25,
        offset: int = 0,
        label: Optional[str] = None,
    ) -> Tuple[List[Dict], int]:
        rows = self._history
        if label:
            rows = [r for r in rows if r["label"] == label]
        total = len(rows)
        return rows[offset: offset + limit], total

    def get_distinct_labels(self) -> List[str]:
        seen = set()
        labels = []
        for r in self._history:
            if r["label"] not in seen:
                seen.add(r["label"])
                labels.append(r["label"])
        return labels
