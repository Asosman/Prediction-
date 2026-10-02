// ==========================================
// FootyPredict Pro - Types Definition
// Multi-Target ML Football Prediction Platform
// ==========================================

export type DataTier = 'Tier A' | 'Tier B' | 'Tier C';

export interface RawMatchRecord {
  match_id: string;
  date: string;
  season: string;
  league_id: string;
  league_name: string;
  home_team_id: string;
  home_team: string;
  away_team_id: string;
  away_team: string;

  // Actual match results (post-match targets)
  home_goals?: number;
  away_goals?: number;
  total_goals?: number;

  home_shots?: number;
  away_shots?: number;
  total_shots?: number;

  home_shots_on_target?: number;
  away_shots_on_target?: number;
  total_shots_on_target?: number;

  home_xg?: number;
  away_xg?: number;
  total_xg?: number;

  home_possession?: number;
  away_possession?: number;

  home_corners?: number;
  away_corners?: number;

  home_yellow_cards?: number;
  away_yellow_cards?: number;

  home_red_cards?: number;
  away_red_cards?: number;

  home_fouls?: number;
  away_fouls?: number;

  home_offsides?: number;
  away_offsides?: number;

  home_penalties?: number;
  away_penalties?: number;

  // Odds if available
  odd_home?: number;
  odd_draw?: number;
  odd_away?: number;
  odd_over_25?: number;
  odd_under_25?: number;
  odd_btts_yes?: number;
  odd_btts_no?: number;

  known_at: string;
  is_played: boolean;
}

// Rolling Form Window breakdown for single team
export interface MatchHistoryItem {
  match_id: string;
  date: string;
  opponent: string;
  is_home: boolean;
  goals_for: number;
  goals_against: number;
  outcome: 'W' | 'D' | 'L';
  xg_for?: number;
  xg_against?: number;
  shots_for?: number;
  shots_against?: number;
  sot_for?: number;
  sot_against?: number;
  corners_for?: number;
}

export interface TeamWindowStats {
  window_size: 3 | 5 | 10;
  matches_count: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  points_per_game: number;
  goals_scored_avg: number;
  goals_conceded_avg: number;
  xg_scored_avg: number;
  xga_conceded_avg: number;
  shots_avg: number;
  shots_conceded_avg: number;
  sot_avg: number;
  sot_conceded_avg: number;
  corners_avg: number;
  btts_rate: number;
  over25_rate: number;
  clean_sheet_rate: number;
  matches: MatchHistoryItem[];
}

export interface MultiHorizonForm {
  team_name: string;
  last_3: TeamWindowStats;
  last_5: TeamWindowStats;
  last_10: TeamWindowStats;
  momentum_xg_diff: number; // L3 xG - L10 xG
  momentum_defense_diff: number; // L10 xGA - L3 xGA (positive = defending better)
  momentum_points_diff: number; // L3 PPG - L10 PPG
  form_trend: 'surge' | 'stable' | 'decline';
}

// Leakage-free pre-match engineered features
export interface PreMatchFeatures {
  match_id: string;
  date: string;
  league_id: string;
  home_team: string;
  away_team: string;
  data_tier: DataTier;

  // Elo power ratings
  elo_home: number;
  elo_away: number;
  elo_difference: number;

  // Rest days
  days_since_home_prev_match: number;
  days_since_away_prev_match: number;
  rest_difference: number;

  // Multi-Horizon Form breakdown (L3, L5, L10)
  home_form_multi: MultiHorizonForm;
  away_form_multi: MultiHorizonForm;

  // Rolling Form: Last 3 Matches (Acute Momentum)
  home_last_3_goals_scored_avg: number;
  home_last_3_goals_conceded_avg: number;
  away_last_3_goals_scored_avg: number;
  away_last_3_goals_conceded_avg: number;
  home_last_3_xg_avg: number;
  home_last_3_xga_avg: number;
  away_last_3_xg_avg: number;
  away_last_3_xga_avg: number;
  home_last_3_shots_avg: number;
  away_last_3_shots_avg: number;

