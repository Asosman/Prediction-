// ============================================================================
// Squad & Coach Intelligence Hub Modal Component
// Real-time tracking and simulation of player injuries, fitness, and coach well-being
// ============================================================================

import React, { useState } from 'react';
import { SquadIntelligenceProfile, PlayerInjury } from '../types';
import { getTeamSquadIntelligence, updatePlayerInjuryStatus } from '../ml/squadIntelligence';
import {
  ShieldAlert,
  UserCheck,
  UserX,
  Activity,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface SquadIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeTeam: string;
  awayTeam: string;
  onSquadUpdated?: () => void;
}

export const SquadIntelligenceModal: React.FC<SquadIntelligenceModalProps> = ({
  isOpen,
  onClose,
  homeTeam,
  awayTeam,
  onSquadUpdated,
}) => {
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPosition, setNewPosition] = useState<'GK' | 'DEF' | 'MID' | 'FWD'>('FWD');
  const [newStatus, setNewStatus] = useState<'Out' | 'Doubtful' | 'Suspended'>('Out');
  const [newReason, setNewReason] = useState('');

  if (!isOpen) return null;

  const currentTeamName = selectedTeam === 'home' ? homeTeam : awayTeam;
  const profile = getTeamSquadIntelligence(currentTeamName);

  const handleAddInjury = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const penalty =
      newPosition === 'FWD' || newPosition === 'MID'
        ? newStatus === 'Out' ? -0.12 : -0.06
        : newStatus === 'Out' ? -0.10 : -0.05;

    const injury: PlayerInjury = {
      player_name: newPlayerName.trim(),
      position: newPosition,
      status: newStatus,
      importance: 'Key Player',
      reason: newReason.trim() || 'Tactical medical report confirmation',
      impact_score: penalty,
    };

    updatePlayerInjuryStatus(currentTeamName, injury);
    setNewPlayerName('');
    setNewReason('');
    if (onSquadUpdated) onSquadUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 text-slate-200 overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Squad Intelligence &amp; Live Injury Hub</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  REAL-TIME SYNC
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitor team fitness, track player absences, and simulate tactical impact on match predictions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Team Selection Toggle */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedTeam('home')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-2 ${
              selectedTeam === 'home'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{homeTeam} (Home Squad)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTeam('away')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-2 ${
              selectedTeam === 'away'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{awayTeam} (Away Squad)</span>
          </button>
        </div>

        {/* Coach & Well-being Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Manager &amp; Head Coach</span>
              <span className="text-sm font-bold text-white">{profile.coach.name}</span>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                {profile.coach.wellbeing_status}
              </span>
              <span className="text-[10px] text-slate-500 block font-mono">Win Rate: {profile.coach.win_rate_pct}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Tactical System:</span>
              <span className="font-semibold text-slate-200">{profile.coach.tactical_style}</span>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 block">Squad Morale Index:</span>
                <span className="font-bold text-emerald-400 text-sm">{profile.morale_score} / 100</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Fitness Level:</span>
                <span className="font-bold text-cyan-400 text-sm">{profile.squad_fitness_pct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Active Absences */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Reported Player Injuries &amp; Suspensions ({profile.injuries.length}):
            </h4>
            <span className="text-[11px] font-mono text-rose-400">
              Cumulative Attack Penalty: {(profile.injury_attack_penalty * 100).toFixed(0)}% | Defense: {(profile.injury_defense_penalty * 100).toFixed(0)}%
            </span>
          </div>

          {profile.injuries.length === 0 ? (
            <div className="text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>No major injury or suspension flags reported. Full senior starting squad is fit.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {profile.injuries.map((inj, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">{inj.player_name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300 font-semibold">{inj.position}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${inj.status === 'Out' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                        {inj.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">{inj.reason}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-rose-400 block">{(inj.impact_score * 100).toFixed(0)}%</span>
                    <span className="text-[10px] text-slate-500">{inj.importance}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Simulation: Add / Report New Absence */}
        <form onSubmit={handleAddInjury} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Add / Simulate New Player Injury / Suspension:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="e.g. Bukayo Saka, Rodri, Vinicius Jr"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <select
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="FWD">Forward (FWD)</option>
                <option value="MID">Midfielder (MID)</option>
                <option value="DEF">Defender (DEF)</option>
                <option value="GK">Goalkeeper (GK)</option>
              </select>
            </div>

            <div>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Out">Out (Confirmed)</option>
                <option value="Doubtful">Doubtful (50%)</option>
                <option value="Suspended">Suspended (Red card)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Medical reason: e.g. Hamstring strain, knee injury, yellow accumulation"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply &amp; Re-Predict</span>
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs text-slate-400">
          <span className="font-mono text-[11px]">
            Engine: Live Squad &amp; Tactical Intelligence
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
