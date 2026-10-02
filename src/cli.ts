#!/usr/bin/env node

/**
 * FootyPredict CLI - Production Football Prediction Machine Learning Terminal Tool
 * 
 * Usage:
 *   npm run cli                           # Interactive Navigation Menu
 *   npm run cli -- --today                # View Today's 10-Odds Batches
 *   npm run cli -- --yesterday            # View Yesterday's Evaluated Scorecard
 *   npm run cli -- "Arsenal" "Chelsea"    # Predict custom matchup
 */

import * as readline from 'readline';
import { RAW_MATCH_RECORDS, computeDatasetCoverage, ingestMatchRecord } from './data/masterMatchDataset';
import { extractPreMatchFeatures, computeMultiHorizonForm } from './ml/featureEngineering';
import { generateMultiTargetPrediction } from './ml/predictionEngine';
import { runWalkForwardBacktest } from './ml/backtestEngine';
import { getModelRegistry } from './ml/modelRegistry';
import { executeModelAutoUpdate } from './ml/autoUpdateEngine';
import { detectTeamLeague } from './ml/teamProfiles';
import { getTeamSquadIntelligence } from './ml/squadIntelligence';
import {
  fetchEspnPreviousMatches,
  fetchEspnTeamComprehensiveData,
  fetchEspnTeamPastMatches,
  syncEspnHistoricalDataset,
  fetchEspnAllBreakingNews,
} from './services/espnService';
import {
  generateTodaysTenOddsBatches,
  evaluateArchivedBatches,
  loadArchivedBatches,
  OddsBatch,
} from './ml/batchOddsEngine';
import {
  evaluatePredictionsForDate,
  getYesterdaysPredictionReport,
  getHistoricalPerformanceByDate,
  loadPredictionsHistory,
} from './ml/predictionHistoryEngine';

// ANSI terminal color helpers
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  emerald: '\x1b[38;5;48m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

function printBanner() {
  console.log(`
${c.emerald}${c.bold}╔═══════════════════════════════════════════════════════════════════════════════╗
║                   ⚽  FOOTYPREDICT ML PLATFORM CLI  ⚽                       ║
║         Multi-Target Machine Learning Engine • Zero Data Leakage             ║
╚═══════════════════════════════════════════════════════════════════════════════╝${c.reset}`);
}

function printHelp() {
  console.log(`
${c.bold}COMMAND-LINE USAGE:${c.reset}
  ${c.cyan}npm run cli${c.reset}                                 Open interactive numbered navigation menu
  ${c.cyan}npm run cli -- --today${c.reset}                      View today's predictions separated in 10-odds batches
  ${c.cyan}npm run cli -- --yesterday${c.reset}                  View yesterday's predictions outcome & success indicators
  ${c.cyan}npm run cli -- --history${c.reset}                    Audit historical prediction accuracy by date
  ${c.cyan}npm run cli -- --news${c.reset}                       View latest ESPN breaking football happenings
  ${c.cyan}npm run cli -- "Arsenal" "Chelsea"${c.reset}          Predict matchup & view ESPN comprehensive intelligence
  ${c.cyan}npm run cli -- --backtest${c.reset}                   Run out-of-sample walk-forward validation
  ${c.cyan}npm run cli -- --coverage${c.reset}                   Print Data Lake coverage & tier stats
  ${c.cyan}npm run cli -- --models${c.reset}                     List registered ML models and active status
  ${c.cyan}npm run dev${c.reset}                                 Start full Web UI + Node.js API (Port 3000)
`);
}

/**
 * Renders a comprehensive, beautifully formatted match card with full ESPN intelligence
 */
