import React, { useMemo } from 'react';
import { useTradingContext } from '@/contexts/TradingContext';
import { BarChart3, TrendingUp, TrendingDown, Target } from 'lucide-react';

const PerformanceChart: React.FC = () => {
  const { tradeHistory, totalProfit, winRate, totalTrades } = useTradingContext();

  // Calculate cumulative P&L for chart
  const chartData = useMemo(() => {
    if (tradeHistory.length === 0) return [];
    
    // Reverse to get chronological order
    const chronological = [...tradeHistory].reverse();
    let cumulative = 0;
    
    return chronological.map((trade, index) => {
      cumulative += trade.profit;
      return {
        index,
        profit: trade.profit,
        cumulative,
        result: trade.result,
      };
    });
  }, [tradeHistory]);

  // Calculate chart dimensions
  const maxCumulative = Math.max(...chartData.map(d => d.cumulative), 0);
  const minCumulative = Math.min(...chartData.map(d => d.cumulative), 0);
  const range = maxCumulative - minCumulative || 1;

  // Generate SVG path
  const generatePath = () => {
    if (chartData.length === 0) return '';
    
    return chartData.map((point, i) => {
      const x = (i / (chartData.length - 1 || 1)) * 100;
      const y = 100 - ((point.cumulative - minCumulative) / range) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  // Calculate win streak
  const calculateStreak = () => {
    if (tradeHistory.length === 0) return { current: 0, type: 'none' };
    
    let streak = 0;
    const firstResult = tradeHistory[0].result;
    
    for (const trade of tradeHistory) {
      if (trade.result === firstResult) {
        streak++;
      } else {
        break;
      }
    }
    
    return { current: streak, type: firstResult };
  };

  const streak = calculateStreak();
  const wins = tradeHistory.filter(t => t.result === 'win').length;
  const losses = tradeHistory.filter(t => t.result === 'loss').length;

  return (
    <div className="bg-[#0f1629] rounded-xl border border-[#1e2a4a] p-5 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-blue-500/20">
          <BarChart3 className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">Performance</h3>
          <p className="text-slate-400 text-sm">Session overview</p>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-[#0a0e27] rounded-lg p-4 border border-[#1e2a4a] mb-4">
        {chartData.length > 0 ? (
          <>
            <svg viewBox="0 0 100 60" className="w-full h-32" preserveAspectRatio="none">
              <defs>
                <linearGradient id="performanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={totalProfit >= 0 ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={totalProfit >= 0 ? '#10b981' : '#ef4444'} stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Zero line */}
              <line
                x1="0"
                y1={100 - ((0 - minCumulative) / range) * 100}
                x2="100"
                y2={100 - ((0 - minCumulative) / range) * 100}
                stroke="#334155"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
              
              {/* Area fill */}
              <path
                d={generatePath() + ` L 100 ${100 - ((0 - minCumulative) / range) * 100} L 0 ${100 - ((0 - minCumulative) / range) * 100} Z`}
                fill="url(#performanceGradient)"
              />
              
              {/* Line */}
              <path
                d={generatePath()}
                fill="none"
                stroke={totalProfit >= 0 ? '#10b981' : '#ef4444'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Data points */}
              {chartData.map((point, i) => {
                const x = (i / (chartData.length - 1 || 1)) * 100;
                const y = 100 - ((point.cumulative - minCumulative) / range) * 100;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="1.5"
                    fill={point.result === 'win' ? '#10b981' : '#ef4444'}
                  />
                );
              })}
            </svg>
            
            <div className="flex justify-between text-xs text-slate-500 font-mono mt-2">
              <span>${minCumulative.toFixed(2)}</span>
              <span>${maxCumulative.toFixed(2)}</span>
            </div>
          </>
        ) : (
          <div className="h-32 flex items-center justify-center text-slate-500">
            <p className="text-sm">No trade data yet</p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Win Rate */}
        <div className="bg-[#0a0e27] rounded-lg p-3 border border-[#1e2a4a]">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-slate-400 text-xs">Win Rate</span>
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-2xl font-bold ${
              winRate >= 50 ? 'text-emerald-400' : winRate > 0 ? 'text-red-400' : 'text-slate-500'
            }`}>
              {winRate.toFixed(1)}%
            </span>
          </div>
          {/* Win rate progress bar */}
          <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                winRate >= 50 ? 'bg-emerald-500' : 'bg-red-500'
              }`}
              style={{ width: `${winRate}%` }}
            />
          </div>
        </div>

        {/* Current Streak */}
        <div className="bg-[#0a0e27] rounded-lg p-3 border border-[#1e2a4a]">
          <div className="flex items-center gap-2 mb-2">
            {streak.type === 'win' ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : streak.type === 'loss' ? (
              <TrendingDown className="w-4 h-4 text-red-400" />
            ) : (
              <Target className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-slate-400 text-xs">Current Streak</span>
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-2xl font-bold ${
              streak.type === 'win' ? 'text-emerald-400' : 
              streak.type === 'loss' ? 'text-red-400' : 'text-slate-500'
            }`}>
              {streak.current}
            </span>
            <span className={`text-xs mb-1 ${
              streak.type === 'win' ? 'text-emerald-400' : 
              streak.type === 'loss' ? 'text-red-400' : 'text-slate-500'
            }`}>
              {streak.type === 'win' ? 'wins' : streak.type === 'loss' ? 'losses' : '-'}
            </span>
          </div>
        </div>

        {/* Wins */}
        <div className="bg-[#0a0e27] rounded-lg p-3 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-xs block mb-1">Wins</span>
              <span className="text-emerald-400 text-xl font-bold">{wins}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Losses */}
        <div className="bg-[#0a0e27] rounded-lg p-3 border border-red-500/20">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-xs block mb-1">Losses</span>
              <span className="text-red-400 text-xl font-bold">{losses}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;
