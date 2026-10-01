import React, { useState, useEffect } from 'react';
import { MultiTargetPrediction, EspnMatchOfTheDay } from '../types';
import { extractPreMatchFeatures } from '../ml/featureEngineering';
import { generateMultiTargetPrediction } from '../ml/predictionEngine';
import { detectTeamLeague } from '../ml/teamProfiles';
import { MatchPredictionCard } from './MatchPredictionCard';
import {
  Layers,
  Download,
  FileSpreadsheet,
  FileCode,
  Play,
  CheckCircle2,
  Trash2,
  Sparkles,
  ExternalLink,
  X,
  Target,
} from 'lucide-react';

const DEFAULT_BATCH_FIXTURES = [
  { home: 'Arsenal', away: 'Chelsea', league: 'Premier League', date: '2026-09-20' },
  { home: 'Liverpool', away: 'Everton', league: 'Premier League', date: '2026-09-22' },
  { home: 'Barcelona', away: 'Real Madrid', league: 'La Liga', date: '2026-09-21' },
  { home: 'Bayern Munich', away: 'Borussia Dortmund', league: 'Bundesliga', date: '2026-09-23' },
  { home: 'Inter Milan', away: 'Juventus', league: 'Serie A', date: '2026-09-24' },
  { home: 'Manchester City', away: 'Arsenal', league: 'Premier League', date: '2026-09-25' },
];

function parseMatchLine(line: string): { home: string; away: string; league: string; date: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // 1. Comma-separated: "Arsenal, Chelsea" or "Arsenal, Chelsea, Premier League, 2026-09-20"
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map((p) => p.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const home = parts[0];
      const away = parts[1];
      const explicitLeague = parts[2] && parts[2].trim() ? parts[2].trim() : null;
      const league = explicitLeague || detectTeamLeague(home, away);
      return {
        home,
        away,
        league,
        date: parts[3] || '2026-09-20',
      };
    }
  }

  // 2. Tab-separated
  if (trimmed.includes('\t')) {
    const parts = trimmed.split('\t').map((p) => p.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const home = parts[0];
      const away = parts[1];
      const explicitLeague = parts[2] && parts[2].trim() ? parts[2].trim() : null;
      const league = explicitLeague || detectTeamLeague(home, away);
      return {
        home,
        away,
        league,
        date: parts[3] || '2026-09-20',
      };
    }
  }

  // 3. "vs", "v", or "-" separated (e.g. "Arsenal vs Chelsea", "Barcelona vs Real Madrid | La Liga")
  const match = trimmed.match(/^(.+?)\s+(?:vs\.?|v\.?|-)\s+(.+?)(?:\s*\|\s*(.*))?$/i);
  if (match && match[1] && match[2]) {
    const home = match[1].trim();
    const away = match[2].trim();
    let league = match[3]?.trim();
    if (!league) {
      league = detectTeamLeague(home, away);
    }
    const date = '2026-09-20';

    return {
      home,
      away,
      league,
      date,
    };
  }

  return null;
}

interface BatchPredictionStudioProps {
  initialFixtures?: EspnMatchOfTheDay[];
  onSelectSingleMatch?: (match: { home: string; away: string; league: string; date: string }) => void;
}