async function displayMatchPrediction(pred: ReturnType<typeof generateMultiTargetPrediction>, preFeatures?: any) {
  const homeWinPct = (pred.result.home * 100).toFixed(1);
  const drawPct = (pred.result.draw * 100).toFixed(1);
  const awayWinPct = (pred.result.away * 100).toFixed(1);
  const bttsYesPct = (pred.btts.yes * 100).toFixed(1);
  const over25Pct = (pred.over_2_5.over * 100).toFixed(1);
  const under25Pct = (pred.over_2_5.under * 100).toFixed(1);

  const fairOddsHome = (1 / Math.max(0.001, pred.result.home)).toFixed(2);
  const fairOddsDraw = (1 / Math.max(0.001, pred.result.draw)).toFixed(2);
  const fairOddsAway = (1 / Math.max(0.001, pred.result.away)).toFixed(2);
  const fairOddsBtts = (1 / Math.max(0.001, pred.btts.yes)).toFixed(2);
  const fairOddsOver = (1 / Math.max(0.001, pred.over_2_5.over)).toFixed(2);

  // Ensure preFeatures is available directly from the ML model
  const modelFeatures =
    preFeatures ||
    extractPreMatchFeatures({
      home_team: pred.match.home,
      away_team: pred.match.away,
      date: pred.match.date,
      league_id: pred.match.league,
    });

  // Retrieve Comprehensive ESPN Telemetry for both teams
  const [homeData, awayData] = await Promise.all([
    fetchEspnTeamComprehensiveData(pred.match.home, pred.match.league),
    fetchEspnTeamComprehensiveData(pred.match.away, pred.match.league),
  ]);

  // Determine Primary High-Accuracy Professional Prediction & Forensic Reason
  let primaryPick = '';
  let primaryReason = '';
  const timeDisplay = pred.match.date;

  if (pred.result.home >= 0.55) {
    primaryPick = `${pred.match.home} to Win (1)`;
    primaryReason = `Model identifies decisive ${(pred.result.home * 100).toFixed(0)}% Home Win probability with superior home xG generation (${pred.expected_goals.lambda_home.toFixed(2)}) versus away defense (${pred.expected_goals.mu_away.toFixed(2)}).`;
  } else if (pred.result.away >= 0.50) {
    primaryPick = `${pred.match.away} to Win (2)`;
    primaryReason = `Away dominance indicated at ${(pred.result.away * 100).toFixed(0)}% backed by acute away form momentum and positive Elo differential.`;
  } else if (pred.double_chance.dc_1x >= 0.70) {
    primaryPick = `Double Chance: ${pred.match.home} Win or Draw (1X)`;
    primaryReason = `High fortress safety factor ${(pred.double_chance.dc_1x * 100).toFixed(0)}% ensuring Home Win or Draw resilience based on home clean-sheet and defensive solidarity metrics.`;
  } else if (pred.double_chance.dc_x2 >= 0.68) {
    primaryPick = `Double Chance: ${pred.match.away} Win or Draw (X2)`;
    primaryReason = `Road safety rating of ${(pred.double_chance.dc_x2 * 100).toFixed(0)}% favoring Away side to avoid defeat based on acute transition threat.`;
  } else if (pred.btts.yes >= 0.55) {
    primaryPick = 'Both Teams To Score - YES (GG)';
    primaryReason = `Both attacking units exhibiting high offensive output with combined expected goals (${pred.expected_goals.total.toFixed(2)}) yielding ${(pred.btts.yes * 100).toFixed(0)}% BTTS probability.`;
  } else if (pred.over_2_5.over >= 0.55) {
    primaryPick = 'Over 2.5 Goals';
    primaryReason = `Aggressive attacking metrics and high expected shot volume (${pred.shots.expected_total.toFixed(1)} shots) suggest an open fixture exceeding 2.5 goals (${(pred.over_2_5.over * 100).toFixed(0)}%).`;
  } else {
    primaryPick = pred.result.home >= pred.result.away ? `Double Chance: ${pred.match.home} Win or Draw (1X)` : `Double Chance: ${pred.match.away} Win or Draw (X2)`;
    primaryReason = `Balanced tactical matchup where defensive stability and venue split recommend Double Chance for maximum risk-adjusted reliability.`;
  }

  console.log(`\n${c.bold}${c.green}╔═══════════════════════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.green}║        🏟️   FOOTYPREDICT 35-YEAR PROFESSIONAL MATCH FORENSICS                ║${c.reset}`);
  console.log(`${c.bold}${c.green}╚═══════════════════════════════════════════════════════════════════════════════╝${c.reset}`);

  console.log(`  ${c.bold}MATCHUP:${c.reset}  ${c.bold}${c.cyan}${pred.match.home.toUpperCase()}${c.reset} vs ${c.bold}${c.magenta}${pred.match.away.toUpperCase()}${c.reset}`);
  console.log(`  ${c.bold}LEAGUE:${c.reset}   ${c.yellow}${pred.match.league}${c.reset}  |  ${c.bold}DATE:${c.reset} ${pred.match.date}`);
  console.log(`  ${c.bold}METADATA:${c.reset} Model: ${pred.model_info.active_version} | Data Tier: ${pred.data_tier} | Calibration: ${pred.model_info.calibration_method}`);
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // 1. Primary Formatted Prediction Header
  console.log(`  ${c.bold}🎯 PRIMARY PREDICTION & FORENSIC RECOMMENDATION:${c.reset}`);
  console.log(`     ${c.bold}${c.yellow}${timeDisplay}:${c.reset} ${c.bold}${c.cyan}${pred.match.home}${c.reset} vs ${c.bold}${c.magenta}${pred.match.away}${c.reset} ${c.bold}${c.green}(${primaryPick})${c.reset}`);
  console.log(`     ${c.bold}Reason:${c.reset} ${primaryReason}`);
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // 2. Dressing Room Atmosphere (Peace vs Crisis/Chaos)
  console.log(`  ${c.bold}🚪 DRESSING ROOM ATMOSPHERE (PEACE vs CHAOS):${c.reset}`);
  const homePeaceBadge = homeData.dressing_room.status === 'Crisis & Turmoil' ? `${c.red}⚠️ CRISIS & CHAOS` : `${c.green}🕊️ ${homeData.dressing_room.status.toUpperCase()}`;
  const awayPeaceBadge = awayData.dressing_room.status === 'Crisis & Turmoil' ? `${c.red}⚠️ CRISIS & CHAOS` : `${c.green}🕊️ ${awayData.dressing_room.status.toUpperCase()}`;
  console.log(`     • ${c.bold}${c.cyan}${homeData.team_name}${c.reset}: ${homePeaceBadge}${c.reset} (Morale Index: ${c.yellow}${homeData.dressing_room.morale_index}/100${c.reset})`);
  console.log(`       Report: ${c.dim}${homeData.dressing_room.harmony_report}${c.reset}`);
  console.log(`     • ${c.bold}${c.magenta}${awayData.team_name}${c.reset}: ${awayPeaceBadge}${c.reset} (Morale Index: ${c.yellow}${awayData.dressing_room.morale_index}/100${c.reset})`);
  console.log(`       Report: ${c.dim}${awayData.dressing_room.harmony_report}${c.reset}`);
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // 3. Key Players & Injuries / Suspensions
  console.log(`  ${c.bold}🌟 KEY ROSTER STARS & INJURY / SUSPENSION REPORT:${c.reset}`);
  console.log(`     • ${c.bold}${c.cyan}${homeData.team_name}${c.reset} Stars: ${c.emerald}${homeData.key_players.join(', ')}${c.reset}`);
  if (homeData.injuries_and_suspensions.length === 0) {
    console.log(`       Health: ${c.green}Full squad available, zero major fitness concerns.${c.reset}`);
  } else {
    const injStr = homeData.injuries_and_suspensions.map((i) => `${i.player_name} [${i.status}: ${i.reason}]`).join(' | ');
    console.log(`       Health: ${c.yellow}${injStr}${c.reset}`);
  }

  console.log(`     • ${c.bold}${c.magenta}${awayData.team_name}${c.reset} Stars: ${c.emerald}${awayData.key_players.join(', ')}${c.reset}`);
  if (awayData.injuries_and_suspensions.length === 0) {
    console.log(`       Health: ${c.green}Full squad available, zero major fitness concerns.${c.reset}`);
  } else {
    const injStr = awayData.injuries_and_suspensions.map((i) => `${i.player_name} [${i.status}: ${i.reason}]`).join(' | ');
    console.log(`       Health: ${c.yellow}${injStr}${c.reset}`);
  }
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // 4. Home Performance vs Away Performance Splits
  console.log(`  ${c.bold}🏟️ HOME vs AWAY VENUE SPLITS & EFFICIENCY:${c.reset}`);
  const hp = homeData.home_performance;
  const ap = awayData.away_performance;
  console.log(`     • ${c.bold}${c.cyan}${homeData.team_name} (At Home):${c.reset}  Win Rate: ${c.green}${hp.win_pct}%${c.reset} | ${hp.wins}W-${hp.draws}D-${hp.losses}L | Scored: ${hp.goals_scored_avg}/gm | Conceded: ${hp.goals_conceded_avg}/gm | Clean Sheets: ${hp.clean_sheets_pct}%`);
  console.log(`     • ${c.bold}${c.magenta}${awayData.team_name} (On Road):${c.reset}   Win Rate: ${c.green}${ap.win_pct}%${c.reset} | ${ap.wins}W-${ap.draws}D-${ap.losses}L | Scored: ${ap.goals_scored_avg}/gm | Conceded: ${ap.goals_conceded_avg}/gm | Clean Sheets: ${ap.clean_sheets_pct}%`);
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // 5. Multi-Horizon Form (L3 • L5 • L10) & Red Cards Discipline
  console.log(`  ${c.bold}📈 MULTI-HORIZON FORM PERFORMANCE & DISCIPLINARY CARDS:${c.reset}`);
  const hf = homeData.multi_horizon_form;
  const af = awayData.multi_horizon_form;
  console.log(`     • ${c.bold}${c.cyan}${homeData.team_name}:${c.reset} L3: ${hf.last_3.wins}W-${hf.last_3.draws}D-${hf.last_3.losses}L | L5: ${hf.last_5.wins}W-${hf.last_5.draws}D-${hf.last_5.losses}L | L10: ${hf.last_10.wins}W-${hf.last_10.draws}D-${hf.last_10.losses}L | ${c.red}Red Cards: ${homeData.discipline.total_red_cards}${c.reset} (Yellow: ${homeData.discipline.total_yellow_cards})`);
  console.log(`     • ${c.bold}${c.magenta}${awayData.team_name}:${c.reset} L3: ${af.last_3.wins}W-${af.last_3.draws}D-${af.last_3.losses}L | L5: ${af.last_5.wins}W-${af.last_5.draws}D-${af.last_5.losses}L | L10: ${af.last_10.wins}W-${af.last_10.draws}D-${af.last_10.losses}L | ${c.red}Red Cards: ${awayData.discipline.total_red_cards}${c.reset} (Yellow: ${awayData.discipline.total_yellow_cards})`);
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // 6. 1X2 Probabilities & Fair Odds Table
  console.log(`  ${c.bold}🎲 1X2 OUTCOME PROBABILITIES & FAIR ODDS:${c.reset}`);
  console.log(`     - [1] ${c.cyan}${pred.match.home.padEnd(22)}${c.reset} Probability: ${c.bold}${homeWinPct}%${c.reset}   | Fair Odds: ${c.green}${fairOddsHome}${c.reset}  | xP: ${pred.result.expected_points_home.toFixed(2)}`);
  console.log(`     - [X] ${c.gray}${"Draw / Tie".padEnd(22)}${c.reset} Probability: ${c.bold}${drawPct}%${c.reset}   | Fair Odds: ${c.green}${fairOddsDraw}${c.reset}`);
  console.log(`     - [2] ${c.magenta}${pred.match.away.padEnd(22)}${c.reset} Probability: ${c.bold}${awayWinPct}%${c.reset}   | Fair Odds: ${c.green}${fairOddsAway}${c.reset}  | xP: ${pred.result.expected_points_away.toFixed(2)}`);
  console.log(`     - ${c.bold}Double Chance:${c.reset}  1X (Win/Draw): ${c.cyan}${(pred.double_chance.dc_1x * 100).toFixed(0)}%${c.reset}  |  X2 (Win/Draw): ${c.magenta}${(pred.double_chance.dc_x2 * 100).toFixed(0)}%${c.reset}  |  12 (No Draw): ${(pred.double_chance.dc_12 * 100).toFixed(0)}%`);
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // 7. Goals & Totals (BTTS & Over 2.5)
  console.log(`  ${c.bold}⚽ GOALS & TOTALS MARKETS:${c.reset}`);
  console.log(`     • ${c.bold}Both Teams To Score (GG/BTTS):${c.reset}  YES: ${c.green}${bttsYesPct}%${c.reset} (Fair: ${fairOddsBtts}) | NO: ${((1 - pred.btts.yes) * 100).toFixed(1)}%`);
  console.log(`     • ${c.bold}Over / Under 2.5 Goals:${c.reset}         OVER: ${c.green}${over25Pct}%${c.reset} (Fair: ${fairOddsOver}) | UNDER: ${under25Pct}%`);
  console.log(`     • ${c.dim}Poisson Expectancy (xG):${c.reset}        λ Home: ${pred.expected_goals.lambda_home.toFixed(2)}  |  μ Away: ${pred.expected_goals.mu_away.toFixed(2)} | Combined: ${pred.expected_goals.total.toFixed(2)}`);
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // 8. Shot Volume & Dynamic Regression Lines
  console.log(`  ${c.bold}🎯 SHOT VOLUME PROBABILITY MARKET:${c.reset}`);
  console.log(`     • Expected Match Shots: ${c.yellow}${pred.shots.expected_total.toFixed(1)}${c.reset} (Home: ${pred.shots.expected_home_shots.toFixed(1)} | Away: ${pred.shots.expected_away_shots.toFixed(1)})`);
  const l225 = pred.shots.lines['line_22_5'];
  const l245 = pred.shots.lines['line_24_5'];
  const l265 = pred.shots.lines['line_26_5'];
  if (l225 && l245 && l265) {
    console.log(`     • Dynamic Lines:        Over 22.5: ${(l225.over * 100).toFixed(1)}%  |  Over 24.5: ${(l245.over * 100).toFixed(1)}%  |  Over 26.5: ${(l265.over * 100).toFixed(1)}%`);
  }
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // 9. Verified Last 5 Form Matches for Both Home and Away (Fetched Directly from ML Model)
  console.log(`  ${c.bold}📊 VERIFIED LAST 5 HISTORICAL FORM MATCHES (FETCHED DIRECTLY FROM ML MODEL, NEWEST FIRST):${c.reset}`);
  console.log(`     • ${c.bold}${c.cyan}${pred.match.home.toUpperCase()}${c.reset}:`);
  const modelHomeMatches = modelFeatures.home_form_multi?.last_5?.matches || [];
  if (modelHomeMatches.length === 0) {
    console.log(`       No past match records found for ${pred.match.home}.`);
  } else {
    modelHomeMatches.forEach((m: any) => {
      const outcomeBadge = m.outcome === 'W' ? `${c.green}[W] WIN${c.reset}` : m.outcome === 'D' ? `${c.yellow}[D] DRAW${c.reset}` : `${c.red}[L] LOSS${c.reset}`;
      const scoreStr = `${m.goals_for} - ${m.goals_against}`;
      console.log(`       - [${m.date}] ${m.is_home ? 'Home' : 'Away'} vs ${m.opponent.padEnd(24)} | Score: ${scoreStr.padEnd(7)} | Outcome: ${outcomeBadge}`);
    });
  }

  console.log(`     • ${c.bold}${c.magenta}${pred.match.away.toUpperCase()}${c.reset}:`);
  const modelAwayMatches = modelFeatures.away_form_multi?.last_5?.matches || [];
  if (modelAwayMatches.length === 0) {
    console.log(`       No past match records found for ${pred.match.away}.`);
  } else {
    modelAwayMatches.forEach((m: any) => {
      const outcomeBadge = m.outcome === 'W' ? `${c.green}[W] WIN${c.reset}` : m.outcome === 'D' ? `${c.yellow}[D] DRAW${c.reset}` : `${c.red}[L] LOSS${c.reset}`;
      const scoreStr = `${m.goals_for} - ${m.goals_against}`;
      console.log(`       - [${m.date}] ${m.is_home ? 'Home' : 'Away'} vs ${m.opponent.padEnd(24)} | Score: ${scoreStr.padEnd(7)} | Outcome: ${outcomeBadge}`);
    });
  }
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // 10. Key SHAP ML Influencers
  if (pred.feature_contributions && pred.feature_contributions.length > 0) {
    const topContrib = pred.feature_contributions.slice(0, 3).map((f) => `${f.label}: ${f.contribution > 0 ? '+' : ''}${f.contribution.toFixed(2)}`).join('  |  ');
    console.log(`  ${c.bold}💡 KEY SHAP ML INFLUENCERS:${c.reset} ${c.dim}${topContrib}${c.reset}`);
  }
  console.log(`${c.bold}${c.green}╚═══════════════════════════════════════════════════════════════════════════════╝${c.reset}\n`);
}

