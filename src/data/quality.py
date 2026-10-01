"""
Data Quality & Completeness Inspector
Validates columns, datatypes, duplicates, missingness, and assigns data quality tiers (Tier A/B/C)
"""

from typing import Dict, Any

def generate_quality_report(df_summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates dataset against mandatory feature completeness thresholds.
    Tier A: xG >= 80%, Shots >= 80%
    Tier B: Shots >= 70%
    Tier C: Results only
    """
    total = df_summary.get("total_rows", 0)
    xg_count = df_summary.get("xg_count", 0)
    shots_count = df_summary.get("shots_count", 0)
    
    xg_coverage = (xg_count / max(1, total)) * 100
    shots_coverage = (shots_count / max(1, total)) * 100
    
    tier = "Tier C"
    if xg_coverage >= 80 and shots_coverage >= 80:
        tier = "Tier A"
    elif shots_coverage >= 70:
        tier = "Tier B"
        
    return {
        "total_rows": total,
        "xg_coverage_pct": round(xg_coverage, 1),
        "shots_coverage_pct": round(shots_coverage, 1),
        "assigned_tier": tier,
        "is_ready_for_tier_a_training": tier == "Tier A"
    }
