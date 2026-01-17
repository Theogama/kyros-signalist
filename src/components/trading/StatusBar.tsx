import React, { useState, useEffect } from 'react';
import { useTradingContext } from '@/contexts/TradingContext';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  Clock, 
  Zap,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';

const StatusBar: React.FC = () => {
  const { 
    connectionStatus, 
    isRunning, 
    accountInfo, 
    ticks,
    contractType,
    selectedSymbol,
    totalTrades,
    winRate,
    accountType,
  } = useTradingContext();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [latency, setLatency] = useState<number | null>(null);

  // Update clock
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate latency from tick timestamps
  useEffect(() => {
    if (ticks.length > 0) {
      const lastTick = ticks[ticks.length - 1];
      const tickTime = lastTick.epoch * 1000;
      const now = Date.now();
      setLatency(Math.max(0, now - tickTime));
    }
  }, [ticks]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-emerald-400';
      case 'connecting': return 'text-amber-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-500';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi className="w-4 h-4" />;
      case 'connecting': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <WifiOff className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Error';
      default: return 'Disconnected';
    }
  };

  return (
    <div className="bg-[#0a0e27] border-b border-[#1e2a4a] px-4 py-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Left Section - Connection Status */}
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className={`flex items-center gap-2 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="text-sm font-medium">{getStatusText()}</span>
            {connectionStatus === 'connected' && (
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>

          {/* Latency */}
          {connectionStatus === 'connected' && latency !== null && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <Activity className="w-3 h-3" />
              <span className="text-xs font-mono">
                {latency}ms
              </span>
            </div>
          )}

          {/* Account ID */}
          {accountInfo && (
            <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                accountType === 'real' 
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {accountType.toUpperCase()}
              </span>
              <span className="text-xs font-mono">
                {accountInfo.loginid}
              </span>
            </div>
          )}
        </div>

        {/* Center Section - Bot Status */}
        <div className="flex items-center gap-4">
          {/* Bot Running Status */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            isRunning 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'bg-slate-700/50 text-slate-500'
          }`}>
            <Zap className={`w-3 h-3 ${isRunning ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-medium">
              {isRunning ? 'BOT ACTIVE' : 'BOT IDLE'}
            </span>
          </div>

          {/* Contract Type */}
          {isRunning && (
            <div className="hidden md:flex items-center gap-2 text-slate-400">
              <span className="text-xs">
                {contractType === 'scalping' ? 'Scalping' : 'Rise/Fall'}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-xs font-mono">{selectedSymbol}</span>
            </div>
          )}
        </div>

        {/* Right Section - Stats & Time */}
        <div className="flex items-center gap-4">
          {/* Quick Stats */}
          {totalTrades > 0 && (
            <div className="hidden lg:flex items-center gap-3 text-xs">
              <span className="text-slate-400">
                Trades: <span className="text-white font-medium">{totalTrades}</span>
              </span>
              <span className="text-slate-400">
                Win Rate: <span className={`font-medium ${winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {winRate.toFixed(1)}%
                </span>
              </span>
            </div>
          )}

          {/* Current Time */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3 h-3" />
            <span className="text-xs font-mono">
              {currentTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
