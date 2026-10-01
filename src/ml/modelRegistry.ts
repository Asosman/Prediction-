// ============================================================================
// Model Registry & Version Tracking Engine
// Tracks trained model versions, performance metrics, and active estimators
// ============================================================================

import { ModelRegistryRecord } from '../types';

export const DEFAULT_MODEL_REGISTRY: ModelRegistryRecord[] = [
  {
    model_name: 'btts_lgb_v002',
    version: 'v002',
    target: 'BTTS',
    algorithm: 'LightGBM Classifier + Platt Scaling',
    training_date: '2026-09-14',
    training_rows: 4820,
    features_used: [
      'home_last_5_xg_avg',
      'away_last_5_xg_avg',
      'home_last_5_xga_avg',
      'away_last_5_xga_avg',
      'elo_difference',
      'attack_vs_defense_home',
      'attack_vs_defense_away',
    ],
    validation_metrics: {
      accuracy: 0.642,
      log_loss: 0.612,
      brier_score: 0.218,
      f1_score: 0.658,
      roc_auc: 0.694,
    },
    test_metrics: {
      accuracy: 0.631,
      log_loss: 0.624,
      brier_score: 0.224,
      f1_score: 0.645,
      roc_auc: 0.682,
    },
    calibration_method: 'Platt_Scaling',
    data_version: 'eatpizzanot/soccer-dataset-v2.1',
    is_active: true,
  },
  {
    model_name: 'btts_xgb_v001',
    version: 'v001',
    target: 'BTTS',
    algorithm: 'XGBoost Baseline',
    training_date: '2026-08-10',
    training_rows: 3200,
    features_used: ['home_last_5_goals_scored_avg', 'away_last_5_goals_scored_avg', 'elo_difference'],
    validation_metrics: {
      accuracy: 0.614,
      log_loss: 0.648,
      brier_score: 0.235,
      f1_score: 0.622,
      roc_auc: 0.655,
    },
    test_metrics: {
      accuracy: 0.605,
      log_loss: 0.655,
      brier_score: 0.241,
      f1_score: 0.612,
      roc_auc: 0.648,
    },
    calibration_method: 'Raw_Softmax',
    data_version: 'eatpizzanot/soccer-dataset-v1.8',
    is_active: false,
  },
  {
    model_name: 'over25_lgb_v002',
    version: 'v002',
    target: 'Over_2_5',
    algorithm: 'LightGBM Binary + Isotonic Regression',
    training_date: '2026-09-14',
    training_rows: 4820,
    features_used: [
      'home_last_5_xg_avg',
      'away_last_5_xg_avg',
      'shots_difference',
      'elo_difference',
      'rest_difference',
      'h2h_avg_goals',
    ],
    validation_metrics: {
      accuracy: 0.618,
      log_loss: 0.635,
      brier_score: 0.228,
      f1_score: 0.631,
      roc_auc: 0.672,
    },
    test_metrics: {
      accuracy: 0.608,
      log_loss: 0.644,
      brier_score: 0.234,
      f1_score: 0.620,
      roc_auc: 0.661,
    },
    calibration_method: 'Isotonic_Regression',
    data_version: 'eatpizzanot/soccer-dataset-v2.1',
    is_active: true,
  },
  {
    model_name: 'result_ensemble_v001',
    version: 'v001',
    target: 'Result_1X2',
    algorithm: 'Dixon-Coles Poisson GLM + Elo + Random Forest',
    training_date: '2026-09-15',
    training_rows: 5120,
    features_used: [
      'elo_home',
      'elo_away',
      'elo_difference',
      'home_last_5_xg_avg',
      'away_last_5_xg_avg',
      'home_last_5_sot_avg',
      'away_last_5_sot_avg',
      'rest_difference',
    ],
    validation_metrics: {
      accuracy: 0.584,
      log_loss: 0.885,
      brier_score: 0.542,
      roc_auc: 0.732,
    },
    test_metrics: {
      accuracy: 0.572,
      log_loss: 0.901,
      brier_score: 0.558,
      roc_auc: 0.720,
    },
    calibration_method: 'Platt_Scaling',
    data_version: 'eatpizzanot/soccer-dataset-v2.1',
    is_active: true,
  },
  {
    model_name: 'shots_reg_v002',
    version: 'v002',
    target: 'Total_Shots',
    algorithm: 'Ridge Linear Regressor + Poisson Line Fitting',
    training_date: '2026-09-14',
    training_rows: 4100,
    features_used: [
      'home_last_5_shots_avg',
      'away_last_5_shots_avg',
      'home_last_5_shots_conceded_avg',
      'away_last_5_shots_conceded_avg',
      'home_last_5_sot_avg',
      'away_last_5_sot_avg',
    ],
    validation_metrics: {
      mae: 3.42,
      rmse: 4.58,
    },
    test_metrics: {
      mae: 3.65,
      rmse: 4.82,
    },
    calibration_method: 'Platt_Scaling',
    data_version: 'eatpizzanot/soccer-dataset-v2.1',
    is_active: true,
  },
  {
    model_name: 'ensemble_prod_v004',
    version: 'v004',
    target: 'Full_Ensemble',
    algorithm: 'Multi-Target Unified Joint Calibrated Engine',
    training_date: '2026-09-15',
    training_rows: 5120,
    features_used: [
      'All Tier A Features',
      'Temporal Dixon-Coles GLM',
      'Dynamic Elo',
      'Non-Linear LightGBM Classifiers',
      'Poisson Shot Distribution',
    ],
    validation_metrics: {
      accuracy: 0.638,
      log_loss: 0.598,
      brier_score: 0.209,
      f1_score: 0.655,
      roc_auc: 0.745,
    },
    test_metrics: {
      accuracy: 0.628,
      log_loss: 0.612,
      brier_score: 0.216,
      f1_score: 0.642,
      roc_auc: 0.735,
    },
    calibration_method: 'Platt_Scaling',
    data_version: 'eatpizzanot/soccer-dataset-v2.1',
    is_active: true,
  },
];

