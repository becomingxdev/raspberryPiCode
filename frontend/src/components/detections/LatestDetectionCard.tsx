import { Sparkles, Activity } from 'lucide-react';
import { formatConfidence, formatAge, formatTime } from '../../lib/formatters';
import type { LatestDetection, ModelState, ComponentError } from '../../lib/api/types';

export interface LatestDetectionCardProps {
  detection: LatestDetection | null;
  modelState: ModelState;
  modelError: ComponentError | null;
}

export function LatestDetectionCard({
  detection,
  modelState,
  modelError,
}: LatestDetectionCardProps) {
  const isModelReady = modelState === 'ready';
  const isOlder = detection ? detection.age_seconds > 10 : false;

  let modelNote: string | null = null;
  if (modelState === 'not_configured') {
    modelNote = 'Inference disabled — no model weights configured on backend.';
  } else if (modelState === 'loading') {
    modelNote = 'Model is currently loading weights...';
  } else if (modelState === 'error') {
    modelNote = `Model failure: ${modelError?.message || 'Error running inference'}`;
  } else if (modelState === 'disabled') {
    modelNote = 'Model inference is disabled.';
  }

  const confidencePct = detection ? Math.round(detection.confidence * 1000) / 10 : 0;

  return (
    <div
      className={`bg-surface-1 border border-border rounded-card p-5 shadow-sm space-y-4 select-none ${
        isOlder ? 'opacity-70' : ''
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 ${isModelReady ? 'text-brand' : 'text-text-muted'}`} />
          <h2 className="text-sm font-bold text-text">Latest Detection</h2>
        </div>

        {detection && (
          <div className="flex items-center gap-2">
            {isOlder && (
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-pill bg-surface-2 text-text-muted border border-border">
                older
              </span>
            )}
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-pill border ${
                detection.persisted
                  ? 'bg-ok/10 text-ok border-ok/30'
                  : 'bg-surface-2 text-text-muted border-border'
              }`}
            >
              {detection.persisted ? 'Saved' : 'not saved: repeat within cooldown'}
            </span>
          </div>
        )}
      </div>

      {/* Model explanation if not ready */}
      {modelNote && (
        <div className="p-3 bg-surface-2 border border-border rounded-input text-xs text-text-muted">
          {modelNote}
        </div>
      )}

      {/* Detection content */}
      {!detection ? (
        <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
          <Activity className="w-8 h-8 text-text-muted/60 stroke-[1.5]" />
          <div>
            <p className="text-sm font-semibold text-text">No detection yet</p>
            <p className="text-xs text-text-muted mt-0.5">
              {isModelReady
                ? 'Camera is actively scanning for crop diseases'
                : 'Load model weights to start detecting'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-text capitalize tracking-tight">
                {detection.label}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Detected {formatAge(detection.age_seconds)} ({formatTime(detection.detected_at)})
              </p>
            </div>
            <span className="text-xl font-bold font-mono text-brand">
              {formatConfidence(detection.confidence)}
            </span>
          </div>

          {/* Visual Confidence Bar (0 - 100%, one decimal) */}
          <div className="space-y-1">
            <div className="w-full h-2.5 bg-surface-2 rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-brand transition-all duration-300"
                style={{ width: `${Math.min(Math.max(confidencePct, 0), 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-text-muted font-mono">
              <span>0%</span>
              <span>Confidence Threshold: 50%</span>
              <span>100%</span>
            </div>
          </div>

          <p className="text-[11px] text-text-muted border-t border-border pt-2.5">
            Results come from the trained ResNet-18 model and cover the 218 agricultural classes it was trained on.
          </p>
        </div>
      )}
    </div>
  );
}