export const BatchPredictionStudio: React.FC<BatchPredictionStudioProps> = ({
  initialFixtures,
  onSelectSingleMatch,
}) => {
  const [batchText, setBatchText] = useState<string>(() => {
    if (initialFixtures && initialFixtures.length > 0) {
      return initialFixtures
        .map((f) => `${f.home_team} vs ${f.away_team} | ${f.league_name}`)
        .join('\n');
    }
    return DEFAULT_BATCH_FIXTURES.map((f) => `${f.home} vs ${f.away} | ${f.league}`).join('\n');
  });
  const [predictions, setPredictions] = useState<MultiTargetPrediction[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'gg_ranked' | 'standard'>('gg_ranked');
  const [inspectedPrediction, setInspectedPrediction] = useState<MultiTargetPrediction | null>(null);

  // If initialFixtures changes externally, update batchText and re-run
  useEffect(() => {
    if (initialFixtures && initialFixtures.length > 0) {
      const text = initialFixtures
        .map((f) => `${f.home_team} vs ${f.away_team} | ${f.league_name}`)
        .join('\n');
      setBatchText(text);
      executeBatch(text);
    }
  }, [initialFixtures]);

  const executeBatch = (textToProcess: string) => {
    setIsProcessing(true);
    try {
      const lines = textToProcess.trim().split('\n');
      const results: MultiTargetPrediction[] = [];

      lines.forEach((line) => {
        const parsed = parseMatchLine(line);
        if (parsed) {
          const { home, away, league, date } = parsed;

          const features = extractPreMatchFeatures({
            home_team: home,
            away_team: away,
            date,
            league_id: league.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          });

          const pred = generateMultiTargetPrediction(
            {
              home_team: home,
              away_team: away,
              league,
              date,
            },
            features
          );

          results.push(pred);
        }
      });

      setPredictions(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunBatch = () => {
    executeBatch(batchText);
  };

  // Run automatically on mount so the user immediately sees the ranked list
  useEffect(() => {
    executeBatch(batchText);
  }, []);

  const handleExportCSV = () => {
    if (predictions.length === 0) return;

    const headers = [
      'Match',
      'League',
      'Date',
      'Data_Tier',
      '1X2_Home_Win_Pct',
      '1X2_Draw_Pct',
      '1X2_Away_Win_Pct',
      'DoubleChance_1X',
      'DoubleChance_X2',
      'DoubleChance_12',
      'BTTS_YES_Pct',
      'BTTS_NO_Pct',
      'Over_2_5_Pct',
      'Under_2_5_Pct',
      'Expected_Total_Shots',
      'Shots_Over_24_5_Pct',
      'BTTS_and_Over25_Pct',
    ];

    const rows = predictions.map((p) => [
      `"${p.match.home} vs ${p.match.away}"`,
      `"${p.match.league}"`,
      p.match.date,
      p.data_tier,
      (p.result.home * 100).toFixed(1),
      (p.result.draw * 100).toFixed(1),
      (p.result.away * 100).toFixed(1),
      (p.double_chance.dc_1x * 100).toFixed(1),
      (p.double_chance.dc_x2 * 100).toFixed(1),
      (p.double_chance.dc_12 * 100).toFixed(1),
      (p.btts.yes * 100).toFixed(1),
      (p.btts.no * 100).toFixed(1),
      (p.over_2_5.over * 100).toFixed(1),
      (p.over_2_5.under * 100).toFixed(1),
      p.shots.expected_total,
      p.shots.lines['24.5'] ? (p.shots.lines['24.5'].over * 100).toFixed(1) : '50.0',
      (p.combinations.btts_and_over_2_5 * 100).toFixed(1),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `footypredict_batch_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (predictions.length === 0) return;
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(predictions, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonStr);
    link.setAttribute('download', `footypredict_batch_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Input Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Batch Multi-Target Fixture Processor</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Format: Home vs Away (e.g., Arsenal vs Chelsea) or Home, Away</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold">Quick Sample Slates:</span>
          <button
            type="button"
            onClick={() => {
              const text = [
                'Arsenal vs Chelsea',
                'Liverpool vs Everton',
                'Manchester City vs Manchester United',
                'Tottenham vs West Ham',
                'Newcastle vs Aston Villa',
              ].join('\n');
              setBatchText(text);
              executeBatch(text);
            }}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] cursor-pointer transition border border-slate-700"
          >
            Premier League Derbies
          </button>
          <button
            type="button"
            onClick={() => {
              const text = [
                'Real Madrid vs Barcelona',
                'Bayern Munich vs Borussia Dortmund',
                'Inter Milan vs Juventus',
                'Paris Saint-Germain vs Marseille',
                'Atletico Madrid vs Sevilla',
              ].join('\n');
              setBatchText(text);
              executeBatch(text);
            }}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] cursor-pointer transition border border-slate-700"
          >
            European Giants
          </button>
        </div>

        <textarea
          rows={6}
          value={batchText}
          onChange={(e) => setBatchText(e.target.value)}
          placeholder={`Arsenal vs Chelsea\nLiverpool vs Everton\nBarcelona vs Real Madrid`}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRunBatch}
              disabled={isProcessing}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer flex items-center space-x-1.5"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>{isProcessing ? 'Generating ML Predictions...' : 'Generate Batch Predictions'}</span>
            </button>

            <button
              onClick={() => setBatchText('')}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>

          {predictions.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
              >
                <FileCode className="w-4 h-4" />
                <span>Export JSON</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Batch Results Table */}
      {predictions.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Batch Prediction Grid ({predictions.length} fixtures evaluated)
              </h4>
              <p className="text-[11px] text-slate-400">
                Sorted by target probability or displayed in standard multi-target layout.
              </p>
            </div>

            {/* Toggle View Mode */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1 self-start md:self-auto">
              <button
                onClick={() => setViewMode('gg_ranked')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
                  viewMode === 'gg_ranked'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>GG &amp; Over 2.5 Ranked</span>
              </button>
              <button
                onClick={() => setViewMode('standard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
                  viewMode === 'standard'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Detailed Grid</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {viewMode === 'gg_ranked' ? (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 text-center w-12">Rank</th>
                    <th className="py-3 px-4">Fixture</th>
                    <th className="py-3 px-4 text-center bg-emerald-500/5 text-emerald-400 font-semibold border-x border-slate-800/40">
                      GG &amp; Over 2.5 Prob
                    </th>
                    <th className="py-3 px-4 text-center">Average Shots</th>
                    <th className="py-3 px-4 text-center">Win (1X2)</th>
                    <th className="py-3 px-4 text-center">Win or Draw (Double Chance)</th>
                    <th className="py-3 px-4 text-center">Forensic Reasons</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {[...predictions]
                    .sort((a, b) => b.combinations.btts_and_over_2_5 - a.combinations.btts_and_over_2_5)
                    .map((p, i) => {
                      const rankColorClass = i === 0 
                        ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' 
                        : i === 1 
                          ? 'text-slate-300 bg-slate-400/10 border-slate-400/20' 
                          : i === 2 
                            ? 'text-amber-600 bg-amber-700/10 border-amber-700/20' 
                            : 'text-slate-400 bg-slate-950 border-slate-800';

                      // Find highest probability 1X2 outcome
                      const outcomes = [
                        { label: 'Home Win', prob: p.result.home, name: p.match.home },
                        { label: 'Draw', prob: p.result.draw, name: 'Draw' },
                        { label: 'Away Win', prob: p.result.away, name: p.match.away }
                      ];
                      const highestOutcome = outcomes.reduce((max, op) => op.prob > max.prob ? op : max, outcomes[0]);

                      return (
                        <tr
                          key={i}
                          onClick={() => setInspectedPrediction(p)}
                          className="hover:bg-slate-800/60 transition cursor-pointer group"
                        >
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border ${rankColorClass}`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-sans font-medium text-white">
                            <div className="flex items-center space-x-2">
                              <span className="group-hover:text-emerald-300 transition">{p.match.home}</span>
                              <span className="text-slate-500 text-xs font-normal">vs</span>
                              <span className="group-hover:text-emerald-300 transition">{p.match.away}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {p.match.league} • {p.match.date}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center bg-emerald-500/5 border-x border-slate-800/40 font-bold text-sm text-emerald-400">
                            <div>{(p.combinations.btts_and_over_2_5 * 100).toFixed(1)}%</div>
                            <div className="text-[9px] text-slate-400 font-normal mt-0.5">
                              GG: {(p.btts.yes * 100).toFixed(0)}% • O2.5: {(p.over_2_5.over * 100).toFixed(0)}%
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="text-slate-200 font-bold text-xs">{p.shots.expected_total}</div>
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              H: {p.shots.expected_home_shots} • A: {p.shots.expected_away_shots}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className={`text-xs font-bold ${
                              highestOutcome.label === 'Draw' 
                                ? 'text-amber-400' 
                                : highestOutcome.label === 'Home Win' 
                                  ? 'text-emerald-400' 
                                  : 'text-blue-400'
                            }`}>
                              {highestOutcome.name === 'Draw' ? 'Draw' : highestOutcome.name} ({ (highestOutcome.prob * 100).toFixed(0) }%)
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              H: {(p.result.home * 100).toFixed(0)}% • D: {(p.result.draw * 100).toFixed(0)}% • A: {(p.result.away * 100).toFixed(0)}%
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-3 text-xs">
                              <span className={p.double_chance.dc_1x >= 0.70 ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                                1X: {(p.double_chance.dc_1x * 100).toFixed(0)}%
                              </span>
                              <span className="text-slate-600">|</span>
                              <span className={p.double_chance.dc_x2 >= 0.70 ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                                X2: {(p.double_chance.dc_x2 * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="text-[9px] text-slate-500 mt-0.5">
                              12: {(p.double_chance.dc_12 * 100).toFixed(0)}%
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectedPrediction(p);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center space-x-1 mx-auto cursor-pointer transition"
                            >
                              <Sparkles className="w-3 h-3 text-emerald-400" />
                              <span>View Reasons</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Fixture</th>
                    <th className="py-3 px-3">Tier</th>
                    <th className="py-3 px-3">1X2 (H / D / A)</th>
                    <th className="py-3 px-3">Double Chance</th>
                    <th className="py-3 px-3">BTTS (YES / NO)</th>
                    <th className="py-3 px-3">Over 2.5</th>
                    <th className="py-3 px-3">Exp Shots</th>
                    <th className="py-3 px-3">BTTS + O2.5</th>
                    <th className="py-3 px-3 text-center">Reasons</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {predictions.map((p, i) => (
                    <tr
                      key={i}
                      onClick={() => setInspectedPrediction(p)}
                      className="hover:bg-slate-800/60 transition cursor-pointer group"
                    >
                      <td className="py-3 px-3 font-sans font-medium text-white">
                        <div className="group-hover:text-emerald-300 transition">{p.match.home} vs {p.match.away}</div>
                        <div className="text-[10px] text-slate-500">{p.match.league} • {p.match.date}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {p.data_tier}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-400">{(p.result.home * 100).toFixed(0)}%</span> /{' '}
                        <span className="text-slate-400">{(p.result.draw * 100).toFixed(0)}%</span> /{' '}
                        <span className="text-white">{(p.result.away * 100).toFixed(0)}%</span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        1X: {(p.double_chance.dc_1x * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 px-3">
                        <span className={p.btts.yes >= 0.55 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                          YES {(p.btts.yes * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={p.over_2_5.over >= 0.55 ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
                          {(p.over_2_5.over * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {p.shots.expected_total}
                      </td>
                      <td className="py-3 px-3 text-indigo-300 font-bold">
                        {(p.combinations.btts_and_over_2_5 * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedPrediction(p);
                          }}
                          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold flex items-center space-x-1 mx-auto cursor-pointer transition"
                        >
                          <ExternalLink className="w-3 h-3 text-cyan-400" />
                          <span>Forensics</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Forensic Inspection Modal When User Enters Inside Any Batch Match */}
      {inspectedPrediction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  MATCH FORENSIC REPORT
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {inspectedPrediction.match.home} vs {inspectedPrediction.match.away}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {inspectedPrediction.match.league} • {inspectedPrediction.match.date}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {onSelectSingleMatch && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSingleMatch({
                        home: inspectedPrediction.match.home,
                        away: inspectedPrediction.match.away,
                        league: inspectedPrediction.match.league,
                        date: inspectedPrediction.match.date,
                      });
                      setInspectedPrediction(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <span>Open in Single Match Studio</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInspectedPrediction(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <MatchPredictionCard
              prediction={inspectedPrediction}
              features={extractPreMatchFeatures({
                home_team: inspectedPrediction.match.home,
                away_team: inspectedPrediction.match.away,
                date: inspectedPrediction.match.date,
                league_id: inspectedPrediction.match.league.toLowerCase().replace(/[^a-z0-9]/g, '_'),
              })}
            />
          </div>
        </div>
      )}
    </div>
  );
};
