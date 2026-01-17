import React from 'react';
import { useTradingContext } from '@/contexts/TradingContext';

const LiveIndicator: React.FC = () => {
  const { isRunning, currentTrade, ticks } = useTradingContext();

  if (!isRunning) return null;

  const lastTick = ticks[ticks.length - 1];
  const prevTick = ticks[ticks.length - 2];
  const priceDirection = lastTick && prevTick 
    ? lastTick.quote > prevTick.quote ? 'up' : lastTick.quote < prevTick.quote ? 'down' : 'neutral'
    : 'neutral';

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-xl p-4 shadow-2xl min-w-[200px]">
        {/* Live Status */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="text-emerald-400 text-sm font-medium">LIVE</span>
        </div>

        {/* Current Price */}
        {lastTick && (
          <div className="mb-3">
            <p className="text-slate-500 text-xs mb-1">Current Price</p>
            <p className={`text-2xl font-bold font-mono ${
              priceDirection === 'up' ? 'text-emerald-400' :
              priceDirection === 'down' ? 'text-red-400' : 'text-white'
            }`}>
              {lastTick.quote.toFixed(4)}
            </p>
          </div>
        )}

        {/* Active Trade */}
        {currentTrade && (
          <div className="pt-3 border-t border-[#1e2a4a]">
            <p className="text-slate-500 text-xs mb-1">Active Trade</p>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                currentTrade.direction === 'CALL'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {currentTrade.direction}
              </span>
              <span className="text-white text-sm font-mono">
                @ {currentTrade.entryPrice?.toFixed(4)}
              </span>
            </div>
          </div>
        )}

        {/* Tick Counter */}
        <div className="mt-3 pt-3 border-t border-[#1e2a4a] flex justify-between text-xs">
          <span className="text-slate-500">Ticks received</span>
          <span className="text-white font-mono">{ticks.length}</span>
        </div>
      </div>
    </div>
  );
};

export default LiveIndicator;
