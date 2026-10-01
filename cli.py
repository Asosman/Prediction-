#!/usr/bin/env python3
"""
FootyPredict ML Platform - Python CLI Tool
Direct terminal prediction engine for VS Code.

Usage:
    python cli.py                          # Predict all upcoming fixtures
    python cli.py "Arsenal" "Chelsea"      # Predict custom fixture
    python cli.py --help                   # Show command line options
"""

import sys
import math

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'

# Baseline ratings dictionary
TEAM_ELO = {
    'Arsenal': 1955,
    'Chelsea': 1810,
    'Liverpool': 1945,
    'Everton': 1640,
    'Barcelona': 1930,
    'Real Madrid': 2005,
    'Bayern Munich': 1920,
    'Borussia Dortmund': 1800,
    'Manchester City': 2010,
    'Manchester United': 1770,
}

UPCOMING_MATCHES = [
    {"home": "Arsenal", "away": "Chelsea", "league": "Premier League", "date": "2026-09-20"},
    {"home": "Barcelona", "away": "Real Madrid", "league": "La Liga", "date": "2026-09-21"},
    {"home": "Liverpool", "away": "Everton", "league": "Premier League", "date": "2026-09-22"},
    {"home": "Bayern Munich", "away": "Borussia Dortmund", "league": "Bundesliga", "date": "2026-09-23"},
]

def poisson_pmf(k, lam):
    return (math.pow(lam, k) * math.exp(-lam)) / math.factorial(k)

def compute_prediction(home, away, league="Premier League", date="2026-09-20"):
    home_elo = TEAM_ELO.get(home, 1750) + 65 # Home field advantage +65 Elo
    away_elo = TEAM_ELO.get(away, 1750)
    elo_diff = home_elo - away_elo

    # Dixon-Coles inspired expected goal intensities
    base_home_xg = 1.65 + (elo_diff / 400.0) * 0.75
    base_away_xg = 1.15 - (elo_diff / 400.0) * 0.55
    lam_home = max(0.4, min(3.8, base_home_xg))
    mu_away = max(0.3, min(3.2, base_away_xg))

    # Calculate 1X2, BTTS, and Over 2.5 via bivariate distribution
    p_home = 0.0
    p_draw = 0.0
    p_away = 0.0
    p_btts = 0.0
    p_over_25 = 0.0

    for i in range(7):
        for j in range(7):
            p_ij = poisson_pmf(i, lam_home) * poisson_pmf(j, mu_away)
            # Dixon-Coles tau adjustment for 0-0, 1-0, 0-1, 1-1
            tau = 1.0
            if i == 0 and j == 0: tau = 1.0 - (lam_home * mu_away * -0.06)
            elif i == 0 and j == 1: tau = 1.0 + (lam_home * -0.06)
            elif i == 1 and j == 0: tau = 1.0 + (mu_away * -0.06)
            elif i == 1 and j == 1: tau = 1.0 - (-0.06)
            
            p_adj = max(0.0001, p_ij * tau)

            if i > j: p_home += p_adj
            elif i == j: p_draw += p_adj
            else: p_away += p_adj

            if i > 0 and j > 0: p_btts += p_adj
            if (i + j) > 2.5: p_over_25 += p_adj

    total_1x2 = p_home + p_draw + p_away
    p_home /= total_1x2
    p_draw /= total_1x2
    p_away /= total_1x2

    # Expected Shots model (regression baseline)
    exp_shots = 24.5 + (elo_diff / 250.0) * 1.8

    return {
        "home": home,
        "away": away,
        "league": league,
        "date": date,
        "home_win": p_home,
        "draw": p_draw,
        "away_win": p_away,
        "fair_odds_home": 1.0 / max(0.01, p_home),
        "fair_odds_draw": 1.0 / max(0.01, p_draw),
        "fair_odds_away": 1.0 / max(0.01, p_away),
        "btts_yes": p_btts,
        "fair_odds_btts": 1.0 / max(0.01, p_btts),
        "over_25": p_over_25,
        "fair_odds_over": 1.0 / max(0.01, p_over_25),
        "exp_shots": exp_shots,
        "lam_home": lam_home,
        "mu_away": mu_away
    }

