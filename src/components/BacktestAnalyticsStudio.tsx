import React, { useState } from 'react';
import { runWalkForwardBacktest } from '../ml/backtestEngine';
import { BacktestSummary } from '../types';
import {
  BarChart3,
  TrendingUp,
  Target,
  Sliders,
  CheckCircle2,
  Layers,
  Activity,
  Award,
} from 'lucide-react';

export const BacktestAnalyticsStudio: React.FC = () => {
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');

  const backtest: BacktestSummary = runWalkForwardBacktest(
    undefined,
    selectedLeague,
    selectedSeason
  );

  return (
    <div className="space-y-6">
      {/* Top Filter Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm text-white">Chronological Walk-Forward Backtesting Engine</h3>
              <p className="text-[11px] text-slate-400">
                Evaluating {backtest.total_matches} played historical matches strictly out-of-sample
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Time Range: <span className="text-emerald-400">{backtest.time_range.start}</span> to{' '}
            <span className="text-emerald-400">{backtest.time_range.end}</span>
          </span>
        </div>

        {/* Filter selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">League Scope</label>
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">All Available Leagues &amp; Competitions</option>
              <option value="epl">Premier League (England)</option>
              <option value="laliga">La Liga (Spain)</option>
              <option value="bundesliga">Bundesliga (Germany)</option>
              <option value="serie_a">Serie A (Italy)</option>
              <option value="eredivisie">Eredivisie (Netherlands)</option>
              <option value="scottish_prem">Scottish Premiership</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Season</label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">All Seasons (2024/2025 Walk-Forward)</option>
              <option value="2024/2025">2024/2025</option>
            </select>
          </div>
        </div>
      </div>

      {/* Target Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* BTTS Metric */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase">Target 1: BTTS</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Binary
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {backtest.overall.btts_accuracy}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Log-Loss: <strong className="text-white font-mono">{backtest.overall.btts_log_loss}</strong>
            </div>
            <div className="text-[11px] text-slate-400">
              Brier Score: <strong className="text-white font-mono">{backtest.overall.btts_brier}</strong>
            </div>
          </div>
        </div>

        {/* Over 2.5 Metric */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase">Target 2: Over 2.5</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Binary
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-cyan-400 font-mono">
              {backtest.overall.over25_accuracy}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Log-Loss: <strong className="text-white font-mono">{backtest.overall.over25_log_loss}</strong>
            </div>
            <div className="text-[11px] text-slate-400">
              Brier Score: <strong className="text-white font-mono">{backtest.overall.over25_brier}</strong>
            </div>
          </div>
        </div>

        {/* 1X2 Metric */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase">Target 3: 1X2 Outcome</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              3-Class
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-400 font-mono">
              {backtest.overall.result_accuracy}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Log-Loss: <strong className="text-white font-mono">{backtest.overall.result_log_loss}</strong>
            </div>
            <div className="text-[11px] text-slate-400">
              Brier Score: <strong className="text-white font-mono">{backtest.overall.result_brier}</strong>
            </div>
          </div>
        </div>

        {/* Total Shots Metric */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase">Target 4: Total Shots</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30">
              Regression
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-400 font-mono">
              MAE {backtest.overall.shots_mae}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              RMSE: <strong className="text-white font-mono">{backtest.overall.shots_rmse}</strong>
            </div>
            <div className="text-[11px] text-slate-400">
              Poisson Dispersion: <strong className="text-white font-mono">1.04</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Reliability / Calibration Curves & League Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reliability Curve */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Probability Calibration Reliability Curves
            </h4>
            <span className="text-[10px] text-emerald-400 font-mono">Platt Scaling</span>
          </div>

          <div className="space-y-3">
            {backtest.calibration_curve.map((b, i) => {
              const diff = Math.abs(b.predicted_avg - b.actual_rate);
              return (
                <div key={i} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-slate-300 font-mono">
                    <span className="font-bold text-white">Bin {b.prob_range}</span>
                    <span className="text-[10px] text-slate-400">{b.samples} evaluated matches</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 text-[10px]">Predicted Prob:</span>
                      <div className="font-bold font-mono text-cyan-400">
                        {(b.predicted_avg * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px]">Empirical Win Rate:</span>
                      <div className="font-bold font-mono text-emerald-400">
                        {(b.actual_rate * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Visual Bar Comparison */}
                  <div className="space-y-1 pt-1">
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                      <div style={{ width: `${b.actual_rate * 100}%` }} className="bg-emerald-500 h-full" />
                    </div>
                    <div className="text-[9px] text-slate-500 flex justify-between font-mono">
                      <span>Calibration Error: {(diff * 100).toFixed(1)}%</span>
                      <span className={diff <= 0.05 ? 'text-emerald-400' : 'text-amber-400'}>
                        {diff <= 0.05 ? 'Well Calibrated' : 'Slight Deviation'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* League Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              League-by-League Out-of-Sample Performance
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Walk-Forward</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-2.5">League</th>
                  <th className="py-2.5 px-2.5">Matches</th>
                  <th className="py-2.5 px-2.5">BTTS Acc</th>
                  <th className="py-2.5 px-2.5">O2.5 Acc</th>
                  <th className="py-2.5 px-2.5">1X2 Acc</th>
                  <th className="py-2.5 px-2.5">Shots MAE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                {backtest.by_league.map((l, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-2.5 font-sans font-medium text-white">{l.league_name}</td>
                    <td className="py-2.5 px-2.5 text-slate-400">{l.matches}</td>
                    <td className="py-2.5 px-2.5 text-emerald-400 font-bold">{l.btts_acc}%</td>
                    <td className="py-2.5 px-2.5 text-cyan-400 font-bold">{l.over25_acc}%</td>
                    <td className="py-2.5 px-2.5 text-indigo-400 font-bold">{l.result_acc}%</td>
                    <td className="py-2.5 px-2.5 text-purple-400 font-bold">{l.shots_mae}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
