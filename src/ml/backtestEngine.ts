// ============================================================================
// Chronological Walk-Forward Backtesting & Calibration Engine
// Evaluates historical fixtures strictly out-of-sample with reliability curves
// ============================================================================

import { RawMatchRecord, BacktestSummary } from '../types';
import { RAW_MATCH_RECORDS } from '../data/masterMatchDataset';
import { extractPreMatchFeatures } from './featureEngineering';
import { generateMultiTargetPrediction } from './predictionEngine';

export function runWalkForwardBacktest(
  matches: RawMatchRecord[] = RAW_MATCH_RECORDS,
  filterLeague?: string,
  filterSeason?: string
): BacktestSummary {
  // Filter played matches
  let playedMatches = matches.filter((m) => m.is_played);
  if (filterLeague && filterLeague !== 'all') {
    playedMatches = playedMatches.filter((m) => m.league_id === filterLeague);
  }
  if (filterSeason && filterSeason !== 'all') {
    playedMatches = playedMatches.filter((m) => m.season === filterSeason);
  }

  // Sort ascending by match date
  playedMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let bttsHits = 0;
  let bttsLogLossSum = 0;
  let bttsBrierSum = 0;

  let over25Hits = 0;
  let over25LogLossSum = 0;
  let over25BrierSum = 0;

  let resultHits = 0;
  let resultLogLossSum = 0;
  let resultBrierSum = 0;

  let shotsAbsErrorSum = 0;
  let shotsSqErrorSum = 0;
  let shotsCount = 0;

  const totalN = playedMatches.length;

  // Calibration buckets: [0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0]
  const buckets = [
    { range: '0.0 - 0.2', min: 0.0, max: 0.2, predSum: 0, actualHits: 0, count: 0 },
    { range: '0.2 - 0.4', min: 0.2, max: 0.4, predSum: 0, actualHits: 0, count: 0 },
    { range: '0.4 - 0.6', min: 0.4, max: 0.6, predSum: 0, actualHits: 0, count: 0 },
    { range: '0.6 - 0.8', min: 0.6, max: 0.8, predSum: 0, actualHits: 0, count: 0 },
    { range: '0.8 - 1.0', min: 0.8, max: 1.0, predSum: 0, actualHits: 0, count: 0 },
  ];

  // League-specific accumulator
  const leagueStatsMap = new Map<string, {
    name: string;
    matches: number;
    bttsHits: number;
    over25Hits: number;
    resultHits: number;
    shotsAbsError: number;
    shotsCount: number;
    tier: 'Tier A' | 'Tier B' | 'Tier C';
  }>();

  playedMatches.forEach((m) => {
    // 1. Generate PRE-MATCH features using strictly past matches
    const preFeatures = extractPreMatchFeatures(
      {
        home_team: m.home_team,
        away_team: m.away_team,
        date: m.date,
        match_id: m.match_id,
        league_id: m.league_id,
      },
      matches
    );

    // 2. Generate Prediction
    const pred = generateMultiTargetPrediction(
      {
        home_team: m.home_team,
        away_team: m.away_team,
        date: m.date,
        league: m.league_name,
      },
      preFeatures
    );

    // 3. Ground Truth Evaluation
    const actualHomeGoals = m.home_goals ?? 0;
    const actualAwayGoals = m.away_goals ?? 0;
    const actualTotalGoals = actualHomeGoals + actualAwayGoals;
    const actualBtts = actualHomeGoals > 0 && actualAwayGoals > 0 ? 1 : 0;
    const actualOver25 = actualTotalGoals >= 3 ? 1 : 0;
    const actual1x2 = actualHomeGoals > actualAwayGoals ? 'home' : actualHomeGoals === actualAwayGoals ? 'draw' : 'away';

    // BTTS Evaluation
    const predBttsYes = pred.btts.yes;
    const predictedBttsClass = predBttsYes >= 0.5 ? 1 : 0;
    if (predictedBttsClass === actualBtts) bttsHits++;
    const bttsP = Math.max(0.01, Math.min(0.99, actualBtts === 1 ? predBttsYes : 1 - predBttsYes));
    bttsLogLossSum += -Math.log(bttsP);
    bttsBrierSum += Math.pow(predBttsYes - actualBtts, 2);

    // Over 2.5 Evaluation
    const predOver25 = pred.over_2_5.over;
    const predictedOver25Class = predOver25 >= 0.5 ? 1 : 0;
    if (predictedOver25Class === actualOver25) over25Hits++;
    const overP = Math.max(0.01, Math.min(0.99, actualOver25 === 1 ? predOver25 : 1 - predOver25));
    over25LogLossSum += -Math.log(overP);
    over25BrierSum += Math.pow(predOver25 - actualOver25, 2);

    // 1X2 Evaluation
    let predicted1x2 = 'home';
    if (pred.result.draw > pred.result.home && pred.result.draw > pred.result.away) predicted1x2 = 'draw';
    else if (pred.result.away > pred.result.home && pred.result.away > pred.result.draw) predicted1x2 = 'away';

    if (predicted1x2 === actual1x2) resultHits++;
    const resultP =
      actual1x2 === 'home' ? pred.result.home : actual1x2 === 'draw' ? pred.result.draw : pred.result.away;
    resultLogLossSum += -Math.log(Math.max(0.01, resultP));
    const actualVector = [actual1x2 === 'home' ? 1 : 0, actual1x2 === 'draw' ? 1 : 0, actual1x2 === 'away' ? 1 : 0];
    const predVector = [pred.result.home, pred.result.draw, pred.result.away];
    resultBrierSum +=
      Math.pow(predVector[0] - actualVector[0], 2) +
      Math.pow(predVector[1] - actualVector[1], 2) +
      Math.pow(predVector[2] - actualVector[2], 2);

    // Shots Evaluation
    if (m.total_shots !== undefined) {
      const err = Math.abs(pred.shots.expected_total - m.total_shots);
      shotsAbsErrorSum += err;
      shotsSqErrorSum += err * err;
      shotsCount++;
    }

    // Add to calibration curve buckets for BTTS & Over2.5
    [
      { prob: predBttsYes, actual: actualBtts },
      { prob: predOver25, actual: actualOver25 },
    ].forEach(({ prob, actual }) => {
      const b = buckets.find((b) => prob >= b.min && prob < b.max) || buckets[buckets.length - 1];
      b.predSum += prob;
      b.actualHits += actual;
      b.count++;
    });

    // League breakdown
    if (!leagueStatsMap.has(m.league_id)) {
      leagueStatsMap.set(m.league_id, {
        name: m.league_name,
        matches: 0,
        bttsHits: 0,
        over25Hits: 0,
        resultHits: 0,
        shotsAbsError: 0,
        shotsCount: 0,
        tier: preFeatures.data_tier,
      });
    }
    const lObj = leagueStatsMap.get(m.league_id)!;
    lObj.matches++;
    if (predictedBttsClass === actualBtts) lObj.bttsHits++;
    if (predictedOver25Class === actualOver25) lObj.over25Hits++;
    if (predicted1x2 === actual1x2) lObj.resultHits++;
    if (m.total_shots !== undefined) {
      lObj.shotsAbsError += Math.abs(pred.shots.expected_total - m.total_shots);
      lObj.shotsCount++;
    }
  });

  const validN = Math.max(1, totalN);

  const calibration_curve = buckets.map((b) => ({
    prob_range: b.range,
    predicted_avg: b.count > 0 ? Number((b.predSum / b.count).toFixed(3)) : (b.min + b.max) / 2,
    actual_rate: b.count > 0 ? Number((b.actualHits / b.count).toFixed(3)) : (b.min + b.max) / 2,
    samples: b.count,
  }));

  const by_league = Array.from(leagueStatsMap.entries()).map(([id, l]) => ({
    league_name: l.name,
    matches: l.matches,
    btts_acc: Number(((l.bttsHits / Math.max(1, l.matches)) * 100).toFixed(1)),
    over25_acc: Number(((l.over25Hits / Math.max(1, l.matches)) * 100).toFixed(1)),
    result_acc: Number(((l.resultHits / Math.max(1, l.matches)) * 100).toFixed(1)),
    shots_mae: Number((l.shotsAbsError / Math.max(1, l.shotsCount)).toFixed(2)),
    data_tier: l.tier,
  }));

  return {
    total_matches: totalN,
    time_range: {
      start: playedMatches[0]?.date || '2024-08-16',
      end: playedMatches[playedMatches.length - 1]?.date || '2024-11-10',
    },
    overall: {
      btts_accuracy: Number(((bttsHits / validN) * 100).toFixed(1)),
      btts_log_loss: Number((bttsLogLossSum / validN).toFixed(3)),
      btts_brier: Number((bttsBrierSum / validN).toFixed(3)),
      over25_accuracy: Number(((over25Hits / validN) * 100).toFixed(1)),
      over25_log_loss: Number((over25LogLossSum / validN).toFixed(3)),
      over25_brier: Number((over25BrierSum / validN).toFixed(3)),
      result_accuracy: Number(((resultHits / validN) * 100).toFixed(1)),
      result_log_loss: Number((resultLogLossSum / validN).toFixed(3)),
      result_brier: Number((resultBrierSum / validN).toFixed(3)),
      shots_mae: Number((shotsAbsErrorSum / Math.max(1, shotsCount)).toFixed(2)),
      shots_rmse: Number((Math.sqrt(shotsSqErrorSum / Math.max(1, shotsCount))).toFixed(2)),
    },
    by_league,
    by_season: [
      {
        season: '2024/2025',
        matches: totalN,
        btts_acc: Number(((bttsHits / validN) * 100).toFixed(1)),
        over25_acc: Number(((over25Hits / validN) * 100).toFixed(1)),
        result_acc: Number(((resultHits / validN) * 100).toFixed(1)),
        log_loss: Number((bttsLogLossSum / validN).toFixed(3)),
      },
    ],
    calibration_curve,
  };
}
