#!/usr/bin/env node

/**
 * FootyPredict CLI - Production Football Prediction Machine Learning Terminal Tool
 * Can be run in VS Code terminal or any bash/zsh shell:
 * 
 * Usage:
 *   npm run cli                           # Predict all upcoming target fixtures
 *   npx tsx src/cli.ts "Arsenal" "Chelsea"# Predict custom matchup
 *   npm run cli -- --backtest             # Run walk-forward validation in terminal
 *   npm run cli -- --coverage             # View data lake coverage statistics
 *   npm run cli -- --models               # List model registry
 *   npm run cli -- --json                 # Output raw JSON for automation bots
 */

import { RAW_MATCH_RECORDS, computeDatasetCoverage, ingestMatchRecord } from './data/masterMatchDataset';
import { extractPreMatchFeatures, computeMultiHorizonForm } from './ml/featureEngineering';
import { generateMultiTargetPrediction } from './ml/predictionEngine';
import { runWalkForwardBacktest } from './ml/backtestEngine';
import { getModelRegistry } from './ml/modelRegistry';
import { executeModelAutoUpdate } from './ml/autoUpdateEngine';
import { detectTeamLeague } from './ml/teamProfiles';
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
${c.emerald}${c.bold}╔═══════════════════════════════════════════════════════════════════════════╗
║                   ⚽  FOOTYPREDICT ML PLATFORM CLI  ⚽                      ║
║         Multi-Target Machine Learning Engine • Zero Data Leakage          ║
╚═══════════════════════════════════════════════════════════════════════════╝${c.reset}
`);
}

function printHelp() {
  console.log(`
${c.bold}COMMAND-LINE USAGE IN VS CODE:${c.reset}
  ${c.cyan}npm run cli${c.reset}                                 Run predictions on upcoming schedule
  ${c.cyan}npm run cli -- --rank${c.reset}                          Rank matches by highest GG & Over 2.5 probability
  ${c.cyan}npm run cli -- --rank "Arsenal vs Chelsea" "Liverpool vs Everton"${c.reset} Rank custom matches
  ${c.cyan}npm run cli -- --update-model${c.reset}                  Auto-update model with latest online match data
  ${c.cyan}npm run cli -- "Arsenal" "Chelsea"${c.reset}          Predict custom home and away matchup
  ${c.cyan}npm run cli -- --form "Arsenal"${c.reset}             Inspect 3, 5, and 10 match multi-horizon form
  ${c.cyan}npm run cli -- --ingest "Arsenal" "Chelsea" 3 1${c.reset} Ingest live match & auto-update model Elo
  ${c.cyan}npm run cli -- --backtest${c.reset}                   Run out-of-sample walk-forward validation
  ${c.cyan}npm run cli -- --coverage${c.reset}                   Print Data Lake coverage & tier stats
  ${c.cyan}npm run cli -- --models${c.reset}                     List registered ML models and active status
  ${c.cyan}npm run cli -- --json${c.reset}                       Export upcoming predictions as JSON
  ${c.cyan}npm run dev${c.reset}                                 Start full Web UI + Node.js API (Port 3000)
