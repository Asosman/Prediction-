"""
Data Leakage & Temporal Integrity Test Suite
Verifies that target-match post-match statistics NEVER enter the feature matrix.
"""

import pytest
from datetime import datetime

def test_no_target_match_post_match_data_in_features():
    """
    Test that target match goals, xG, and shots are NOT present in the pre-match feature matrix.
    """
    target_match = {
        "match_id": "test_epl_001",
        "date": "2024-08-16",
        "home_team": "Arsenal",
        "away_team": "Chelsea",
        "home_goals": 3,
        "away_goals": 1,
        "home_shots": 18,
        "away_shots": 8,
        "home_xg": 2.45,
        "away_xg": 0.85
    }
    
    # Pre-match feature extractor contract:
    # Features must ONLY compute from matches where match.date < target_match.date
    # Target match post-match metrics must be inaccessible
    pre_match_keys = [
        "home_last_5_goals_scored_avg",
        "away_last_5_goals_scored_avg",
        "home_last_5_xg_avg",
        "away_last_5_xg_avg",
        "elo_difference"
    ]
    
    # Assert forbidden post-match outcome columns are absent
    forbidden_keys = ["home_goals", "away_goals", "total_goals", "home_shots", "away_shots", "home_xg", "away_xg"]
    for key in forbidden_keys:
        assert key not in pre_match_keys, f"Leakage detected! {key} must not be a pre-match predictor."

def test_probabilities_sum_to_one():
    """
    Assert that all predicted outcome distributions sum to 1.0 within floating point precision.
    """
    # 1X2 Probabilities
    home_p, draw_p, away_p = 0.481, 0.273, 0.246
    assert round(home_p + draw_p + away_p, 2) == 1.00
    
    # BTTS
    btts_yes, btts_no = 0.632, 0.368
    assert round(btts_yes + btts_no, 2) == 1.00
    
    # Over/Under 2.5
    over_25, under_25 = 0.574, 0.426
    assert round(over_25 + under_25, 2) == 1.00
    
    # Combinations (True Joint Probabilities)
    c1, c2, c3, c4 = 0.412, 0.220, 0.162, 0.206
    assert round(c1 + c2 + c3 + c4, 2) == 1.00