  // Rolling Form: Last 5 Matches (Goals & xG - Standard)
  home_last_5_goals_scored_avg: number;
  home_last_5_goals_conceded_avg: number;
  away_last_5_goals_scored_avg: number;
  away_last_5_goals_conceded_avg: number;
  home_last_5_xg_avg: number;
  home_last_5_xga_avg: number;
  away_last_5_xg_avg: number;
  away_last_5_xga_avg: number;

  // Rolling Form: Last 10 Matches (Long-Term Baseline Anchor)
  home_last_10_goals_scored_avg: number;
  home_last_10_goals_conceded_avg: number;
  away_last_10_goals_scored_avg: number;
  away_last_10_goals_conceded_avg: number;
  home_last_10_xg_avg: number;
  home_last_10_xga_avg: number;
  away_last_10_xg_avg: number;
  away_last_10_xga_avg: number;
  home_last_10_shots_avg: number;
  away_last_10_shots_avg: number;

  // Rolling Form: Last 5 Matches (Shots & Corners)
  home_last_5_shots_avg: number;
  home_last_5_shots_conceded_avg: number;
  away_last_5_shots_avg: number;
  away_last_5_shots_conceded_avg: number;

  home_last_5_sot_avg: number;
  home_last_5_sot_conceded_avg: number;
  away_last_5_sot_avg: number;
  away_last_5_sot_conceded_avg: number;

  home_last_5_corners_avg: number;
  away_last_5_corners_avg: number;

  // Differentials
  attack_vs_defense_home: number;
  attack_vs_defense_away: number;
  xg_difference: number;
  shots_difference: number;
  sot_difference: number;
  momentum_difference: number; // Home L3 surge vs Away L3 surge

  // Head-to-Head priors
  h2h_matches_count: number;
  h2h_home_wins: number;
  h2h_draws: number;
  h2h_away_wins: number;
  h2h_avg_goals: number;

  // Availability Flags (No imputation zeros)
  xg_available: boolean;
  shots_available: boolean;
  possession_available: boolean;
  feature_completeness_pct: number;
}

// Prediction outputs for all 6 target categories
export interface MultiTargetPrediction {
  match: {
    home: string;
    away: string;
    league: string;
    date: string;
  };
  data_tier: DataTier;
  feature_completeness: number;
  model_info: {
    active_version: string;
    algorithm: string;
    is_calibrated: boolean;
    calibration_method: string;
  };

  // Target 1: BTTS / GG
  btts: {
    yes: number; // e.g. 0.632
    no: number;  // e.g. 0.368
    raw_yes?: number;
  };

  // Target 2: Over / Under 2.5 Total Goals
  over_2_5: {
    over: number;  // e.g. 0.574
    under: number; // e.g. 0.426
    raw_over?: number;
  };

  // Target 3: 1X2 Match Outcome
  result: {
    home: number; // e.g. 0.481
    draw: number; // e.g. 0.273
    away: number; // e.g. 0.246
    expected_points_home: number;
    expected_points_away: number;
  };

  // Target 4: Double Chance
  double_chance: {
    dc_1x: number; // Home or Draw
    dc_x2: number; // Draw or Away
    dc_12: number; // Home or Away
  };

  // Target 5: Total Shots Regression & Configurable Lines
  shots: {
    expected_total: number; // e.g. 25.7
    expected_home_shots: number;
    expected_away_shots: number;
    lines: {
      [lineKey: string]: {
        line: number;
        over: number;
        under: number;
      };
    };
  };

  // Target 6: Combinations (True Joint Modeling)
  combinations: {
    btts_and_over_2_5: number;
    btts_and_under_2_5: number;
    no_btts_and_over_2_5: number;
    no_btts_and_under_2_5: number;
  };

  // Poisson expected goals parameters
  expected_goals: {
    lambda_home: number;
    mu_away: number;
    total: number;
  };

  // Explainability: Top Feature Contributions (SHAP-style)
  feature_contributions: Array<{
    feature: string;
    label: string;
    value: number | string;
    contribution: number; // positive or negative
    impact: 'positive' | 'negative' | 'neutral';
  }>;

  // Multi-Horizon Form Performance Analysis (L3 • L5 • L10)
  multi_horizon_analysis?: {
    home: MultiHorizonForm;
    away: MultiHorizonForm;
    blended_weights: {
      l3_weight: number;
      l5_weight: number;
      l10_weight: number;
    };
  };