def print_banner():
    print(f"""
{Colors.GREEN}{Colors.BOLD}╔═══════════════════════════════════════════════════════════════════════════╗
║                   ⚽  FOOTYPREDICT ML PLATFORM CLI  ⚽                      ║
║         Multi-Target Machine Learning Engine • Zero Data Leakage          ║
╚═══════════════════════════════════════════════════════════════════════════╝{Colors.ENDC}
""")

def display_prediction(p):
    print(f"{Colors.BOLD}─────────────────────────────────────────────────────────────────────────────{Colors.ENDC}")
    print(f" 🏟️  {Colors.BOLD}{Colors.CYAN}{p['home'].upper()}{Colors.ENDC} vs {Colors.BOLD}{Colors.HEADER}{p['away'].upper()}{Colors.ENDC}  {Colors.DIM}[{p['league']} • {p['date']}]{Colors.ENDC}")
    print(f"{Colors.BOLD}─────────────────────────────────────────────────────────────────────────────{Colors.ENDC}")
    print(f" {Colors.BOLD}1X2 MATCH PROBABILITIES & FAIR ODDS:{Colors.ENDC}")
    print(f"   • {Colors.CYAN}Home Win (1):{Colors.ENDC}  {p['home_win']*100:5.1f}%  | Fair Odds: {Colors.WARNING}{p['fair_odds_home']:.2f}{Colors.ENDC}")
    print(f"   • {Colors.DIM}Draw (X):{Colors.ENDC}      {p['draw']*100:5.1f}%  | Fair Odds: {Colors.WARNING}{p['fair_odds_draw']:.2f}{Colors.ENDC}")
    print(f"   • {Colors.HEADER}Away Win (2):{Colors.ENDC}  {p['away_win']*100:5.1f}%  | Fair Odds: {Colors.WARNING}{p['fair_odds_away']:.2f}{Colors.ENDC}")
    print(f"   • Double Chance: 1X: {(p['home_win']+p['draw'])*100:.0f}% | X2: {(p['away_win']+p['draw'])*100:.0f}% | 12: {(p['home_win']+p['away_win'])*100:.0f}%")
    print("")
    print(f" {Colors.BOLD}GOALS & TOTALS MARKETS:{Colors.ENDC}")
    print(f"   • Both Teams To Score (BTTS/GG): YES: {Colors.GREEN}{p['btts_yes']*100:.1f}%{Colors.ENDC} (Fair: {p['fair_odds_btts']:.2f}) | NO: {(1-p['btts_yes'])*100:.1f}%")
    print(f"   • Over / Under 2.5 Goals:        OVER: {Colors.GREEN}{p['over_25']*100:.1f}%{Colors.ENDC} (Fair: {p['fair_odds_over']:.2f}) | UNDER: {(1-p['over_25'])*100:.1f}%")
    print(f"   • Dixon-Coles Goal Intensities:  λ Home: {p['lam_home']:.2f}  |  μ Away: {p['mu_away']:.2f}")
    print("")
    print(f" {Colors.BOLD}SHOT VOLUME PROBABILITY MARKET:{Colors.ENDC}")
    print(f"   • Expected Total Match Shots: {Colors.WARNING}{p['exp_shots']:.1f}{Colors.ENDC} shots")
    print("\n")

def main():
    import subprocess
    args = sys.argv[1:]
    
    # We delegate directly to the high-performance TypeScript CLI engine
    # to guarantee identical calculations, live ESPN fetching, genuine coach lookup,
    # 10-odds batches partitioning, and persistent yesterday results tracking.
    try:
        subprocess.run(["npx", "tsx", "src/cli.ts"] + args)
        return
    except Exception as e:
        # Fallback to pure local Python calculations in case of node/npm environment issues
        print_banner()
        if "--help" in args or "-h" in args:
            print("Usage:")
            print("  python cli.py                       # Run all upcoming matches")
            print("  python cli.py 'Arsenal' 'Chelsea'   # Predict custom matchup")
            return

        if len(args) >= 2:
            home, away = args[0], args[1]
            p = compute_prediction(home, away, "Custom Match")
            display_prediction(p)
            return

        print(f" {Colors.BOLD}RUNNING MULTI-TARGET PREDICTIONS FOR UPCOMING FIXTURES...{Colors.ENDC}\n")
        for m in UPCOMING_MATCHES:
            p = compute_prediction(m["home"], m["away"], m["league"], m["date"])
            display_prediction(p)

if __name__ == "__main__":
    main()
