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
  ${c.cyan}npm run cli -- "Arsenal" "Chelsea"${c.reset}          Predict matchup & view last 5 form matches
  ${c.cyan}npm run cli -- --backtest${c.reset}                   Run out-of-sample walk-forward validation
  ${c.cyan}npm run cli -- --coverage${c.reset}                   Print Data Lake coverage & tier stats
  ${c.cyan}npm run cli -- --models${c.reset}                     List registered ML models and active status
  ${c.cyan}npm run dev${c.reset}                                 Start full Web UI + Node.js API (Port 3000)
`);
}

/**
 * Renders a comprehensive, beautifully formatted match card with verified Last 5 Form Matches
 */
function displayMatchPrediction(pred: ReturnType<typeof generateMultiTargetPrediction>, preFeatures?: any) {
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

  // Retrieve Genuine Coach & Squad Info
  const homeSquad = getTeamSquadIntelligence(pred.match.home, pred.match.league);
  const awaySquad = getTeamSquadIntelligence(pred.match.away, pred.match.league);

  // Fetch last 5 historical encounters/form matches
  const homeMatches = RAW_MATCH_RECORDS.filter(
    (m) => m.is_played && (m.home_team.toLowerCase() === pred.match.home.toLowerCase() || m.away_team.toLowerCase() === pred.match.home.toLowerCase())
  ).slice(-5).reverse();

  const awayMatches = RAW_MATCH_RECORDS.filter(
    (m) => m.is_played && (m.home_team.toLowerCase() === pred.match.away.toLowerCase() || m.away_team.toLowerCase() === pred.match.away.toLowerCase())
  ).slice(-5).reverse();

  console.log(`\n${c.bold}${c.green}╔═══════════════════════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.green}║                   🏟️   DETAILED MATCH ANALYSIS & FORENSICS                   ║${c.reset}`);
  console.log(`${c.bold}${c.green}╚═══════════════════════════════════════════════════════════════════════════════╝${c.reset}`);

  console.log(`  ${c.bold}MATCHUP:${c.reset}  ${c.bold}${c.cyan}${pred.match.home.toUpperCase()}${c.reset} vs ${c.bold}${c.magenta}${pred.match.away.toUpperCase()}${c.reset}`);
  console.log(`  ${c.bold}LEAGUE:${c.reset}   ${c.yellow}${pred.match.league}${c.reset}  |  ${c.bold}DATE:${c.reset} ${pred.match.date}`);
  console.log(`  ${c.bold}METADATA:${c.reset} Model: ${pred.model_info.active_version} | Data Tier: ${pred.data_tier} | Calibration: ${pred.model_info.calibration_method}`);
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // Display Genuine Coaches
  console.log(`  ${c.bold}💼 GENUINE TEAM LEADERSHIP & COACHES:${c.reset}`);
  console.log(`     • ${c.bold}${c.cyan}${pred.match.home}${c.reset} Coach: ${c.bold}${homeSquad.coach.name}${c.reset} (Tenure: ${homeSquad.coach.tenure_months}m | Win Rate: ${homeSquad.coach.win_rate_pct}% | Morale: ${homeSquad.morale_score}%)`);
  console.log(`       Tactical Style: ${c.dim}${homeSquad.coach.tactical_style}${c.reset}`);
  console.log(`     • ${c.bold}${c.magenta}${pred.match.away}${c.reset} Coach: ${c.bold}${awaySquad.coach.name}${c.reset} (Tenure: ${awaySquad.coach.tenure_months}m | Win Rate: ${awaySquad.coach.win_rate_pct}% | Morale: ${awaySquad.morale_score}%)`);
  console.log(`       Tactical Style: ${c.dim}${awaySquad.coach.tactical_style}${c.reset}`);
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // Display Key Players / Squad Report
  console.log(`  ${c.bold}🌟 KEY PLAYERS & SQUAD INTELLIGENCE:${c.reset}`);
  const homeStars = homeSquad.key_players && homeSquad.key_players.length > 0 ? homeSquad.key_players.join(', ') : 'Standard Starting XI';
  const awayStars = awaySquad.key_players && awaySquad.key_players.length > 0 ? awaySquad.key_players.join(', ') : 'Standard Starting XI';
  console.log(`     • ${c.bold}${c.cyan}${pred.match.home}${c.reset} Star Players: ${c.emerald}${homeStars}${c.reset}`);
  console.log(`       Bulletin: ${c.dim}${homeSquad.news_bulletin}${c.reset}`);
  console.log(`     • ${c.bold}${c.magenta}${pred.match.away}${c.reset} Star Players: ${c.emerald}${awayStars}${c.reset}`);
  console.log(`       Bulletin: ${c.dim}${awaySquad.news_bulletin}${c.reset}`);
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // 1X2 Probabilities & Fair Odds Table
  console.log(`  ${c.bold}🎲 1X2 OUTCOME PROBABILITIES & FAIR ODDS:${c.reset}`);
  console.log(`     - [1] ${c.cyan}${pred.match.home.padEnd(22)}${c.reset} Probability: ${c.bold}${homeWinPct}%${c.reset}   | Fair Odds: ${c.green}${fairOddsHome}${c.reset}  | xP: ${pred.result.expected_points_home.toFixed(2)}`);
  console.log(`     - [X] ${c.gray}${"Draw / Tie".padEnd(22)}${c.reset} Probability: ${c.bold}${drawPct}%${c.reset}   | Fair Odds: ${c.green}${fairOddsDraw}${c.reset}`);
  console.log(`     - [2] ${c.magenta}${pred.match.away.padEnd(22)}${c.reset} Probability: ${c.bold}${awayWinPct}%${c.reset}   | Fair Odds: ${c.green}${fairOddsAway}${c.reset}  | xP: ${pred.result.expected_points_away.toFixed(2)}`);
  console.log(`     - ${c.bold}Double Chance:${c.reset}  1X (Win/Draw): ${c.cyan}${(pred.double_chance.dc_1x * 100).toFixed(0)}%${c.reset}  |  X2 (Win/Draw): ${c.magenta}${(pred.double_chance.dc_x2 * 100).toFixed(0)}%${c.reset}  |  12 (No Draw): ${(pred.double_chance.dc_12 * 100).toFixed(0)}%`);
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // BTTS & Over/Under 2.5
  console.log(`  ${c.bold}⚽ GOALS & TOTALS MARKETS:${c.reset}`);
  console.log(`     • ${c.bold}Both Teams To Score (GG/BTTS):${c.reset}  YES: ${c.green}${bttsYesPct}%${c.reset} (Fair: ${fairOddsBtts}) | NO: ${((1 - pred.btts.yes) * 100).toFixed(1)}%`);
  console.log(`     • ${c.bold}Over / Under 2.5 Goals:${c.reset}         OVER: ${c.green}${over25Pct}%${c.reset} (Fair: ${fairOddsOver}) | UNDER: ${under25Pct}%`);
  console.log(`     • ${c.dim}Poisson Expectancy (xG):${c.reset}        λ Home: ${pred.expected_goals.lambda_home.toFixed(2)}  |  μ Away: ${pred.expected_goals.mu_away.toFixed(2)} | Combined: ${pred.expected_goals.total.toFixed(2)}`);
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // Shots Prop Market
  console.log(`  ${c.bold}🎯 SHOT VOLUME PROBABILITY MARKET:${c.reset}`);
  console.log(`     • Expected Match Shots: ${c.yellow}${pred.shots.expected_total.toFixed(1)}${c.reset} (Home: ${pred.shots.expected_home_shots.toFixed(1)} | Away: ${pred.shots.expected_away_shots.toFixed(1)})`);
  const l225 = pred.shots.lines['line_22_5'];
  const l245 = pred.shots.lines['line_24_5'];
  const l265 = pred.shots.lines['line_26_5'];
  if (l225 && l245 && l265) {
    console.log(`     • Dynamic Lines:        Over 22.5: ${(l225.over * 100).toFixed(1)}%  |  Over 24.5: ${(l245.over * 100).toFixed(1)}%  |  Over 26.5: ${(l265.over * 100).toFixed(1)}%`);
  }
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // Verified Last 5 Form Matches for Both Home and Away
  console.log(`  ${c.bold}📊 VERIFIED LAST 5 HISTORICAL FORM MATCHES (NEWEST FIRST):${c.reset}`);
  console.log(`     • ${c.bold}${c.cyan}${pred.match.home.toUpperCase()}${c.reset}:`);
  if (homeMatches.length === 0) {
    console.log(`       No past match records found in master dataset.`);
  } else {
    homeMatches.forEach((m) => {
      const isHome = m.home_team.toLowerCase() === pred.match.home.toLowerCase();
      const opp = isHome ? m.away_team : m.home_team;
      const score = `${m.home_goals} - ${m.away_goals}`;
      let outcome = '';
      if (m.home_goals === m.away_goals) {
        outcome = `${c.yellow}[D] DRAW${c.reset}`;
      } else if ((isHome && m.home_goals > m.away_goals) || (!isHome && m.away_goals > m.home_goals)) {
        outcome = `${c.green}[W] WIN${c.reset}`;
      } else {
        outcome = `${c.red}[L] LOSS${c.reset}`;
      }
      console.log(`       - [${m.date}] ${isHome ? 'Home' : 'Away'} vs ${opp.padEnd(22)} | Score: ${score.padEnd(7)} | Outcome: ${outcome}`);
    });
  }

  console.log(`     • ${c.bold}${c.magenta}${pred.match.away.toUpperCase()}${c.reset}:`);
  if (awayMatches.length === 0) {
    console.log(`       No past match records found in master dataset.`);
  } else {
    awayMatches.forEach((m) => {
      const isHome = m.home_team.toLowerCase() === pred.match.away.toLowerCase();
      const opp = isHome ? m.away_team : m.home_team;
      const score = `${m.home_goals} - ${m.away_goals}`;
      let outcome = '';
      if (m.home_goals === m.away_goals) {
        outcome = `${c.yellow}[D] DRAW${c.reset}`;
      } else if ((isHome && m.home_goals > m.away_goals) || (!isHome && m.away_goals > m.home_goals)) {
        outcome = `${c.green}[W] WIN${c.reset}`;
      } else {
        outcome = `${c.red}[L] LOSS${c.reset}`;
      }
      console.log(`       - [${m.date}] ${isHome ? 'Home' : 'Away'} vs ${opp.padEnd(22)} | Score: ${score.padEnd(7)} | Outcome: ${outcome}`);
    });
  }
  console.log(`${c.dim}  ─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // Feature contributions
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
  const { batches, matchesCount } = await generateTodaysTenOddsBatches();
  console.log(`   Ingested ${c.cyan}${matchesCount}${c.reset} live fixtures. Produced ${c.green}${batches.length}${c.reset} optimal ~10.00x Odds Batches.`);

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

  // Extract distinct list of today's matches for drilldown
  const matchList: Array<{ home: string; away: string; league: string; date: string }> = [];
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

  console.log(`\n${c.bold}📋 TODAY'S MATCHES AVAILABLE FOR IN-DEPTH FORENSIC DRILLDOWN:${c.reset}`);
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

    displayMatchPrediction(pred, preFeatures);
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

    displayMatchPrediction(pred, preFeatures);
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

  displayMatchPrediction(pred, preFeatures);
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
      console.log(`  • BTTS Accuracy / Log-Loss: ${(res.overall.btts_accuracy * 100).toFixed(1)}% (Log-Loss: ${res.overall.btts_log_loss.toFixed(3)})`);
      console.log(`  • Over 2.5 Acc / Log-Loss:  ${(res.overall.over25_accuracy * 100).toFixed(1)}% (Log-Loss: ${res.overall.over25_log_loss.toFixed(3)})`);
      console.log(`  • 1X2 Match Outcome Acc:    ${(res.overall.result_accuracy * 100).toFixed(1)}% (Log-Loss: ${res.overall.result_log_loss.toFixed(3)})`);
      console.log(`  • Shots Regression MAE:     ${res.overall.shots_mae.toFixed(2)} shots`);
      await promptUser('\nPress [ENTER] to return to Main Menu...');
    } else if (choice === '5') {
      console.log(`\n${c.bold}GLOBAL FOOTBALL DATA LAKE COVERAGE AUDIT:${c.reset}\n`);
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
    console.log(`  • BTTS Accuracy:             ${(res.overall.btts_accuracy * 100).toFixed(1)}%`);
    console.log(`  • Over 2.5 Accuracy:         ${(res.overall.over25_accuracy * 100).toFixed(1)}%`);
    console.log(`  • 1X2 Match Outcome Acc:     ${(res.overall.result_accuracy * 100).toFixed(1)}%`);
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
    displayMatchPrediction(pred, preFeatures);
    return;
  }

  // Default execution: Launch Interactive Menu
  await runInteractiveMenu();
}

runCli().catch((err) => {
  console.error('CLI execution error:', err);
  process.exit(1);
});
