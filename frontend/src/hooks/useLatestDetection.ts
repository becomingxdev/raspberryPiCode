import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../lib/api/client';
import { ENDPOINTS } from '../lib/api/endpoints';
import type { LatestDetection, CameraState } from '../lib/api/types';

export function useLatestDetection(cameraState: CameraState | undefined, intervalMs = 2000) {
  const [detection, setDetection] = useState<LatestDetection | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const inFlight = useRef(false);
  const mounted  = useRef(true);
  const isActive = cameraState === 'connected' || cameraState === 'stale';

  const fetch_ = useCallback(async () => {
    if (!isActive || inFlight.current) return;
    inFlight.current = true;
    try {
      const data = await apiFetch<{ detection: LatestDetection | null }>(ENDPOINTS.DETECTIONS_LATEST, { timeoutMs: 3000 });
      if (mounted.current) { setDetection(data.detection); setError(null); }
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      inFlight.current = false;
    }
  }, [isActive]);

  useEffect(() => {
    mounted.current = true;
    if (!isActive) { setDetection(null); return; }
    void fetch_();
    const t = setInterval(() => void fetch_(), intervalMs);
    return () => { mounted.current = false; clearInterval(t); };
  }, [isActive, fetch_, intervalMs]);

  return { detection, error };
}
