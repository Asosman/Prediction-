import React, { useState, useEffect } from 'react';
import { MultiHorizonForm, TeamWindowStats } from '../types';
import { extractPreMatchFeatures, computeMultiHorizonForm, normalizeTeamName } from '../ml/featureEngineering';
import { RAW_MATCH_RECORDS, ingestMatchRecord, resetDatasetToBaseline } from '../data/masterMatchDataset';
import {
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  PlusCircle,
  RotateCcw,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  Target,
  Flame,
  Award,
} from 'lucide-react';

interface MultiHorizonFormStudioProps {
  initialHomeTeam?: string;
  initialAwayTeam?: string;
  onDataUpdated?: () => void;
}

const TEAMS_LIST = [
  'Arsenal',
  'Chelsea',
  'Manchester City',
  'Liverpool',
  'Manchester United',
  'Tottenham',
  'Aston Villa',
  'Brentford',
  'Fulham',
  'Wolves',
  'Everton',
  'Real Madrid',
  'Barcelona',
  'Atletico Madrid',
  'Valencia',
  'Mallorca',
  'Bayern Munich',
  'Bayer Leverkusen',
  'Borussia Dortmund',
  'Inter Milan',
  'Juventus',
  'Celtic',
  'Rangers',
  'Ajax',
  'Feyenoord',
];

