// ============================================================================
// ESPN Matches of the Day Component (West Africa Time - WAT / UTC+1)
// Fetches daily fixtures from official ESPN endpoints, formats in WAT,
// and feeds them directly into single predictions or batch ranked studio.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { EspnMatchOfTheDay } from '../types';
import { getLiveEspnMatches, EspnFeedResponse } from '../services/espnClient';
import { getCurrentDateInWAT } from '../services/espnService';
import {
  Globe2,
  Clock,
  RefreshCw,
  Play,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Radio,
} from 'lucide-react';

interface EspnMatchesOfTheDayBarProps {
  onSelectMatch: (match: { home: string; away: string; league: string; date: string }) => void;
  onSendToBatchStudio?: (matches: EspnMatchOfTheDay[]) => void;
}

export const EspnMatchesOfTheDayBar: React.FC<EspnMatchesOfTheDayBarProps> = ({
  onSelectMatch,
  onSendToBatchStudio,
}) => {
  const [watInfo, setWatInfo] = useState(getCurrentDateInWAT());
  const [matches, setMatches] = useState<EspnMatchOfTheDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Update WAT live clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setWatInfo(getCurrentDateInWAT());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchMatches = async (dateStr?: string) => {
    setLoading(true);
    try {
      const data: EspnFeedResponse = await getLiveEspnMatches(dateStr);
      setMatches(data.matches);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load ESPN matches:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    fetchMatches();
  }, []);

  // Periodic polling every 3 minutes if auto-refresh is active
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchMatches();
    }, 180000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Dynamically generate league filter chips from today's real matches fetched from ESPN
  const leagueCounts: Record<string, number> = {};
  matches.forEach((m) => {
    const lName = m.league_name || 'Soccer';
    leagueCounts[lName] = (leagueCounts[lName] || 0) + 1;
  });

  const availableLeagues = [
    { id: 'all', label: `All Matches Today (${matches.length})` },
    ...Object.entries(leagueCounts).map(([name, count]) => ({
      id: name,
      label: `${name} (${count})`,
    })),
  ];

  const filteredMatches =
    selectedLeague === 'all'
      ? matches
      : matches.filter(
          (m) =>
            m.league_name.toLowerCase() === selectedLeague.toLowerCase() ||
            m.league_id.toLowerCase() === selectedLeague.toLowerCase()
        );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-lg shadow-black/20">
      {/* Top Banner: WAT Time, Controls & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Globe2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Matches of the Day (ESPN Feed • West Africa Time)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>WAT UTC+1</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Current WAT: <strong className="text-white font-mono">{watInfo.formatted} • {watInfo.timeWat}</strong> (Lagos, Abuja, Accra, Yaoundé)
            </p>
          </div>
        </div>

        {/* Buttons & Actions */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {onSendToBatchStudio && matches.length > 0 && (
            <button
              type="button"
              onClick={() => onSendToBatchStudio(filteredMatches)}
              className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shadow"
              title="Send these matches to Batch Studio to rank by GG & Over 2.5"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Rank All in Batch Studio ({filteredMatches.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchMatches()}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{loading ? 'Fetching ESPN...' : 'Refresh ESPN'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs by League (Dynamically populated from today's real matches) */}
      <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px] font-medium pb-1 scrollbar-thin">
        {availableLeagues.map((lg) => (
          <button
            key={lg.id}
            type="button"
            onClick={() => setSelectedLeague(lg.id)}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer shrink-0 border ${
              selectedLeague === lg.id
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {lg.label}
          </button>
        ))}
      </div>

      {/* Matches Horizontal Ribbon / Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {loading && matches.length === 0 ? (
          <div className="col-span-full py-6 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Connecting to ESPN sports endpoints and formatting to West Africa Time (WAT)...</span>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="col-span-full py-4 text-center text-xs text-slate-500">
            No matches found for {selectedLeague} today. Showing global scheduled fixtures.
          </div>
        ) : (
          filteredMatches.map((m) => (
            <div
              key={m.id}
              onClick={() =>
                onSelectMatch({
                  home: m.home_team,
                  away: m.away_team,
                  league: m.league_name,
                  date: m.date_wat,
                })
              }
              className="group bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 p-3 rounded-xl transition cursor-pointer space-y-2 relative"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="truncate max-w-[130px] font-semibold text-slate-300">
                  {m.league_name}
                </span>
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{m.kickoff_wat}</span>
                </span>
              </div>

              <div className="text-xs font-bold text-white space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="truncate">{m.home_team}</span>
                  {m.home_score !== undefined && (
                    <span className="font-mono text-emerald-400 ml-1">{m.home_score}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="truncate">{m.away_team}</span>
                  {m.away_score !== undefined && (
                    <span className="font-mono text-emerald-400 ml-1">{m.away_score}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                <span className="flex items-center space-x-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${m.status === 'In Progress' ? 'bg-amber-400 animate-ping' : 'bg-slate-600'}`}></span>
                  <span>{m.status}</span>
                </span>
                <span className="text-emerald-400 font-medium group-hover:underline flex items-center space-x-0.5">
                  <span>Analyze</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
