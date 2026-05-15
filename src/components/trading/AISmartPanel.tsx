import React from 'react';
import { useTradingContext } from '@/contexts/TradingContext';
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';

const AISmartPanel: React.FC = () => {
  const {
    aiAnalysis,
    safetyState,
    accountType,
    contractType,
    winRate,
    totalTrades,
  } = useTradingContext();

  const confidence = aiAnalysis?.confidence ?? 0;
  const verdict = aiAnalysis?.verdict ?? 'AVOID TRADE';
  const isGood = verdict === 'GOOD TO TRADE';
  const isRisky = verdict === 'RISKY';
  const confidenceColor = confidence >= 90
    ? 'text-emerald-400'
    : confidence >= 70
      ? 'text-amber-400'
      : 'text-red-400';
  const verdictStyle = isGood
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    : isRisky
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      : 'bg-red-500/10 text-red-400 border-red-500/30';

  const activeStrategy = aiAnalysis?.activeStrategy ?? (contractType === 'kyros_ai' ? 'standby' : contractType);
  const progress = safetyState?.dailyTargetProgress ?? 0;
  const warnings = aiAnalysis?.warnings.slice(0, 3) ?? ['Waiting for chart analysis'];
  const confirmations = aiAnalysis?.confirmations.slice(0, 4) ?? [];
  const alerts = aiAnalysis?.smartAlerts.slice(0, 3) ?? ['AI reader standing by'];

  return (
    <div className="bg-[#0f1629] rounded-xl border border-[#1e2a4a] p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isGood ? 'bg-emerald-500/20' : isRisky ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>
            <BrainCircuit className={`w-5 h-5 ${isGood ? 'text-emerald-400' : isRisky ? 'text-amber-400' : 'text-red-400'}`} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">AI Smart Chart Reader</h3>
            <p className="text-slate-400 text-sm">{aiAnalysis?.marketCondition ?? 'Collecting market context'}</p>
          </div>
        </div>

        <div className={`px-3 py-1.5 rounded-full border text-xs font-bold ${verdictStyle}`}>
          {verdict}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-[#0a0e27] rounded-lg p-3 border border-[#1e2a4a]">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-slate-500" />
            <span className="text-slate-500 text-xs">Confidence</span>
          </div>
          <div className={`text-2xl font-bold ${confidenceColor}`}>{confidence}%</div>
          <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${confidence >= 90 ? 'bg-emerald-500' : confidence >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        <div className="bg-[#0a0e27] rounded-lg p-3 border border-[#1e2a4a]">
          <div className="flex items-center gap-2 mb-2">
            {aiAnalysis?.sentiment === 'BEARISH' ? (
              <TrendingDown className="w-4 h-4 text-red-400" />
            ) : (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            )}
            <span className="text-slate-500 text-xs">Sentiment</span>
          </div>
          <div className={`text-lg font-bold ${aiAnalysis?.sentiment === 'BEARISH' ? 'text-red-400' : aiAnalysis?.sentiment === 'BULLISH' ? 'text-emerald-400' : 'text-slate-400'}`}>
            {aiAnalysis?.sentiment ?? 'NEUTRAL'}
          </div>
          <p className="text-slate-600 text-[10px] mt-1">{aiAnalysis?.structure.trendDirection ?? 'sideways'} trend</p>
        </div>

        <div className="bg-[#0a0e27] rounded-lg p-3 border border-[#1e2a4a]">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-slate-500 text-xs">Strategy</span>
          </div>
          <div className="text-white text-sm font-bold capitalize">{String(activeStrategy).replace('_', ' ')}</div>
          <p className="text-blue-400 text-[10px] mt-1">{accountType === 'real' ? 'Protection mode' : 'Testing mode'}</p>
        </div>

        <div className="bg-[#0a0e27] rounded-lg p-3 border border-[#1e2a4a]">
          <div className="flex items-center gap-2 mb-2">
            {safetyState?.emergencyStop ? (
              <ShieldAlert className="w-4 h-4 text-red-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
            <span className="text-slate-500 text-xs">Risk</span>
          </div>
          <div className={`text-lg font-bold ${safetyState?.emergencyStop ? 'text-red-400' : 'text-emerald-400'}`}>
            {(safetyState?.riskExposurePercent ?? 0).toFixed(2)}%
          </div>
          <p className="text-slate-600 text-[10px] mt-1">Exposure</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <div className="bg-[#0a0e27] rounded-lg p-3 border border-[#1e2a4a]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-500 text-xs">Daily Target</span>
            </div>
            <span className="text-slate-400 text-xs">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <p className={`text-xs mt-2 ${(safetyState?.dailyPnLPercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {(safetyState?.dailyPnLPercent ?? 0).toFixed(2)}% session
          </p>
        </div>

        <div className="bg-[#0a0e27] rounded-lg p-3 border border-[#1e2a4a]">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-violet-400" />
            <span className="text-slate-500 text-xs">Structure</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-slate-500">Support</span>
            <span className="text-white font-mono text-right">{aiAnalysis?.structure.support?.toFixed(2) ?? '-'}</span>
            <span className="text-slate-500">Resistance</span>
            <span className="text-white font-mono text-right">{aiAnalysis?.structure.resistance?.toFixed(2) ?? '-'}</span>
            <span className="text-slate-500">R/R</span>
            <span className="text-white font-mono text-right">{(aiAnalysis?.riskRewardRatio ?? 0).toFixed(2)}x</span>
          </div>
        </div>

        <div className="bg-[#0a0e27] rounded-lg p-3 border border-[#1e2a4a]">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-500 text-xs">Analytics</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-slate-500">Win Rate</span>
            <span className="text-white font-mono text-right">{winRate.toFixed(1)}%</span>
            <span className="text-slate-500">Trades</span>
            <span className="text-white font-mono text-right">{totalTrades}</span>
            <span className="text-slate-500">Fakeout</span>
            <span className="text-white font-mono text-right">{(aiAnalysis?.fakeoutRisk ?? 0).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="space-y-2">
          <p className="text-slate-500 text-xs font-bold uppercase">Confirmations</p>
          {(confirmations.length ? confirmations : ['Waiting for stronger confirmation']).map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-md px-2 py-1.5">
              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-slate-500 text-xs font-bold uppercase">Warnings</p>
          {warnings.map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/5 border border-amber-500/10 rounded-md px-2 py-1.5">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-slate-500 text-xs font-bold uppercase">Smart Alerts</p>
          {alerts.map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/5 border border-blue-500/10 rounded-md px-2 py-1.5">
              <BrainCircuit className="w-3 h-3 flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AISmartPanel;
