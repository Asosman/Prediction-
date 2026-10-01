import React from 'react';
import {
  Sparkles,
  Layers,
  BarChart,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Info,
} from 'lucide-react';

const GLOBAL_FEATURE_IMPORTANCE = [
  { feature: 'elo_difference (Elo delta + Home Advantage)', weight: 0.28, target: '1X2 & Over 2.5', category: 'Strength Baseline' },
  { feature: 'home_last_5_xg_avg (Rolling Expected Goals)', weight: 0.22, target: 'BTTS & Over 2.5', category: 'Attacking Form' },
  { feature: 'away_last_5_xg_avg (Away Offensive Threat)', weight: 0.18, target: 'BTTS & Over 2.5', category: 'Attacking Form' },
  { feature: 'home_last_5_shots_avg (Total Shot Volume)', weight: 0.12, target: 'Total Shots Lines', category: 'Shot Production' },
  { feature: 'away_last_5_shots_avg (Away Shot Volume)', weight: 0.09, target: 'Total Shots Lines', category: 'Shot Production' },
  { feature: 'rest_difference (Days Rest Delta)', weight: 0.06, target: '1X2 & Fatigue', category: 'Schedule / Rest' },
  { feature: 'h2h_btts_rate (Head-to-Head Historic)', weight: 0.05, target: 'BTTS / GG', category: 'Matchup History' },
];

export const ModelExplainabilityStudio: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm text-white">Global Feature Importance &amp; Model Explainability</h3>
              <p className="text-[11px] text-slate-400">
                SHAP (SHapley Additive exPlanations) &amp; Tree Gini Feature Attribution
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            Tree SHAP
          </span>
        </div>

        {/* Feature Importance Bars */}
        <div className="space-y-4 pt-2">
          {GLOBAL_FEATURE_IMPORTANCE.map((f, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-white font-medium">{f.feature}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-sans">
                    {f.category}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-slate-400 text-[11px] font-mono">{f.target}</span>
                  <span className="font-mono font-bold text-emerald-400">{(f.weight * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
                <div
                  style={{ width: `${f.weight * 100 * 3}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Logic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold">
            <TrendingUp className="w-4 h-4" />
            <span>Rolling xG &amp; xGA (5/10 Matches)</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            Expected goals (xG) strips out finishing variance and goalkeeping luck. Rolling 5-match form creates the primary attack vs defense coefficients (&lambda; and &mu;) for Poisson/Dixon-Coles calculations.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold">
            <Cpu className="w-4 h-4" />
            <span>Dynamic Elo + 65 HFA</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            Elo ratings represent the baseline latent power of each club, updated recursively after every fixture. A 65-point home field advantage (HFA) offset accounts for home pitch bias across European leagues.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Bivariate Joint Probability (Combinations)</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            Target 6 combines BTTS and Over 2.5 goals using true joint score-matrix summation (e.g., 2-1, 3-1, 2-2) rather than naive independent multiplication, avoiding severe mathematical underestimation.
          </p>
        </div>
      </div>
    </div>
  );
};