function promptUser(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

/**
 * Generates and displays Today's predictions in 10-odds batches, and allows drilling into any match
 */
async function runTodayBatchesInteractive() {
  console.log(`\n${c.bold}${c.green}🔥 GENERATING TODAY'S 10-ODDS PREDICTION BATCHES...${c.reset}`);
  const { batches, matchesCount, allMatches } = await generateTodaysTenOddsBatches();
  console.log(`   Ingested ${c.cyan}${matchesCount}${c.reset} live fixtures directly from ESPN endpoints. Produced ${c.green}${batches.length}${c.reset} optimal ~10.00x Odds Batches.`);

  batches.forEach((b) => {
    console.log(`\n${c.bold}${c.magenta}📦 BATCH ID: ${b.batch_id} — ${b.batch_title.toUpperCase()}${c.reset}`);
    console.log(`   ${c.bold}⚡ Target Bracket:${c.reset} ${b.target_odds_bracket}  |  ${c.bold}Combined Odds:${c.reset} ${c.green}${b.total_odds}x${c.reset}  |  ${c.bold}Win Probability:${c.reset} ${c.cyan}${b.combined_probability_pct}%${c.reset}  |  ${c.bold}Date:${c.reset} ${b.date}`);
    console.log(`   ${c.dim}─────────────────────────────────────────────────────────────────────────────${c.reset}`);

    b.legs.forEach((leg: any, idx: number) => {
      const oddsStr = `${leg.odds}x`.padStart(6);
      const probStr = `${leg.probability_pct}%`.padStart(6);
      const kickoffTime = leg.kickoff_wat || leg.date;

      console.log(`     ${c.bold}${idx + 1}.${c.reset} ${c.yellow}${kickoffTime}:${c.reset} ${c.bold}${c.cyan}${leg.home_team}${c.reset} vs ${c.bold}${c.magenta}${leg.away_team}${c.reset} ${c.bold}${c.green}(${leg.selection})${c.reset}`);
      console.log(`        • ${c.bold}Reason for the prediction:${c.reset} ${leg.reason}`);
      console.log(`        • ${c.dim}Market: ${leg.market_label} | Odds: ${oddsStr} | Win Prob: ${probStr} | Status: ⏳ PENDING${c.reset}`);
    });
    console.log(`   ${c.dim}─────────────────────────────────────────────────────────────────────────────${c.reset}`);
  });

  // Extract complete list of all today's matches fetched from ESPN endpoints for drilldown
  const matchList: Array<{ home: string; away: string; league: string; date: string }> = (allMatches || []).map((m) => ({
    home: m.home_team,
    away: m.away_team,
    league: m.league_name,
    date: m.date_wat,
  }));

  // Fallback if allMatches was empty
  if (matchList.length === 0) {
    batches.forEach((b) => {
      b.legs.forEach((l) => {
        if (!matchList.some((m) => m.home === l.home_team && m.away === l.away_team)) {
          matchList.push({
            home: l.home_team,
            away: l.away_team,
            league: l.league,
            date: l.date,
          });
        }
      });
    });
  }

  console.log(`\n${c.bold}📋 ALL TODAY'S MATCHES FETCHED FROM ESPN (${matchList.length} FIXTURES AVAILABLE FOR DRILLDOWN):${c.reset}`);
  matchList.forEach((m, idx) => {
    console.log(`  [${c.cyan}${idx + 1}${c.reset}] ${m.home} vs ${m.away} ${c.dim}(${m.league})${c.reset}`);
  });

  // Interactive match inspection loop
  while (true) {
    console.log('');
    const input = await promptUser(`👉 Enter Match Number (1-${matchList.length}) to see full squad & Last 5 Matches, or 'b' for Back: `);
    if (input.toLowerCase() === 'b' || input === '0' || input === '') {
      break;
    }
    const matchIdx = parseInt(input, 10) - 1;
    if (isNaN(matchIdx) || matchIdx < 0 || matchIdx >= matchList.length) {
      console.log(`${c.red}Invalid selection. Please choose a number between 1 and ${matchList.length}.${c.reset}`);
      continue;
    }

    const selected = matchList[matchIdx];
    const preFeatures = extractPreMatchFeatures({
      home_team: selected.home,
      away_team: selected.away,
      date: selected.date,
      league_id: selected.league.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    });
    const pred = generateMultiTargetPrediction(
      {
        home_team: selected.home,
        away_team: selected.away,
        league: selected.league,
        date: selected.date,
      },
      preFeatures
    );

    await displayMatchPrediction(pred, preFeatures);
  }
}

/**
 * Loads and displays Yesterday's predictions outcome with separate Successful and Failed sections
 */
async function runYesterdayOutcomeInteractive() {
  console.log(`\n${c.bold}${c.green}📊 LOADING YESTERDAY'S PREDICTIONS & EVALUATING OFFICIAL FINAL SCORES FROM ESPN...${c.reset}`);
  const report = await getYesterdaysPredictionReport();

  console.log(`
${c.bold}═══════════════════════════════════════════════════════════════════════════════
  YESTERDAY'S PREDICTIONS PERFORMANCE AUDIT (${report.date})
═══════════════════════════════════════════════════════════════════════════════${c.reset}
  • ${c.bold}Total Predictions:${c.reset}      ${c.cyan}${report.total}${c.reset}
  • ${c.bold}Successful [WON]:${c.reset}       ${c.green}${report.successful}${c.reset}
  • ${c.bold}Failed [LOST]:${c.reset}          ${c.red}${report.failed}${c.reset}
  • ${c.bold}Pending Matches:${c.reset}        ${c.yellow}${report.pending}${c.reset}
  • ${c.bold}Verified Accuracy Rate:${c.reset} ${c.emerald}${c.bold}${report.accuracy_pct.toFixed(2)}%${c.reset} (Excl. pending fixtures)
${c.dim}─────────────────────────────────────────────────────────────────────────────${c.reset}
`);

  // 1. Successful Predictions Section
  console.log(`\n${c.bold}${c.green}✅ SUCCESSFUL PREDICTIONS (${report.successful_predictions.length})${c.reset}`);
  console.log(`${c.dim}─────────────────────────────────────────────────────────────────────────────${c.reset}`);
  if (report.successful_predictions.length === 0) {
    console.log(`  ${c.dim}No successful predictions recorded for yesterday.${c.reset}`);
  } else {
    report.successful_predictions.forEach((p, idx) => {
      console.log(`  ${c.bold}${idx + 1}.${c.reset} ${c.yellow}${p.kickoff_wat}:${c.reset} ${c.bold}${c.cyan}${p.home_team}${c.reset} vs ${c.bold}${c.magenta}${p.away_team}${c.reset} ${c.bold}${c.green}(${p.selection})${c.reset}`);
      console.log(`     • ${c.bold}Reason for the prediction:${c.reset} ${p.reason}`);
      console.log(`     • ${c.bold}Predicted Score:${c.reset} ${p.predicted_score} | ${c.bold}Actual Result:${c.reset} ${c.green}${p.actual_final_score || 'N/A'}${c.reset} | ${c.bold}Odds:${c.reset} ${p.odds}x | ${c.bold}Status:${c.reset} ${c.green}✅ SUCCESS${c.reset}`);
      console.log('');
    });
  }

  // 2. Failed Predictions Section
  console.log(`\n${c.bold}${c.red}❌ FAILED PREDICTIONS (${report.failed_predictions.length})${c.reset}`);
  console.log(`${c.dim}─────────────────────────────────────────────────────────────────────────────${c.reset}`);
  if (report.failed_predictions.length === 0) {
    console.log(`  ${c.dim}Zero failed predictions recorded for yesterday.${c.reset}`);
  } else {
    report.failed_predictions.forEach((p, idx) => {
      console.log(`  ${c.bold}${idx + 1}.${c.reset} ${c.yellow}${p.kickoff_wat}:${c.reset} ${c.bold}${c.cyan}${p.home_team}${c.reset} vs ${c.bold}${c.magenta}${p.away_team}${c.reset} ${c.bold}${c.red}(${p.selection})${c.reset}`);
      console.log(`     • ${c.bold}Reason for the prediction:${c.reset} ${p.reason}`);
      console.log(`     • ${c.bold}Predicted Score:${c.reset} ${p.predicted_score} | ${c.bold}Actual Result:${c.reset} ${c.red}${p.actual_final_score || 'N/A'}${c.reset} | ${c.bold}Odds:${c.reset} ${p.odds}x | ${c.bold}Status:${c.reset} ${c.red}❌ FAILED${c.reset}`);
      console.log('');
    });
  }

  // 3. Pending Predictions Section
  if (report.pending_predictions.length > 0) {
    console.log(`\n${c.bold}${c.yellow}⏳ PENDING PREDICTIONS (${report.pending_predictions.length})${c.reset}`);
    console.log(`${c.dim}─────────────────────────────────────────────────────────────────────────────${c.reset}`);
    report.pending_predictions.forEach((p, idx) => {
      console.log(`  ${c.bold}${idx + 1}.${c.reset} ${c.yellow}${p.kickoff_wat}:${c.reset} ${c.bold}${c.cyan}${p.home_team}${c.reset} vs ${c.bold}${c.magenta}${p.away_team}${c.reset} ${c.bold}(${p.selection})${c.reset}`);
      console.log(`     • ${c.bold}Reason for the prediction:${c.reset} ${p.reason}`);
      console.log(`     • ${c.bold}Status:${c.reset} ${c.yellow}⏳ PENDING WHISTLE${c.reset}`);
      console.log('');
    });
  }

  // 4. Batch Performance Section
  const evalRes = await evaluateArchivedBatches();
  const yestBatches = evalRes.allBatches.filter((b) => b.date === report.date || b.batch_id.includes(report.date.replace(/[^0-9]/g, '')));
  if (yestBatches.length > 0) {
    console.log(`\n${c.bold}${c.magenta}📦 YESTERDAY'S 10-ODDS BATCHES BREAKDOWN:${c.reset}`);
    console.log(`${c.dim}─────────────────────────────────────────────────────────────────────────────${c.reset}`);
    yestBatches.forEach((b) => {
      const badge = b.status === 'WON' ? `${c.green}✅ SUCCESS` : b.status === 'LOST' ? `${c.red}❌ FAILED` : `${c.yellow}⏳ PENDING`;
      console.log(`  • ${c.bold}${b.batch_id}${c.reset} — ${b.batch_title} [${badge}${c.reset}]`);
      console.log(`    Combined Odds: ${c.yellow}${b.total_odds}x${c.reset} | Hit Rate: ${b.legs_won}/${b.legs.length} Legs Won`);
    });
  }

  await promptUser('\nPress [ENTER] to return to Main Menu...');
}

/**
 * Historical Daily Accuracy Audit & Date Inspector
 */
async function runPredictionHistoryByDateInteractive() {
  console.log(`\n${c.bold}${c.green}📅 HISTORICAL PREDICTION ACCURACY & AUDIT TRAIL ACROSS ALL RECORDED DATES${c.reset}`);
  const summaries = getHistoricalPerformanceByDate();

  console.log(`
${c.bold}┌────────────┬─────────────┬────────────┬─────────┬─────────┬─────────────────┐
│ Date       │ Predictions │ Successful │ Failed  │ Pending │ Verified Acc %  │
├────────────┼─────────────┼────────────┼─────────┼─────────┼─────────────────┤${c.reset}`);

  summaries.forEach((s) => {
    const dStr = s.date.padEnd(10);
    const totStr = String(s.total_predictions).padStart(11);
    const succStr = String(s.successful_predictions).padStart(10);
    const failStr = String(s.failed_predictions).padStart(7);
    const pendStr = String(s.pending_predictions).padStart(7);
    const accStr = `${s.accuracy_pct.toFixed(1)}%`.padStart(15);

    console.log(`│ ${c.cyan}${dStr}${c.reset} │ ${totStr} │ ${c.green}${succStr}${c.reset} │ ${c.red}${failStr}${c.reset} │ ${c.yellow}${pendStr}${c.reset} │ ${c.emerald}${accStr}${c.reset} │`);
  });

  console.log(`${c.bold}└────────────┴─────────────┴────────────┴─────────┴─────────┴─────────────────┘${c.reset}\n`);

  const dateInput = await promptUser(`  👉 Enter Date (YYYY-MM-DD) to inspect all predictions, or 'b' for Back: `);
  if (!dateInput || dateInput.toLowerCase() === 'b') return;

  const targetDate = dateInput.trim();
  console.log(`\n${c.bold}EVALUATING PREDICTIONS FOR ${targetDate}...${c.reset}`);
  const report = await evaluatePredictionsForDate(targetDate);

  console.log(`\n${c.bold}PREDICTION PERFORMANCE FOR ${targetDate}:${c.reset}`);
  console.log(`  • Total: ${report.total} | Successful: ${c.green}${report.successful}${c.reset} | Failed: ${c.red}${report.failed}${c.reset} | Pending: ${c.yellow}${report.pending}${c.reset} | Accuracy: ${c.emerald}${report.accuracy_pct.toFixed(1)}%${c.reset}\n`);

  if (report.successful_predictions.length > 0) {
    console.log(`${c.bold}${c.green}✅ SUCCESSFUL PREDICTIONS:${c.reset}`);
    report.successful_predictions.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.kickoff_wat}: ${p.home_team} vs ${p.away_team} (${p.selection})`);
      console.log(`     Reason: ${p.reason}`);
      console.log(`     Actual Score: ${p.actual_final_score} [SUCCESS] (Odds: ${p.odds}x)\n`);
    });
  }

  if (report.failed_predictions.length > 0) {
    console.log(`${c.bold}${c.red}❌ FAILED PREDICTIONS:${c.reset}`);
    report.failed_predictions.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.kickoff_wat}: ${p.home_team} vs ${p.away_team} (${p.selection})`);
      console.log(`     Reason: ${p.reason}`);
      console.log(`     Actual Score: ${p.actual_final_score} [FAILED] (Odds: ${p.odds}x)\n`);
    });
  }

  await promptUser('Press [ENTER] to return to Main Menu...');
}

