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
} from './services/espnService';
import {
  generateTodaysTenOddsBatches,
  evaluateArchivedBatches,
  loadArchivedBatches,
  OddsBatch,
} from './ml/batchOddsEngine';

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

  // Retrieve Comprehensive ESPN Telemetry for both teams
  const [homeData, awayData, homeMatches, awayMatches] = await Promise.all([
    fetchEspnTeamComprehensiveData(pred.match.home, pred.match.league),
    fetchEspnTeamComprehensiveData(pred.match.away, pred.match.league),
    fetchEspnTeamPastMatches(pred.match.home, pred.match.league, 5),
    fetchEspnTeamPastMatches(pred.match.away, pred.match.league, 5),
  ]);

  console.log(`\n${c.bold}${c.green}╔═══════════════════════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.green}║        🏟️   ESPN COMPREHENSIVE MATCH FORENSICS & ML INTELLIGENCE             ║${c.reset}`);
  console.log(`${c.bold}${c.green}╚═══════════════════════════════════════════════════════════════════════════════╝${c.reset}`);

  console.log(`  ${c.bold}MATCHUP:${c.reset}  ${c.bold}${c.cyan}${pred.match.home.toUpperCase()}${c.reset} vs ${c.bold}${c.magenta}${pred.match.away.toUpperCase()}${c.reset}`);
  console.log(`  ${c.bold}LEAGUE:${c.reset}   ${c.yellow}${pred.match.league}${c.reset}  |  ${c.bold}DATE:${c.reset} ${pred.match.date}`);
  console.log(`  ${c.bold}METADATA:${c.reset} Model: ${pred.model_info.active_version} | Data Tier: ${pred.data_tier} | Calibration: ${pred.model_info.calibration_method}`);
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // 1. Genuine Coaching Staff
  console.log(`  ${c.bold}💼 GENUINE HEAD COACHES & TACTICAL PHILOSOPHY:${c.reset}`);
  console.log(`     • ${c.bold}${c.cyan}${homeData.team_name}${c.reset} Coach: ${c.bold}${homeData.coach.name}${c.reset} (Tenure: ${homeData.coach.tenure_months}m | Win Rate: ${homeData.coach.win_rate_pct}%)`);
  console.log(`       Tactics: ${c.dim}${homeData.coach.tactical_philosophy}${c.reset}`);
  console.log(`     • ${c.bold}${c.magenta}${awayData.team_name}${c.reset} Coach: ${c.bold}${awayData.coach.name}${c.reset} (Tenure: ${awayData.coach.tenure_months}m | Win Rate: ${awayData.coach.win_rate_pct}%)`);
  console.log(`       Tactics: ${c.dim}${awayData.coach.tactical_philosophy}${c.reset}`);
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

  // 9. Verified Last 5 Form Matches for Both Home and Away (Direct from ESPN Endpoints)
  console.log(`  ${c.bold}📊 VERIFIED LAST 5 HISTORICAL FORM MATCHES (DIRECT ESPN ENDPOINTS, NEWEST FIRST):${c.reset}`);
  console.log(`     • ${c.bold}${c.cyan}${pred.match.home.toUpperCase()}${c.reset}:`);
  if (homeMatches.length === 0) {
    console.log(`       No past match records found on ESPN endpoints.`);
  } else {
    homeMatches.forEach((m) => {
      let outcomeBadge = m.outcome;
      if (m.outcome.includes('[W]')) outcomeBadge = `${c.green}${m.outcome}${c.reset}`;
      else if (m.outcome.includes('[D]')) outcomeBadge = `${c.yellow}${m.outcome}${c.reset}`;
      else if (m.outcome.includes('[L]')) outcomeBadge = `${c.red}${m.outcome}${c.reset}`;

      console.log(`       - [${m.date}] ${m.is_home ? 'Home' : 'Away'} vs ${m.opponent.padEnd(24)} | Score: ${m.score_display.padEnd(7)} | Outcome: ${outcomeBadge}`);
    });
  }

  console.log(`     • ${c.bold}${c.magenta}${pred.match.away.toUpperCase()}${c.reset}:`);
  if (awayMatches.length === 0) {
    console.log(`       No past match records found on ESPN endpoints.`);
  } else {
    awayMatches.forEach((m) => {
      let outcomeBadge = m.outcome;
      if (m.outcome.includes('[W]')) outcomeBadge = `${c.green}${m.outcome}${c.reset}`;
      else if (m.outcome.includes('[D]')) outcomeBadge = `${c.yellow}${m.outcome}${c.reset}`;
      else if (m.outcome.includes('[L]')) outcomeBadge = `${c.red}${m.outcome}${c.reset}`;

      console.log(`       - [${m.date}] ${m.is_home ? 'Home' : 'Away'} vs ${m.opponent.padEnd(24)} | Score: ${m.score_display.padEnd(7)} | Outcome: ${outcomeBadge}`);
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
      const marketBadge = leg.market_label.padEnd(25);
      const selectionStr = leg.selection.padEnd(35);
      const oddsStr = `${leg.odds}x`.padStart(6);
      const probStr = `${leg.probability_pct}%`.padStart(6);
      const statusIndicator = `${c.yellow}⏳ PENDING${c.reset}`;

      console.log(`     ${c.bold}${idx + 1}.${c.reset} [${leg.league}] ${c.bold}${c.cyan}${leg.home_team}${c.reset} vs ${c.bold}${c.magenta}${leg.away_team}${c.reset}`);
      console.log(`        • ${c.bold}Genuine Coaches:${c.reset} H: ${c.bold}${leg.home_coach || "Coaching Staff"}${c.reset} vs A: ${c.bold}${leg.away_coach || "Coaching Staff"}${c.reset}`);
      console.log(`        • Market: ${marketBadge} | Pick: ${selectionStr} | Odds: ${c.yellow}${oddsStr}${c.reset} | Prob: ${probStr} | Status: ${statusIndicator}`);
      console.log(`        • Forensics: ${leg.reason}`);
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
 * Loads and displays Yesterday's predictions outcome with success indicators, and allows drilldown
 */
async function runYesterdayOutcomeInteractive() {
  console.log(`\n${c.bold}${c.green}📊 LOADING YESTERDAY'S PREDICTIONS & EVALUATING OUTCOME INDICATORS...${c.reset}`);
  const evalRes = await evaluateArchivedBatches();
  const batchesToDisplay = evalRes.allBatches;

  console.log(`${c.bold}─────────────────────────────────────────────────────────────────────────────${c.reset}`);
  console.log(` 🏆  ${c.bold}${c.emerald}FOOTYPREDICT 10-ODDS BATCHES RECORD & WIN/LOSS INDICATORS${c.reset}`);
  console.log(`${c.bold}─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  let totalWon = 0;
  let totalLost = 0;
  let totalPending = 0;

  const pastMatchList: Array<{ home: string; away: string; league: string; date: string }> = [];

  batchesToDisplay.forEach((b) => {
    let indicator = `${c.yellow}⏳ PENDING${c.reset}`;
    if (b.status === 'WON') {
      indicator = `${c.bold}${c.green}🏆 SUCCESSFUL BATCH [WON]${c.reset}`;
      totalWon++;
    } else if (b.status === 'LOST') {
      indicator = `${c.bold}${c.red}❌ FAILED BATCH [LOST]${c.reset}`;
      totalLost++;
    } else {
      totalPending++;
    }

    console.log(`\n  • [${b.date}] ${c.bold}${c.cyan}${b.batch_id}${c.reset} — ${c.bold}${b.batch_title}${c.reset}`);
    console.log(`    Status Indicator: ${indicator}`);
    console.log(`    Multiplier Return: ${c.emerald}${b.total_odds}x${c.reset}  |  Legs Hits: ${b.legs_won}/${b.legs.length} Won  |  Created: ${b.created_at}`);

    b.legs.forEach((leg: any, idx: number) => {
      let legMark = '⏳';
      if (leg.status === 'WON') legMark = `${c.green}✅ WON${c.reset}`;
      if (leg.status === 'LOST') legMark = `${c.red}❌ LOST${c.reset}`;
      console.log(`      ${idx + 1}. [${legMark}] ${c.bold}${leg.fixture}${c.reset}`);
      console.log(`         Genuine Coaches: H: ${leg.home_coach || "Coaching Staff"} vs A: ${leg.away_coach || "Coaching Staff"}`);
      console.log(`         Pick: ${leg.selection} (${leg.odds}x) | Result: ${leg.actual_score || 'N/A'}`);

      if (!pastMatchList.some((m) => m.home === leg.home_team && m.away === leg.away_team)) {
        pastMatchList.push({
          home: leg.home_team,
          away: leg.away_team,
          league: leg.league,
          date: leg.date,
        });
      }
    });
  });

  const totalEvaluated = totalWon + totalLost;
  const successRate = totalEvaluated > 0 ? (totalWon / totalEvaluated) * 100 : 0;
  console.log(`\n${c.bold}─────────────────────────────────────────────────────────────────────────────${c.reset}`);
  console.log(` ${c.bold}SUMMARY SCORECARD:${c.reset}`);
  console.log(`   • ${c.bold}Total Batches Evaluated:${c.reset} ${batchesToDisplay.length}`);
  console.log(`   • ${c.bold}Successful Won Batches:${c.reset}  ${c.green}${totalWon}${c.reset}`);
  console.log(`   • ${c.bold}Failed Lost Batches:${c.reset}     ${c.red}${totalLost}${c.reset}`);
  console.log(`   • ${c.bold}Pending Active Batches:${c.reset}  ${c.yellow}${totalPending}${c.reset}`);
  console.log(`   • ${c.bold}Batch Success Rate:${c.reset}      ${c.green}${successRate.toFixed(1)}%${c.reset}`);
  console.log(`${c.bold}─────────────────────────────────────────────────────────────────────────────${c.reset}\n`);

  console.log(`\n${c.bold}📋 PAST MATCHES AVAILABLE FOR HISTORICAL DRILLDOWN & VERIFICATION:${c.reset}`);
  pastMatchList.forEach((m, idx) => {
    console.log(`  [${c.cyan}${idx + 1}${c.reset}] ${m.home} vs ${m.away} ${c.dim}(${m.league})${c.reset}`);
  });

  // Interactive match inspection loop
  while (true) {
    console.log('');
    const input = await promptUser(`👉 Enter Match Number (1-${pastMatchList.length}) to see full squad & Last 5 Matches, or 'b' for Back: `);
    if (input.toLowerCase() === 'b' || input === '0' || input === '') {
      break;
    }
    const matchIdx = parseInt(input, 10) - 1;
    if (isNaN(matchIdx) || matchIdx < 0 || matchIdx >= pastMatchList.length) {
      console.log(`${c.red}Invalid selection. Please choose a number between 1 and ${pastMatchList.length}.${c.reset}`);
      continue;
    }

    const selected = pastMatchList[matchIdx];
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
  ${c.bold}${c.green}[3]${c.reset} 🔍 Direct Match Forensics, Squad & Last 5 Matches Lookup
  ${c.bold}${c.green}[4]${c.reset} ⚡ Run Temporal Walk-Forward Out-of-Sample Backtest
  ${c.bold}${c.green}[5]${c.reset} 🌐 View Global Data Lake Coverage Audit
  ${c.bold}${c.red}[0]${c.reset} 🚪 Exit
`);

    const choice = await promptUser(`  ${c.bold}👉 Select an option (1, 2, 3, 4, 5, 0): ${c.reset}`);

    if (choice === '1') {
      await runTodayBatchesInteractive();
    } else if (choice === '2') {
      await runYesterdayOutcomeInteractive();
    } else if (choice === '3') {
      await runCustomMatchupInteractive();
    } else if (choice === '4') {
      console.log(`\n${c.bold}RUNNING TEMPORAL WALK-FORWARD OOS BACKTEST (ZERO LEAKAGE)...${c.reset}\n`);
      const res = runWalkForwardBacktest(RAW_MATCH_RECORDS, 'all', 'all');
      console.log(`  • Evaluated Matches:        ${c.cyan}${res.total_matches}${c.reset}`);
      console.log(`  • BTTS Accuracy / Log-Loss: ${res.overall.btts_accuracy.toFixed(1)}% (Log-Loss: ${res.overall.btts_log_loss.toFixed(3)})`);
      console.log(`  • Over 2.5 Acc / Log-Loss:  ${res.overall.over25_accuracy.toFixed(1)}% (Log-Loss: ${res.overall.over25_log_loss.toFixed(3)})`);
      console.log(`  • 1X2 Match Outcome Acc:    ${res.overall.result_accuracy.toFixed(1)}% (Log-Loss: ${res.overall.result_log_loss.toFixed(3)})`);
      console.log(`  • Shots Regression MAE:     ${res.overall.shots_mae.toFixed(2)} shots`);
      await promptUser('\nPress [ENTER] to return to Main Menu...');
    } else if (choice === '5') {
      console.log(`\n${c.bold}SYNCING GLOBAL HISTORICAL DATA LAKE FROM ESPN ENDPOINTS...${c.reset}`);
      const syncRes = await syncEspnHistoricalDataset(['2024', '2025', '2026']);
      console.log(`  • ESPN Endpoints Queried:   ${syncRes.leaguesQueried.length} Leagues across ${syncRes.seasonsQueried.join(', ')}`);
      console.log(`  • New Matches Ingested:     ${c.green}+${syncRes.newMatchesIngested} Real Historical Matches${c.reset}`);
      console.log(`\n${c.bold}GLOBAL FOOTBALL DATA LAKE COVERAGE AUDIT:${c.reset}`);
      const cov = computeDatasetCoverage();
      console.log(`  • Total Ingested Fixtures: ${c.cyan}${cov.total_fixtures}${c.reset} (${cov.played_fixtures} historical, ${cov.upcoming_fixtures} upcoming)`);
      console.log(`  • Matches with Full xG:    ${c.green}${cov.matches_with_xg}${c.reset} (${Math.round((cov.matches_with_xg / Math.max(1, cov.played_fixtures)) * 100)}% coverage)`);
      console.log(`  • Date Range:              ${cov.date_range.min_date} to ${cov.date_range.max_date}`);
      await promptUser('\nPress [ENTER] to return to Main Menu...');
    } else if (choice === '0' || choice.toLowerCase() === 'q' || choice.toLowerCase() === 'exit') {
      console.log(`\n${c.green}Thank you for using FootyPredict ML CLI. Goodbye!${c.reset}\n`);
      break;
    } else {
      console.log(`${c.red}Invalid option. Please choose from 1, 2, 3, 4, 5, or 0.${c.reset}`);
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
