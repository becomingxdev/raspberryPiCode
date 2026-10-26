import { useState } from 'react';
import { Leaf, Wifi, AlertCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api/client';
import { setBackendUrl, getBackendUrl } from '../lib/api/baseUrl';
import { ENDPOINTS } from '../lib/api/endpoints';

interface Props {
  onConnected: (url: string) => void;
}

export function BackendConnectScreen({ onConnected }: Props) {
  const [url, setUrl] = useState<string>(getBackendUrl() || 'http://');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    const trimmed = url.trim().replace(/\/$/, '');
    if (!trimmed.startsWith('http')) {
      setError('URL must start with http:// or https://');
      return;
    }
    setLoading(true);
    setError(null);
    setBackendUrl(trimmed);
    try {
      await apiFetch(ENDPOINTS.HEALTH, { timeoutMs: 6000 });
      onConnected(trimmed);
    } catch (e) {
      setError(`Cannot reach backend: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-8 shadow-lg space-y-7">
        {/* Icon + title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--brand)]/10 border border-[var(--brand)]/20 flex items-center justify-center">
            <Leaf className="w-8 h-8 text-[var(--brand)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text)]">AgreBot</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">Agricultural Inspection System</p>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4">
          <Wifi className="w-4 h-4 text-[var(--brand)] mt-0.5 shrink-0" />
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Make sure your laptop and Raspberry Pi are on the <strong className="text-[var(--text)]">same Wi-Fi network</strong>.
            Run <code className="bg-[var(--bg)] px-1.5 py-0.5 rounded font-mono">python main.py</code> on the Pi — it will print the backend URL.
          </p>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <label htmlFor="backend-url" className="block text-sm font-medium text-[var(--text)]">
            Raspberry Pi Backend URL
          </label>
          <input
            id="backend-url"
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void handleConnect()}
            placeholder="http://192.168.x.x:5000"
            disabled={loading}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50 disabled:opacity-50 font-mono"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Button */}
        <button
          onClick={() => void handleConnect()}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[var(--brand)] text-[var(--on-brand)] font-semibold text-sm rounded-xl py-3 hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</> : 'Connect to Backend'}
        </button>
      </div>
    </div>
  );
}