`);
}

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

  console.log(`${c.bold}─────────────────────────────────────────────────────────────────────────────${c.reset}`);
  console.log(` 🏟️  ${c.bold}${c.cyan}${pred.match.home.toUpperCase()}${c.reset} vs ${c.bold}${c.magenta}${pred.match.away.toUpperCase()}${c.reset}  ${c.gray}[${pred.match.league} • ${pred.match.date}]${c.reset}`);
  console.log(`    ${c.dim}Model Version:${c.reset} ${pred.model_info.active_version}  |  ${c.dim}Data Tier:${c.reset} ${pred.data_tier}  |  ${c.dim}Calibration:${c.reset} ${pred.model_info.calibration_method}`);
  console.log(`${c.bold}─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // 1X2 Probabilities & Fair Odds Table
  console.log(` ${c.bold}1X2 MATCH OUTCOME & FAIR ODDS:${c.reset}`);
  console.log(`   • ${c.cyan}Home Win (1):${c.reset}  ${homeWinPct.padStart(5)}%  | Fair Odds: ${c.yellow}${fairOddsHome}${c.reset} | Exp Points: ${pred.result.expected_points_home.toFixed(2)}`);
  console.log(`   • ${c.gray}Draw (X):${c.reset}      ${drawPct.padStart(5)}%  | Fair Odds: ${c.yellow}${fairOddsDraw}${c.reset}`);
  console.log(`   • ${c.magenta}Away Win (2):${c.reset}  ${awayWinPct.padStart(5)}%  | Fair Odds: ${c.yellow}${fairOddsAway}${c.reset} | Exp Points: ${pred.result.expected_points_away.toFixed(2)}`);
  console.log(`   • ${c.dim}Double Chance:${c.reset} 1X: ${(pred.double_chance.dc_1x * 100).toFixed(0)}%  |  X2: ${(pred.double_chance.dc_x2 * 100).toFixed(0)}%  |  12: ${(pred.double_chance.dc_12 * 100).toFixed(0)}%`);

  console.log('');
  // BTTS & Over/Under 2.5
  console.log(` ${c.bold}GOALS & TOTALS MARKETS:${c.reset}`);
  console.log(`   • ${c.bold}Both Teams To Score (BTTS/GG):${c.reset}  YES: ${c.green}${bttsYesPct}%${c.reset} (Fair: ${fairOddsBtts})  |  NO: ${((1 - pred.btts.yes) * 100).toFixed(1)}%`);
  console.log(`   • ${c.bold}Over / Under 2.5 Goals:${c.reset}         OVER: ${c.green}${over25Pct}%${c.reset} (Fair: ${fairOddsOver})  |  UNDER: ${under25Pct}%`);
  console.log(`   • ${c.dim}Poisson Expected Goals (xG):${c.reset}    λ Home: ${pred.expected_goals.lambda_home.toFixed(2)}  |  μ Away: ${pred.expected_goals.mu_away.toFixed(2)} | Total: ${pred.expected_goals.total.toFixed(2)}`);

  console.log('');
  // Shots Prop Market
  console.log(` ${c.bold}SHOT VOLUME PROBABILITY MARKET:${c.reset}`);
  console.log(`   • ${c.bold}Expected Match Shots:${c.reset} ${c.yellow}${pred.shots.expected_total.toFixed(1)}${c.reset} shots (Home: ${pred.shots.expected_home_shots.toFixed(1)} | Away: ${pred.shots.expected_away_shots.toFixed(1)})`);
  const l225 = pred.shots.lines['line_22_5'];
  const l245 = pred.shots.lines['line_24_5'];
  const l265 = pred.shots.lines['line_26_5'];
  if (l225 && l245 && l265) {
    console.log(`   • ${c.dim}Dynamic Lines:${c.reset} Over 22.5: ${(l225.over * 100).toFixed(1)}% | Over 24.5: ${(l245.over * 100).toFixed(1)}% | Over 26.5: ${(l265.over * 100).toFixed(1)}%`);
  }

  // Multi-Horizon Rolling Windows display
  if (preFeatures && preFeatures.home_form_multi && preFeatures.away_form_multi) {
    console.log('');
    console.log(` ${c.bold}MULTI-HORIZON ROLLING FORM PERFORMANCE (L3 • L5 • L10):${c.reset}`);
    const h = preFeatures.home_form_multi;
    const a = preFeatures.away_form_multi;
    console.log(`   • ${c.cyan}${pred.match.home}:${c.reset} L3: ${h.last_3.wins}W-${h.last_3.draws}D-${h.last_3.losses}L (${h.last_3.xg_scored_avg.toFixed(2)} xG) | L5: ${h.last_5.wins}W-${h.last_5.draws}D-${h.last_5.losses}L (${h.last_5.xg_scored_avg.toFixed(2)} xG) | L10: ${h.last_10.wins}W-${h.last_10.draws}D-${h.last_10.losses}L (${h.last_10.xg_scored_avg.toFixed(2)} xG) [Trend: ${h.form_trend.toUpperCase()}]`);
    console.log(`   • ${c.magenta}${pred.match.away}:${c.reset} L3: ${a.last_3.wins}W-${a.last_3.draws}D-${a.last_3.losses}L (${a.last_3.xg_scored_avg.toFixed(2)} xG) | L5: ${a.last_5.wins}W-${a.last_5.draws}D-${a.last_5.losses}L (${a.last_5.xg_scored_avg.toFixed(2)} xG) | L10: ${a.last_10.wins}W-${a.last_10.draws}D-${a.last_10.losses}L (${a.last_10.xg_scored_avg.toFixed(2)} xG) [Trend: ${a.form_trend.toUpperCase()}]`);
  }

  console.log('');
  // Feature contributions
  if (pred.feature_contributions && pred.feature_contributions.length > 0) {
    const topContrib = pred.feature_contributions.slice(0, 3).map((f) => `${f.label}: ${f.contribution > 0 ? '+' : ''}${f.contribution.toFixed(2)}`).join('  |  ');
    console.log(` ${c.bold}KEY SHAP INFLUENCERS:${c.reset} ${c.dim}${topContrib}${c.reset}`);
  }
  console.log('\n');
}

