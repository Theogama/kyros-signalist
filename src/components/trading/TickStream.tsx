import React, { useRef, useEffect } from 'react';
import { useTradingContext } from '@/contexts/TradingContext';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TickStream: React.FC = () => {
  const { ticks, isRunning, connectionStatus } = useTradingContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticks]);

  const isConnected = connectionStatus === 'connected';
  const lastTick = ticks[ticks.length - 1];
  const prevTick = ticks[ticks.length - 2];

  const getTickDirection = (current: number, previous: number) => {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'neutral';
  };

  // Calculate sparkline data
  const sparklineData = ticks.slice(-30).map(t => t.quote);
  const minPrice = Math.min(...sparklineData);
  const maxPrice = Math.max(...sparklineData);
  const priceRange = maxPrice - minPrice || 1;

  const sparklinePath = sparklineData.map((price, i) => {
    const x = (i / (sparklineData.length - 1)) * 100;
    const y = 100 - ((price - minPrice) / priceRange) * 100;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="bg-[#0f1629] rounded-xl border border-[#1e2a4a] p-5 shadow-lg h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isRunning ? 'bg-emerald-500/20' : 'bg-slate-700/50'}`}>
            <Activity className={`w-5 h-5 ${isRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Live Ticks</h3>
            <p className="text-slate-400 text-sm">
              {isRunning ? 'Streaming...' : 'Waiting for data'}
            </p>
          </div>
        </div>
        {lastTick && (
          <div className="text-right">
            <div className={`text-2xl font-bold font-mono ${
              prevTick && lastTick.quote > prevTick.quote ? 'text-emerald-400' :
              prevTick && lastTick.quote < prevTick.quote ? 'text-red-400' : 'text-white'
            }`}>
              {lastTick.quote.toFixed(2)}
            </div>
            <div className="text-slate-500 text-xs font-mono">
              {lastTick.symbol}
            </div>
          </div>
        )}
      </div>

      {/* Sparkline Chart */}
      {sparklineData.length > 1 && (
        <div className="mb-4 bg-[#0a0e27] rounded-lg p-3 border border-[#1e2a4a]">
          <svg viewBox="0 0 100 50" className="w-full h-16" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={sparklinePath + ` L 100 100 L 0 100 Z`}
              fill="url(#sparklineGradient)"
            />
            <path
              d={sparklinePath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Current price dot */}
            <circle
              cx="100"
              cy={100 - ((sparklineData[sparklineData.length - 1] - minPrice) / priceRange) * 100}
              r="2"
              fill="#3b82f6"
              className="animate-pulse"
            />
          </svg>
          <div className="flex justify-between text-xs text-slate-500 font-mono mt-1">
            <span>{minPrice.toFixed(2)}</span>
            <span>{maxPrice.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Tick List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1 min-h-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Activity className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Connect to see live ticks</p>
          </div>
        ) : ticks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Activity className="w-8 h-8 mb-2 opacity-50 animate-pulse" />
            <p className="text-sm">Waiting for tick data...</p>
          </div>
        ) : (
          ticks.slice(-50).map((tick, index, arr) => {
            const prevTickInList = arr[index - 1];
            const direction = prevTickInList
              ? getTickDirection(tick.quote, prevTickInList.quote)
              : 'neutral';

            return (
              <div
                key={`${tick.epoch}-${index}`}
                className={`flex items-center justify-between py-2 px-3 rounded-lg transition-all duration-200 ${
                  index === arr.length - 1
                    ? 'bg-blue-500/10 border border-blue-500/30'
                    : 'bg-[#0a0e27] hover:bg-[#111827]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {direction === 'up' && (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  )}
                  {direction === 'down' && (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  )}
                  {direction === 'neutral' && (
                    <Minus className="w-3 h-3 text-slate-500" />
                  )}
                  <span className="text-slate-500 text-xs font-mono">
                    {new Date(tick.epoch * 1000).toLocaleTimeString()}
                  </span>
                </div>
                <span className={`font-mono font-medium ${
                  direction === 'up' ? 'text-emerald-400' :
                  direction === 'down' ? 'text-red-400' : 'text-white'
                }`}>
                  {tick.quote.toFixed(2)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Tick Count */}
      {ticks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#1e2a4a] flex justify-between text-xs text-slate-500">
          <span>Total ticks: {ticks.length}</span>
          <span>Last 50 shown</span>
        </div>
      )}
    </div>
  );
};

export default TickStream;