/**
 * Direct Match Forensics query helper
 */
async function runCustomMatchupInteractive() {
  console.log(`\n${c.bold}${c.green}🔍 DIRECT MATCH FORENSICS & LAST 5 FORM MATCHES LOOKUP${c.reset}`);
  const home = await promptUser('  Enter Home Team Name (e.g. Arsenal, Real Madrid, Nigeria): ');
  if (!home) return;
  const away = await promptUser('  Enter Away Team Name (e.g. Chelsea, Barcelona, Ghana): ');
  if (!away) return;

  const matchDate = new Date().toISOString().split('T')[0];
  const detectedLeague = detectTeamLeague(home, away);
  const preFeatures = extractPreMatchFeatures({
    home_team: home,
    away_team: away,
    date: matchDate,
    league_id: detectedLeague.toLowerCase().replace(/[^a-z0-9]/g, '_'),
  });
  const pred = generateMultiTargetPrediction(
    {
      home_team: home,
      away_team: away,
      league: detectedLeague,
      date: matchDate,
    },
    preFeatures
  );

  await displayMatchPrediction(pred, preFeatures);
}

/**
 * Interactive ESPN Breaking News Viewer
 */
async function runNewsInteractive() {
  console.log(`\n${c.bold}${c.green}📰 FETCHING LIVE BREAKING FOOTBALL HAPPENINGS FROM ESPN ENDPOINTS...${c.reset}\n`);
  const articles = await fetchEspnAllBreakingNews(4);

  if (articles.length === 0) {
    console.log(`  ${c.yellow}No news articles currently returned from ESPN news stream.${c.reset}`);
  } else {
    articles.forEach((art, idx) => {
      console.log(`  ${c.bold}${c.cyan}[${idx + 1}] ${art.headline}${c.reset}`);
      if (art.description) {
        console.log(`      ${c.dim}${art.description}${c.reset}`);
      }
      const dateFormatted = new Date(art.published).toLocaleString();
      console.log(`      ${c.gray}Published: ${dateFormatted} | Source: ${art.byline || 'ESPN'} | League: ${art.league?.toUpperCase() || 'SOCCER'}${c.reset}`);
      if (art.web_url) {
        console.log(`      ${c.dim}Link: ${art.web_url}${c.reset}`);
      }
      console.log('');
    });
  }

  await promptUser('Press [ENTER] to return to Main Menu...');
}

