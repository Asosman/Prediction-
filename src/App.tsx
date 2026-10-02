import React, { useState } from 'react';
import { Header } from './components/Header';
import { PredictionsDashboard } from './components/PredictionsDashboard';
import { PredictionHistoryStudio } from './components/PredictionHistoryStudio';
import { MultiHorizonFormStudio } from './components/MultiHorizonFormStudio';
import { BatchPredictionStudio } from './components/BatchPredictionStudio';
import { DataCoverageStudio } from './components/DataCoverageStudio';
import { ModelTrainingStudio } from './components/ModelTrainingStudio';
import { BacktestAnalyticsStudio } from './components/BacktestAnalyticsStudio';
import { ModelExplainabilityStudio } from './components/ModelExplainabilityStudio';
import { NodeBotIntegrationHub } from './components/NodeBotIntegrationHub';
import { PythonPipelinesStudio } from './components/PythonPipelinesStudio';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('predictions');
  const [activeModelVersion, setActiveModelVersion] = useState<string>('ensemble_prod_v004');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeModelVersion={activeModelVersion}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'predictions' && <PredictionsDashboard />}
        {activeTab === 'history' && <PredictionHistoryStudio />}
        {activeTab === 'form_tracker' && <MultiHorizonFormStudio />}
        {activeTab === 'batch' && <BatchPredictionStudio />}
        {activeTab === 'data_lake' && <DataCoverageStudio />}
        {activeTab === 'training' && (
          <ModelTrainingStudio onModelActivated={(ver) => setActiveModelVersion(ver)} />
        )}
        {activeTab === 'backtesting' && <BacktestAnalyticsStudio />}
        {activeTab === 'explainability' && <ModelExplainabilityStudio />}
        {activeTab === 'bot_api' && <NodeBotIntegrationHub />}
        {activeTab === 'python_cli' && <PythonPipelinesStudio />}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-slate-500 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-300">FootyPredict ML Platform</span>
            <span>•</span>
            <span>Multi-Target Machine Learning &amp; Historical Statistical Engine</span>
          </div>
          <div className="text-slate-500 font-mono text-[11px]">
            Zero Data Leakage • Dixon-Coles GLM • LightGBM • Platt Calibration • Node.js Bot API Ready
          </div>
        </div>
      </footer>
    </div>
  );
}
