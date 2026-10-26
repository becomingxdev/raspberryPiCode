// Endpoint paths (relative — prepend backendUrl at call site)
export const ENDPOINTS = {
  HEALTH:             '/api/health',
  CAMERA_CONNECT:     '/api/camera/connect',
  CAMERA_DISCONNECT:  '/api/camera/disconnect',
  CAMERA_STATUS:      '/api/camera/status',
  VIDEO_FEED:         '/api/video/feed',
  DETECTIONS_LATEST:  '/api/detections/latest',
  DETECTIONS:         '/api/detections',
  DETECTIONS_LABELS:  '/api/detections/labels',
} as const;
