import { useState, useEffect } from 'react';
import { BackendConnectScreen } from './components/BackendConnectScreen';
import { CameraConnectScreen } from './components/CameraConnectScreen';
import { VideoPanel } from './components/VideoPanel';
import { LatestDetectionCard } from './components/detections/LatestDetectionCard';
import { DetectionHistoryTable } from './components/detections/DetectionHistoryTable';
import { useLatestDetection } from './hooks/useLatestDetection';
import { apiFetch } from './lib/api/client';
import { ENDPOINTS } from './lib/api/endpoints';
import { getBackendUrl, clearBackendUrl } from './lib/api/baseUrl';
import type { CameraState } from './lib/api/types';
import { Leaf, LogOut, Camera, Wifi, WifiOff } from 'lucide-react';

type Step = 'backend' | 'camera' | 'dashboard';

// ── Minimal camera-state poll ─────────────────────────────────────────────────
function useCameraState(active: boolean) {
  const [state, setState] = useState<CameraState>('disconnected');
  const [fps, setFps] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let failures = 0;

    const poll = async () => {
      try {
        const data = await apiFetch<{ state: CameraState; fps: number | null }>(
          ENDPOINTS.CAMERA_STATUS, { timeoutMs: 4000 }
        );
        if (!cancelled) { setState(data.state); setFps(data.fps); failures = 0; setIsOffline(false); }
      } catch {
        if (!cancelled) { failures++; if (failures >= 3) setIsOffline(true); }
      }
    };

    void poll();
    const t = setInterval(() => void poll(), 2500);
    return () => { cancelled = true; clearInterval(t); };
  }, [active]);

  return { cameraState: state, fps, isOffline };
}

// ── App ───────────────────────────────────────────────────────────────────────
export function App() {
  const [step, setStep] = useState<Step>(() =>
    getBackendUrl() ? 'camera' : 'backend'
  );
  const [backendUrl, setBackendUrl_] = useState(getBackendUrl);
  const [cameraUrl, setCameraUrl]    = useState('');

  const isDashboard = step === 'dashboard';
  const { cameraState, fps, isOffline } = useCameraState(isDashboard);
  const { detection } = useLatestDetection(isDashboard ? cameraState : undefined);

  const handleBackendConnected = (url: string) => {
    setBackendUrl_(url);
    setStep('camera');
  };

  const handleCameraConnected = (url: string) => {
    setCameraUrl(url);
    setStep('dashboard');
  };

  const handleDisconnect = async () => {
    try { await apiFetch(ENDPOINTS.CAMERA_DISCONNECT, { method: 'POST' }); } catch { /* ignore */ }
    setStep('camera');
    setCameraUrl('');
  };

  const handleBackToBackend = () => {
    clearBackendUrl();
    setBackendUrl_('');
    setStep('backend');
  };

  // Step 1
  if (step === 'backend') {
    return <BackendConnectScreen onConnected={handleBackendConnected} />;
  }

  // Step 2
  if (step === 'camera') {
    return (
      <CameraConnectScreen
        backendUrl={backendUrl}
        onConnected={handleCameraConnected}
        onBack={handleBackToBackend}
      />
    );
  }

  // Step 3 — Dashboard
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col" data-theme="dark">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3 bg-[var(--surface-1)] border-b border-[var(--border)] select-none shrink-0">
        <div className="flex items-center gap-3">
          <Leaf className="w-5 h-5 text-[var(--brand)]" />
          <span className="font-bold text-[var(--text)]">AgreBot</span>
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--border)] rounded-full px-2.5 py-1">
            <Wifi className="w-3 h-3" />{backendUrl}
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--border)] rounded-full px-2.5 py-1">
            <Camera className="w-3 h-3" />{cameraUrl}
          </span>
          {isOffline && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-full px-2.5 py-1">
              <WifiOff className="w-3 h-3" /> Backend offline
            </span>
          )}
        </div>
        <button
          onClick={() => void handleDisconnect()}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--danger)] border border-[var(--border)] rounded-lg px-3 py-1.5 transition"
        >
          <LogOut className="w-3.5 h-3.5" /> Disconnect
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 p-4 overflow-auto">
        {/* Left — video feed */}
        <div className="flex flex-col gap-4 min-w-0">
          <VideoPanel cameraState={cameraState} isOffline={isOffline} fps={fps} />
        </div>

        {/* Right — detection panel */}
        <div className="flex flex-col gap-4">
          <LatestDetectionCard
            detection={detection}
            modelState="ready"
            modelError={null}
          />
        </div>
      </main>

      {/* History table */}
      <section className="px-4 pb-4">
        <DetectionHistoryTable />
      </section>
    </div>
  );
}

export default App;
