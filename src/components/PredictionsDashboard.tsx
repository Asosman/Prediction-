import React, { useState } from 'react';
import { MultiTargetPrediction, PreMatchFeatures, EspnMatchOfTheDay } from '../types';
import { MatchPredictionCard } from './MatchPredictionCard';
import { BatchPredictionStudio } from './BatchPredictionStudio';
import { DataDriftWarningBadge } from './DataDriftWarningBadge';
import { EspnMatchesOfTheDayBar } from './EspnMatchesOfTheDayBar';
import { extractPreMatchFeatures } from '../ml/featureEngineering';
import { generateMultiTargetPrediction } from '../ml/predictionEngine';
import { evaluateModelDataDrift } from '../ml/dataDriftDetector';
import { detectTeamLeague } from '../ml/teamProfiles';
import {
  Calendar,
  Layers,
  Search,
  Zap,
  Sliders,
  Database,
  CheckCircle2,
  Globe,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

const FEATURED_FIXTURES = [
  { home: 'Arsenal', away: 'Chelsea', league: 'Premier League', date: '2026-09-20' },
  { home: 'Barcelona', away: 'Real Madrid', league: 'La Liga', date: '2026-09-21' },
  { home: 'Liverpool', away: 'Everton', league: 'Premier League', date: '2026-09-22' },
  { home: 'Bayern Munich', away: 'Borussia Dortmund', league: 'Bundesliga', date: '2026-09-23' },
  { home: 'Inter Milan', away: 'Juventus', league: 'Serie A', date: '2026-09-24' },
];

const AVAILABLE_TEAMS = [
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
  'B. Monchengladbach',
  'Inter Milan',
  'Juventus',
  'Genoa',
  'Celtic',
  'Rangers',
  'Feyenoord',
  'Ajax',
];

export const PredictionsDashboard: React.FC = () => {
  const [predictionMode, setPredictionMode] = useState<'single' | 'batch'>('single');
  const [customTeamMode, setCustomTeamMode] = useState<boolean>(false);
  const [homeTeam, setHomeTeam] = useState<string>('Arsenal');
  const [awayTeam, setAwayTeam] = useState<string>('Chelsea');
  const [league, setLeague] = useState<string>('Premier League');
  const [matchDate, setMatchDate] = useState<string>('2026-09-20');
  const [batchFixturesFromEspn, setBatchFixturesFromEspn] = useState<EspnMatchOfTheDay[]>([]);

  // Compute live prediction from ML engine
  const features: PreMatchFeatures = extractPreMatchFeatures({
    home_team: homeTeam,
    away_team: awayTeam,
    date: matchDate,
    league_id: league.toLowerCase().replace(/[^a-z0-9]/g, '_'),
  });

  const prediction: MultiTargetPrediction = generateMultiTargetPrediction(
    {
      home_team: homeTeam,
      away_team: awayTeam,
      league,
      date: matchDate,
    },
    features
  );

  // Evaluate statistical data drift vs historical benchmark means
  const driftReport = evaluateModelDataDrift(prediction, features);

  const handleSelectFeatured = (f: typeof FEATURED_FIXTURES[0]) => {
    setHomeTeam(f.home);
    setAwayTeam(f.away);
    setLeague(f.league);
    setMatchDate(f.date);
    setCustomTeamMode(false);
  };

  const handleSelectEspnMatch = (m: { home: string; away: string; league: string; date: string }) => {
    setHomeTeam(m.home);
    setAwayTeam(m.away);
    setLeague(m.league);
    setMatchDate(m.date);
    setCustomTeamMode(false);
    setPredictionMode('single');
  };

  const handleSendEspnToBatch = (espnMatches: EspnMatchOfTheDay[]) => {
    setBatchFixturesFromEspn(espnMatches);
    setPredictionMode('batch');
  };

  const handleHomeTeamChange = (newHome: string) => {
    setHomeTeam(newHome);
    const detected = detectTeamLeague(newHome, awayTeam);
    setLeague(detected);
  };

  const handleAwayTeamChange = (newAway: string) => {
    setAwayTeam(newAway);
    const detected = detectTeamLeague(homeTeam, newAway);
    setLeague(detected);
  };

  return (
    <div className="space-y-6">
      {/* Top Mode Selector & Data Drift Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-3 px-5 shadow-lg shadow-black/20">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Match Prediction Center</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PROD
                </span>
              </h2>
            </div>
            <p className="text-[11px] text-slate-400">
              Analyze an individual game or paste an entire list of matches to rank them by GG &amp; Over 2.5
            </p>
          </div>
        </div>

        {/* Visual Warning Indicator & Mode Switcher */}
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {/* Visual Data Drift Warning Indicator in Header */}
          <DataDriftWarningBadge report={driftReport} />

          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1 shrink-0">
            <button
              onClick={() => setPredictionMode('single')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
                predictionMode === 'single'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Single Match</span>
            </button>
            <button
              onClick={() => setPredictionMode('batch')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
                predictionMode === 'batch'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Batch Matches (Insert &amp; Rank)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Visual Data Drift Warning Banner if Drift is Detected */}
      {driftReport.isDriftDetected && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 shadow-xl shadow-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                  Model Confidence Data Drift Warning
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  |Z| = {driftReport.maxZScore.toFixed(2)}σ Outlier
                </span>
                <span className="text-[11px] text-amber-300/70 font-mono">
                  Target: {homeTeam} vs {awayTeam}
                </span>
              </div>
              <p className="text-xs text-amber-100/90 leading-relaxed">
                {driftReport.primaryDriftMetric ? (
                  <>
                    The model's confidence for{' '}
                    <strong className="text-amber-300 font-semibold">{driftReport.primaryDriftMetric.metricName}</strong>{' '}
                    diverges significantly to{' '}
                    <strong className="font-mono text-white">{driftReport.primaryDriftMetric.currentValueFormatted}</strong>{' '}
                    (historical benchmark mean is {driftReport.primaryDriftMetric.historicalMeanFormatted}, Δ{' '}
                    {driftReport.primaryDriftMetric.deviationPct > 0 ? '+' : ''}
                    {driftReport.primaryDriftMetric.deviationPct}%).
                  </>
                ) : (
                  'Model confidence scores deviate significantly from historical training means, signaling potential input distribution shift or tail-probability calibration.'
                )}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center space-x-2 self-end sm:self-center">
            <DataDriftWarningBadge report={driftReport} showDetailsButton={false} />
          </div>
        </div>
      )}

      {/* ESPN Live Matches of the Day Bar (West Africa Time - WAT UTC+1) */}
      <EspnMatchesOfTheDayBar
        onSelectMatch={handleSelectEspnMatch}
        onSendToBatchStudio={handleSendEspnToBatch}
      />

      {/* If in Batch Mode, render BatchPredictionStudio directly */}
      {predictionMode === 'batch' ? (
        <BatchPredictionStudio
          initialFixtures={batchFixturesFromEspn}
          onSelectSingleMatch={handleSelectEspnMatch}
        />
      ) : (
        <>
          {/* Top Fixture Selection Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <Sliders className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Target Match Selector &amp; Pre-Match Engine</h3>
                {driftReport.isDriftDetected ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>Drift Alert: {driftReport.maxZScore.toFixed(1)}σ</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 hidden sm:inline">
                    Drift: Normal
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCustomTeamMode(!customTeamMode)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 transition cursor-pointer border ${
                    customTeamMode
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span>{customTeamMode ? 'Typing Any World Teams' : 'Type Any Team (Worldwide)'}</span>
                </button>
                <span className="text-xs text-slate-400 font-mono hidden md:inline">
                  Leakage Guard: <span className="text-emerald-400">Strict Temporal</span>
                </span>
              </div>
            </div>

            {/* Quick-Pick Marquee Fixtures */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                Quick-Select Marquee Fixtures:
              </span>
              <div className="flex flex-wrap gap-2">
                {FEATURED_FIXTURES.map((f, idx) => {
                  const isSelected = !customTeamMode && f.home === homeTeam && f.away === awayTeam;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectFeatured(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 border ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{f.home}</span>
                      <span className="text-slate-500">vs</span>
                      <span>{f.away}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Input Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Home Team {customTeamMode && <span className="text-indigo-400">(Any World Club/Country)</span>}
                </label>
                {customTeamMode ? (
                  <input
                    type="text"
                    value={homeTeam}
                    onChange={(e) => handleHomeTeamChange(e.target.value)}
                    placeholder="e.g. Flamengo, Kaizer Chiefs, Al Hilal"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                ) : (
                  <select
                    value={homeTeam}
                    onChange={(e) => handleHomeTeamChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    {AVAILABLE_TEAMS.filter((t) => t !== awayTeam).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Away Team {customTeamMode && <span className="text-indigo-400">(Any World Club/Country)</span>}
                </label>
                {customTeamMode ? (
                  <input
                    type="text"
                    value={awayTeam}
                    onChange={(e) => handleAwayTeamChange(e.target.value)}
                    placeholder="e.g. Palmeiras, Orlando Pirates, Al Nassr"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                ) : (
                  <select
                    value={awayTeam}
                    onChange={(e) => handleAwayTeamChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    {AVAILABLE_TEAMS.filter((t) => t !== homeTeam).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">League / Tournament</label>
                {customTeamMode ? (
                  <input
                    type="text"
                    value={league}
                    onChange={(e) => setLeague(e.target.value)}
                    placeholder="e.g. Copa Libertadores, CAF, MLS"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                ) : (
                  <select
                    value={league}
                    onChange={(e) => setLeague(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium"
                  >
                    <option value="Premier League">Premier League (England)</option>
                    <option value="La Liga">La Liga (Spain)</option>
                    <option value="Bundesliga">Bundesliga (Germany)</option>
                    <option value="Serie A">Serie A (Italy)</option>
                    <option value="Ligue 1">Ligue 1 (France)</option>
                    <option value="Primeira Liga">Primeira Liga (Portugal)</option>
                    <option value="Eredivisie">Eredivisie (Netherlands)</option>
                    <option value="Scottish Premiership">Scottish Premiership (Scotland)</option>
                    <option value="Brasileirão Serie A">Brasileirão Serie A (Brazil)</option>
                    <option value="Saudi Pro League">Saudi Pro League</option>
                    <option value="Major League Soccer">Major League Soccer (MLS)</option>
                    <option value="Argentine Primera">Argentine Primera (Argentina)</option>
                    <option value="South African PSL">South African PSL</option>
                    <option value="Egyptian Premier League">Egyptian Premier League</option>
                    {!['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1', 'Primeira Liga', 'Eredivisie', 'Scottish Premiership', 'Brasileirão Serie A', 'Saudi Pro League', 'Major League Soccer', 'Argentine Primera', 'South African PSL', 'Egyptian Premier League'].includes(league) && (
                      <option value={league}>{league}</option>
                    )}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Kickoff Date</label>
                <input
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Primary Multi-Target Prediction Card */}
          <MatchPredictionCard prediction={prediction} features={features} />

          {/* Pre-Match Historical Feature Matrix Inspection */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">
                  Leakage-Free Pre-Match Feature Vector ({features.data_tier})
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Rolling Window: <strong className="text-slate-200">5 Matches</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Home Elo</span>
                <span className="text-base font-bold text-white font-mono">{features.elo_home}</span>
                <span className="text-[9px] text-emerald-400 block">+65 HFA</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Away Elo</span>
                <span className="text-base font-bold text-white font-mono">{features.elo_away}</span>
                <span className="text-[9px] text-slate-500 block">Neutral</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Home 5-xG Form</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {features.home_last_5_xg_avg.toFixed(2)}
                </span>
                <span className="text-[9px] text-slate-400 block">xGA: {features.home_last_5_xga_avg.toFixed(2)}</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Away 5-xG Form</span>
                <span className="text-base font-bold text-cyan-400 font-mono">
                  {features.away_last_5_xg_avg.toFixed(2)}
                </span>
                <span className="text-[9px] text-slate-400 block">xGA: {features.away_last_5_xga_avg.toFixed(2)}</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Home Shots/90</span>
                <span className="text-base font-bold text-white font-mono">
                  {features.home_last_5_shots_avg.toFixed(1)}
                </span>
                <span className="text-[9px] text-slate-400 block">SoT: {features.home_last_5_sot_avg.toFixed(1)}</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Rest Advantage</span>
                <span className="text-base font-bold text-indigo-400 font-mono">
                  {features.rest_difference > 0 ? `+${features.rest_difference}` : features.rest_difference}d
                </span>
                <span className="text-[9px] text-slate-400 block">
                  H: {features.days_since_home_prev_match}d | A: {features.days_since_away_prev_match}d
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
