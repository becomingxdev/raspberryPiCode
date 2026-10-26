import { useState, useRef } from 'react';
import {
  RefreshCw, VideoOff, WifiOff, AlertTriangle,
  Maximize2, Minimize2
} from 'lucide-react';
import { apiUrl } from '../lib/api/baseUrl';
import { ENDPOINTS } from '../lib/api/endpoints';
import type { CameraState } from '../lib/api/types';

interface Props {
  cameraState: CameraState;
  isOffline: boolean;
  fps?: number | null;
}

export function VideoPanel({ cameraState, isOffline, fps }: Props) {
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isConnected = cameraState === 'connected';
  const isStale     = cameraState === 'stale';
  const shouldMount = (isConnected || isStale) && !isOffline;
  const streamSrc   = `${apiUrl(ENDPOINTS.VIDEO_FEED)}?t=${reloadKey}`;

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full rounded-2xl overflow-hidden bg-[var(--surface-1)] border border-[var(--border)] shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] select-none">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-[var(--ok)] animate-pulse' : isStale ? 'bg-[var(--warn)]' : 'bg-[var(--text-muted)]'}`} />
          <h2 className="text-sm font-bold text-[var(--text)]">Camera Feed</h2>
          {fps != null && fps > 0 && (
            <span className="text-xs font-mono text-[var(--text-muted)]">{fps.toFixed(1)} fps</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setReloadKey(k => k + 1)} disabled={!shouldMount}
            className="p-1.5 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition disabled:opacity-40"
            title="Reload stream">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => void toggleFullscreen()}
            className="p-1.5 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 16:9 canvas */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
        {isOffline ? (
          <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
            <WifiOff className="w-10 h-10 text-[var(--danger)]" />
            <p className="text-sm font-semibold text-[var(--text)]">Backend Offline</p>
          </div>
        ) : !shouldMount ? (
          <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
            <VideoOff className="w-10 h-10" />
            <p className="text-sm font-semibold text-[var(--text)]">Camera Not Connected</p>
            <p className="text-xs">Waiting for IP Webcam stream…</p>
          </div>
        ) : (
          <>
            <img key={reloadKey} src={streamSrc} alt="Live camera feed"
              className={`w-full h-full object-contain ${isStale ? 'opacity-40 grayscale' : ''}`} />
            {isStale && (
              <div role="alert" className="absolute inset-x-0 top-0 bg-[var(--warn)]/95 text-black px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                STALE STREAM — No new frames
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
