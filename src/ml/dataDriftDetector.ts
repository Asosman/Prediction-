// ============================================================================
// FootyPredict Model Confidence & Data Drift Detection Engine
// Detects when the model's confidence scores or feature distributions deviate
// significantly from historical training set means, signaling potential data drift.
// ============================================================================

import { MultiTargetPrediction, PreMatchFeatures } from '../types';

export interface MetricDriftDetail {
  metricName: string;
  category: '1X2 Outcome' | 'BTTS (GG)' | 'Over 2.5' | 'Expected Goals (xG)' | 'Total Shots' | 'Composite Confidence';
  currentValue: number;
  currentValueFormatted: string;
  historicalMean: number;
  historicalMeanFormatted: string;
  historicalStdDev: number;
  zScore: number;
  deviationPct: number;
  isDrifting: boolean;
  severity: 'normal' | 'moderate' | 'high' | 'critical';
}

export interface DataDriftReport {
  isDriftDetected: boolean;
  driftLevel: 'stable' | 'mild_skew' | 'warning_drift' | 'critical_drift';
  compositeConfidence: number;
  maxZScore: number;
  primaryDriftMetric: MetricDriftDetail | null;
  metrics: MetricDriftDetail[];
  driftSignals: string[];
  mitigationAdvice: string;
  evaluatedAt: string;
}

// Historical benchmark distributions derived from 5,000+ played training fixtures
export const HISTORICAL_BENCHMARKS = {
  // Composite model certainty across primary betting targets: mean ~61.4%, std ~5.2%
  composite_confidence: { mean: 0.614, std: 0.052, format: 'pct' },
  // Max probability of 1X2 outcome: mean ~54.8%, std ~7.8% (typical favorites win ~55%)
  outcome_1x2_max_prob: { mean: 0.548, std: 0.078, format: 'pct' },
  // BTTS certainty: |P(Yes) - 0.5| * 2: mean ~0.24, std ~0.11
  btts_certainty: { mean: 0.240, std: 0.110, format: 'pct' },
  // Over 2.5 certainty: |P(Over) - 0.5| * 2: mean ~0.25, std ~0.11
  over25_certainty: { mean: 0.250, std: 0.110, format: 'pct' },
  // Total expected goals (lambda_home + mu_away): mean ~2.68, std ~0.48
  expected_goals_total: { mean: 2.68, std: 0.48, format: 'num' },
  // Total expected shots: mean ~25.2, std ~3.5
  expected_shots_total: { mean: 25.2, std: 3.5, format: 'num' },
};

/**
 * Evaluates model predictions against historical benchmarks to detect statistical data drift.
 */
