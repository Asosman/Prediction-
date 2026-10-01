"""
Master Match Table Schema Definition
Standardized schema matching eatpizzanot/soccer-dataset (Parquet / Arrow structured)
"""

MASTER_MATCH_COLUMNS = [
    "match_id",
    "date",
    "season",
    "league_id",
    "league_name",
    "home_team_id",
    "home_team",
    "away_team_id",
    "away_team",
    
    # Ground Truths
    "home_goals",
    "away_goals",
    "total_goals",
    
    # Shot Metrics
    "home_shots",
    "away_shots",
    "total_shots",
    "home_shots_on_target",
    "away_shots_on_target",
    "total_shots_on_target",
    
    # Expected Goals
    "home_xg",
    "away_xg",
    "total_xg",
    
    # Tactical & Discipline
    "home_possession",
    "away_possession",
    "home_corners",
    "away_corners",
    "home_yellow_cards",
    "away_yellow_cards",
    "home_red_cards",
    "away_red_cards",
    "home_fouls",
    "away_fouls",
    "home_offsides",
    "away_offsides",
    "home_penalties",
    "away_penalties",
    
    # Market & Metadata
    "odd_home",
    "odd_draw",
    "odd_away",
    "odd_over_25",
    "odd_under_25",
    "odd_btts_yes",
    "odd_btts_no",
    "known_at",
    "is_played"
]

COLUMN_DTYPES = {
    "match_id": "string",
    "date": "string",
    "season": "string",
    "league_id": "string",
    "league_name": "string",
    "home_team": "string",
    "away_team": "string",
    "home_goals": "Int64",
    "away_goals": "Int64",
    "total_goals": "Int64",
    "home_shots": "Int64",
    "away_shots": "Int64",
    "total_shots": "Int64",
    "home_shots_on_target": "Int64",
    "away_shots_on_target": "Int64",
    "home_xg": "Float64",
    "away_xg": "Float64",
    "is_played": "boolean"
}
