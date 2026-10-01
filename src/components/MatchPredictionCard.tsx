import React, { useState } from 'react';
import {
  MultiTargetPrediction,
  PreMatchFeatures,
} from '../types';
import { DataDriftWarningBadge } from './DataDriftWarningBadge';
import { MatchForensicReasoning } from './MatchForensicReasoning';
import { SquadIntelligenceModal } from './SquadIntelligenceModal';
import { evaluateModelDataDrift } from '../ml/dataDriftDetector';
import {
  ShieldCheck,
  Zap,
  Target,
  BarChart2,
  Layers,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Sliders,
  Info,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

interface MatchPredictionCardProps {
  prediction: MultiTargetPrediction;
  features?: PreMatchFeatures;
}

export const MatchPredictionCard: React.FC<MatchPredictionCardProps> = ({
  prediction,
  features,
}) => {
  const [selectedShotLine, setSelectedShotLine] = useState<number>(24.5);
  const [customShotLine, setCustomShotLine] = useState<string>('23.5');
  const [formWindow, setFormWindow] = useState<'3' | '5' | '10'>('5');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [squadModalOpen, setSquadModalOpen] = useState<boolean>(false);

  // Evaluate data drift vs historical benchmark means
  const driftReport = evaluateModelDataDrift(prediction, features);

  // Helper for percentage formatting
  const pct = (val: number) => (val * 100).toFixed(1);

  // Calculate dynamic custom shot line probability using normal CDF approx
  const calculateCustomShotProb = (lineVal: number) => {
    const mean = prediction.shots.expected_total;
    const std = 4.8;
    const z = (lineVal - mean) / std;
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (z > 0) p = 1.0 - p;
    return {
      over: Number((1 - p).toFixed(3)),
      under: Number(p.toFixed(3)),
    };
  };

  const handleRequestAiExplanation = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/explain-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prediction, features }),
      });
      const data = await res.json();
      if (data.ai_explanation) {
        setAiAnalysis(data.ai_explanation);
      } else if (data.summary) {
        setAiAnalysis({ summary: data.summary, tacticalKey: data.tacticalKey });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const customNum = parseFloat(customShotLine) || 24.5;
  const customProb = calculateCustomShotProb(customNum);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-6 p-6">
      {/* Top Header & Teams */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">
              {prediction.match.league}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400 font-mono">{prediction.match.date}</span>
          </div>
          <h2 className="text-2xl font-black text-white font-sans flex items-center gap-3">
            <span>{prediction.match.home}</span>
            <span className="text-slate-500 text-lg font-light">vs</span>
            <span>{prediction.match.away}</span>
          </h2>
        </div>

        {/* Quality Tier & Model Badge */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Data Quality:</span>
            <span
              className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                prediction.data_tier === 'Tier A'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : prediction.data_tier === 'Tier B'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {prediction.data_tier}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-400">Model:</span>
            <span className="font-mono text-indigo-400 font-bold">{prediction.model_info.active_version}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Completeness: {prediction.feature_completeness}%</span>
          </div>

          {/* Model Confidence Drift Indicator */}
          <DataDriftWarningBadge report={driftReport} />

          {/* Squad & Injuries Hub Button */}
          <button
            type="button"
            onClick={() => setSquadModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-xs text-amber-300 font-semibold transition cursor-pointer"
            title="Inspect player injuries, coach status, and squad well-being"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Injuries &amp; Squad Hub</span>
          </button>
        </div>
      </div>

      {/* Target Grid (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* TARGET 1: BTTS / GG */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4.5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                1. BTTS / GG
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Calibrated (Platt)</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div
              className={`p-3 rounded-lg border transition ${
                prediction.btts.yes >= 0.55
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <div className="text-[11px] text-slate-400 uppercase font-medium">YES (GG)</div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                {pct(prediction.btts.yes)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Fair: {(1 / prediction.btts.yes).toFixed(2)}
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border transition ${
                prediction.btts.no > 0.55
                  ? 'bg-indigo-500/10 border-indigo-500/40 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <div className="text-[11px] text-slate-400 uppercase font-medium">NO (NG)</div>
              <div className="text-2xl font-black text-slate-200 font-mono mt-0.5">
                {pct(prediction.btts.no)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Fair: {(1 / prediction.btts.no).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Probability Progress Bar */}
          <div className="space-y-1">
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
              <div
                style={{ width: `${prediction.btts.yes * 100}%` }}
                className="bg-emerald-500 h-full"
              />
              <div
                style={{ width: `${prediction.btts.no * 100}%` }}
                className="bg-slate-700 h-full"
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>YES {pct(prediction.btts.yes)}%</span>
              <span>NO {pct(prediction.btts.no)}%</span>
            </div>
          </div>
        </div>

        {/* TARGET 2: Over / Under 2.5 Total Goals */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4.5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                2. Over / Under 2.5
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">
              xG Total: {prediction.expected_goals.total}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div
              className={`p-3 rounded-lg border transition ${
                prediction.over_2_5.over >= 0.55
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <div className="text-[11px] text-slate-400 uppercase font-medium">OVER 2.5</div>
              <div className="text-2xl font-black text-cyan-400 font-mono mt-0.5">
                {pct(prediction.over_2_5.over)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Fair: {(1 / prediction.over_2_5.over).toFixed(2)}
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border transition ${
                prediction.over_2_5.under > 0.55
                  ? 'bg-indigo-500/10 border-indigo-500/40 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <div className="text-[11px] text-slate-400 uppercase font-medium">UNDER 2.5</div>
              <div className="text-2xl font-black text-slate-200 font-mono mt-0.5">
                {pct(prediction.over_2_5.under)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Fair: {(1 / prediction.over_2_5.under).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Goal parameters breakdown */}
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded">
            <span>&lambda; (Home): {prediction.expected_goals.lambda_home}</span>
            <span>&mu; (Away): {prediction.expected_goals.mu_away}</span>
          </div>
        </div>

        {/* TARGET 3: 1X2 Match Outcome */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4.5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                3. 1X2 Match Outcome
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Sum = 100%</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 truncate uppercase">1 (Home)</div>
              <div className="text-lg font-black text-white font-mono mt-0.5">
                {pct(prediction.result.home)}%
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5 font-mono">
                {(1 / prediction.result.home).toFixed(2)}
              </div>
            </div>

            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 truncate uppercase">X (Draw)</div>
              <div className="text-lg font-black text-slate-300 font-mono mt-0.5">
                {pct(prediction.result.draw)}%
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5 font-mono">
                {(1 / prediction.result.draw).toFixed(2)}
              </div>
            </div>

            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 truncate uppercase">2 (Away)</div>
              <div className="text-lg font-black text-white font-mono mt-0.5">
                {pct(prediction.result.away)}%
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5 font-mono">
                {(1 / prediction.result.away).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Expected Points */}
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded">
            <span>xPoints (H): {prediction.result.expected_points_home}</span>
            <span>xPoints (A): {prediction.result.expected_points_away}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Target 4 (Double Chance), Target 5 (Total Shots), Target 6 (Combinations) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* TARGET 4: Double Chance */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4.5 space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-800/60 pb-2">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              4. Double Chance
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">1X</span>
              <span className="text-base font-black text-emerald-400 font-mono mt-1 block">
                {pct(prediction.double_chance.dc_1x)}%
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                {(1 / prediction.double_chance.dc_1x).toFixed(2)}
              </span>
            </div>

            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">X2</span>
              <span className="text-base font-black text-cyan-400 font-mono mt-1 block">
                {pct(prediction.double_chance.dc_x2)}%
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                {(1 / prediction.double_chance.dc_x2).toFixed(2)}
              </span>
            </div>

            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">12</span>
              <span className="text-base font-black text-indigo-400 font-mono mt-1 block">
                {pct(prediction.double_chance.dc_12)}%
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                {(1 / prediction.double_chance.dc_12).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* TARGET 5: Total Shots (Regression & Configurable Lines) */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4.5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                5. Total Shots
              </span>
            </div>
            <div className="text-xs font-mono font-bold text-emerald-400">
              Exp: {prediction.shots.expected_total}
            </div>
          </div>

          <div className="space-y-2">
            {/* Quick shot lines pills */}
            <div className="flex flex-wrap gap-1">
              {[18.5, 20.5, 22.5, 24.5, 25.5, 26.5, 28.5, 30.5].map((line) => {
                const isSel = selectedShotLine === line;
                return (
                  <button
                    key={line}
                    onClick={() => setSelectedShotLine(line)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                      isSel
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    O/U {line}
                  </button>
                );
              })}
            </div>

            {/* Display selected line probability */}
            {prediction.shots.lines[selectedShotLine.toString()] && (
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-[10px]">Line {selectedShotLine}:</span>
                  <div className="font-bold text-white">
                    OVER {pct(prediction.shots.lines[selectedShotLine.toString()].over)}%
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px]">Fair Odds:</span>
                  <div className="font-mono text-emerald-400">
                    {(1 / prediction.shots.lines[selectedShotLine.toString()].over).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TARGET 6: Combinations (True Joint Bivariate Modeling) */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4.5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                6. Combinations (Joint Model)
              </span>
            </div>
            <span className="text-[9px] text-slate-500 font-mono">No Blind Multipl.</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400">BTTS + Over 2.5</div>
              <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                {pct(prediction.combinations.btts_and_over_2_5)}%
              </div>
            </div>

            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400">BTTS + Under 2.5</div>
              <div className="text-sm font-black text-slate-300 font-mono mt-0.5">
                {pct(prediction.combinations.btts_and_under_2_5)}%
              </div>
            </div>

            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400">No BTTS + Over 2.5</div>
              <div className="text-sm font-black text-slate-300 font-mono mt-0.5">
                {pct(prediction.combinations.no_btts_and_over_2_5)}%
              </div>
            </div>

            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400">No BTTS + Under 2.5</div>
              <div className="text-sm font-black text-slate-300 font-mono mt-0.5">
                {pct(prediction.combinations.no_btts_and_under_2_5)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MULTI-HORIZON ROLLING FORM ENGINE (LAST 3 • LAST 5 • LAST 10 MATCHES) */}
      {features && (
        <div className="bg-slate-950/90 rounded-xl p-5 border border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Rolling Form Horizon Analysis (Last {formWindow} Matches)
                </h4>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Multi-window rolling performance model (L3: 45% Acute Momentum • L5: 35% Medium Form • L10: 20% Baseline Anchor)
              </p>
            </div>

            {/* Horizon Window Selector Tabs */}
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setFormWindow('3')}
                className={`px-2.5 py-1 rounded font-mono font-bold text-[11px] transition cursor-pointer ${
                  formWindow === '3'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ Last 3 (Momentum)
              </button>
              <button
                onClick={() => setFormWindow('5')}
                className={`px-2.5 py-1 rounded font-mono font-bold text-[11px] transition cursor-pointer ${
                  formWindow === '5'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📊 Last 5 (Standard)
              </button>
              <button
                onClick={() => setFormWindow('10')}
                className={`px-2.5 py-1 rounded font-mono font-bold text-[11px] transition cursor-pointer ${
                  formWindow === '10'
                    ? 'bg-indigo-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚓ Last 10 (Baseline)
              </button>
            </div>
          </div>

          {/* Comparative Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Home Team Form */}
            <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{prediction.match.home}</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                  {formWindow === '3'
                    ? `${features.home_form_multi.last_3.wins}W-${features.home_form_multi.last_3.draws}D-${features.home_form_multi.last_3.losses}L (${features.home_form_multi.last_3.points_per_game} PPG)`
                    : formWindow === '10'
                    ? `${features.home_form_multi.last_10.wins}W-${features.home_form_multi.last_10.draws}D-${features.home_form_multi.last_10.losses}L (${features.home_form_multi.last_10.points_per_game} PPG)`
                    : `${features.home_form_multi.last_5.wins}W-${features.home_form_multi.last_5.draws}D-${features.home_form_multi.last_5.losses}L (${features.home_form_multi.last_5.points_per_game} PPG)`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                  <div className="text-[9px] text-slate-400 uppercase">Avg Goals</div>
                  <div className="font-mono font-bold text-white mt-0.5">
                    {formWindow === '3'
                      ? features.home_last_3_goals_scored_avg.toFixed(2)
                      : formWindow === '10'
                      ? features.home_last_10_goals_scored_avg.toFixed(2)
                      : features.home_last_5_goals_scored_avg.toFixed(2)}
                  </div>
                  <div className="text-[8px] text-slate-500">
                    Conc:{' '}
                    {formWindow === '3'
                      ? features.home_last_3_goals_conceded_avg.toFixed(2)
                      : formWindow === '10'
                      ? features.home_last_10_goals_conceded_avg.toFixed(2)
                      : features.home_last_5_goals_conceded_avg.toFixed(2)}
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                  <div className="text-[9px] text-slate-400 uppercase">xG / 90</div>
                  <div className="font-mono font-bold text-emerald-400 mt-0.5">
                    {formWindow === '3'
                      ? features.home_last_3_xg_avg.toFixed(2)
                      : formWindow === '10'
                      ? features.home_last_10_xg_avg.toFixed(2)
                      : features.home_last_5_xg_avg.toFixed(2)}
                  </div>
                  <div className="text-[8px] text-slate-500">
                    xGA:{' '}
                    {formWindow === '3'
                      ? features.home_last_3_xga_avg.toFixed(2)
                      : formWindow === '10'
                      ? features.home_last_10_xga_avg.toFixed(2)
                      : features.home_last_5_xga_avg.toFixed(2)}
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                  <div className="text-[9px] text-slate-400 uppercase">Shots / 90</div>
                  <div className="font-mono font-bold text-cyan-400 mt-0.5">
                    {formWindow === '3'
                      ? features.home_last_3_shots_avg.toFixed(1)
                      : formWindow === '10'
                      ? features.home_last_10_shots_avg.toFixed(1)
                      : features.home_last_5_shots_avg.toFixed(1)}
                  </div>
                  <div className="text-[8px] text-slate-500">
                    SoT: {features.home_last_5_sot_avg.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>

            {/* Away Team Form */}
            <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>{prediction.match.away}</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                  {formWindow === '3'
                    ? `${features.away_form_multi.last_3.wins}W-${features.away_form_multi.last_3.draws}D-${features.away_form_multi.last_3.losses}L (${features.away_form_multi.last_3.points_per_game} PPG)`
                    : formWindow === '10'
                    ? `${features.away_form_multi.last_10.wins}W-${features.away_form_multi.last_10.draws}D-${features.away_form_multi.last_10.losses}L (${features.away_form_multi.last_10.points_per_game} PPG)`
                    : `${features.away_form_multi.last_5.wins}W-${features.away_form_multi.last_5.draws}D-${features.away_form_multi.last_5.losses}L (${features.away_form_multi.last_5.points_per_game} PPG)`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                  <div className="text-[9px] text-slate-400 uppercase">Avg Goals</div>
                  <div className="font-mono font-bold text-white mt-0.5">
                    {formWindow === '3'
                      ? features.away_last_3_goals_scored_avg.toFixed(2)
                      : formWindow === '10'
                      ? features.away_last_10_goals_scored_avg.toFixed(2)
                      : features.away_last_5_goals_scored_avg.toFixed(2)}
                  </div>
                  <div className="text-[8px] text-slate-500">
                    Conc:{' '}
                    {formWindow === '3'
                      ? features.away_last_3_goals_conceded_avg.toFixed(2)
                      : formWindow === '10'
                      ? features.away_last_10_goals_conceded_avg.toFixed(2)
                      : features.away_last_5_goals_conceded_avg.toFixed(2)}
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                  <div className="text-[9px] text-slate-400 uppercase">xG / 90</div>
                  <div className="font-mono font-bold text-indigo-400 mt-0.5">
                    {formWindow === '3'
                      ? features.away_last_3_xg_avg.toFixed(2)
                      : formWindow === '10'
                      ? features.away_last_10_xg_avg.toFixed(2)
                      : features.away_last_5_xg_avg.toFixed(2)}
                  </div>
                  <div className="text-[8px] text-slate-500">
                    xGA:{' '}
                    {formWindow === '3'
                      ? features.away_last_3_xga_avg.toFixed(2)
                      : formWindow === '10'
                      ? features.away_last_10_xga_avg.toFixed(2)
                      : features.away_last_5_xga_avg.toFixed(2)}
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                  <div className="text-[9px] text-slate-400 uppercase">Shots / 90</div>
                  <div className="font-mono font-bold text-cyan-400 mt-0.5">
                    {formWindow === '3'
                      ? features.away_last_3_shots_avg.toFixed(1)
                      : formWindow === '10'
                      ? features.away_last_10_shots_avg.toFixed(1)
                      : features.away_last_5_shots_avg.toFixed(1)}
                  </div>
                  <div className="text-[8px] text-slate-500">
                    SoT: {features.away_last_5_sot_avg.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Contributions & Explainability Waterfall */}
      <div className="bg-slate-950/90 rounded-xl p-4.5 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Top Feature Contributions (SHAP-Style Attribution)
            </h4>
          </div>
          <span className="text-[10px] text-slate-500">Model Feature Impact</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {prediction.feature_contributions.map((fc, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px] truncate">{fc.label}</span>
                <span
                  className={`font-mono font-bold text-[10px] ${
                    fc.contribution > 0
                      ? 'text-emerald-400'
                      : fc.contribution < 0
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {fc.contribution > 0 ? `+${fc.contribution}` : fc.contribution}
                </span>
              </div>
              <div className="text-white font-mono text-[11px] mt-1">{fc.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Deep Forensic Prediction Reasoning Hub (Shots, GG, O2.5, DC, 1X2, L3/L5/L10, H2H, Calendar, Matchday, Splits) */}
      <MatchForensicReasoning prediction={prediction} features={features} />

      {/* Squad Intelligence & Injury Simulation Modal */}
      <SquadIntelligenceModal
        isOpen={squadModalOpen}
        onClose={() => setSquadModalOpen(false)}
        homeTeam={prediction.match.home}
        awayTeam={prediction.match.away}
      />

      {/* Optional AI Tactical Explanation Assist */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/30 rounded-xl p-4 border border-indigo-500/20 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-200">
              AI Natural-Language Tactical Explainer (Optional)
            </span>
          </div>
          <button
            onClick={handleRequestAiExplanation}
            disabled={aiLoading}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{aiAnalysis ? 'Refresh NL Analysis' : 'Generate NL Analysis'}</span>
          </button>
        </div>

        {aiAnalysis && (
          <div className="p-3.5 rounded-lg bg-slate-950 border border-indigo-500/30 text-xs space-y-2">
            <p className="text-slate-200 font-medium leading-relaxed">{aiAnalysis.summary}</p>
            {aiAnalysis.tacticalKey && (
              <p className="text-indigo-300 text-[11px] border-t border-slate-800 pt-1.5">
                <strong>Tactical Edge:</strong> {aiAnalysis.tacticalKey}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
