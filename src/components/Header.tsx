import React from 'react';
import { useOnlineModelSync } from '../ml/autoUpdateEngine';
import {
  Activity,
  Cpu,
  Database,
  Layers,
  Sparkles,
  BarChart3,
  Bot,
  Terminal,
  ShieldCheck,
  Flame,
  RefreshCw,
  Wifi,
  WifiOff,
  History,
  CalendarCheck,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeModelVersion: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeModelVersion,
}) => {
  const {
    isOnline,
    isSyncing,
    lastSyncTime,
    syncSummary,
    triggerManualSync,
  } = useOnlineModelSync();
  const navTabs = [
    { id: 'predictions', label: 'Match Dashboard', icon: Activity },
    { id: 'history', label: 'Prediction History & Yesterday', icon: CalendarCheck, isNew: true },
    { id: 'batch', label: '10-Odds Batches & Accumulators', icon: Layers },
    { id: 'form_tracker', label: 'Form Tracker & Forensics', icon: Flame },
    { id: 'data_lake', label: 'Data Lake & Coverage', icon: Database },
    { id: 'training', label: 'Training & Registry', icon: Cpu },
    { id: 'backtesting', label: 'Walk-Forward Backtest', icon: BarChart3 },
    { id: 'explainability', label: 'Explainability', icon: Sparkles },
    { id: 'bot_api', label: 'Node.js Bot API', icon: Bot },
    { id: 'python_cli', label: 'Python & CLI', icon: Terminal },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-white text-base tracking-tight font-sans">
                  FootyPredict <span className="text-emerald-400">ML Studio</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  PROD ML
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Multi-Target Historical Statistical &amp; Machine Learning Engine
              </p>
            </div>
          </div>

          {/* Model Status & Online Auto-Update Badges */}
          <div className="flex items-center space-x-2.5">
            {/* Online Auto-Update Live Indicator */}
            <div
              className={`flex items-center space-x-2 px-2.5 py-1 rounded-lg border text-[11px] transition ${
                isOnline
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
              title={syncSummary}
            >
              {isOnline ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="font-semibold hidden sm:inline">
                {isOnline ? 'Online Auto-Update' : 'Offline'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                ({lastSyncTime})
              </span>
              <button
                type="button"
                onClick={triggerManualSync}
                disabled={isSyncing}
                title="Force check & auto-update model with latest online match data"
                className="hover:text-white transition ml-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
              </button>
            </div>

            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Active Model:</span>
              <span className="font-mono font-bold text-emerald-400">{activeModelVersion}</span>
            </div>

            <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Leakage Guard:</span>
              <span className="text-emerald-400 font-bold">Zero Lookahead</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex space-x-1 overflow-x-auto scrollbar-none py-2 border-t border-slate-900 text-xs">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {'isNew' in tab && tab.isNew && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-slate-950">
                    NEW
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
