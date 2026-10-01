import React from 'react';
import { computeDatasetCoverage } from '../data/masterMatchDataset';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ShieldCheck,
  Layers,
  BarChart,
  HardDrive,
} from 'lucide-react';

export const DataCoverageStudio: React.FC = () => {
  const coverage = computeDatasetCoverage();

  const pct = (num: number, denom: number) =>
    denom > 0 ? Math.round((num / denom) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm text-white">Global Football Data Lake Inspector</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Source: Hugging Face <code className="text-emerald-400">eatpizzanot/soccer-dataset</code>
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Parquet / Arrow
          </span>
        </div>

        {/* Metric Counters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Total Fixtures</span>
            <span className="text-xl font-black text-white font-mono">{coverage.total_fixtures}</span>
            <span className="text-[10px] text-slate-400 block">{coverage.played_fixtures} played matches</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Matches with xG</span>
            <span className="text-xl font-black text-cyan-400 font-mono">{coverage.matches_with_xg}</span>
            <span className="text-[10px] text-slate-400 block">
              {pct(coverage.matches_with_xg, coverage.played_fixtures)}% coverage
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Matches with Shots</span>
            <span className="text-xl font-black text-emerald-400 font-mono">{coverage.matches_with_shots}</span>
            <span className="text-[10px] text-slate-400 block">
              {pct(coverage.matches_with_shots, coverage.played_fixtures)}% coverage
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Possession Stats</span>
            <span className="text-xl font-black text-purple-400 font-mono">{coverage.matches_with_possession}</span>
            <span className="text-[10px] text-slate-400 block">
              {pct(coverage.matches_with_possession, coverage.played_fixtures)}% coverage
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Corners &amp; Cards</span>
            <span className="text-xl font-black text-amber-400 font-mono">{coverage.matches_with_corners}</span>
            <span className="text-[10px] text-slate-400 block">
              {pct(coverage.matches_with_corners, coverage.played_fixtures)}% coverage
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Pinnacle / B365 Odds</span>
            <span className="text-xl font-black text-indigo-400 font-mono">{coverage.matches_with_odds}</span>
            <span className="text-[10px] text-slate-400 block">Ground truth CLV</span>
          </div>
        </div>
      </div>

      {/* League Coverage Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              League Coverage &amp; Data Quality Tier Assignment
            </h4>
            <p className="text-[11px] text-slate-400">
              Only leagues with &gt;= 80% xG and Shots coverage qualify for Tier A Full ML Modeling.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">{coverage.leagues_coverage.length} Competitions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">League</th>
                <th className="py-3 px-3">Country</th>
                <th className="py-3 px-3">Total Fixtures</th>
                <th className="py-3 px-3">xG Coverage</th>
                <th className="py-3 px-3">Shots Coverage</th>
                <th className="py-3 px-3">Assigned Tier</th>
                <th className="py-3 px-3">ML Strategy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {coverage.leagues_coverage.map((l, i) => (
                <tr key={i} className="hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-sans font-medium text-white">{l.league_name}</td>
                  <td className="py-3 px-3 text-slate-400">{l.country}</td>
                  <td className="py-3 px-3 text-slate-300">{l.total_matches} matches</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          style={{ width: `${l.xg_coverage_pct}%` }}
                          className={`h-full ${l.xg_coverage_pct >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        />
                      </div>
                      <span className="text-[10px]">{l.xg_coverage_pct}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div style={{ width: `${l.shots_coverage_pct}%` }} className="h-full bg-emerald-500" />
                      </div>
                      <span className="text-[10px]">{l.shots_coverage_pct}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        l.data_tier === 'Tier A'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : l.data_tier === 'Tier B'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {l.data_tier}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-sans text-slate-300 text-[11px]">
                    {l.data_tier === 'Tier A'
                      ? 'Full Dixon-Coles + LightGBM Ensemble'
                      : l.data_tier === 'Tier B'
                      ? 'Reduced-Feature Gradient Boosted Model'
                      : 'Elo & Poisson Baseline Fallback'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Missing Data Policy & Zero-Lookahead Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-rose-400 font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Strict Rule: Missing xG Is NEVER Replaced with Zero</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            In amateur sports ML pipelines, imputing missing xG or shots as 0.0 falsely implies that a team had zero attacking presence. Our pipeline marks <code>xg_available = False</code> and routes the match through the tier-calibrated estimator fallback.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Strict Temporal Cutoff (Zero Data Leakage)</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            Target match outcomes (goals, shots, cards, corners, post-match xG) are completely isolated from feature construction. Features are strictly computed using past matches with <code>date &lt; target_kickoff</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