export const MultiHorizonFormStudio: React.FC<MultiHorizonFormStudioProps> = ({
  initialHomeTeam = 'Arsenal',
  initialAwayTeam = 'Chelsea',
  onDataUpdated,
}) => {
  const [selectedHome, setSelectedHome] = useState<string>(initialHomeTeam);
  const [selectedAway, setSelectedAway] = useState<string>(initialAwayTeam);
  const [selectedWindow, setSelectedWindow] = useState<'3' | '5' | '10'>('5');
  const [activeTab, setActiveTab] = useState<'comparison' | 'ingest' | 'weights'>('comparison');
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  // Ingestion form state
  const [ingestHome, setIngestHome] = useState<string>('Arsenal');
  const [ingestAway, setIngestAway] = useState<string>('Chelsea');
  const [ingestHomeGoals, setIngestHomeGoals] = useState<number>(3);
  const [ingestAwayGoals, setIngestAwayGoals] = useState<number>(1);
  const [ingestHomeXg, setIngestHomeXg] = useState<number>(2.45);
  const [ingestAwayXg, setIngestAwayXg] = useState<number>(0.85);
  const [ingestHomeShots, setIngestHomeShots] = useState<number>(16);
  const [ingestAwayShots, setIngestAwayShots] = useState<number>(9);
  const [ingestHomeSot, setIngestHomeSot] = useState<number>(7);
  const [ingestAwaySot, setIngestAwaySot] = useState<number>(3);
  const [ingestLeague, setIngestLeague] = useState<string>('Premier League');
  const [ingestDate, setIngestDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Dynamic state trigger
  const [dataVersion, setDataVersion] = useState<number>(0);

  // Compute live multi-horizon form profiles
  const homeHistory = RAW_MATCH_RECORDS.filter(
    (m) =>
      m.is_played &&
      (normalizeTeamName(m.home_team) === normalizeTeamName(selectedHome) ||
        normalizeTeamName(m.away_team) === normalizeTeamName(selectedHome))
  );

  const awayHistory = RAW_MATCH_RECORDS.filter(
    (m) =>
      m.is_played &&
      (normalizeTeamName(m.home_team) === normalizeTeamName(selectedAway) ||
        normalizeTeamName(m.away_team) === normalizeTeamName(selectedAway))
  );

  const homeForm: MultiHorizonForm = computeMultiHorizonForm(selectedHome, homeHistory);
  const awayForm: MultiHorizonForm = computeMultiHorizonForm(selectedAway, awayHistory);

  const getWindowStats = (form: MultiHorizonForm, window: '3' | '5' | '10'): TeamWindowStats => {
    if (window === '3') return form.last_3;
    if (window === '10') return form.last_10;
    return form.last_5;
  };

  const homeStats = getWindowStats(homeForm, selectedWindow);
  const awayStats = getWindowStats(awayForm, selectedWindow);

  // Handle Match Ingestion
  const handleIngestMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = ingestMatchRecord({
        home_team: ingestHome,
        away_team: ingestAway,
        date: ingestDate,
        league_name: ingestLeague,
        home_goals: Number(ingestHomeGoals),
        away_goals: Number(ingestAwayGoals),
        home_xg: Number(ingestHomeXg),
        away_xg: Number(ingestAwayXg),
        home_shots: Number(ingestHomeShots),
        away_shots: Number(ingestAwayShots),
        home_shots_on_target: Number(ingestHomeSot),
        away_shots_on_target: Number(ingestAwaySot),
      });

      setDataVersion((v) => v + 1);
      setIngestStatus(
        `✓ Ingested match ${ingestHome} ${ingestHomeGoals} - ${ingestAwayGoals} ${ingestAway}. Elo: ${ingestHome} (${result.elo_update.elo_change_home > 0 ? '+' : ''}${result.elo_update.elo_change_home} pts). L3/L5/L10 rolling stats updated!`
      );
      if (onDataUpdated) onDataUpdated();
    } catch (err: any) {
      setIngestStatus(`Error: ${err.message}`);
    }
  };

  const handleResetDataset = () => {
    resetDatasetToBaseline();
    setDataVersion((v) => v + 1);
    setIngestStatus('✓ Dataset and Elo ratings restored to original baseline.');
    if (onDataUpdated) onDataUpdated();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Flame className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Multi-Horizon Form Performance Engine
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Last 3 Matches (Acute Momentum) • Last 5 Matches (Medium Form) • Last 10 Matches (Baseline Anchor)
                </p>
              </div>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
                activeTab === 'comparison'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Multi-Window Breakdown</span>
            </button>
            <button
              onClick={() => setActiveTab('ingest')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
                activeTab === 'ingest'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Ingest / Record Match</span>
            </button>
          </div>
        </div>

        {/* Global Ingestion Feedback Banner */}
        {ingestStatus && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{ingestStatus}</span>
            </div>
            <button
              onClick={() => setIngestStatus(null)}
              className="text-slate-400 hover:text-white text-[11px] font-mono ml-3"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {activeTab === 'comparison' && (
        <div className="space-y-6">
          {/* Matchup & Horizon Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Home Team
              </label>
              <select
                value={selectedHome}
                onChange={(e) => setSelectedHome(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                {TEAMS_LIST.map((t) => (
                  <option key={`home-${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Away Team
              </label>
              <select
                value={selectedAway}
                onChange={(e) => setSelectedAway(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                {TEAMS_LIST.map((t) => (
                  <option key={`away-${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Active Horizon Window
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setSelectedWindow('3')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    selectedWindow === '3'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ Last 3 (Acute)
                </button>
                <button
                  onClick={() => setSelectedWindow('5')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    selectedWindow === '5'
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📊 Last 5 (Std)
                </button>
                <button
                  onClick={() => setSelectedWindow('10')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    selectedWindow === '10'
                      ? 'bg-indigo-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⚓ Last 10 (Base)
                </button>
              </div>
            </div>
          </div>

          {/* Acute Momentum Trajectory Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Home Momentum Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <h3 className="font-bold text-white text-base">{selectedHome} Form Trajectory</h3>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    homeForm.form_trend === 'surge'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : homeForm.form_trend === 'decline'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {homeForm.form_trend === 'surge' && '🔥 Acute Form Surge'}
                  {homeForm.form_trend === 'decline' && '❄️ Cold Spell Dip'}
                  {homeForm.form_trend === 'stable' && '⚖️ Stable Equilibrium'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">xG Surge (L3 vs L10)</div>
                  <div
                    className={`text-base font-extrabold font-mono mt-1 ${
                      homeForm.momentum_xg_diff > 0
                        ? 'text-emerald-400'
                        : homeForm.momentum_xg_diff < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {homeForm.momentum_xg_diff > 0 ? '+' : ''}
                    {homeForm.momentum_xg_diff.toFixed(2)} /90
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Defensive Tightening</div>
                  <div
                    className={`text-base font-extrabold font-mono mt-1 ${
                      homeForm.momentum_defense_diff > 0
                        ? 'text-emerald-400'
                        : homeForm.momentum_defense_diff < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {homeForm.momentum_defense_diff > 0 ? '+' : ''}
                    {homeForm.momentum_defense_diff.toFixed(2)} xGA
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">PPG Acceleration</div>
                  <div
                    className={`text-base font-extrabold font-mono mt-1 ${
                      homeForm.momentum_points_diff > 0
                        ? 'text-emerald-400'
                        : homeForm.momentum_points_diff < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {homeForm.momentum_points_diff > 0 ? '+' : ''}
                    {homeForm.momentum_points_diff.toFixed(2)} pts
                  </div>
                </div>
              </div>
            </div>

            {/* Away Momentum Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                  <h3 className="font-bold text-white text-base">{selectedAway} Form Trajectory</h3>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    awayForm.form_trend === 'surge'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : awayForm.form_trend === 'decline'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {awayForm.form_trend === 'surge' && '🔥 Acute Form Surge'}
                  {awayForm.form_trend === 'decline' && '❄️ Cold Spell Dip'}
                  {awayForm.form_trend === 'stable' && '⚖️ Stable Equilibrium'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">xG Surge (L3 vs L10)</div>
                  <div
                    className={`text-base font-extrabold font-mono mt-1 ${
                      awayForm.momentum_xg_diff > 0
                        ? 'text-emerald-400'
                        : awayForm.momentum_xg_diff < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {awayForm.momentum_xg_diff > 0 ? '+' : ''}
                    {awayForm.momentum_xg_diff.toFixed(2)} /90
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Defensive Tightening</div>
                  <div
                    className={`text-base font-extrabold font-mono mt-1 ${
                      awayForm.momentum_defense_diff > 0
                        ? 'text-emerald-400'
                        : awayForm.momentum_defense_diff < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {awayForm.momentum_defense_diff > 0 ? '+' : ''}
                    {awayForm.momentum_defense_diff.toFixed(2)} xGA
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">PPG Acceleration</div>
                  <div
                    className={`text-base font-extrabold font-mono mt-1 ${
                      awayForm.momentum_points_diff > 0
                        ? 'text-emerald-400'
                        : awayForm.momentum_points_diff < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {awayForm.momentum_points_diff > 0 ? '+' : ''}
                    {awayForm.momentum_points_diff.toFixed(2)} pts
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comparative Horizon Metrics Table (Last N matches) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div>
                <h3 className="font-bold text-white text-base">
                  Head-to-Head Rolling Statistical Comparison ({`Last ${selectedWindow} Matches`})
                </h3>
                <p className="text-xs text-slate-400">
                  Calculated strictly before target kickoff. Zero leakage applied.
                </p>
              </div>
              <div className="flex items-center space-x-3 text-xs font-mono">
                <span className="text-emerald-400 font-bold">{selectedHome}</span>
                <span className="text-slate-600">vs</span>
                <span className="text-indigo-400 font-bold">{selectedAway}</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Metric 1: Record & PPG */}
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/60">
                <div className="w-1/3 text-emerald-400 font-bold font-mono">
                  {homeStats.wins}W - {homeStats.draws}D - {homeStats.losses}L ({homeStats.points} pts /{' '}
                  {homeStats.points_per_game} PPG)
                </div>
                <div className="w-1/3 text-center text-slate-400 font-semibold uppercase text-[11px]">
                  Record &amp; Points
                </div>
                <div className="w-1/3 text-right text-indigo-400 font-bold font-mono">
                  {awayStats.wins}W - {awayStats.draws}D - {awayStats.losses}L ({awayStats.points} pts /{' '}
                  {awayStats.points_per_game} PPG)
                </div>
              </div>

              {/* Metric 2: Goals Scored / Conceded */}
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/60">
                <div className="w-1/3 text-white font-mono font-bold">
                  {homeStats.goals_scored_avg} scored / {homeStats.goals_conceded_avg} conceded
                </div>
                <div className="w-1/3 text-center text-slate-400 font-semibold uppercase text-[11px]">
                  Avg Goals per Match
                </div>
                <div className="w-1/3 text-right text-white font-mono font-bold">
                  {awayStats.goals_scored_avg} scored / {awayStats.goals_conceded_avg} conceded
                </div>
              </div>

              {/* Metric 3: xG & xGA */}
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/60">
                <div className="w-1/3 text-emerald-400 font-mono font-bold">
                  {homeStats.xg_scored_avg} xG / {homeStats.xga_conceded_avg} xGA
                </div>
                <div className="w-1/3 text-center text-slate-400 font-semibold uppercase text-[11px]">
                  Expected Goals (xG / xGA)
                </div>
                <div className="w-1/3 text-right text-indigo-400 font-mono font-bold">
                  {awayStats.xg_scored_avg} xG / {awayStats.xga_conceded_avg} xGA
                </div>
              </div>

              {/* Metric 4: Shots & SoT */}
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/60">
                <div className="w-1/3 text-white font-mono font-bold">
                  {homeStats.shots_avg} shots ({homeStats.sot_avg} on target)
                </div>
                <div className="w-1/3 text-center text-slate-400 font-semibold uppercase text-[11px]">
                  Total Shots / Target
                </div>
                <div className="w-1/3 text-right text-white font-mono font-bold">
                  {awayStats.shots_avg} shots ({awayStats.sot_avg} on target)
                </div>
              </div>

              {/* Metric 5: BTTS & Over 2.5 Hit Rate */}
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/60">
                <div className="w-1/3 text-amber-400 font-mono font-bold">
                  BTTS: {Math.round(homeStats.btts_rate * 100)}% | &gt;2.5: {Math.round(homeStats.over25_rate * 100)}%
                </div>
                <div className="w-1/3 text-center text-slate-400 font-semibold uppercase text-[11px]">
                  Historical Target Hit Rates
                </div>
                <div className="w-1/3 text-right text-amber-400 font-mono font-bold">
                  BTTS: {Math.round(awayStats.btts_rate * 100)}% | &gt;2.5: {Math.round(awayStats.over25_rate * 100)}%
                </div>
              </div>

              {/* Metric 6: Clean Sheet Rate */}
              <div className="flex items-center justify-between text-xs py-2">
                <div className="w-1/3 text-teal-400 font-mono font-bold">
                  {Math.round(homeStats.clean_sheet_rate * 100)}% clean sheets
                </div>
                <div className="w-1/3 text-center text-slate-400 font-semibold uppercase text-[11px]">
                  Clean Sheets
                </div>
                <div className="w-1/3 text-right text-teal-400 font-mono font-bold">
                  {Math.round(awayStats.clean_sheet_rate * 100)}% clean sheets
                </div>
              </div>
            </div>
          </div>

          {/* Match-by-Match Breakdown (Last 10 Games for Both Teams) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Home Team Match Log */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-sm">{selectedHome}</span>
                  <span className="text-xs text-slate-400">Match Log (Last 10)</span>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {homeForm.last_10.matches.length} matches recorded
                </span>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {homeForm.last_10.matches.map((m, idx) => (
                  <div
                    key={`home-log-${m.match_id}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`w-6 h-6 rounded-md font-bold text-[11px] flex items-center justify-center shrink-0 ${
                          m.outcome === 'W'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : m.outcome === 'L'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        {m.outcome}
                      </span>
                      <div>
                        <div className="font-bold text-white flex items-center space-x-1.5">
                          <span>{m.is_home ? 'vs' : '@'}</span>
                          <span>{m.opponent}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{m.date}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-extrabold font-mono text-sm text-white">
                        {m.goals_for} - {m.goals_against}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {m.xg_for !== undefined ? `${m.xg_for.toFixed(1)} xG` : ''}
                        {m.shots_for !== undefined ? ` • ${m.shots_for} sh` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Away Team Match Log */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-sm">{selectedAway}</span>
                  <span className="text-xs text-slate-400">Match Log (Last 10)</span>
                </div>
                <span className="text-xs font-mono text-indigo-400 font-bold">
                  {awayForm.last_10.matches.length} matches recorded
                </span>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {awayForm.last_10.matches.map((m, idx) => (
                  <div
                    key={`away-log-${m.match_id}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`w-6 h-6 rounded-md font-bold text-[11px] flex items-center justify-center shrink-0 ${
                          m.outcome === 'W'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : m.outcome === 'L'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        {m.outcome}
                      </span>
                      <div>
                        <div className="font-bold text-white flex items-center space-x-1.5">
                          <span>{m.is_home ? 'vs' : '@'}</span>
                          <span>{m.opponent}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{m.date}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-extrabold font-mono text-sm text-white">
                        {m.goals_for} - {m.goals_against}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {m.xg_for !== undefined ? `${m.xg_for.toFixed(1)} xG` : ''}
                        {m.shots_for !== undefined ? ` • ${m.shots_for} sh` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INGESTION & AUTO-UPDATE TAB */}
      {activeTab === 'ingest' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <span>Ingest Live / Completed Match Result</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Appends the new match into the active Data Lake, updates Elo ratings, and recalculates 3, 5, and 10 match form horizons in real-time.
              </p>
            </div>
            <button
              onClick={handleResetDataset}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Data Lake</span>
            </button>
          </div>

          <form onSubmit={handleIngestMatch} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Home Team */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Home Team</label>
                <input
                  type="text"
                  value={ingestHome}
                  onChange={(e) => setIngestHome(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Away Team */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Away Team</label>
                <input
                  type="text"
                  value={ingestAway}
                  onChange={(e) => setIngestAway(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Match Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Match Date</label>
                <input
                  type="date"
                  value={ingestDate}
                  onChange={(e) => setIngestDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* League */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">League / Competition</label>
                <input
                  type="text"
                  value={ingestLeague}
                  onChange={(e) => setIngestLeague(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Scoreline & Granular Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Home Goals</label>
                <input
                  type="number"
                  min="0"
                  value={ingestHomeGoals}
                  onChange={(e) => setIngestHomeGoals(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Away Goals</label>
                <input
                  type="number"
                  min="0"
                  value={ingestAwayGoals}
                  onChange={(e) => setIngestAwayGoals(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Home xG</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ingestHomeXg}
                  onChange={(e) => setIngestHomeXg(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Away xG</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ingestAwayXg}
                  onChange={(e) => setIngestAwayXg(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Home Shots</label>
                <input
                  type="number"
                  min="0"
                  value={ingestHomeShots}
                  onChange={(e) => setIngestHomeShots(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Away Shots</label>
                <input
                  type="number"
                  min="0"
                  value={ingestAwayShots}
                  onChange={(e) => setIngestAwayShots(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono"
                />
              </div>
            </div>

            {/* Quick Test Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs text-slate-400 font-semibold">Quick Presets:</span>
              <button
                type="button"
                onClick={() => {
                  setIngestHome('Arsenal');
                  setIngestAway('Chelsea');
                  setIngestHomeGoals(3);
                  setIngestAwayGoals(1);
                  setIngestHomeXg(2.55);
                  setIngestAwayXg(0.8);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200"
              >
                Arsenal 3 - 1 Chelsea
              </button>
              <button
                type="button"
                onClick={() => {
                  setIngestHome('Liverpool');
                  setIngestAway('Everton');
                  setIngestHomeGoals(4);
                  setIngestAwayGoals(0);
                  setIngestHomeXg(3.12);
                  setIngestAwayXg(0.35);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200"
              >
                Liverpool 4 - 0 Everton
              </button>
              <button
                type="button"
                onClick={() => {
                  setIngestHome('Real Madrid');
                  setIngestAway('Barcelona');
                  setIngestHomeGoals(2);
                  setIngestAwayGoals(2);
                  setIngestHomeXg(1.85);
                  setIngestAwayXg(1.92);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200"
              >
                Real Madrid 2 - 2 Barcelona
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>Ingest Match &amp; Auto-Update Model</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
