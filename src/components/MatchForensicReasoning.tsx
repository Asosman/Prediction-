// ============================================================================
// Match Forensic Reasoning & Contextual Intelligence Hub
// Displays deep historical, tactical, squad injury, and performance evidence
// explaining why the model forecasted each specific market: Shots, GG, O2.5, DC, 1X2.
// ============================================================================

import React, { useState } from 'react';
import {
  MultiTargetPrediction,
  PreMatchFeatures,
  PlayerInjury,
} from '../types';
import {
  ShieldAlert,
  Calendar,
  History,
  Trophy,
  Home,
  Briefcase,
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  TrendingUp,
  Zap,
  Target,
  BarChart2,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';

interface MatchForensicReasoningProps {
  prediction: MultiTargetPrediction;
  features?: PreMatchFeatures;
}

export const MatchForensicReasoning: React.FC<MatchForensicReasoningProps> = ({
  prediction,
  features,
}) => {
  const [activeTab, setActiveTab] = useState<
    'rationales' | 'horizons' | 'squad_injuries' | 'h2h' | 'splits' | 'calendar_matchday'
  >('rationales');

  const reasoning = prediction.forensic_reasoning;
  const squad = prediction.squad_intelligence;
  const h2h = prediction.h2h_detailed;
  const calendar = prediction.calendar_day_performance;
  const tournament = prediction.tournament_performance;
  const matchday = prediction.matchday_performance;
  const splits = prediction.home_away_splits;
  const multiHorizon = prediction.multi_horizon_analysis;

  const home = prediction.match.home;
  const away = prediction.match.away;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-5 p-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Forensic Prediction Reasoning &amp; Tactical Intelligence
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                AUDITED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-dimensional breakdown showing why every target was forecasted (L3/L5/L10, injuries, H2H, calendar day, matchday, and venue splits).
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('rationales')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'rationales'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Target Rationales</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('horizons')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'horizons'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>L3 • L5 • L10 Form</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('squad_injuries')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'squad_injuries'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Squad &amp; Injuries</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('h2h')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'h2h'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>H2H History</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('splits')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'splits'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home / Away Splits</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar_matchday')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'calendar_matchday'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendar &amp; Matchday</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PREDICTION TARGET RATIONALES (Shots, GG, Over 2.5, Win or Draw, 1X2) */}
      {activeTab === 'rationales' && reasoning && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. SHOTS RATIONALE */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Total Shots Rationale
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {reasoning.shots_reasoning.pick}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {reasoning.shots_reasoning.forensic_summary}
              </p>

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Statistical Drivers:
                </span>
                <ul className="space-y-1">
                  {reasoning.shots_reasoning.key_drivers.map((d, i) => (
                    <li key={i} className="text-[11px] text-slate-400 flex items-start space-x-1.5">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 2. GG / BTTS RATIONALE */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Both Teams To Score (GG)
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                    reasoning.gg_reasoning.pick === 'YES'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  GG {reasoning.gg_reasoning.pick} ({(reasoning.gg_reasoning.prob_yes * 100).toFixed(1)}%)
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {reasoning.gg_reasoning.forensic_summary}
              </p>

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tactical &amp; Injury Drivers:
                </span>
                <ul className="space-y-1">
                  {reasoning.gg_reasoning.key_drivers.map((d, i) => (
                    <li key={i} className="text-[11px] text-slate-400 flex items-start space-x-1.5">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 3. OVER / UNDER 2.5 RATIONALE */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Over / Under 2.5 Goals
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {reasoning.over_2_5_reasoning.pick} 2.5 ({(reasoning.over_2_5_reasoning.prob_over * 100).toFixed(1)}%)
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {reasoning.over_2_5_reasoning.forensic_summary}
              </p>

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Scoring Horizon Drivers:
                </span>
                <ul className="space-y-1">
                  {reasoning.over_2_5_reasoning.key_drivers.map((d, i) => (
                    <li key={i} className="text-[11px] text-slate-400 flex items-start space-x-1.5">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 4. WIN OR DRAW (DOUBLE CHANCE) RATIONALE */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Win or Draw (Double Chance)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {reasoning.win_or_draw_reasoning.pick} ({(reasoning.win_or_draw_reasoning.probability * 100).toFixed(1)}%)
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {reasoning.win_or_draw_reasoning.forensic_summary}
              </p>

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Resilience &amp; Venue Drivers:
                </span>
                <ul className="space-y-1">
                  {reasoning.win_or_draw_reasoning.key_drivers.map((d, i) => (
                    <li key={i} className="text-[11px] text-slate-400 flex items-start space-x-1.5">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 5. 1X2 MATCH OUTCOME RATIONALE */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4.5 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    1X2 Primary Match Winner Rationale
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {reasoning.outcome_1x2_reasoning.pick} ({(reasoning.outcome_1x2_reasoning.highest_probability * 100).toFixed(1)}%)
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {reasoning.outcome_1x2_reasoning.forensic_summary}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {reasoning.outcome_1x2_reasoning.key_drivers.map((d, i) => (
                  <div key={i} className="text-[11px] text-slate-300 bg-slate-900 border border-slate-800/80 p-2.5 rounded-lg flex items-start space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-HORIZON FORM INSPECTION (L3 • L5 • L10) */}
      {activeTab === 'horizons' && multiHorizon && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Home Multi-Horizon Breakdown */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  <span>{home}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    Trend: {multiHorizon.home.form_trend.toUpperCase()}
                  </span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  xG Momentum: {multiHorizon.home.momentum_xg_diff > 0 ? '+' : ''}{multiHorizon.home.momentum_xg_diff.toFixed(2)}/90
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 block uppercase">Last 3 (Acute)</span>
                  <div className="font-bold text-white">{multiHorizon.home.last_3.wins}W-{multiHorizon.home.last_3.draws}D-{multiHorizon.home.last_3.losses}L</div>
                  <div className="text-[10px] text-slate-400 font-mono">{multiHorizon.home.last_3.xg_scored_avg} xG/g</div>
                  <div className="text-[10px] text-slate-400 font-mono">{multiHorizon.home.last_3.shots_avg} shots</div>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-cyan-400 block uppercase">Last 5 (Standard)</span>
                  <div className="font-bold text-white">{multiHorizon.home.last_5.wins}W-{multiHorizon.home.last_5.draws}D-{multiHorizon.home.last_5.losses}L</div>
                  <div className="text-[10px] text-slate-400 font-mono">{multiHorizon.home.last_5.xg_scored_avg} xG/g</div>
                  <div className="text-[10px] text-slate-400 font-mono">{multiHorizon.home.last_5.shots_avg} shots</div>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-indigo-400 block uppercase">Last 10 (Baseline)</span>
                  <div className="font-bold text-white">{multiHorizon.home.last_10.wins}W-{multiHorizon.home.last_10.draws}D-{multiHorizon.home.last_10.losses}L</div>
                  <div className="text-[10px] text-slate-400 font-mono">{multiHorizon.home.last_10.xg_scored_avg} xG/g</div>
                  <div className="text-[10px] text-slate-400 font-mono">{multiHorizon.home.last_10.shots_avg} shots</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60 flex justify-between">
                <span>BTTS Rate: {(multiHorizon.home.last_5.btts_rate * 100).toFixed(0)}%</span>
                <span>Over 2.5: {(multiHorizon.home.last_5.over25_rate * 100).toFixed(0)}%</span>
                <span>Clean Sheet: {(multiHorizon.home.last_5.clean_sheet_rate * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Away Multi-Horizon Breakdown */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  <span>{away}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                    Trend: {multiHorizon.away.form_trend.toUpperCase()}
                  </span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  xG Momentum: {multiHorizon.away.momentum_xg_diff > 0 ? '+' : ''}{multiHorizon.away.momentum_xg_diff.toFixed(2)}/90
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 block uppercase">Last 3 (Acute)</span>
                  <div className="font-bold text-white">{multiHorizon.away.last_3.wins}W-{multiHorizon.away.last_3.draws}D-{multiHorizon.away.last_3.losses}L</div>
                  <div className="text-[10px] text-slate-400 font-mono">{multiHorizon.away.last_3.xg_scored_avg} xG/g</div>
                  <div className="text-[10px] text-slate-400 font-mono">{multiHorizon.away.last_3.shots_avg} shots</div>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-cyan-400 block uppercase">Last 5 (Standard)</span>
                  <div className="font-bold text-white">{multiHorizon.away.last_5.wins}W-{multiHorizon.away.last_5.draws}D-{multiHorizon.away.last_5.losses}L</div>
                  <div className="text-[10px] text-slate-400 font-mono">{multiHorizon.away.last_5.xg_scored_avg} xG/g</div>
                  <div className="text-[10px] text-slate-400 font-mono">{multiHorizon.away.last_5.shots_avg} shots</div>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-indigo-400 block uppercase">Last 10 (Baseline)</span>
                  <div className="font-bold text-white">{multiHorizon.away.last_10.wins}W-{multiHorizon.away.last_10.draws}D-{multiHorizon.away.last_10.losses}L</div>
                  <div className="text-[10px] text-slate-400 font-mono">{multiHorizon.away.last_10.xg_scored_avg} xG/g</div>
                  <div className="text-[10px] text-slate-400 font-mono">{multiHorizon.away.last_10.shots_avg} shots</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60 flex justify-between">
                <span>BTTS Rate: {(multiHorizon.away.last_5.btts_rate * 100).toFixed(0)}%</span>
                <span>Over 2.5: {(multiHorizon.away.last_5.over25_rate * 100).toFixed(0)}%</span>
                <span>Clean Sheet: {(multiHorizon.away.last_5.clean_sheet_rate * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SQUAD INTELLIGENCE, INJURIES & COACH WELLBEING */}
      {activeTab === 'squad_injuries' && squad && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Home Squad & Coach */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <h4 className="font-bold text-sm text-white">{squad.home.team_name} Squad</h4>
                  <span className="text-[11px] text-slate-400">
                    Coach: <strong className="text-white">{squad.home.coach.name}</strong> ({squad.home.coach.tenure_months} mo)
                  </span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 block">
                    Morale: {squad.home.morale_score}/100
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Fitness: {squad.home.squad_fitness_pct}%</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 italic bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                "{squad.home.news_bulletin}"
              </p>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Player Absences &amp; Injuries ({squad.home.injuries.length}):
                </span>
                {squad.home.injuries.length === 0 ? (
                  <div className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                    ✓ Clean bill of health. Full senior squad fit and available.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {squad.home.injuries.map((inj, idx) => (
                      <div key={idx} className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white">{inj.player_name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-slate-300">{inj.position}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${inj.status === 'Out' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                              {inj.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">{inj.reason}</span>
                        </div>
                        <span className="text-[11px] font-mono text-rose-400">{(inj.impact_score * 100).toFixed(0)}% Impact</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Away Squad & Coach */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <h4 className="font-bold text-sm text-white">{squad.away.team_name} Squad</h4>
                  <span className="text-[11px] text-slate-400">
                    Coach: <strong className="text-white">{squad.away.coach.name}</strong> ({squad.away.coach.tenure_months} mo)
                  </span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 block">
                    Morale: {squad.away.morale_score}/100
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Fitness: {squad.away.squad_fitness_pct}%</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 italic bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                "{squad.away.news_bulletin}"
              </p>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Player Absences &amp; Injuries ({squad.away.injuries.length}):
                </span>
                {squad.away.injuries.length === 0 ? (
                  <div className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                    ✓ Clean bill of health. Full senior squad fit and available.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {squad.away.injuries.map((inj, idx) => (
                      <div key={idx} className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white">{inj.player_name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-slate-300">{inj.position}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${inj.status === 'Out' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                              {inj.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">{inj.reason}</span>
                        </div>
                        <span className="text-[11px] font-mono text-rose-400">{(inj.impact_score * 100).toFixed(0)}% Impact</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HISTORICAL HEAD-TO-HEAD RECORDS */}
      {activeTab === 'h2h' && h2h && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4.5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Total Encounters</span>
                <span className="text-lg font-bold text-white">{h2h.total_matches} Matches</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Head-to-Head Split</span>
                <span className="text-sm font-bold text-emerald-400">{home} {h2h.home_wins}</span>
                <span className="text-slate-500 mx-1">-</span>
                <span className="text-sm font-bold text-slate-300">{h2h.draws}D</span>
                <span className="text-slate-500 mx-1">-</span>
                <span className="text-sm font-bold text-cyan-400">{away} {h2h.away_wins}</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">H2H BTTS Rate</span>
                <span className="text-lg font-bold text-emerald-400">{(h2h.btts_rate * 100).toFixed(0)}%</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Average Goals / Game</span>
                <span className="text-lg font-bold text-amber-400">{h2h.avg_goals} Goals</span>
              </div>
            </div>

            {h2h.bogey_team_factor && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs text-amber-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{h2h.bogey_team_factor}</span>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Recent Direct Encounters:
              </span>
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-lg overflow-hidden text-xs">
                {h2h.recent_matches.map((m, idx) => (
                  <div key={idx} className="p-3 bg-slate-900/60 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-slate-400 text-[11px] font-mono">{m.date} • {m.competition}</span>
                      <div className="font-semibold text-white">
                        <span>{m.home}</span>
                        <span className="mx-2 text-slate-500 font-mono font-bold">{m.score}</span>
                        <span>{m.away}</span>
                      </div>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${m.outcome === 'home' ? 'bg-emerald-500/20 text-emerald-300' : m.outcome === 'away' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-300'}`}>
                        {m.outcome === 'home' ? `${m.home} Win` : m.outcome === 'away' ? `${m.away} Win` : 'Draw'}
                      </span>
                      <div className="text-[10px] text-slate-500">
                        BTTS: {m.btts ? 'Yes' : 'No'} | Goals: {m.total_goals}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PURE HOME VS AWAY SPLITS */}
      {activeTab === 'splits' && splits && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pure Home Side */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-sm text-white">{home} at Home</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                  {splits.home_team_at_home.ppg} PPG at Home
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Home Record</span>
                  <span className="font-bold text-white">{splits.home_team_at_home.wins}W - {splits.home_team_at_home.draws}D - {splits.home_team_at_home.losses}L</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Home Win Rate</span>
                  <span className="font-bold text-emerald-400">{splits.home_team_at_home.win_pct}%</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Home Goals / xG</span>
                  <span className="font-bold text-white">{splits.home_team_at_home.goals_scored_avg} sc ({splits.home_team_at_home.xg_avg} xG)</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Home Clean Sheet Rate</span>
                  <span className="font-bold text-cyan-400">{splits.home_team_at_home.clean_sheet_pct}%</span>
                </div>
              </div>
            </div>

            {/* Pure Away Side */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-sm text-white">{away} on the Road (Away)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300">
                  {splits.away_team_on_road.ppg} PPG Away
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Away Record</span>
                  <span className="font-bold text-white">{splits.away_team_on_road.wins}W - {splits.away_team_on_road.draws}D - {splits.away_team_on_road.losses}L</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Away Win Rate</span>
                  <span className="font-bold text-cyan-400">{splits.away_team_on_road.win_pct}%</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Away Goals / xG</span>
                  <span className="font-bold text-white">{splits.away_team_on_road.goals_scored_avg} sc ({splits.away_team_on_road.xg_avg} xG)</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Away Conceded Avg</span>
                  <span className="font-bold text-rose-400">{splits.away_team_on_road.goals_conceded_avg} conc/g</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: CALENDAR DAY, MATCHDAY & TOURNAMENT STANDINGS */}
      {activeTab === 'calendar_matchday' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Calendar Day Performance */}
            {calendar && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Calendar Date Performance
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-2">
                  <div className="flex justify-between items-center text-white">
                    <span>Fixture Timing:</span>
                    <span className="font-mono text-emerald-300 font-bold">{calendar.calendar_day} ({calendar.day_of_week})</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-white font-semibold block">{home} in {calendar.calendar_month}:</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{calendar.home_record.trend_description}</p>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-white font-semibold block">{away} in {calendar.calendar_month}:</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{calendar.away_record.trend_description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Matchday Context */}
            {matchday && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Matchday {matchday.matchday} Context
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 block text-center">
                    {matchday.season_stage}
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {matchday.stage_trend_description}
                  </p>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                    <span>Historical Win Rate at this stage:</span>
                    <span className="font-bold text-emerald-400">{matchday.home_matchday_win_rate}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tournament Standing */}
            {tournament && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {tournament.league_name} Standings
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-2">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                    <span className="text-white font-semibold">{home}</span>
                    <span className="font-mono text-emerald-300 font-bold">Rank #{tournament.home_standing.rank} ({tournament.home_standing.points} pts)</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                    <span className="text-white font-semibold">{away}</span>
                    <span className="font-mono text-cyan-300 font-bold">Rank #{tournament.away_standing.rank} ({tournament.away_standing.points} pts)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1 flex justify-between">
                    <span>Tournament Goal Avg: {tournament.league_avg_goals_per_game}/m</span>
                    <span>BTTS: {(tournament.league_btts_rate * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