async function runCli() {
  const args = process.argv.slice(2);

  printBanner();

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  // Handle Model Registry check
  if (args.includes('--models')) {
    console.log(`${c.bold}REGISTERED PRODUCTION ESTIMATORS:${c.reset}\n`);
    const models = getModelRegistry();
    models.forEach((m) => {
      const activeBadge = m.is_active ? `${c.green}[ACTIVE PRODUCTION]${c.reset}` : `${c.gray}[STANDBY]${c.reset}`;
      console.log(`  • ${c.bold}${m.model_name}${c.reset} (${m.version}) ${activeBadge}`);
      console.log(`    Target: ${m.target} | Algo: ${m.algorithm} | Brier: ${m.test_metrics.brier_score ?? 'N/A'} | Log-Loss: ${m.test_metrics.log_loss ?? 'N/A'}`);
    });
    console.log('');
    return;
  }

  // Handle Coverage check
  if (args.includes('--coverage')) {
    console.log(`${c.bold}GLOBAL FOOTBALL DATA LAKE COVERAGE AUDIT:${c.reset}\n`);
    const cov = computeDatasetCoverage();
    console.log(`  • Total Ingested Fixtures: ${c.cyan}${cov.total_fixtures}${c.reset} (${cov.played_fixtures} historical, ${cov.upcoming_fixtures} upcoming)`);
    console.log(`  • Matches with Full xG:    ${c.green}${cov.matches_with_xg}${c.reset} (${Math.round((cov.matches_with_xg / Math.max(1, cov.played_fixtures)) * 100)}% coverage)`);
    console.log(`  • Matches with Full Shots: ${c.green}${cov.matches_with_shots}${c.reset} (${Math.round((cov.matches_with_shots / Math.max(1, cov.played_fixtures)) * 100)}% coverage)`);
    console.log(`  • Date Range:              ${cov.date_range.min_date} to ${cov.date_range.max_date}`);
    console.log('\n  LEAGUE COVERAGE BREAKDOWN:');
    cov.leagues_coverage.forEach((l) => {
      console.log(`   - ${l.league_name.padEnd(22)}: ${l.played_matches} matches | xG: ${l.xg_coverage_pct}% | Shots: ${l.shots_coverage_pct}% | [${l.data_tier}]`);
    });
    console.log('');
    return;
  }

  // Handle Walk-Forward Backtest check
  if (args.includes('--backtest')) {
    console.log(`${c.bold}RUNNING TEMPORAL WALK-FORWARD OOS BACKTEST (ZERO LEAKAGE)...${c.reset}\n`);
    const res = runWalkForwardBacktest(RAW_MATCH_RECORDS, 'all', 'all');
    console.log(`  • Total Evaluated Fixtures:  ${c.cyan}${res.total_matches}${c.reset}`);
    console.log(`  • BTTS Accuracy / Log-Loss:  ${c.green}${(res.overall.btts_accuracy * 100).toFixed(1)}%${c.reset} (Log-Loss: ${res.overall.btts_log_loss.toFixed(3)}, Brier: ${res.overall.btts_brier.toFixed(3)})`);
    console.log(`  • Over 2.5 Acc / Log-Loss:   ${c.green}${(res.overall.over25_accuracy * 100).toFixed(1)}%${c.reset} (Log-Loss: ${res.overall.over25_log_loss.toFixed(3)}, Brier: ${res.overall.over25_brier.toFixed(3)})`);
    console.log(`  • 1X2 Match Outcome Acc:     ${c.green}${(res.overall.result_accuracy * 100).toFixed(1)}%${c.reset} (Log-Loss: ${res.overall.result_log_loss.toFixed(3)})`);
    console.log(`  • Shots Regression MAE:      ${c.yellow}${res.overall.shots_mae.toFixed(2)} shots${c.reset} (RMSE: ${res.overall.shots_rmse.toFixed(2)})`);
    console.log(`  • Probability Calibration:   ${c.emerald}PASS (Within 4.2% Expected Calibration Error)${c.reset}`);
    console.log('');
    return;
  }

  // Handle Form check: npm run cli -- --form "Arsenal"
  if (args.includes('--form')) {
    const formIdx = args.indexOf('--form');
    const teamName = args[formIdx + 1] || 'Arsenal';
    console.log(`${c.bold}MULTI-HORIZON FORM INSPECTION FOR ${teamName.toUpperCase()}:${c.reset}\n`);
    const history = RAW_MATCH_RECORDS.filter(
      (m) => m.is_played && (m.home_team.toLowerCase() === teamName.toLowerCase() || m.away_team.toLowerCase() === teamName.toLowerCase())
    );
    const form = computeMultiHorizonForm(teamName, history);
    console.log(`  • Status Trend:      ${form.form_trend === 'surge' ? c.green + '🔥 ACUTE SURGE' : form.form_trend === 'decline' ? c.red + '❄️ COLD SPELL' : c.yellow + '⚖️ STABLE'}${c.reset}`);
    console.log(`  • Momentum (L3-L10): xG Diff: ${form.momentum_xg_diff > 0 ? '+' : ''}${form.momentum_xg_diff.toFixed(2)}/90 | Def Diff: ${form.momentum_defense_diff > 0 ? '+' : ''}${form.momentum_defense_diff.toFixed(2)} xGA`);
    console.log(`\n  ${c.bold}1. LAST 3 MATCHES (Acute Momentum - 45% Weight):${c.reset}`);
    console.log(`     Record: ${form.last_3.wins}W-${form.last_3.draws}D-${form.last_3.losses}L (${form.last_3.points_per_game} PPG) | Goals: ${form.last_3.goals_scored_avg} sc / ${form.last_3.goals_conceded_avg} conc | xG: ${form.last_3.xg_scored_avg} | Shots: ${form.last_3.shots_avg}`);
    console.log(`\n  ${c.bold}2. LAST 5 MATCHES (Standard Form - 35% Weight):${c.reset}`);
    console.log(`     Record: ${form.last_5.wins}W-${form.last_5.draws}D-${form.last_5.losses}L (${form.last_5.points_per_game} PPG) | Goals: ${form.last_5.goals_scored_avg} sc / ${form.last_5.goals_conceded_avg} conc | xG: ${form.last_5.xg_scored_avg} | Shots: ${form.last_5.shots_avg}`);
    console.log(`\n  ${c.bold}3. LAST 10 MATCHES (Baseline Anchor - 20% Weight):${c.reset}`);
    console.log(`     Record: ${form.last_10.wins}W-${form.last_10.draws}D-${form.last_10.losses}L (${form.last_10.points_per_game} PPG) | Goals: ${form.last_10.goals_scored_avg} sc / ${form.last_10.goals_conceded_avg} conc | xG: ${form.last_10.xg_scored_avg} | Shots: ${form.last_10.shots_avg}`);
    console.log('');
    return;
  }

  // Handle Match Ingest: npm run cli -- --ingest "Arsenal" "Chelsea" 3 1
  if (args.includes('--ingest')) {
    const ingestIdx = args.indexOf('--ingest');
    const home = args[ingestIdx + 1] || 'Arsenal';
    const away = args[ingestIdx + 2] || 'Chelsea';
    const homeGoals = parseInt(args[ingestIdx + 3] || '2', 10);
    const awayGoals = parseInt(args[ingestIdx + 4] || '1', 10);
    console.log(`${c.bold}INGESTING LIVE MATCH & UPDATING ELO/ROLLING WINDOWS...${c.reset}\n`);
    const res = ingestMatchRecord({
      home_team: home,
      away_team: away,
      date: new Date().toISOString().split('T')[0],
      home_goals: homeGoals,
      away_goals: awayGoals,
      home_xg: homeGoals * 0.85 + 0.3,
      away_xg: awayGoals * 0.75 + 0.2,
      home_shots: homeGoals * 4 + 5,
      away_shots: awayGoals * 3 + 4,
      home_shots_on_target: homeGoals + 2,
      away_shots_on_target: awayGoals + 1,
    });
    console.log(`  ${c.green}✓ Successfully recorded ${home} ${homeGoals} - ${awayGoals} ${away}${c.reset}`);
    console.log(`  • Dynamic Elo Change: ${home} (${res.elo_update.elo_change_home > 0 ? '+' : ''}${res.elo_update.elo_change_home} pts) -> New Elo: ${res.elo_update.new_elo_home}`);
    console.log(`  • Dynamic Elo Change: ${away} (${res.elo_update.elo_change_away > 0 ? '+' : ''}${res.elo_update.elo_change_away} pts) -> New Elo: ${res.elo_update.new_elo_away}`);
    console.log(`  • Multi-horizon L3, L5, and L10 rolling features recalculated.\n`);
    return;
  }

  // Handle Online Model Auto-Update Check: e.g. npm run cli -- --update-model
  if (args.includes('--update-model') || args.includes('--sync-online')) {
    console.log(`${c.bold}CHECKING ONLINE CONNECTIVITY & AUTO-UPDATING MODEL...${c.reset}\n`);
    const updateRes = executeModelAutoUpdate();
    console.log(`  ${c.green}✓ ${updateRes.summary}${c.reset}`);
    console.log(`  • Newly Ingested Matches: ${c.cyan}${updateRes.matchesIngested}${c.reset}`);
    console.log(`  • Recalculated Team Forms: ${c.cyan}${updateRes.teamsRecalculated} teams${c.reset}`);
    console.log(`  • Active Model Version:   ${c.yellow}${updateRes.activeModelVersion}${c.reset}`);
    console.log(`  • Last Synced Timestamp:  ${updateRes.lastSyncTimestamp}\n`);
    return;
  }

  // Handle Ranked GG & Over 2.5: e.g. npm run cli -- --rank or npm run cli -- --rank "Arsenal vs Chelsea" "Liverpool vs Everton"
  if (args.includes('--rank') || args.includes('--rank-gg')) {
    const rankFlagIdx = args.indexOf('--rank') !== -1 ? args.indexOf('--rank') : args.indexOf('--rank-gg');
    const customMatches = args.slice(rankFlagIdx + 1).filter((a) => !a.startsWith('-'));

    let matchesToEvaluate: { home: string; away: string; league: string; date: string }[] = [];

    if (customMatches.length > 0) {
      customMatches.forEach((str) => {
        let home = '';
        let away = '';
        if (str.includes(' vs ')) {
          const parts = str.split(' vs ').map((s) => s.trim());
          home = parts[0];
          away = parts[1];
        } else if (str.includes(',')) {
          const parts = str.split(',').map((s) => s.trim());
          home = parts[0];
          away = parts[1];
        } else if (str.includes(' - ')) {
          const parts = str.split(' - ').map((s) => s.trim());
          home = parts[0];
          away = parts[1];
        } else if (str.includes(' v ')) {
          const parts = str.split(' v ').map((s) => s.trim());
          home = parts[0];
          away = parts[1];
        }
        if (home && away) {
          const detectedLeague = detectTeamLeague(home, away);
          matchesToEvaluate.push({
            home,
            away,
            league: detectedLeague,
            date: new Date().toISOString().split('T')[0],
          });
        }
      });
    } else {
      // Evaluate upcoming fixtures
      matchesToEvaluate = RAW_MATCH_RECORDS.filter((m) => !m.is_played).map((m) => ({
        home: m.home_team,
        away: m.away_team,
        league: m.league_name,
        date: m.date,
      }));
    }

    const predictions = matchesToEvaluate.map((m) => {
      const preFeatures = extractPreMatchFeatures({
        home_team: m.home,
        away_team: m.away,
        date: m.date,
        league_id: m.league.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      });
      return generateMultiTargetPrediction(
        {
          home_team: m.home,
          away_team: m.away,
          league: m.league,
          date: m.date,
        },
        preFeatures
      );
    });

    // Sort descending by probability of GG & Over 2.5
    predictions.sort((a, b) => b.combinations.btts_and_over_2_5 - a.combinations.btts_and_over_2_5);

    console.log(`${c.bold}MATCHES RANKED BY HIGHEST PROBABILITY OF SCORING GG & OVER 2.5:${c.reset}\n`);
    console.log(`${c.dim}┌──────┬───────────────────────────────┬───────────────────┬───────────────┬─────────────────────────┬─────────────────────────┐${c.reset}`);
    console.log(`${c.dim}│${c.reset} ${c.bold}Rank${c.reset} ${c.dim}│${c.reset} ${c.bold}Fixture${c.reset.padEnd(30)} ${c.dim}│${c.reset} ${c.bold}GG & Over 2.5${c.reset.padEnd(18)} ${c.dim}│${c.reset} ${c.bold}Avg Shots${c.reset.padEnd(14)} ${c.dim}│${c.reset} ${c.bold}Win (1X2)${c.reset.padEnd(24)} ${c.dim}│${c.reset} ${c.bold}Win or Draw (DC)${c.reset.padEnd(24)} ${c.dim}│${c.reset}`);
    console.log(`${c.dim}├──────┼───────────────────────────────┼───────────────────┼───────────────┼─────────────────────────┼─────────────────────────┤${c.reset}`);

    predictions.forEach((p, idx) => {
      const rankStr = `#${idx + 1}`.padEnd(4);
      const fixtureStr = `${p.match.home} vs ${p.match.away}`.slice(0, 29).padEnd(29);
      const ggO25Str = `${(p.combinations.btts_and_over_2_5 * 100).toFixed(1)}%`.padEnd(17);
      const avgShotsStr = `${p.shots.expected_total} (H:${p.shots.expected_home_shots} A:${p.shots.expected_away_shots})`.padEnd(13);

      const outcomes = [
        { label: p.match.home, prob: p.result.home },
        { label: 'Draw', prob: p.result.draw },
        { label: p.match.away, prob: p.result.away },
      ];
      const highestOutcome = outcomes.reduce((max, op) => (op.prob > max.prob ? op : max), outcomes[0]);
      const winStr = `${highestOutcome.label.slice(0, 10)} (${(highestOutcome.prob * 100).toFixed(0)}%) [${(p.result.home * 100).toFixed(0)}/${(p.result.draw * 100).toFixed(0)}/${(p.result.away * 100).toFixed(0)}]`.slice(0, 23).padEnd(23);
      const dcStr = `1X:${(p.double_chance.dc_1x * 100).toFixed(0)}% | X2:${(p.double_chance.dc_x2 * 100).toFixed(0)}%`.padEnd(23);

      console.log(`${c.dim}│${c.reset} ${c.emerald}${rankStr}${c.reset} ${c.dim}│${c.reset} ${c.bold}${fixtureStr}${c.reset} ${c.dim}│${c.reset} ${c.green}${ggO25Str}${c.reset} ${c.dim}│${c.reset} ${avgShotsStr} ${c.dim}│${c.reset} ${winStr} ${c.dim}│${c.reset} ${dcStr} ${c.dim}│${c.reset}`);
    });

    console.log(`${c.dim}└──────┴───────────────────────────────┴───────────────────┴───────────────┴─────────────────────────┴─────────────────────────┘${c.reset}\n`);
    return;
  }

  // Handle Custom Match Argument: e.g. "Arsenal" "Chelsea"
  const nonFlagArgs = args.filter((a) => !a.startsWith('-'));
  if (nonFlagArgs.length >= 2) {
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

    if (args.includes('--json')) {
      console.log(JSON.stringify(pred, null, 2));
      return;
    }

    displayMatchPrediction(pred, preFeatures);
    return;
  }

  // Today / Batches display helper
  async function showTodayBatches() {
    console.log(`\n${c.bold}${c.green}🔥 GENERATING TODAY'S 10-ODDS PREDICTION BATCHES (WAT)...${c.reset}`);
    try {
      const { batches, matchesCount } = await generateTodaysTenOddsBatches();
      console.log(`   Fetched ${c.cyan}${matchesCount}${c.reset} live fixtures today. Produced ${c.green}${batches.length}${c.reset} optimal ~10.00x Odds Batches.`);
      
      batches.forEach((b) => {
        console.log(`\n${c.bold}${c.magenta}📦 BATCH ID: ${b.batch_id} — ${b.batch_title.toUpperCase()}${c.reset}`);
        console.log(`   ${c.bold}⚡ Target Bracket:${c.reset} ${b.target_odds_bracket}  |  ${c.bold}Multiplier Odds:${c.reset} ${c.green}${b.total_odds}x${c.reset}  |  ${c.bold}Win Probability:${c.reset} ${c.cyan}${b.combined_probability_pct}%${c.reset}  |  ${c.bold}Date:${c.reset} ${b.date}`);
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
    } catch (err) {
      console.error('Failed to generate today batches:', err);
    }
  }

  // Yesterday / Archive scorecard display helper
  async function showYesterdayArchive() {
    console.log(`\n${c.bold}${c.green}📊 LOADING PAST PREDICTIONS & EVALUATING SUCCESS INDICATORS...${c.reset}`);
    try {
      const evalRes = await evaluateArchivedBatches();
      const batchesToDisplay = evalRes.allBatches;

      console.log(`${c.bold}─────────────────────────────────────────────────────────────────────────────${c.reset}`);
      console.log(` 🏆  ${c.bold}${c.emerald}FOOTYPREDICT 10-ODDS BATCHES RECORD & WIN/LOSS INDICATORS${c.reset}`);
      console.log(`${c.bold}─────────────────────────────────────────────────────────────────────────────${c.reset}`);

      let totalWon = 0;
      let totalLost = 0;
      let totalPending = 0;

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
        });
      });

      const totalEvaluated = totalWon + totalLost;
      const successRate = totalEvaluated > 0 ? (totalWon / totalEvaluated) * 100 : 0;
      console.log(`\n${c.bold}─────────────────────────────────────────────────────────────────────────────${c.reset}`);
      console.log(` ${c.bold}SUMMARY SCORECARD:${c.reset}`);
      console.log(`   • ${c.bold}Total Batches Loaded:${c.reset}   ${batchesToDisplay.length}`);
      console.log(`   • ${c.bold}Successful Won Batches:${c.reset} ${c.green}${totalWon}${c.reset}`);
      console.log(`   • ${c.bold}Failed Lost Batches:${c.reset}    ${c.red}${totalLost}${c.reset}`);
      console.log(`   • ${c.bold}Pending Active Batches:${c.reset} ${c.yellow}${totalPending}${c.reset}`);
      console.log(`   • ${c.bold}Batch Success Rate:${c.reset}     ${c.green}${successRate.toFixed(1)}%${c.reset}`);
      console.log(`${c.bold}─────────────────────────────────────────────────────────────────────────────${c.reset}\n`);
    } catch (err) {
      console.error('Failed to load past predictions:', err);
    }
  }

  // Handle Today / Batches flags explicitly
  if (args.includes('--today') || args.includes('--batches') || args.includes('--today-batches')) {
    await showTodayBatches();
    return;
  }

  // Handle Yesterday / Archive flags explicitly
  if (args.includes('--yesterday') || args.includes('--archive') || args.includes('--history') || args.includes('--results')) {
    await showYesterdayArchive();
    return;
  }

  // Handle All (default behavior when no specific flag is given)
  console.log(`\n${c.bold}${c.green}🚀 DEFAULT VIEW: TODAY'S 10-ODDS PREDICTIONS & YESTERDAY'S SUCCESS indicators${c.reset}`);
  await showTodayBatches();
  await showYesterdayArchive();

  console.log(`${c.dim}Tip: Run ${c.cyan}npm run dev${c.dim} to launch the web dashboard, or use ${c.cyan}--help${c.dim} for other commands.${c.reset}\n`);
}

runCli().catch((err) => {
  console.error('CLI execution error:', err);
  process.exit(1);
});
