// ============================================================================
// Data Drift Warning Indicator & Diagnostics Modal Component
// Displays visual warning when model confidence scores deviate from historical means
// ============================================================================

import React, { useState } from 'react';
import { DataDriftReport } from '../ml/dataDriftDetector';
import {
  AlertTriangle,
  ShieldCheck,
  Activity,
  AlertCircle,
  X,
  TrendingUp,
  Info,
  Sliders,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface DataDriftWarningBadgeProps {
  report: DataDriftReport;
  className?: string;
  showDetailsButton?: boolean;
}

export const DataDriftWarningBadge: React.FC<DataDriftWarningBadgeProps> = ({
  report,
  className = '',
  showDetailsButton = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const { isDriftDetected, driftLevel, maxZScore, primaryDriftMetric } = report;

  // Determine styling based on drift severity
  let badgeStyles = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
  let badgeIcon = <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
  let badgeText = 'Calibration Stable';
  let badgeSubtext = `Z: ${maxZScore.toFixed(1)}σ vs Baseline`;

  if (driftLevel === 'critical_drift') {
    badgeStyles = 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/40 animate-pulse';
    badgeIcon = <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
    badgeText = 'Critical Data Drift';
    badgeSubtext = `Deviates ${maxZScore.toFixed(1)}σ from Mean`;
  } else if (driftLevel === 'warning_drift') {
    badgeStyles = 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/30';
    badgeIcon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    badgeText = 'Data Drift Warning';
    badgeSubtext = `Deviates ${maxZScore.toFixed(1)}σ from Mean`;
  } else if (driftLevel === 'mild_skew') {
    badgeStyles = 'bg-indigo-500/15 border-indigo-500/35 text-indigo-300';
    badgeIcon = <Activity className="w-3.5 h-3.5 text-indigo-400" />;
    badgeText = 'Mild Confidence Shift';
    badgeSubtext = `Z: ${maxZScore.toFixed(1)}σ`;
  }

  return (
    <>
      {/* Clickable Header Indicator Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`group flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer hover:brightness-110 ${badgeStyles} ${className}`}
        title={`Click to inspect model confidence drift diagnostics (Evaluated at ${report.evaluatedAt})`}
      >
        <span className="flex items-center space-x-1.5">
          {isDriftDetected ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          )}
          {badgeIcon}
          <span className="font-bold tracking-tight">{badgeText}</span>
        </span>

        <span className="text-[11px] opacity-75 hidden md:inline font-mono">
          ({badgeSubtext})
        </span>

        {showDetailsButton && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 group-hover:bg-black/50 transition font-mono uppercase tracking-wider">
            Diagnostics
          </span>
        )}
      </button>

      {/* Diagnostics Modal / Detailed Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-slate-200 overflow-y-auto max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2.5 rounded-xl border ${
                    isDriftDetected
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  {isDriftDetected ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white">
                      Model Confidence &amp; Data Drift Diagnostics
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        isDriftDetected
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {isDriftDetected ? 'Drift Alert' : 'In Range'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Evaluates live prediction confidence distributions against 5,000+ historical baseline fixtures.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drift Status Banner */}
            <div
              className={`p-4 rounded-xl border space-y-2 ${
                isDriftDetected
                  ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                  : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center space-x-2">
                  <Activity className="w-4 h-4" />
                  <span>
                    Status:{' '}
                    {isDriftDetected
                      ? 'Statistical Drift Detected (|Z| ≥ 2.0σ)'
                      : 'Calibration Nominal (|Z| < 2.0σ)'}
                  </span>
                </span>
                <span className="font-mono text-[11px] opacity-80">
                  Peak Deviation: {maxZScore.toFixed(2)}σ
                </span>
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
                {report.mitigationAdvice}
              </p>
            </div>

            {/* Breakdown Table: Metrics vs Historical Means */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                <span>Estimator Confidence Target</span>
                <span>Current vs Historical Mean (±1σ)</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl divide-y divide-slate-800/80 overflow-hidden text-xs">
                {report.metrics.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-3 flex items-center justify-between transition ${
                      m.isDrifting ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white">{m.metricName}</span>
                        {m.isDrifting && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            DRIFT ({m.zScore > 0 ? `+${m.zScore}` : m.zScore}σ)
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        Category: {m.category}
                      </span>
                    </div>

                    <div className="text-right space-y-0.5">
                      <div className="font-mono font-bold text-slate-200 flex items-center justify-end space-x-1.5">
                        <span
                          className={
                            m.isDrifting
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }
                        >
                          {m.currentValueFormatted}
                        </span>
                        <span className="text-slate-600">/</span>
                        <span className="text-slate-400 text-[11px]">
                          {m.historicalMeanFormatted}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono block ${
                          m.isDrifting
                            ? 'text-amber-400 font-bold'
                            : 'text-slate-500'
                        }`}
                      >
                        Δ {m.deviationPct > 0 ? `+${m.deviationPct}` : m.deviationPct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Diagnosed Signals */}
            {report.driftSignals.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                  Diagnosed Drift Signals:
                </span>
                <ul className="space-y-1.5">
                  {report.driftSignals.map((sig, i) => (
                    <li
                      key={i}
                      className="text-xs text-slate-300 bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex items-start space-x-2"
                    >
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{sig}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
              <span className="font-mono text-[11px]">
                Last evaluated: {report.evaluatedAt}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
              >
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
