import React from 'react';
import { useTradingContext } from '@/contexts/TradingContext';
import {
    TrendingUp,
    TrendingDown,
    Target,
    AlertCircle,
    Shield,
    Award,
    Activity
} from 'lucide-react';

const StrategyPerformance: React.FC = () => {
    const { tradeHistory, totalProfit, winRate, totalTrades, isRunning } = useTradingContext();

    // Calculate session statistics
    const wins = tradeHistory.filter(t => t.result === 'win').length;
    const losses = tradeHistory.filter(t => t.result === 'loss').length;

    const avgWin = wins > 0
        ? tradeHistory.filter(t => t.result === 'win').reduce((sum, t) => sum + t.profit, 0) / wins
        : 0;

    const avgLoss = losses > 0
        ? Math.abs(tradeHistory.filter(t => t.result === 'loss').reduce((sum, t) => sum + t.profit, 0) / losses)
        : 0;

    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Risk status determination
    const getRiskStatus = () => {
        if (totalTrades < 5) return { label: 'Warming Up', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
        if (winRate >= 65) return { label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
        if (winRate >= 55) return { label: 'Good', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' };
        if (winRate >= 45) return { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
        return { label: 'High Risk', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
    };

    const riskStatus = getRiskStatus();

    // Efficiency score (0-100)
    const efficiencyScore = totalTrades > 0
        ? Math.min(100, Math.round((winRate * 0.6) + (profitFactor * 20)))
        : 0;

    if (totalTrades === 0) {
        return (
            <div className="bg-[#0f1629] rounded-xl border border-[#1e2a4a] p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-slate-700/50">
                        <Activity className="w-5 h-5 text-slate-400" />
                    </div>
                    <h3 className="text-white font-semibold text-lg">Strategy Performance</h3>
                </div>
                <div className="text-center py-8">
                    <p className="text-slate-400 text-sm">No trades yet. Start trading to see performance metrics.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#0f1629] rounded-xl border border-[#1e2a4a] p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-700/50">
                        <Activity className="w-5 h-5 text-slate-400" />
                    </div>
                    <h3 className="text-white font-semibold text-lg">Strategy Performance</h3>
                </div>

                {/* Live indicator */}
                {isRunning && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-400 text-xs font-medium">LIVE</span>
                    </div>
                )}
            </div>

            {/* Risk Status Banner */}
            <div className={`mb-4 p-3 rounded-lg border ${riskStatus.bg} ${riskStatus.border} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${riskStatus.color}`} />
                    <span className={`text-sm font-medium ${riskStatus.color}`}>
                        Status: {riskStatus.label}
                    </span>
                </div>
                <div className={`text-xs ${riskStatus.color} font-mono`}>
                    Score: {efficiencyScore}/100
                </div>
            </div>

            {/* Main Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
                {/* Win Rate */}
                <div className="bg-[#0a0e27] rounded-lg p-2.5 sm:p-3 border border-[#1e2a4a]">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                        <Target className="w-3.5 h-3.5 text-slate-500" />
                        <p className="text-slate-500 text-[10px] sm:text-xs">Win Rate</p>
                    </div>
                    <p className={`text-xl sm:text-2xl font-bold ${winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {winRate.toFixed(1)}%
                    </p>
                    <p className="text-slate-600 text-[9px] sm:text-[10px] mt-1">{wins}W / {losses}L</p>
                </div>

                {/* Total Profit */}
                <div className="bg-[#0a0e27] rounded-lg p-2.5 sm:p-3 border border-[#1e2a4a]">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                        {totalProfit >= 0 ? (
                            <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                        ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <p className="text-slate-500 text-[10px] sm:text-xs">Total P/L</p>
                    </div>
                    <p className={`text-xl sm:text-2xl font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${totalProfit.toFixed(2)}
                    </p>
                    <p className="text-slate-600 text-[9px] sm:text-[10px] mt-1">{totalTrades} trades</p>
                </div>
            </div>

            {/* Advanced Metrics */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {/* Average Win */}
                <div className="bg-[#0a0e27] rounded-lg p-2 sm:p-2.5 border border-[#1e2a4a]">
                    <p className="text-slate-500 text-[9px] sm:text-[10px] mb-1">Avg Win</p>
                    <p className="text-emerald-400 font-bold text-xs sm:text-sm">+${avgWin.toFixed(2)}</p>
                </div>

                {/* Average Loss */}
                <div className="bg-[#0a0e27] rounded-lg p-2 sm:p-2.5 border border-[#1e2a4a]">
                    <p className="text-slate-500 text-[9px] sm:text-[10px] mb-1">Avg Loss</p>
                    <p className="text-red-400 font-bold text-xs sm:text-sm">-${avgLoss.toFixed(2)}</p>
                </div>

                {/* Profit Factor */}
                <div className="bg-[#0a0e27] rounded-lg p-2 sm:p-2.5 border border-[#1e2a4a]">
                    <p className="text-slate-500 text-[9px] sm:text-[10px] mb-1">Profit Factor</p>
                    <p className={`font-bold text-xs sm:text-sm ${profitFactor >= 1.5 ? 'text-emerald-400' : profitFactor >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
                        {profitFactor.toFixed(2)}x
                    </p>
                </div>

                {/* Efficiency */}
                <div className="bg-[#0a0e27] rounded-lg p-2 sm:p-2.5 border border-[#1e2a4a] flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-[9px] sm:text-[10px] mb-1">Efficiency</p>
                        <p className="text-blue-400 font-bold text-xs sm:text-sm">{efficiencyScore}%</p>
                    </div>
                    <Award className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400/50 hidden sm:block" />
                </div>
            </div>

            {/* Warning if performance is poor */}
            {totalTrades >= 10 && winRate < 50 && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-amber-400 text-xs font-medium">Performance Alert</p>
                        <p className="text-amber-400/80 text-[10px] mt-1">
                            Win rate below 50%. Consider adjusting strategy settings or reducing stake.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StrategyPerformance;
