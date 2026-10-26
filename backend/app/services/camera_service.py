"""camera_service.py — Robust camera worker supporting IP Webcam MJPEG and local cameras."""
import cv2
import numpy as np
import threading
import time
import urllib.request
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
        url = url.strip()
        # Automatically append /video if user pasted the base IP Webcam URL e.g. http://192.168.1.5:8080
        if url.startswith("http://") or url.startswith("https://"):
            clean_url = url.rstrip("/")
            if clean_url.endswith(":8080"):
                url = clean_url + "/video"

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

    def _update_frame(self, frame: np.ndarray, pre_encoded_jpeg: Optional[bytes] = None) -> None:
        """Internal helper to publish a new decoded frame."""
        now_ts = time.time()
        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Resize if wider than maximum configured width
        h, w = frame.shape[:2]
        if w > self.config.FRAME_MAX_WIDTH:
            scale = self.config.FRAME_MAX_WIDTH / float(w)
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
            pre_encoded_jpeg = None

        if pre_encoded_jpeg is None:
            ok, enc = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), self.config.JPEG_QUALITY])
            if ok:
                pre_encoded_jpeg = enc.tobytes()

        if pre_encoded_jpeg is not None:
            with self._frame_cond:
                self._raw_frame = frame
                self._latest_jpeg = pre_encoded_jpeg
                self.last_frame_at = now_utc
                self.last_frame_time = now_ts
                self.state = "connected"

                # Update FPS calculation
                self._frames_since_calc += 1
                diff = now_ts - self._last_fps_calc_time
                if diff >= 1.0:
                    self.fps = self._frames_since_calc / diff
                    self._frames_since_calc = 0
                    self._last_fps_calc_time = now_ts

                self._frame_cond.notify_all()

    def _capture_worker(self, url: str) -> None:
        """Chooses native HTTP stream parser for HTTP streams or VideoCapture for local devices."""
        is_http = url.startswith("http://") or url.startswith("https://")

        if is_http:
            self._capture_http_loop(url)
        else:
            self._capture_cv2_loop(url)

    def _capture_http_loop(self, url: str) -> None:
        """Reads HTTP MJPEG streams directly via urllib without FFmpeg chunk truncation issues."""
        backoff = 1.0
        max_backoff = self.config.RECONNECT_BACKOFF_MAX_SECONDS

        while not self._stop_event.is_set():
            try:
                req = urllib.request.Request(
                    url,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AgreBot/1.0",
                        "Accept": "*/*",
                        "Connection": "keep-alive"
                    }
                )
                stream = urllib.request.urlopen(req, timeout=6.0)

                with self._lock:
                    self.state = "connected"
                    self.error = None
                    backoff = 1.0

                content_type = stream.headers.get("Content-Type", "")

                # Case A: Static snapshot endpoint (e.g. /shot.jpg)
                if "image/jpeg" in content_type or url.endswith(".jpg"):
                    while not self._stop_event.is_set():
                        data = stream.read()
                        frame = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
                        if frame is not None:
                            self._update_frame(frame, data)
                        time.sleep(0.05)  # Poll snapshot at ~20 fps
                        stream = urllib.request.urlopen(req, timeout=4.0)

                # Case B: Standard multipart MJPEG stream (e.g. /video)
                else:
                    bytes_buffer = bytearray()
                    while not self._stop_event.is_set():
                        chunk = stream.read(4096)
                        if not chunk:
                            break
                        bytes_buffer.extend(chunk)

                        # Look for JPEG Start-Of-Image (0xFFD8) and End-Of-Image (0xFFD9)
                        a = bytes_buffer.find(b"\xff\xd8")
                        b = bytes_buffer.find(b"\xff\xd9", a + 2) if a != -1 else -1

                        if a != -1 and b != -1:
                            jpg_bytes = bytes(bytes_buffer[a:b + 2])
                            bytes_buffer = bytes_buffer[b + 2:]

                            frame = cv2.imdecode(np.frombuffer(jpg_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
                            if frame is not None:
                                self._update_frame(frame, jpg_bytes)

            except Exception as e:
                with self._lock:
                    self.state = "connecting"
                    self.error = {"code": "STREAM_DISCONNECTED", "message": str(e)}

                time.sleep(backoff)
                backoff = min(backoff * 1.5, max_backoff)

    def _capture_cv2_loop(self, url: str) -> None:
        """Captures from local webcam devices (0, 1) or RTSP streams using OpenCV."""
        backoff = 1.0
        max_backoff = self.config.RECONNECT_BACKOFF_MAX_SECONDS

        while not self._stop_event.is_set():
            cap_source = int(url) if str(url).isdigit() else url
            cap = cv2.VideoCapture(cap_source)

            if not cap.isOpened():
                with self._lock:
                    self.state = "error"
                    self.error = {"code": "CONNECT_FAILED", "message": "Failed to open camera device."}
                cap.release()
                time.sleep(backoff)
                backoff = min(backoff * 1.5, max_backoff)
                continue

            with self._lock:
                self.state = "connected"
                self.error = None
                backoff = 1.0

            consecutive_fails = 0
            while not self._stop_event.is_set():
                ret, frame = cap.read()
                if not ret or frame is None:
                    consecutive_fails += 1
                    if consecutive_fails > 30:
                        with self._lock:
                            self.state = "stale"
                        break
                    time.sleep(0.02)
                    continue

                consecutive_fails = 0
                self._update_frame(frame)
                time.sleep(0.01)

            cap.release()
            if not self._stop_event.is_set():
                time.sleep(1.0)
