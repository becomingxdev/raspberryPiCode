"""pipeline.py — Frame → inference → annotate → publish loop (no DB/session dependency)."""
import cv2
import threading
import time
from app.config import Config
from app.services.camera_service import CameraService
from app.services.inference_service import InferenceService
from app.services.detection_service import DetectionService
from app.ml.annotate import annotate_frame


class PipelineService:
    def __init__(
        self,
        config: Config,
        camera_service: CameraService,
        inference_service: InferenceService,
        detection_service: DetectionService,
    ):
        self.config = config
        self.camera = camera_service
        self.inference = inference_service
        self.detection = detection_service
        self._thread: threading.Thread = None
        self._stop_event = threading.Event()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._run_loop, daemon=True, name="InferencePipeline"
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()

    def _run_loop(self) -> None:
        target_delay = 1.0 / max(1, self.config.INFERENCE_MAX_FPS)

        while not self._stop_event.is_set():
            t0 = time.perf_counter()
            cam_status = self.camera.get_status()

            if cam_status["state"] == "connected":
                with self.camera._lock:
                    raw_frame = getattr(self.camera, "_raw_frame", None)

                if raw_frame is not None:
                    dets, _ = self.inference.predict(raw_frame)

                    for d in dets:
                        self.detection.process_detection(d, source_mode="live")

                    annotated = annotate_frame(raw_frame, dets, source_mode="LIVE")

                    ok, enc = cv2.imencode(
                        ".jpg", annotated,
                        [int(cv2.IMWRITE_JPEG_QUALITY), self.config.JPEG_QUALITY]
                    )
                    if ok:
                        with self.camera._frame_cond:
                            self.camera._latest_jpeg = enc.tobytes()
                            self.camera._frame_cond.notify_all()

            elapsed = time.perf_counter() - t0
            sleep_time = max(0.0, target_delay - elapsed)
            time.sleep(sleep_time)
