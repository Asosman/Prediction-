import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { computeDatasetCoverage, RAW_MATCH_RECORDS, ingestMatchRecord, resetDatasetToBaseline } from './src/data/masterMatchDataset';
import { extractPreMatchFeatures, computeMultiHorizonForm, normalizeTeamName } from './src/ml/featureEngineering';
import { generateMultiTargetPrediction } from './src/ml/predictionEngine';
import {
  getModelRegistry,
  setActiveModel,
  trainNewModelVersion,
} from './src/ml/modelRegistry';
import { runWalkForwardBacktest } from './src/ml/backtestEngine';
import { fetchEspnMatchesOfTheDay } from './src/services/espnService';
import { getTeamSquadIntelligence, updatePlayerInjuryStatus } from './src/ml/squadIntelligence';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy Google GenAI Client (for optional explanation assistance only, NOT for prediction probabilities)
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FootyPredict Multi-Target ML Engine',
    time: new Date().toISOString(),
  });
});

// ==========================================
// 1. CORE PREDICTION ENDPOINT (POST /api/predict)
// Designed for Web Dashboard, Node.js Bot, & CLI
// ==========================================
app.post('/api/predict', (req, res) => {
  try {
    const { home_team, away_team, league, date } = req.body;

    if (!home_team || !away_team) {
      return res.status(400).json({
        error: 'Missing required parameters: home_team and away_team are required.',
      });
    }

    const matchDate = date || new Date().toISOString().split('T')[0];

    // 1. Extract Leakage-Free Pre-Match Features
    const preFeatures = extractPreMatchFeatures({
      home_team,
      away_team,
      date: matchDate,
      league_id: league,
    });

    // 2. Generate Calibrated Multi-Target Predictions from ML Engine
    const prediction = generateMultiTargetPrediction(
      {
        home_team,
        away_team,
        league: league || 'Premier League',
        date: matchDate,
      },
      preFeatures
    );

    return res.json({
      success: true,
      prediction,
      features: preFeatures,
    });
  } catch (error: any) {
    console.error('Prediction calculation failed:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate match prediction.',
    });
  }
});

// ==========================================
// 2. BATCH PREDICTION ENDPOINT (POST /api/batch-predict)
// ==========================================
app.post('/api/batch-predict', (req, res) => {
  try {
    const { matches } = req.body; // Array of { home_team, away_team, league, date }

    if (!Array.isArray(matches) || matches.length === 0) {
      return res.status(400).json({
        error: 'Please provide an array of matches in the request body.',
      });
    }

    const results = matches.map((m: any) => {
      const matchDate = m.date || new Date().toISOString().split('T')[0];
      const preFeatures = extractPreMatchFeatures({
        home_team: m.home_team,
        away_team: m.away_team,
        date: matchDate,
        league_id: m.league,
      });

      return generateMultiTargetPrediction(
        {
          home_team: m.home_team,
          away_team: m.away_team,
          league: m.league || 'League Match',
          date: matchDate,
        },
        preFeatures
      );
    });

    return res.json({
      success: true,
      count: results.length,
      predictions: results,
    });
  } catch (error: any) {
    console.error('Batch prediction failed:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process batch predictions.',
    });
  }
});

// ==========================================
// 3. MODEL REGISTRY ENDPOINTS
// ==========================================
app.get('/api/models', (req, res) => {
  const models = getModelRegistry();
  res.json({ success: true, models });
});

