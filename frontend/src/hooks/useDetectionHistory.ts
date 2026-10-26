import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../lib/api/client';
import { ENDPOINTS } from '../lib/api/endpoints';
import type { Detection, Page, Mode } from '../lib/api/types';

export interface DetectionFilters {
  label: string;
  mode: Mode | '';
  limit: number;
  offset: number;
}

export function useDetectionHistory(initialFilters?: Partial<DetectionFilters>) {
  const [filters, setFilters] = useState<DetectionFilters>({
    label:  initialFilters?.label  || '',
    mode:   initialFilters?.mode   || '',
    limit:  initialFilters?.limit  || 25,
    offset: initialFilters?.offset || 0,
  });
  const [data, setData]     = useState<Page<Detection>>({ items: [], total: 0, limit: 25, offset: 0 });
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchLabels = useCallback(async () => {
    try {
      const res = await apiFetch<{ labels: string[] }>(ENDPOINTS.DETECTIONS_LABELS, { timeoutMs: 4000 });
      setLabels(res.labels);
    } catch { /* ignore */ }
  }, []);

  const fetchDetections = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true); setError(null);
    const q: Record<string, string> = { limit: String(filters.limit), offset: String(filters.offset) };
    if (filters.label) q.label = filters.label;
    if (filters.mode)  q.mode  = filters.mode;
    try {
      const res = await apiFetch<Page<Detection>>(`${ENDPOINTS.DETECTIONS}?${new URLSearchParams(q)}`, { signal: ctrl.signal, timeoutMs: 8000 });
      setData(res);
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void fetchLabels(); }, [fetchLabels]);
  useEffect(() => { void fetchDetections(); return () => abortRef.current?.abort(); }, [fetchDetections]);

  return { filters, setFilters, data, labels, loading, error, refresh: fetchDetections };
}