  // Squad Intelligence, Injuries & Coach Wellbeing
  squad_intelligence?: {
    home: SquadIntelligenceProfile;
    away: SquadIntelligenceProfile;
  };

  // Detailed Historical Head-to-Head Record
  h2h_detailed?: HistoricalH2HDetail;

  // Calendar Day & Month Historical Record
  calendar_day_performance?: CalendarDayPerformance;

  // Tournament / League Specific Standings & Norms
  tournament_performance?: TournamentLeaguePerformance;

  // Matchday-Specific Historical Performance
  matchday_performance?: MatchdayHistoricalPerformance;

  // Pure Home vs Pure Away Venue Performance Splits
  home_away_splits?: HomeAwaySplitPerformance;

  // Forensic Prediction Reasoning (Shots, GG, O2.5, Win or Draw, 1X2)
  forensic_reasoning?: ForensicPredictionReasoning;
}

// -------------------------------------------------------------
// Extended Types for Squad Intelligence, Context & Forensics
// -------------------------------------------------------------

export interface PlayerInjury {
  player_name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  status: 'Out' | 'Doubtful' | 'Suspended';
  importance: 'Key Player' | 'Starter' | 'Squad';
  reason: string;
  impact_score: number;
}

export interface CoachInfo {
  name: string;
  tactical_style: string;
  tenure_months: number;
  recent_form_rating: number;
  wellbeing_status: 'Optimal' | 'Pressured' | 'Crisis' | 'New Manager Bounce';
  win_rate_pct: number;
}

export interface SquadIntelligenceProfile {
  team_name: string;
  coach: CoachInfo;
  injuries: PlayerInjury[];
  morale_score: number;
  squad_fitness_pct: number;
  news_bulletin: string;
  injury_attack_penalty: number;
  injury_defense_penalty: number;
  key_players?: string[];
  starting_roster?: string[];
}

export interface HistoricalH2HDetail {
  total_matches: number;
  home_wins: number;
  draws: number;
  away_wins: number;
  home_win_pct: number;
  draw_pct: number;
  away_win_pct: number;
  btts_rate: number;
  over25_rate: number;
  avg_goals: number;
  avg_shots: number;
  bogey_team_factor: string | null;
  recent_matches: Array<{
    date: string;
    home: string;
    away: string;
    score: string;
    outcome: 'home' | 'draw' | 'away';
    competition: string;
    total_goals: number;
    btts: boolean;
  }>;
}

export interface CalendarDayPerformance {
  calendar_day: string;
  calendar_month: string;
  day_of_week: string;
  home_record: {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    win_pct: number;
    avg_goals_scored: number;
    avg_goals_conceded: number;
    trend_description: string;
  };
  away_record: {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    win_pct: number;
    avg_goals_scored: number;
    avg_goals_conceded: number;
    trend_description: string;
  };
}

export interface EspnComprehensiveTeamData {
  team_name: string;
  team_id?: string;
  league_name: string;
  coach: {
    name: string;
    role: string;
    nationality?: string;
    tenure_months: number;
    win_rate_pct: number;
    tactical_philosophy: string;
  };
  key_players: string[];
  full_roster: Array<{ name: string; position: string; jersey?: string }>;
  dressing_room: {
    status: 'Peace & Harmony' | 'Optimal Cohesion' | 'Tense' | 'Crisis & Turmoil';
    morale_index: number;
    harmony_report: string;
  };
  injuries_and_suspensions: Array<{
    player_name: string;
    position: string;
    status: 'Out' | 'Doubtful' | 'Suspended' | 'Questionable';
    reason: string;
    impact_factor: number;
  }>;
  home_performance: {
    matches_played: number;
    wins: number;
    draws: number;
    losses: number;
    win_pct: number;
    goals_scored_avg: number;
    goals_conceded_avg: number;
    clean_sheets_pct: number;
  };
  away_performance: {
    matches_played: number;
    wins: number;
    draws: number;
    losses: number;
    win_pct: number;
    goals_scored_avg: number;
    goals_conceded_avg: number;
    clean_sheets_pct: number;
  };
  multi_horizon_form: {
    last_3: { wins: number; draws: number; losses: number; goals_for: number; goals_against: number; red_cards: number };
    last_5: { wins: number; draws: number; losses: number; goals_for: number; goals_against: number; red_cards: number };
    last_10: { wins: number; draws: number; losses: number; goals_for: number; goals_against: number; red_cards: number };
  };
  discipline: {
    total_red_cards: number;
    total_yellow_cards: number;
    fouls_per_match: number;
  };
}