/**
 * Main Interactive Navigation Menu Loop
 */
async function runInteractiveMenu() {
  while (true) {
    printBanner();
    console.log(`
${c.bold}┌─────────────────────────────────────────────────────────────────────────────┐
│                       MAIN NAVIGATION MENU                                  │
└─────────────────────────────────────────────────────────────────────────────┘${c.reset}
  ${c.bold}${c.green}[1]${c.reset} 🔥 View Today's Predictions & 10-Odds Batches
  ${c.bold}${c.green}[2]${c.reset} 🏆 View Yesterday's Predictions Outcome & Success Indicators
  ${c.bold}${c.green}[3]${c.reset} 📅 Historical Prediction Accuracy & Audit Trail (By Date)
  ${c.bold}${c.green}[4]${c.reset} 🔍 Direct Match Forensics, Squad & Last 5 Matches Lookup
  ${c.bold}${c.green}[5]${c.reset} ⚡ Run Temporal Walk-Forward Out-of-Sample Backtest
  ${c.bold}${c.green}[6]${c.reset} 🌐 View Global Data Lake Coverage Audit (All Football Leagues)
  ${c.bold}${c.green}[7]${c.reset} 📰 ESPN Breaking News & Latest Football Happenings
  ${c.bold}${c.red}[0]${c.reset} 🚪 Exit
`);

    const choice = await promptUser(`  ${c.bold}👉 Select an option (1, 2, 3, 4, 5, 6, 7, 0): ${c.reset}`);

    if (choice === '1') {
      await runTodayBatchesInteractive();
    } else if (choice === '2') {
      await runYesterdayOutcomeInteractive();
    } else if (choice === '3') {
      await runPredictionHistoryByDateInteractive();
    } else if (choice === '4') {
      await runCustomMatchupInteractive();
    } else if (choice === '5') {
      console.log(`\n${c.bold}RUNNING TEMPORAL WALK-FORWARD OOS BACKTEST (ZERO LEAKAGE)...${c.reset}\n`);
      const res = runWalkForwardBacktest(RAW_MATCH_RECORDS, 'all', 'all');
      console.log(`  • Evaluated Matches:        ${c.cyan}${res.total_matches}${c.reset}`);
      console.log(`  • BTTS Accuracy / Log-Loss: ${res.overall.btts_accuracy.toFixed(1)}% (Log-Loss: ${res.overall.btts_log_loss.toFixed(3)})`);
      console.log(`  • Over 2.5 Acc / Log-Loss:  ${res.overall.over25_accuracy.toFixed(1)}% (Log-Loss: ${res.overall.over25_log_loss.toFixed(3)})`);
      console.log(`  • 1X2 Match Outcome Acc:    ${res.overall.result_accuracy.toFixed(1)}% (Log-Loss: ${res.overall.result_log_loss.toFixed(3)})`);
      console.log(`  • Shots Regression MAE:     ${res.overall.shots_mae.toFixed(2)} shots`);
      await promptUser('\nPress [ENTER] to return to Main Menu...');
    } else if (choice === '6') {
      console.log(`\n${c.bold}SYNCING GLOBAL HISTORICAL DATA LAKE ACROSS ALL FOOTBALL LEAGUES FROM ESPN...${c.reset}`);
      const syncRes = await syncEspnHistoricalDataset(['2024', '2025', '2026']);
      console.log(`  • ESPN Endpoints Queried:   ${syncRes.leaguesQueried.length} Leagues across ${syncRes.seasonsQueried.join(', ')}`);
      console.log(`  • New Matches Ingested:     ${c.green}+${syncRes.newMatchesIngested} Real Historical Matches${c.reset}`);
      console.log(`\n${c.bold}GLOBAL FOOTBALL DATA LAKE COVERAGE AUDIT:${c.reset}`);
      const cov = computeDatasetCoverage();
      console.log(`  • Total Ingested Fixtures: ${c.cyan}${cov.total_fixtures}${c.reset} (${cov.played_fixtures} historical, ${cov.upcoming_fixtures} upcoming)`);
      console.log(`  • Matches with Full xG:    ${c.green}${cov.matches_with_xg}${c.reset} (${Math.round((cov.matches_with_xg / Math.max(1, cov.played_fixtures)) * 100)}% coverage)`);
      console.log(`  • Date Range:              ${cov.date_range.min_date} to ${cov.date_range.max_date}`);
      await promptUser('\nPress [ENTER] to return to Main Menu...');
    } else if (choice === '7') {
      await runNewsInteractive();
    } else if (choice === '0' || choice.toLowerCase() === 'q' || choice.toLowerCase() === 'exit') {
      console.log(`\n${c.green}Thank you for using FootyPredict ML CLI. Goodbye!${c.reset}\n`);
      break;
    } else {
      console.log(`${c.red}Invalid option. Please choose from 1, 2, 3, 4, 5, 6, 7, or 0.${c.reset}`);
    }
  }
}

