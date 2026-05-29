import React, { useState } from 'react';
import { useTradingContext } from '@/contexts/TradingContext';
import { Activity, CandlestickChart } from 'lucide-react';
import TickCandlestickChart from './TickCandlestickChart';

const TICKS_PER_BAR_OPTIONS = [4, 8, 12, 16];

const TickStream: React.FC = () => {
  const { ticks, isRunning, connectionStatus, selectedSymbol } = useTradingContext();
  const [ticksPerCandle, setTicksPerCandle] = useState(8);

  const isConnected = connectionStatus === 'connected';
  const lastTick = ticks[ticks.length - 1];
  const prevTick = ticks[ticks.length - 2];

  return (
    <div className="bg-[#0f1629] rounded-xl border border-[#1e2a4a] shadow-lg h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isRunning ? 'bg-emerald-500/20' : 'bg-slate-700/50'}`}>
            <CandlestickChart className={`w-5 h-5 ${isRunning ? 'text-emerald-400' : 'text-slate-400'}`} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Live Tick Chart</h3>
            <p className="text-slate-400 text-sm">
              {isRunning ? 'TradingView-style candlesticks' : 'Connect & start bot for live data'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Bar size selector */}
          <div className="hidden sm:flex items-center gap-1 bg-[#0a0e27] rounded-lg p-1 border border-[#1e2a4a]">
            {TICKS_PER_BAR_OPTIONS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setTicksPerCandle(n)}
                className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${
                  ticksPerCandle === n
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {n}T
              </button>
            ))}
          </div>

          {lastTick && (
            <div className="text-right">
              <div
                className={`text-xl font-bold font-mono ${
                  prevTick && lastTick.quote > prevTick.quote
                    ? 'text-emerald-400'
                    : prevTick && lastTick.quote < prevTick.quote
                      ? 'text-red-400'
                      : 'text-white'
                }`}
              >
                {lastTick.quote.toFixed(2)}
              </div>
              <div className="text-slate-500 text-[10px] font-mono">{lastTick.symbol}</div>
            </div>
          )}
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 min-h-0 mx-3 mb-3 rounded-lg border border-[#1e2a4a] overflow-hidden bg-[#0a0e27]">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Activity className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Connect to Deriv to view live tick chart</p>
          </div>
        ) : ticks.length < 2 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <CandlestickChart className="w-10 h-10 mb-3 opacity-40 animate-pulse" />
            <p className="text-sm">Building candlesticks from tick stream...</p>
          </div>
        ) : (
          <TickCandlestickChart
            ticks={ticks}
            symbol={selectedSymbol}
            ticksPerCandle={ticksPerCandle}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
};

export default TickStream;
