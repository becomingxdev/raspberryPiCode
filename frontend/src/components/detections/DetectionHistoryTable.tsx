import { useState } from 'react';
import { RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Filter, Database, X, Copy, Check } from 'lucide-react';
import { useDetectionHistory } from '../../hooks/useDetectionHistory';
import { formatDateTime, formatConfidence } from '../../lib/formatters';
import type { Mode } from '../../lib/api/types';

export function DetectionHistoryTable() {
  const { filters, setFilters, data, labels, loading, error, refresh } = useDetectionHistory();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const handlePageChange = (newOffset: number) => {
    setFilters((prev) => ({ ...prev, offset: newOffset }));
  };

  const handleLimitChange = (newLimit: number) => {
    setFilters((prev) => ({ ...prev, limit: newLimit, offset: 0 }));
  };

  const handleLabelChange = (selectedLabel: string) => {
    setFilters((prev) => ({ ...prev, label: selectedLabel, offset: 0 }));
  };

  const handleModeChange = (selectedMode: string) => {
    setFilters((prev) => ({ ...prev, mode: selectedMode as Mode | '', offset: 0 }));
  };

  const handleClearFilters = () => {
    setFilters((prev) => ({ ...prev, label: '', mode: '', offset: 0 }));
  };

  const handleCopySession = (sessionId: string) => {
    if (!sessionId) return;
    navigator.clipboard?.writeText(sessionId).catch(() => {});
    setCopiedId(sessionId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalPages = Math.ceil(data.total / filters.limit) || 1;
  const currentPage = Math.floor(filters.offset / filters.limit) + 1;
  const hasActiveFilters = Boolean(filters.label || filters.mode);

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--brand-primary)] border border-[var(--border-subtle)]">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Detection History
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Saved detections from field camera and replay
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="sm:hidden px-3 py-2 text-xs font-medium rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-primary)] flex items-center gap-1.5 min-h-[44px]"
            aria-expanded={showMobileFilters}
            aria-label="Toggle filters"
          >
            <Filter className="w-3.5 h-3.5" />
            Filters {hasActiveFilters && '(active)'}
          </button>

          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-primary)] text-xs font-medium rounded-xl border border-[var(--border-subtle)] transition disabled:opacity-40 flex items-center gap-1.5"
            aria-label="Refresh detection log"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar (Desktop inline, mobile collapsible) */}
      <div
        className={`${
          showMobileFilters ? 'block' : 'hidden sm:grid'
        } grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--border-subtle)] text-xs`}
      >
        <div>
          <label htmlFor="filter-label" className="block text-[var(--text-muted)] mb-1 text-xs font-medium flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Crop / Disease Label
          </label>
          <select
            id="filter-label"
            value={filters.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="w-full bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] min-h-[44px] sm:min-h-[36px]"
          >
            <option value="">All Labels</option>
            {labels.map((lbl) => (
              <option key={lbl} value={lbl}>
                {lbl}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-mode" className="block text-[var(--text-muted)] mb-1 text-xs font-medium">
            Capture Mode
          </label>
          <select
            id="filter-mode"
            value={filters.mode}
            onChange={(e) => handleModeChange(e.target.value)}
            className="w-full bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] min-h-[44px] sm:min-h-[36px]"
          >
            <option value="">All Modes</option>
            <option value="live">Live Camera</option>
            <option value="replay">Replay Video</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-limit" className="block text-[var(--text-muted)] mb-1 text-xs font-medium">
            Page Size
          </label>
          <select
            id="filter-limit"
            value={filters.limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="w-full bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] min-h-[44px] sm:min-h-[36px]"
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0">
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1 min-h-[44px] sm:min-h-[auto]"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
          <span className="text-[var(--text-muted)] text-xs">
            Total: <strong className="text-[var(--text-primary)] font-semibold">{data.total}</strong>
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div role="alert" className="p-3 bg-red-500/10 border border-[var(--danger-border)] text-[var(--danger-text)] text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Database query error: {error.message}</span>
          </div>
          <button
            onClick={() => void refresh()}
            className="px-2.5 py-1 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] rounded font-medium border border-[var(--border-subtle)]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--surface-2)] text-[var(--text-muted)] border-b border-[var(--border-subtle)] text-[11px] font-semibold uppercase tracking-wider sticky top-0">
            <tr>
              <th scope="col" className="px-4 py-3">Timestamp (Local)</th>
              <th scope="col" className="px-4 py-3">Detected Label</th>
              <th scope="col" className="px-4 py-3">Confidence</th>
              <th scope="col" className="px-4 py-3">Source Mode</th>
              <th scope="col" className="px-4 py-3">Session</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {loading && data.items.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skel-${i}`} className="animate-pulse">
                  <td className="px-4 py-3"><div className="h-4 bg-[var(--surface-3)] rounded w-28" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-[var(--surface-3)] rounded w-36" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-[var(--surface-3)] rounded w-20" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-[var(--surface-3)] rounded w-16" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-[var(--surface-3)] rounded w-14" /></td>
                </tr>
              ))
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    No detections recorded for these filters.
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    When the model identifies plants or diseases, records will appear here automatically.
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearFilters}
                      className="mt-3 px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-xs text-[var(--text-primary)] rounded-lg border border-[var(--border-subtle)]"
                    >
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--surface-2)] transition">
                  <td className="px-4 py-2.5 text-[var(--text-muted)] font-mono">
                    {formatDateTime(row.detected_at)}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-[var(--text-primary)]">
                    {row.label}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-[var(--surface-3)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--success-solid)] rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, row.confidence * 100))}%` }}
                        />
                      </div>
                      <span className="font-mono font-medium text-[var(--text-primary)]">
                        {formatConfidence(row.confidence)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        row.source_mode === 'replay'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {row.source_mode === 'replay' ? 'Replay' : 'Live'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)] font-mono text-[11px]">
                    {row.session_id ? (
                      <button
                        onClick={() => handleCopySession(row.session_id!)}
                        title="Copy session ID"
                        className="flex items-center gap-1 hover:text-[var(--text-primary)]"
                      >
                        {row.session_id.substring(0, 8)}
                        {copiedId === row.session_id ? (
                          <Check className="w-3 h-3 text-[var(--success-solid)]" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-60" />
                        )}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {data.total > filters.limit && (
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-3 border-t border-[var(--border-subtle)]">
          <div>
            Showing <span className="font-medium text-[var(--text-primary)]">{filters.offset + 1}–{Math.min(filters.offset + filters.limit, data.total)}</span> of <span className="font-medium text-[var(--text-primary)]">{data.total}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))}
              disabled={filters.offset === 0 || loading}
              className="p-2 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
              title="Previous Page"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium px-2 text-[var(--text-primary)]">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(filters.offset + filters.limit)}
              disabled={filters.offset + filters.limit >= data.total || loading}
              className="p-2 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
              title="Next Page"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