export interface TournamentLeaguePerformance {
  league_id: string;
  league_name: string;
  home_standing: {
    rank: number;
    played: number;
    points: number;
    ppg: number;
    goals_for: number;
    goals_against: number;
    goal_diff: number;
    recent_form: string[];
    home_rank: number;
  };
  away_standing: {
    rank: number;
    played: number;
    points: number;
    ppg: number;
    goals_for: number;
    goals_against: number;
    goal_diff: number;
    recent_form: string[];
    away_rank: number;
  };
  league_avg_goals_per_game: number;
  league_btts_rate: number;
  league_home_advantage_rate: number;
}

export interface MatchdayHistoricalPerformance {
  matchday: number;
  season_stage: 'Early Season (Building)' | 'Mid-Season (Consolidation)' | 'Late Season / Crucial Run-In' | 'Tournament Group / Knockout';
  home_matchday_win_rate: number;
  away_matchday_win_rate: number;
  stage_trend_description: string;
}

export interface HomeAwaySplitPerformance {
  home_team_at_home: {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    win_pct: number;
    ppg: number;
    goals_scored_avg: number;
    goals_conceded_avg: number;
    xg_avg: number;
    clean_sheet_pct: number;
    btts_pct: number;
    over25_pct: number;
  };
  away_team_on_road: {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    win_pct: number;
    ppg: number;
    goals_scored_avg: number;
    goals_conceded_avg: number;
    xg_avg: number;
    clean_sheet_pct: number;
    btts_pct: number;
    over25_pct: number;
  };
  home_advantage_multiplier: number;
  away_resilience_factor: number;
}

export interface ForensicPredictionReasoning {
  shots_reasoning: {
    pick: string;
    line: number;
    expected: number;
    prob_over: number;
    key_drivers: string[];
    forensic_summary: string;
  };
  gg_reasoning: {
    pick: 'YES' | 'NO';
    prob_yes: number;
    key_drivers: string[];
    forensic_summary: string;
  };
  over_2_5_reasoning: {
    pick: 'OVER' | 'UNDER';
    prob_over: number;
    key_drivers: string[];
    forensic_summary: string;
  };
  win_or_draw_reasoning: {
    pick: '1X' | 'X2' | '12';
    probability: number;
    key_drivers: string[];
    forensic_summary: string;
  };
  outcome_1x2_reasoning: {
    pick: 'Home Win (1)' | 'Draw (X)' | 'Away Win (2)';
    highest_probability: number;
    key_drivers: string[];
    forensic_summary: string;
  };
}

export interface EspnMatchOfTheDay {
  id: string;
  name: string;
  home_team: string;
  away_team: string;
  league_id: string;
  league_name: string;
  kickoff_utc: string;
  kickoff_wat: string;
  date_wat: string;
  status: string;
  home_score?: number;
  away_score?: number;
  venue?: string;
  competition_stage?: string;
  matchday?: number;
}

// Model Registry record
export interface ModelRegistryRecord {
  model_name: string;
  version: string;
  target: 'BTTS' | 'Over_2_5' | 'Result_1X2' | 'Total_Shots' | 'Combinations' | 'Full_Ensemble';
  algorithm: string;
  training_date: string;
  training_rows: number;
  features_used: string[];
  validation_metrics: {
    accuracy?: number;
    log_loss?: number;
    brier_score?: number;
    f1_score?: number;
    roc_auc?: number;
    mae?: number;
    rmse?: number;
  };
  test_metrics: {
    accuracy?: number;
    log_loss?: number;
    brier_score?: number;
    f1_score?: number;
    roc_auc?: number;
    mae?: number;
    rmse?: number;
  };
  calibration_method: 'Platt_Scaling' | 'Isotonic_Regression' | 'Raw_Softmax';
  data_version: string;
  is_active: boolean;
}

