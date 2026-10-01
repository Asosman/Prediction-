import React, { useState } from 'react';
import {
  Bot,
  Terminal,
  Copy,
  Check,
  Play,
  Code2,
  Send,
  Loader2,
} from 'lucide-react';

export const NodeBotIntegrationHub: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [testPayload, setTestPayload] = useState<string>(
    JSON.stringify(
      {
        home_team: 'Arsenal',
        away_team: 'Chelsea',
        league: 'Premier League',
        date: '2026-09-20',
      },
      null,
      2
    )
  );
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleTestApi = async () => {
    setIsLoading(true);
    try {
      const parsed = JSON.parse(testPayload);
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setApiResponse(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const nodeSnippet = `// ============================================================================
// FootyPredict Bot Client (Node.js / Express / Facebook Auto-Poster)
// ============================================================================

import axios from 'axios';

const PREDICTION_API_URL = 'http://localhost:3000/api/predict';

async function fetchMatchPrediction(homeTeam, awayTeam, league) {
  try {
    const response = await axios.post(PREDICTION_API_URL, {
      home_team: homeTeam,
      away_team: awayTeam,
      league: league,
      date: new Date().toISOString().split('T')[0]
    });

    const { prediction } = response.data;

    console.log(\`[BOT] Prediction for \${homeTeam} vs \${awayTeam}:\`);
    console.log(\`  - 1X2 Probabilities: H \${(prediction.result.home * 100).toFixed(1)}% | D \${(prediction.result.draw * 100).toFixed(1)}% | A \${(prediction.result.away * 100).toFixed(1)}%\`);
    console.log(\`  - BTTS YES: \${(prediction.btts.yes * 100).toFixed(1)}%\`);
    console.log(\`  - Over 2.5 Goals: \${(prediction.over_2_5.over * 100).toFixed(1)}%\`);
    console.log(\`  - Expected Shots: \${prediction.shots.expected_total}\`);
    console.log(\`  - BTTS + Over 2.5: \${(prediction.combinations.btts_and_over_2_5 * 100).toFixed(1)}%\`);

    return prediction;
  } catch (error) {
    console.error('[BOT ERROR] Failed to fetch predictions:', error.message);
  }
}

// Example Bot Trigger for Matchday
fetchMatchPrediction('Arsenal', 'Chelsea', 'Premier League');
`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm text-white">Node.js Bot &amp; Automation Integration Hub</h3>
              <p className="text-[11px] text-slate-400">
                Direct integration with external Node.js football live-score &amp; Facebook posting bots
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            REST API v1
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          The FootyPredict backend exposes high-performance REST API endpoints (<code>POST /api/predict</code> and <code>POST /api/batch-predict</code>) designed specifically to return calibrated probabilities, fair odds, expected shots, and combination joint distributions directly to your automated bot scripts.
        </p>
      </div>

      {/* Live Interactive API Test Bench */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Live API Test Bench (POST /api/predict)
            </h4>
          </div>
          <button
            onClick={handleTestApi}
            disabled={isLoading}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Execute Request</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1">Request Payload (JSON)</label>
            <textarea
              rows={8}
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-emerald-400 font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1">Live Engine Response</label>
            <pre className="w-full h-[168px] bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 font-mono overflow-y-auto scrollbar-thin">
              {apiResponse || '// Click "Execute Request" to test live prediction endpoint'}
            </pre>
          </div>
        </div>
      </div>

      {/* Copyable Node.js Bot Code Snippet */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Ready-to-Use Node.js Bot Integration Client
            </h4>
          </div>
          <button
            onClick={() => handleCopy(nodeSnippet, 1)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer flex items-center space-x-1"
          >
            {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedIndex === 1 ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
          {nodeSnippet}
        </pre>
      </div>
    </div>
  );
};