let registryState = [...DEFAULT_MODEL_REGISTRY];

export function getModelRegistry(): ModelRegistryRecord[] {
  return registryState;
}

export function setActiveModel(modelName: string): ModelRegistryRecord[] {
  const targetRecord = registryState.find((m) => m.model_name === modelName);
  if (!targetRecord) return registryState;

  registryState = registryState.map((m) => {
    if (m.target === targetRecord.target) {
      return { ...m, is_active: m.model_name === modelName };
    }
    return m;
  });

  return registryState;
}

export function trainNewModelVersion(
  target: ModelRegistryRecord['target'],
  algorithm: string,
  calibrationMethod: ModelRegistryRecord['calibration_method'] = 'Platt_Scaling'
): ModelRegistryRecord {
  const versionNum = registryState.filter((m) => m.target === target).length + 1;
  const versionStr = `v00${versionNum}`;
  const prefix = target.toLowerCase().replace(/[^a-z0-9]/g, '');
  const model_name = `${prefix}_custom_${versionStr}`;

  // Synthetic validation score within realistic bounds
  const baseAcc = target === 'Result_1X2' ? 0.58 : target === 'Total_Shots' ? 0 : 0.64;
  const validation_metrics =
    target === 'Total_Shots'
      ? { mae: Number((3.2 + Math.random() * 0.4).toFixed(2)), rmse: Number((4.3 + Math.random() * 0.5).toFixed(2)) }
      : {
          accuracy: Number((baseAcc + (Math.random() * 0.04 - 0.02)).toFixed(3)),
          log_loss: Number((0.61 + (Math.random() * 0.04 - 0.02)).toFixed(3)),
          brier_score: Number((0.215 + (Math.random() * 0.02 - 0.01)).toFixed(3)),
          f1_score: Number((0.65 + (Math.random() * 0.03 - 0.015)).toFixed(3)),
          roc_auc: Number((0.71 + (Math.random() * 0.04 - 0.02)).toFixed(3)),
        };

  const newRecord: ModelRegistryRecord = {
    model_name,
    version: versionStr,
    target,
    algorithm,
    training_date: new Date().toISOString().split('T')[0],
    training_rows: 5120,
    features_used: [
      'home_last_5_xg_avg',
      'away_last_5_xg_avg',
      'elo_difference',
      'rest_difference',
      'attack_vs_defense_home',
      'attack_vs_defense_away',
    ],
    validation_metrics,
    test_metrics: {
      ...validation_metrics,
      accuracy: validation_metrics.accuracy ? Number((validation_metrics.accuracy - 0.01).toFixed(3)) : undefined,
    },
    calibration_method: calibrationMethod,
    data_version: 'eatpizzanot/soccer-dataset-v2.1',
    is_active: true,
  };

  // Set other models of same target to inactive
  registryState = registryState.map((m) => {
    if (m.target === target) return { ...m, is_active: false };
    return m;
  });

  registryState.unshift(newRecord);
  return newRecord;
}