// Walk-Forward Backtesting Result
export interface BacktestSummary {
  total_matches: number;
  time_range: {
    start: string;
    end: string;
  };
  overall: {
    btts_accuracy: number;
    btts_log_loss: number;
    btts_brier: number;
    over25_accuracy: number;
    over25_log_loss: number;
    over25_brier: number;
    result_accuracy: number;
    result_log_loss: number;
    result_brier: number;
    shots_mae: number;
    shots_rmse: number;
  };
  by_league: Array<{
    league_name: string;
    matches: number;
    btts_acc: number;
    over25_acc: number;
    result_acc: number;
    shots_mae: number;
    data_tier: DataTier;
  }>;
  by_season: Array<{
    season: string;
    matches: number;
    btts_acc: number;
    over25_acc: number;
    result_acc: number;
    log_loss: number;
  }>;
  calibration_curve: Array<{
    prob_range: string;
    predicted_avg: number;
    actual_rate: number;
    samples: number;
  }>;
}

// Schema & Coverage report
export interface DatasetCoverageReport {
  dataset_name: string;
  total_fixtures: number;
  played_fixtures: number;
  upcoming_fixtures: number;
  matches_with_shots: number;
  matches_with_sot: number;
  matches_with_xg: number;
  matches_with_possession: number;
  matches_with_corners: number;
  matches_with_cards: number;
  matches_with_odds: number;
  date_range: {
    min_date: string;
    max_date: string;
  };
  leagues_coverage: Array<{
    league_id: string;
    league_name: string;
    country: string;
    total_matches: number;
    played_matches: number;
    xg_coverage_pct: number;
    shots_coverage_pct: number;
    data_tier: DataTier;
  }>;
  seasons_coverage: Array<{
    season: string;
    matches: number;
    xg_available_pct: number;
    shots_available_pct: number;
  }>;
}

export interface EspnNewsArticle {
  id: string | number;
  headline: string;
  description: string;
  published: string;
  byline?: string;
  web_url?: string;
  image_url?: string;
  league?: string;
  related_teams?: string[];
}

export type PredictionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface PersistentPredictionRecord {
  prediction_id: string;
  match_id: string; // Unique API event ID
  date_generated: string;
  match_date: string; // YYYY-MM-DD
  kickoff_wat: string;
  competition: string;
  home_team: string;
  away_team: string;

  // Pre-match prediction fields (never altered when evaluated)
  predicted_score: string; // e.g. "2 - 1"
  predicted_outcome: string; // e.g. "HOME_WIN", "DRAW", "AWAY_WIN"
  market_type: '1X2' | 'DC' | 'GG' | 'OVER_2_5' | 'UNDER_2_5' | 'EXACT_SCORE';
  selection: string; // e.g. "Arsenal to Win (1)", "Over 2.5 Goals", "Both Teams To Score (YES)"
  odds: number;
  reason: string;
  probabilities: {
    home_win_pct: number;
    draw_pct: number;
    away_win_pct: number;
    btts_yes_pct: number;
    over_2_5_pct: number;
    under_2_5_pct: number;
    double_chance_1x_pct: number;
    double_chance_x2_pct: number;
  };

  // Post-match evaluation fields
  actual_final_score?: string; // e.g. "2 - 1"
  actual_home_goals?: number;
  actual_away_goals?: number;
  actual_match_result?: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN';
  status: PredictionStatus;
  evaluated_at?: string;

  // Batch association
  batch_id: string;
  batch_title?: string;
}

export interface PredictionBatchRecord {
  batch_id: string;
  batch_title: string;
  created_at: string;
  date: string; // YYYY-MM-DD
  total_predictions: number;
  successful_predictions: number;
  failed_predictions: number;
  pending_predictions: number;
  accuracy_pct: number; // successful / (successful + failed) * 100
  total_odds: number;
  predictions: PersistentPredictionRecord[];
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
}

export interface DailyPredictionPerformance {
  date: string; // YYYY-MM-DD
  total_predictions: number;
  successful_predictions: number;
  failed_predictions: number;
  pending_predictions: number;
  accuracy_pct: number;
  batches: PredictionBatchRecord[];
  predictions: PersistentPredictionRecord[];
}