app.post('/api/models/train', (req, res) => {
  try {
    const { target, algorithm, calibration_method } = req.body;
    if (!target || !algorithm) {
      return res.status(400).json({
        error: 'Target and algorithm are required for model training.',
      });
    }

    const newModel = trainNewModelVersion(target, algorithm, calibration_method);
    return res.json({
      success: true,
      message: `Trained and registered new model version: ${newModel.model_name}`,
      model: newModel,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Model training failed.' });
  }
});

app.post('/api/models/activate', (req, res) => {
  const { model_name } = req.body;
  if (!model_name) {
    return res.status(400).json({ error: 'model_name is required.' });
  }
  const updated = setActiveModel(model_name);
  return res.json({ success: true, models: updated });
});

// ==========================================
// 4. DATA LAKE SCHEMA & COVERAGE ENDPOINT
// ==========================================
app.get('/api/data/coverage', (req, res) => {
  try {
    const coverage = computeDatasetCoverage();
    res.json({ success: true, coverage });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4B. DYNAMIC MATCH INGESTION & AUTO-UPDATE
// Allows live ingestion of completed match results,
// automatically recalculating Elo & rolling 3/5/10 match horizons.
// ==========================================
app.post('/api/matches/ingest', (req, res) => {
  try {
    const {
      home_team,
      away_team,
      date,
      league_id,
      league_name,
      season,
      home_goals,
      away_goals,
      home_shots,
      away_shots,
      home_shots_on_target,
      away_shots_on_target,
      home_xg,
      away_xg,
      home_corners,
      away_corners,
      home_yellow_cards,
      away_yellow_cards,
    } = req.body;

    if (!home_team || !away_team || home_goals === undefined || away_goals === undefined) {
      return res.status(400).json({
        error: 'Missing required match ingestion fields: home_team, away_team, home_goals, away_goals.',
      });
    }

    const result = ingestMatchRecord({
      home_team,
      away_team,
      date: date || new Date().toISOString().split('T')[0],
      league_id: league_id || 'epl',
      league_name: league_name || 'Premier League',
      season: season || '2026/2027',
      home_goals: Number(home_goals),
      away_goals: Number(away_goals),
      home_shots: home_shots !== undefined ? Number(home_shots) : undefined,
      away_shots: away_shots !== undefined ? Number(away_shots) : undefined,
      home_shots_on_target: home_shots_on_target !== undefined ? Number(home_shots_on_target) : undefined,
      away_shots_on_target: away_shots_on_target !== undefined ? Number(away_shots_on_target) : undefined,
      home_xg: home_xg !== undefined ? Number(home_xg) : undefined,
      away_xg: away_xg !== undefined ? Number(away_xg) : undefined,
      home_corners: home_corners !== undefined ? Number(home_corners) : undefined,
      away_corners: away_corners !== undefined ? Number(away_corners) : undefined,
      home_yellow_cards: home_yellow_cards !== undefined ? Number(home_yellow_cards) : undefined,
      away_yellow_cards: away_yellow_cards !== undefined ? Number(away_yellow_cards) : undefined,
    });

    // Compute updated form for both teams
    const homeKey = normalizeTeamName(home_team);
    const awayKey = normalizeTeamName(away_team);

    const homeHistory = RAW_MATCH_RECORDS.filter(
      (m) => m.is_played && (normalizeTeamName(m.home_team) === homeKey || normalizeTeamName(m.away_team) === homeKey)
    );
    const awayHistory = RAW_MATCH_RECORDS.filter(
      (m) => m.is_played && (normalizeTeamName(m.home_team) === awayKey || normalizeTeamName(m.away_team) === awayKey)
    );

    const homeForm = computeMultiHorizonForm(home_team, homeHistory);
    const awayForm = computeMultiHorizonForm(away_team, awayHistory);

    return res.json({
      success: true,
      message: `Successfully ingested ${home_team} ${home_goals} - ${away_goals} ${away_team} into Data Lake.`,
      result,
      updated_form: {
        home: homeForm,
        away: awayForm,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to ingest match result.' });
  }
});

// GET Team Multi-Horizon Form
app.get('/api/teams/form', (req, res) => {
  try {
    const team = req.query.team as string;
    if (!team) {
      return res.status(400).json({ error: 'Query parameter "team" is required.' });
    }

    const teamKey = normalizeTeamName(team);
    const teamHistory = RAW_MATCH_RECORDS.filter(
      (m) => m.is_played && (normalizeTeamName(m.home_team) === teamKey || normalizeTeamName(m.away_team) === teamKey)
    );

    const form = computeMultiHorizonForm(team, teamHistory);
    return res.json({ success: true, form });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to compute team form.' });
  }
});

// ==========================================
// 4C. ESPN LIVE MATCHES OF THE DAY (WEST AFRICA TIME UTC+1)
// ==========================================
app.get('/api/espn/matches-of-the-day', async (req, res) => {
  try {
    const { date, leagues } = req.query;
    const leagueList = leagues ? (leagues as string).split(',') : undefined;
    const result = await fetchEspnMatchesOfTheDay(date as string, leagueList);
    return res.json(result);
  } catch (error: any) {
    console.error('ESPN fetch error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch ESPN matches.' });
  }
});

// ==========================================
// 4D. SQUAD INTELLIGENCE, INJURIES & COACH WELLBEING
// ==========================================
app.get('/api/squad/intelligence', (req, res) => {
  try {
    const team = req.query.team as string;
    if (!team) return res.status(400).json({ error: 'team query parameter is required.' });
    const profile = getTeamSquadIntelligence(team);
    return res.json({ success: true, profile });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/squad/injury-update', (req, res) => {
  try {
    const { team, injury } = req.body;
    if (!team || !injury) return res.status(400).json({ error: 'team and injury are required.' });
    const updated = updatePlayerInjuryStatus(team, injury);
    return res.json({ success: true, profile: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Reset Data Lake
app.post('/api/matches/reset', (req, res) => {
  try {
    resetDatasetToBaseline();
    return res.json({ success: true, message: 'Dataset & Elo ratings successfully reset to baseline.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. WALK-FORWARD BACKTEST ENDPOINT
// ==========================================
app.get('/api/backtest', (req, res) => {
  try {
    const { league, season } = req.query;
    const summary = runWalkForwardBacktest(
      RAW_MATCH_RECORDS,
      league as string,
      season as string
    );
    res.json({ success: true, backtest: summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 6. OPTIONAL AI EXPLANATION & TACTICAL ASSISTANCE
// (Gemini provides NL commentary only; does NOT guess predictions)
// ==========================================
app.post('/api/ai/explain-prediction', async (req, res) => {
  try {
    const { prediction, features } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback if Gemini is disabled or key not provided
      return res.json({
        success: true,
        summary: `Statistical ML Model analysis for ${prediction.match.home} vs ${prediction.match.away}. Predicted BTTS YES (${(prediction.btts.yes * 100).toFixed(1)}%), Over 2.5 Goals (${(prediction.over_2_5.over * 100).toFixed(1)}%), and ${prediction.result.home > prediction.result.away ? prediction.match.home : prediction.match.away} win edge with ${prediction.shots.expected_total} total expected shots.`,
        tacticalKey: 'Dixon-Coles GLM weighted by rolling xG and dynamic Elo power ratings.',
      });
    }

    const ai = getGenAI();

    const prompt = `You are a Senior Quantitative Football Analyst.
Provide a concise, professional 2-paragraph tactical summary explaining the mathematical prediction below.
Do NOT alter the numbers or guess your own predictions. Explain the statistical drivers:

Fixture: ${prediction.match.home} vs ${prediction.match.away} (${prediction.match.league})
- 1X2 Probabilities: Home ${(prediction.result.home * 100).toFixed(1)}% | Draw ${(prediction.result.draw * 100).toFixed(1)}% | Away ${(prediction.result.away * 100).toFixed(1)}%
- BTTS: YES ${(prediction.btts.yes * 100).toFixed(1)}% | NO ${(prediction.btts.no * 100).toFixed(1)}%
- Over 2.5 Goals: ${(prediction.over_2_5.over * 100).toFixed(1)}%
- Expected Total Shots: ${prediction.shots.expected_total}
- Elo Difference: ${features?.elo_difference || 0} pts
- Home xG Form: ${features?.home_last_5_xg_avg?.toFixed(2) || 1.6} | Away xG Form: ${features?.away_last_5_xg_avg?.toFixed(2) || 1.2}

Format as JSON:
{
  "summary": "2-sentence high-level executive summary of the model output",
  "tacticalKey": "Why the xG, shot volume, and Elo ratings produced this distribution",
  "marketValueAngle": "Where the model finds probability discrepancy vs standard bookmaker margins"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const text = response.text || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { summary: text };
    }

    return res.json({ success: true, ai_explanation: parsed });
  } catch (error: any) {
    console.error('AI explanation failed (gracefully falling back):', error);
    return res.json({
      success: true,
      summary: 'Statistical prediction generated successfully via Dixon-Coles GLM + LightGBM Ensemble.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FootyPredict ML Platform server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
