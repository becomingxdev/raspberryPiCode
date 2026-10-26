import { useState } from 'react';
import { Camera, AlertCircle, Loader2, ChevronLeft, Smartphone } from 'lucide-react';
import { apiFetch } from '../lib/api/client';
import { ENDPOINTS } from '../lib/api/endpoints';

interface Props {
  backendUrl: string;
  onConnected: (cameraUrl: string) => void;
  onBack: () => void;
}

export function CameraConnectScreen({ backendUrl, onConnected, onBack }: Props) {
  const [url, setUrl] = useState('http://');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    const trimmed = url.trim();
    if (!trimmed.startsWith('http') && !/^\d+$/.test(trimmed)) {
      setError('Enter a valid URL (http://...) or 0 for built-in webcam');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch<{ success: boolean }>(ENDPOINTS.CAMERA_CONNECT, {
        method: 'POST',
        body: JSON.stringify({ url: trimmed }),
        timeoutMs: 8000,
      });
      onConnected(trimmed);
    } catch (e) {
      setError(`Failed to connect camera: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-8 shadow-lg space-y-7">
        {/* Connected chip */}
        <div className="flex items-center gap-2 text-xs text-[var(--ok)] bg-[var(--ok)]/10 border border-[var(--ok)]/20 rounded-full px-3 py-1 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)]" />
          Connected to {backendUrl}
        </div>

        {/* Icon + title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--brand)]/10 border border-[var(--brand)]/20 flex items-center justify-center">
            <Camera className="w-8 h-8 text-[var(--brand)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text)]">Connect IP Webcam</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">Point the rover camera at your crops</p>
          </div>
        </div>

        {/* Help tip */}
        <div className="flex items-start gap-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4">
          <Smartphone className="w-4 h-4 text-[var(--brand)] mt-0.5 shrink-0" />
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Install <strong className="text-[var(--text)]">IP Webcam</strong> (Android) or <strong className="text-[var(--text)]">EpocCam</strong> (iOS) on your phone.
            Start the server and paste the stream URL here, e.g.
            <code className="block mt-1 bg-[var(--bg)] px-2 py-1 rounded font-mono">http://192.168.x.x:8080/video</code>
          </p>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <label htmlFor="cam-url" className="block text-sm font-medium text-[var(--text)]">
            IP Webcam Stream URL
          </label>
          <input
            id="cam-url"
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void handleConnect()}
            placeholder="http://192.168.x.x:8080/video"
            disabled={loading}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50 disabled:opacity-50 font-mono"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={() => void handleConnect()}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[var(--brand)] text-[var(--on-brand)] font-semibold text-sm rounded-xl py-3 hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting Stream…</> : 'Start Stream'}
        </button>

        <button onClick={onBack} className="w-full flex items-center justify-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition">
          <ChevronLeft className="w-4 h-4" /> Back to backend connect
        </button>
      </div>
    </div>
  );
}
