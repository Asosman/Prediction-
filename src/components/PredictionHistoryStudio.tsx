import React, { useState, useEffect } from 'react';
import {
  PersistentPredictionRecord,
  PredictionBatchRecord,
  DailyPredictionPerformance,
} from '../types';
import {
  evaluatePredictionsForDate,
  getHistoricalPerformanceByDate,
  getAllTrackedBatches,
} from '../ml/predictionHistoryEngine';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Layers,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  ChevronRight,
  ShieldCheck,
  Award,
} from 'lucide-react';

export function PredictionHistoryStudio() {
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-30');
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'successful' | 'failed' | 'pending' | 'batches' | 'historical_table'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [evaluationData, setEvaluationData] = useState<{
    date: string;
    total: number;
    successful: number;
    failed: number;
    pending: number;
    accuracy_pct: number;
    successful_predictions: PersistentPredictionRecord[];
    failed_predictions: PersistentPredictionRecord[];
    pending_predictions: PersistentPredictionRecord[];
  } | null>(null);

  const [dailySummaries, setDailySummaries] = useState<DailyPredictionPerformance[]>([]);
  const [allBatches, setAllBatches] = useState<PredictionBatchRecord[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<PredictionBatchRecord | null>(null);

  // Load and evaluate predictions for selected date
  const loadDateEvaluation = async (dateStr: string) => {
    setIsLoading(true);
    try {
      const res = await evaluatePredictionsForDate(dateStr);
      setEvaluationData(res);
      setDailySummaries(getHistoricalPerformanceByDate());
      setAllBatches(getAllTrackedBatches());
    } catch (err) {
      console.error('Error loading prediction history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDateEvaluation(selectedDate);
  }, [selectedDate]);

  const allPredictions = evaluationData
    ? [
        ...evaluationData.successful_predictions,
        ...evaluationData.failed_predictions,
        ...evaluationData.pending_predictions,
      ]
    : [];

  const filteredPredictions = allPredictions.filter((p) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      p.home_team.toLowerCase().includes(q) ||
      p.away_team.toLowerCase().includes(q) ||
      p.competition.toLowerCase().includes(q) ||
      p.selection.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Prediction History &amp; Real-Time Result Verification
              </h2>
              <p className="text-xs text-slate-400">
                Persistent historical records evaluated against official ESPN final match results (Zero data tampering)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Quick Date Selectors */}
          <button
            onClick={() => setSelectedDate('2026-09-30')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedDate === '2026-09-30'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Yesterday (Sep 30)
          </button>
          <button
            onClick={() => setSelectedDate('2026-10-01')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedDate === '2026-10-01'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Today (Oct 1)
          </button>
          <button
            onClick={() => setSelectedDate('2026-09-29')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedDate === '2026-09-29'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Sep 29
          </button>

          {/* Date Picker Input */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none font-mono text-xs cursor-pointer"
            />
          </div>

          <button
            onClick={() => loadDateEvaluation(selectedDate)}
            disabled={isLoading}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Re-verify ESPN</span>
          </button>
        </div>
      </div>

      {/* Date Performance Scorecard */}
      {evaluationData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Predictions</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-bold text-slate-100 font-mono">{evaluationData.total}</span>
              <span className="text-xs text-slate-500">fixtures</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1">Date: {evaluationData.date}</span>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Successful [WON]</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-bold text-emerald-400 font-mono">{evaluationData.successful}</span>
              <span className="text-xs text-emerald-500/80">hits</span>
            </div>
            <span className="text-[10px] text-emerald-400/70 mt-1">Confirmed winning picks</span>
          </div>

          <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-red-400">Failed [LOST]</span>
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-bold text-red-400 font-mono">{evaluationData.failed}</span>
              <span className="text-xs text-red-500/80">misses</span>
            </div>
            <span className="text-[10px] text-red-400/70 mt-1">Confirmed failed picks</span>
          </div>

          <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Pending</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-bold text-amber-400 font-mono">{evaluationData.pending}</span>
              <span className="text-xs text-amber-500/80">in progress</span>
            </div>
            <span className="text-[10px] text-amber-400/70 mt-1">Awaiting official whistle</span>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/30 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Verified Accuracy</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-black text-emerald-300 font-mono">
                {evaluationData.accuracy_pct.toFixed(1)}%
              </span>
              <span className="text-[11px] text-emerald-400/80">win rate</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Excl. pending fixtures</span>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeSubTab === 'all'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Predictions ({allPredictions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('successful')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center space-x-1.5 transition-all ${
              activeSubTab === 'successful'
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Successful ({evaluationData?.successful || 0})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('failed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center space-x-1.5 transition-all ${
              activeSubTab === 'failed'
                ? 'bg-red-950/40 text-red-300 border border-red-500/40'
                : 'text-slate-400 hover:text-red-400'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span>Failed ({evaluationData?.failed || 0})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center space-x-1.5 transition-all ${
              activeSubTab === 'pending'
                ? 'bg-amber-950/40 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Pending ({evaluationData?.pending || 0})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('batches')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center space-x-1.5 transition-all ${
              activeSubTab === 'batches'
                ? 'bg-purple-950/40 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-purple-400'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Batches View</span>
          </button>
          <button
            onClick={() => setActiveSubTab('historical_table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center space-x-1.5 transition-all ${
              activeSubTab === 'historical_table'
                ? 'bg-cyan-950/40 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-cyan-400'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Historical Days Table</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search teams or leagues..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 w-full sm:w-56"
          />
        </div>
      </div>

      {/* VIEW: Batches Breakdown */}
      {activeSubTab === 'batches' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allBatches.map((batch) => (
              <div
                key={batch.batch_id}
                onClick={() => setSelectedBatch(selectedBatch?.batch_id === batch.batch_id ? null : batch)}
                className={`cursor-pointer bg-slate-900/80 border rounded-xl p-5 transition-all hover:border-slate-700 ${
                  selectedBatch?.batch_id === batch.batch_id
                    ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    {batch.batch_id}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      batch.status === 'SUCCESS'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : batch.status === 'FAILED'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {batch.status === 'SUCCESS' ? '✅ SUCCESS' : batch.status === 'FAILED' ? '❌ FAILED' : '⏳ PENDING'}
                  </span>
                </div>

                <h3 className="font-bold text-slate-100 mt-2.5 text-sm">{batch.batch_title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Date: {batch.date}</p>

                <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Combined Odds</span>
                    <span className="font-mono font-bold text-emerald-400 text-xs">{batch.total_odds}x</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Legs</span>
                    <span className="font-mono font-bold text-slate-200 text-xs">{batch.total_predictions}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Hits / Misses</span>
                    <span className="font-mono font-bold text-slate-200 text-xs">
                      {batch.successful_predictions}W / {batch.failed_predictions}L
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Accuracy</span>
                    <span className="font-mono font-bold text-emerald-300 text-xs">
                      {batch.accuracy_pct.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {selectedBatch?.batch_id === batch.batch_id && (
                  <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Batch Individual Predictions:
                    </span>
                    {batch.predictions.map((p, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">
                            {p.home_team} vs {p.away_team}
                          </div>
                          <div className="text-[11px] text-emerald-400 mt-0.5">
                            Pick: {p.selection} ({p.odds}x)
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'SUCCESS'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : p.status === 'FAILED'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {p.status}
                          </span>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            Score: {p.actual_final_score || 'Pending'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: Historical Performance Daily Table */}
      {activeSubTab === 'historical_table' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Historical Daily Accuracy &amp; Verification Audit</span>
            </h3>
            <span className="text-xs text-slate-400">Click any date row to inspect matches</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Total Predictions</th>
                  <th className="py-3 px-4 text-emerald-400">Successful</th>
                  <th className="py-3 px-4 text-red-400">Failed</th>
                  <th className="py-3 px-4 text-amber-400">Pending</th>
                  <th className="py-3 px-4">Batches</th>
                  <th className="py-3 px-4 text-right">Verified Accuracy</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {dailySummaries.map((day) => (
                  <tr
                    key={day.date}
                    onClick={() => {
                      setSelectedDate(day.date);
                      setActiveSubTab('all');
                    }}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-100">{day.date}</td>
                    <td className="py-3 px-4">{day.total_predictions}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{day.successful_predictions}</td>
                    <td className="py-3 px-4 text-red-400 font-bold">{day.failed_predictions}</td>
                    <td className="py-3 px-4 text-amber-400">{day.pending_predictions}</td>
                    <td className="py-3 px-4 text-purple-400 font-sans">{day.batches.length} Batches</td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-block bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded font-bold">
                        {day.accuracy_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      <span className="text-xs text-emerald-400 hover:underline flex items-center justify-end gap-1">
                        Inspect <ChevronRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: Successful / Failed / All Table */}
      {(activeSubTab === 'all' ||
        activeSubTab === 'successful' ||
        activeSubTab === 'failed' ||
        activeSubTab === 'pending') && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              {activeSubTab === 'successful' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {activeSubTab === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
              {activeSubTab === 'pending' && <Clock className="w-4 h-4 text-amber-400" />}
              {activeSubTab === 'all' && <Filter className="w-4 h-4 text-emerald-400" />}
              <span>
                {activeSubTab === 'successful' && '✅ Confirmed Successful Predictions'}
                {activeSubTab === 'failed' && '❌ Confirmed Failed Predictions'}
                {activeSubTab === 'pending' && '⏳ Pending / In-Progress Predictions'}
                {activeSubTab === 'all' && `All Predictions for ${selectedDate}`}
              </span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Showing {filteredPredictions.filter((p) => {
                if (activeSubTab === 'successful') return p.status === 'SUCCESS';
                if (activeSubTab === 'failed') return p.status === 'FAILED';
                if (activeSubTab === 'pending') return p.status === 'PENDING';
                return true;
              }).length} matches
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4">Match / League</th>
                  <th className="py-3 px-4">Market</th>
                  <th className="py-3 px-4">Original Pre-Match Pick</th>
                  <th className="py-3 px-4 text-center">Predicted Score</th>
                  <th className="py-3 px-4 text-center font-bold text-slate-200">Actual Final Result</th>
                  <th className="py-3 px-4 text-center">Odds</th>
                  <th className="py-3 px-4 text-right">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPredictions
                  .filter((p) => {
                    if (activeSubTab === 'successful') return p.status === 'SUCCESS';
                    if (activeSubTab === 'failed') return p.status === 'FAILED';
                    if (activeSubTab === 'pending') return p.status === 'PENDING';
                    return true;
                  })
                  .map((p) => (
                    <tr key={p.prediction_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-100 text-sm">
                          {p.home_team} <span className="text-slate-500 font-normal">vs</span> {p.away_team}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2">
                          <span className="text-yellow-400/90 font-medium">{p.competition}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-500">{p.kickoff_wat}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono text-[11px]">
                          {p.market_type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-emerald-300">{p.selection}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 max-w-xs">{p.reason}</div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-300">
                        {p.predicted_score}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {p.actual_final_score ? (
                          <span className="font-mono font-bold text-slate-100 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                            {p.actual_final_score}
                          </span>
                        ) : (
                          <span className="font-mono text-slate-500 text-[11px]">Pending Whistle</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-yellow-400">
                        {p.odds}x
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            p.status === 'SUCCESS'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : p.status === 'FAILED'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {p.status === 'SUCCESS' && <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                          {p.status === 'FAILED' && <XCircle className="w-3.5 h-3.5 mr-1" />}
                          {p.status === 'PENDING' && <Clock className="w-3.5 h-3.5 mr-1" />}
                          <span>{p.status === 'SUCCESS' ? 'SUCCESS' : p.status === 'FAILED' ? 'FAILED' : 'PENDING'}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