export function evaluateModelDataDrift(
  prediction: MultiTargetPrediction,
  features?: PreMatchFeatures
): DataDriftReport {
  // 1. Calculate active confidence scores
  const max1x2Prob = Math.max(prediction.result.home, prediction.result.draw, prediction.result.away);
  const bttsCertainty = Math.abs(prediction.btts.yes - 0.5) * 2;
  const over25Certainty = Math.abs(prediction.over_2_5.over - 0.5) * 2;
  const totalXg = prediction.expected_goals ? prediction.expected_goals.total : 2.68;
  const totalShots = prediction.shots ? prediction.shots.expected_total : 25.2;

  // Composite confidence index (0.0 to 1.0)
  const compositeConfidence =
    max1x2Prob * 0.45 + (0.5 + bttsCertainty * 0.5) * 0.275 + (0.5 + over25Certainty * 0.5) * 0.275;

  // 2. Helper to build metric details and calculate z-scores
  const buildMetricDetail = (
    metricName: string,
    category: MetricDriftDetail['category'],
    currentVal: number,
    benchmark: { mean: number; std: number; format: string }
  ): MetricDriftDetail => {
    const zScore = Number(((currentVal - benchmark.mean) / benchmark.std).toFixed(2));
    const absZ = Math.abs(zScore);
    const deviationPct = Number((((currentVal - benchmark.mean) / benchmark.mean) * 100).toFixed(1));

    let severity: MetricDriftDetail['severity'] = 'normal';
    if (absZ >= 2.5) severity = 'critical';
    else if (absZ >= 2.0) severity = 'high';
    else if (absZ >= 1.5) severity = 'moderate';

    const formatVal = (v: number) =>
      benchmark.format === 'pct' ? `${(v * 100).toFixed(1)}%` : v.toFixed(2);

    return {
      metricName,
      category,
      currentValue: currentVal,
      currentValueFormatted: formatVal(currentVal),
      historicalMean: benchmark.mean,
      historicalMeanFormatted: `${formatVal(benchmark.mean)} (±${formatVal(benchmark.std)})`,
      historicalStdDev: benchmark.std,
      zScore,
      deviationPct,
      isDrifting: absZ >= 2.0,
      severity,
    };
  };

  const metrics: MetricDriftDetail[] = [
    buildMetricDetail(
      'Composite Model Confidence',
      'Composite Confidence',
      compositeConfidence,
      HISTORICAL_BENCHMARKS.composite_confidence
    ),
    buildMetricDetail(
      '1X2 Peak Outcome Probability',
      '1X2 Outcome',
      max1x2Prob,
      HISTORICAL_BENCHMARKS.outcome_1x2_max_prob
    ),
    buildMetricDetail(
      'BTTS (GG) Polarization Certainty',
      'BTTS (GG)',
      bttsCertainty,
      HISTORICAL_BENCHMARKS.btts_certainty
    ),
    buildMetricDetail(
      'Over 2.5 Goals Polarization Certainty',
      'Over 2.5',
      over25Certainty,
      HISTORICAL_BENCHMARKS.over25_certainty
    ),
    buildMetricDetail(
      'Expected Match Goals (xG λ+μ)',
      'Expected Goals (xG)',
      totalXg,
      HISTORICAL_BENCHMARKS.expected_goals_total
    ),
    buildMetricDetail(
      'Total Expected Match Shots',
      'Total Shots',
      totalShots,
      HISTORICAL_BENCHMARKS.expected_shots_total
    ),
  ];

  // 3. Find primary drift metric
  const sortedByAbsZ = [...metrics].sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  const maxZScore = Math.abs(sortedByAbsZ[0].zScore);
  const primaryDriftMetric = sortedByAbsZ[0];

  // 4. Identify specific diagnostic signals
  const driftSignals: string[] = [];

  if (Math.abs(metrics[0].zScore) >= 2.0) {
    driftSignals.push(
      `Composite model confidence is ${metrics[0].deviationPct > 0 ? '+' : ''}${metrics[0].deviationPct}% away from the historical baseline (${(compositeConfidence * 100).toFixed(1)}% vs historical mean ${(HISTORICAL_BENCHMARKS.composite_confidence.mean * 100).toFixed(1)}%).`
    );
  }

  if (max1x2Prob > 0.78) {
    driftSignals.push(
      `Extreme favorite skew: top outcome probability reached ${(max1x2Prob * 100).toFixed(1)}% (z = +${metrics[1].zScore}σ vs historical 54.8%), indicating possible overconfidence from heavy Elo divergence.`
    );
  } else if (max1x2Prob < 0.40) {
    driftSignals.push(
      `Abnormally high entropy: 1X2 distribution is unusually flat (top probability only ${(max1x2Prob * 100).toFixed(1)}%), signaling extreme outcome ambiguity.`
    );
  }

  if (totalXg > 3.8) {
    driftSignals.push(
      `Outlier goal volume projection: total expected goals (${totalXg.toFixed(2)}) is +${metrics[4].zScore}σ above the historical league norm of 2.68 goals.`
    );
  } else if (totalXg < 1.7) {
    driftSignals.push(
      `Anomalously low goal projection: total expected goals (${totalXg.toFixed(2)}) is ${metrics[4].zScore}σ below historical mean of 2.68 goals.`
    );
  }

  if (features) {
    if (features.data_tier === 'Tier C') {
      driftSignals.push(
        'Data Tier C Prior Active: Sparse historical data requires reliance on Bayesian synthetic priors rather than dense rolling form.'
      );
    }
    if (Math.abs(features.elo_difference) > 350) {
      driftSignals.push(
        `Large Elo Rating Disparity (Δ ${features.elo_difference > 0 ? '+' : ''}${features.elo_difference}): High skill delta pushes classifier estimators into tail distributions.`
      );
    }
    if (
      features.home_form_multi &&
      Math.abs(features.home_form_multi.momentum_xg_diff) > 1.2
    ) {
      driftSignals.push(
        `Severe Acute Momentum Shock: Home team L3 xG deviates by ${features.home_form_multi.momentum_xg_diff > 0 ? '+' : ''}${features.home_form_multi.momentum_xg_diff.toFixed(2)} from their L10 baseline.`
      );
    }
  }

  // 5. Determine overall drift level
  let driftLevel: DataDriftReport['driftLevel'] = 'stable';
  if (maxZScore >= 2.5 || (metrics[0].isDrifting && metrics[1].isDrifting)) {
    driftLevel = 'critical_drift';
  } else if (maxZScore >= 2.0 || metrics[0].isDrifting) {
    driftLevel = 'warning_drift';
  } else if (maxZScore >= 1.5) {
    driftLevel = 'mild_skew';
  }

  const isDriftDetected = driftLevel === 'warning_drift' || driftLevel === 'critical_drift';

  // 6. Formulate actionable mitigation guidance
  let mitigationAdvice = 'Model distributions are aligned with historical training baselines (within ±1.5σ).';
  if (driftLevel === 'critical_drift') {
    mitigationAdvice =
      'Significant data drift detected (|Z| ≥ 2.5σ). Recommend applying temperature scaling calibration (T=1.2), expanding the feature rolling window from L3 to L10, and cross-verifying recent team news.';
  } else if (driftLevel === 'warning_drift') {
    mitigationAdvice =
      'Elevated distribution shift (|Z| ≥ 2.0σ). Estimator certainty is noticeably skewed relative to historical match distributions. Consider reviewing Platt calibration weights.';
  } else if (driftLevel === 'mild_skew') {
    mitigationAdvice =
      'Mild confidence variance detected (1.5σ ≤ |Z| < 2.0σ). Estimators remain operational but reflect atypical match tactical dynamics.';
  }

  return {
    isDriftDetected,
    driftLevel,
    compositeConfidence,
    maxZScore,
    primaryDriftMetric: isDriftDetected ? primaryDriftMetric : null,
    metrics,
    driftSignals,
    mitigationAdvice,
    evaluatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}
