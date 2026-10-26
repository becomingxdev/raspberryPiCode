"""camera_service.py — IP Webcam capture worker (no DB dependency)."""
import cv2
import threading
import time
from datetime import datetime, timezone
from typing import Optional
from app.config import Config


class CameraService:
    def __init__(self, config: Config):
        self.config = config

        self.state: str = "disconnected"
        self.source: str = "none"
        self.stream_url: Optional[str] = None
        self.last_frame_at: Optional[str] = None
        self.last_frame_time: float = 0.0
        self.fps: Optional[float] = None
        self.error: Optional[dict] = None

        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
        self._frame_cond = threading.Condition(self._lock)
        self._latest_jpeg: Optional[bytes] = None
        self._raw_frame = None
        self._frames_since_calc: int = 0
        self._last_fps_calc_time: float = time.time()

    def connect(self, url: str) -> None:
        with self._lock:
            if self._thread and self._thread.is_alive():
                self._stop_event.set()
            self._stop_event.clear()
            self.state = "connecting"
            self.source = "phone"
            self.stream_url = url
            self.error = None
            self._latest_jpeg = None
            self._raw_frame = None

        self._thread = threading.Thread(
            target=self._capture_worker, args=(url,), daemon=True, name="CameraCapture"
        )
        self._thread.start()

    def disconnect(self) -> None:
        with self._frame_cond:
            self._stop_event.set()
            self.state = "disconnected"
            self.source = "none"
            self.stream_url = None
            self._latest_jpeg = None
            self._raw_frame = None
            self.fps = None
            self.error = None
            self._frame_cond.notify_all()

    def get_status(self) -> dict:
        with self._lock:
            if self.state == "connected" and self.last_frame_time > 0:
                if time.time() - self.last_frame_time > self.config.STALE_FRAME_SECONDS:
                    self.state = "stale"
                    self.fps = 0.0
            return {
                "state": self.state,
                "source": self.source,
                "last_frame_at": self.last_frame_at,
                "fps": round(self.fps, 1) if self.fps is not None else None,
                "error": self.error,
            }

    def get_latest_frame_bytes(self, timeout: float = 1.0) -> Optional[bytes]:
        with self._frame_cond:
            if self._latest_jpeg is not None:
                return self._latest_jpeg
            self._frame_cond.wait(timeout=timeout)
            return self._latest_jpeg

    def _capture_worker(self, url: str) -> None:
        backoff = 1.0
        max_backoff = self.config.RECONNECT_BACKOFF_MAX_SECONDS

        while not self._stop_event.is_set():
            cap_source = int(url) if str(url).isdigit() else url
            cap = cv2.VideoCapture(cap_source)

            if not cap.isOpened():
                with self._lock:
                    self.state = "error"
                    self.error = {"code": "CONNECT_FAILED", "message": "Failed to open camera stream."}
                cap.release()
                time.sleep(backoff)
                backoff = min(backoff * 1.5, max_backoff)
                continue

            with self._lock:
                self.state = "connected"
                self.error = None
                backoff = 1.0

            while not self._stop_event.is_set():
                ret, frame = cap.read()
                if not ret or frame is None:
                    with self._lock:
                        self.state = "stale"
                    break

                now_ts = time.time()
                now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

                h, w = frame.shape[:2]
                if w > self.config.FRAME_MAX_WIDTH:
                    scale = self.config.FRAME_MAX_WIDTH / float(w)
                    frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

                ok, enc = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), self.config.JPEG_QUALITY])
                if ok:
                    with self._frame_cond:
                        self._raw_frame = frame
                        self._latest_jpeg = enc.tobytes()
                        self.last_frame_at = now_utc
                        self.last_frame_time = now_ts
                        self.state = "connected"
                        self._frames_since_calc += 1
                        diff = now_ts - self._last_fps_calc_time
                        if diff >= 1.0:
                            self.fps = self._frames_since_calc / diff
                            self._frames_since_calc = 0
                            self._last_fps_calc_time = now_ts
                        self._frame_cond.notify_all()

                time.sleep(0.01)

            cap.release()
            if not self._stop_event.is_set():
                time.sleep(1.0)
