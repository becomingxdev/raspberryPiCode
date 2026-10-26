// Simplified API types (rover/serial/auth removed)
export type CameraState = 'disconnected' | 'connecting' | 'connected' | 'stale' | 'error';
export type ModelState  = 'not_configured' | 'loading' | 'ready' | 'error' | 'disabled';
export type Mode        = 'live' | 'replay';

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
export interface ComponentError { code: string; message: string }

export interface Bbox { x: number; y: number; width: number; height: number; unit: 'px' }

export interface Detection {
  id: string;
  session_id: string | null;
  detected_at: string;
  label: string;
  confidence: number;
  class_id: number | null;
  bbox: Bbox | null;
  source_mode: Mode;
}

export interface LatestDetection extends Detection {
  persisted: boolean;
  age_seconds: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface HealthResponse {
  status: string;
  uptime_seconds: number;
  camera: { state: CameraState; source: string; fps: number | null };
  model:  { state: ModelState;  name: string | null };
}
