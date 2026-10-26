/**
 * Format an ISO UTC timestamp to local time string hh:mm:ss.
 */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * Format an ISO UTC timestamp to a local date+time string.
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * Format a confidence value (0–1) as "91.0%" (one decimal place).
 */
export function formatConfidence(c: number): string {
  return `${(c * 100).toFixed(1)}%`;
}

/**
 * Format age in seconds as a human-readable string.
 * E.g. "2 s ago", "1 min ago", "5 min ago".
 */
export function formatAge(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} s ago`;
  }
  const mins = Math.floor(seconds / 60);
  return `${mins} min ago`;
}

/**
 * Format uptime in seconds as "2 h 3 m 45 s".
 */
export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} h`);
  if (m > 0 || h > 0) parts.push(`${m} m`);
  parts.push(`${s} s`);
  return parts.join(' ');
}