async function runCli() {
  const args = process.argv.slice(2);

  // Sync historical dataset and previous matches from official ESPN endpoints in background
  try {
    await Promise.allSettled([
      syncEspnHistoricalDataset(['2024', '2025', '2026']),
      fetchEspnPreviousMatches(7),
    ]);
  } catch {
    // Continue smoothly if offline
  }

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  // Non-interactive command handling when flags are provided
  if (args.includes('--today') || args.includes('--batches')) {
    printBanner();
    await runTodayBatchesInteractive();
    return;
  }

  if (args.includes('--news') || args.includes('--happenings')) {
    printBanner();
    await runNewsInteractive();
    return;
  }

  if (args.includes('--yesterday') || args.includes('--archive') || args.includes('--history') || args.includes('--results')) {
    printBanner();
    await runYesterdayOutcomeInteractive();
    return;
  }

  if (args.includes('--models')) {
    printBanner();
    console.log(`${c.bold}REGISTERED PRODUCTION ESTIMATORS:${c.reset}\n`);
    const models = getModelRegistry();
    models.forEach((m) => {
      const activeBadge = m.is_active ? `${c.green}[ACTIVE PRODUCTION]${c.reset}` : `${c.gray}[STANDBY]${c.reset}`;
      console.log(`  • ${c.bold}${m.model_name}${c.reset} (${m.version}) ${activeBadge}`);
      console.log(`    Target: ${m.target} | Algo: ${m.algorithm} | Brier: ${m.test_metrics.brier_score ?? 'N/A'}`);
    });
    return;
  }

  if (args.includes('--backtest')) {
    printBanner();
    console.log(`${c.bold}RUNNING TEMPORAL WALK-FORWARD OOS BACKTEST (ZERO LEAKAGE)...${c.reset}\n`);
    const res = runWalkForwardBacktest(RAW_MATCH_RECORDS, 'all', 'all');
    console.log(`  • Total Evaluated Fixtures:  ${c.cyan}${res.total_matches}${c.reset}`);
    console.log(`  • BTTS Accuracy:             ${res.overall.btts_accuracy.toFixed(1)}%`);
    console.log(`  • Over 2.5 Accuracy:         ${res.overall.over25_accuracy.toFixed(1)}%`);
    console.log(`  • 1X2 Match Outcome Acc:     ${res.overall.result_accuracy.toFixed(1)}%`);
    return;
  }

  // Handle Custom Match Arguments: e.g. npm run cli -- "Arsenal" "Chelsea"
  const nonFlagArgs = args.filter((a) => !a.startsWith('-'));
  if (nonFlagArgs.length >= 2) {
    printBanner();
    const [home, away] = nonFlagArgs;
    const matchDate = new Date().toISOString().split('T')[0];
    const detectedLeague = detectTeamLeague(home, away);
    const preFeatures = extractPreMatchFeatures({
      home_team: home,
      away_team: away,
      date: matchDate,
      league_id: detectedLeague.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    });
    const pred = generateMultiTargetPrediction(
      {
        home_team: home,
        away_team: away,
        league: detectedLeague,
        date: matchDate,
      },
      preFeatures
    );
    await displayMatchPrediction(pred, preFeatures);
    return;
  }

  // Default execution: Launch Interactive Menu
  await runInteractiveMenu();
}

runCli().catch((err) => {
  console.error('CLI execution error:', err);
  process.exit(1);
});
