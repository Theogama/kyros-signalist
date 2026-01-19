import React, { useState } from 'react';
import { useTradingContext } from '@/contexts/TradingContext';
import {
  Play,
  Square,
  Settings,
  Zap,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Target,
  BarChart,
  Repeat
} from 'lucide-react';

const SYMBOLS = [
  { value: 'R_100', label: 'Volatility 100 Index', shortLabel: 'V100' },
  { value: 'R_75', label: 'Volatility 75 Index', shortLabel: 'V75' },
  { value: 'R_50', label: 'Volatility 50 Index', shortLabel: 'V50' },
  { value: 'R_25', label: 'Volatility 25 Index', shortLabel: 'V25' },
  { value: 'R_10', label: 'Volatility 10 Index', shortLabel: 'V10' },
  { value: '1HZ100V', label: 'Volatility 100 (1s) Index', shortLabel: 'V100 1s' },
  { value: '1HZ75V', label: 'Volatility 75 (1s) Index', shortLabel: 'V75 1s' },
  { value: '1HZ50V', label: 'Volatility 50 (1s) Index', shortLabel: 'V50 1s' },
  { value: '1HZ25V', label: 'Volatility 25 (1s) Index', shortLabel: 'V25 1s' },
  { value: '1HZ10V', label: 'Volatility 10 (1s) Index', shortLabel: 'V10 1s' },
  { value: '1HZ15V', label: 'Volatility 15 (1s) Index', shortLabel: 'V15 1s' },
  { value: '1HZ30V', label: 'Volatility 30 (1s) Index', shortLabel: 'V30 1s' },
  { value: '1HZ90V', label: 'Volatility 90 (1s) Index', shortLabel: 'V90 1s' },
  { value: 'RB100', label: 'Range Break 100 Index', shortLabel: 'RB100' },
  { value: 'RB200', label: 'Range Break 200 Index', shortLabel: 'RB200' },
  { value: 'JD10', label: 'Jump 10 Index', shortLabel: 'J10' },
  { value: 'JD25', label: 'Jump 25 Index', shortLabel: 'J25' },
  { value: 'JD50', label: 'Jump 50 Index', shortLabel: 'J50' },
  { value: 'JD75', label: 'Jump 75 Index', shortLabel: 'J75' },
  { value: 'JD100', label: 'Jump 100 Index', shortLabel: 'J100' },
  { value: 'frxXAUUSD', label: 'Gold/USD', shortLabel: 'XAUUSD' },
  { value: 'frxEURUSD', label: 'EUR/USD', shortLabel: 'EURUSD' },
  { value: 'frxGBPUSD', label: 'GBP/USD', shortLabel: 'GBPUSD' },
  { value: 'frxUSDJPY', label: 'USD/JPY', shortLabel: 'USDJPY' },
];

const BotControls: React.FC = () => {
  const {
    isRunning,
    startBot,
    stopBot,
    contractType,
    setContractType,
    stakeAmount,
    setStakeAmount,
    selectedSymbol,
    setSelectedSymbol,
    connectionStatus,
    accountInfo,
    currentTrade,
    accountType,
    totalTrades,
    winRate,
    totalProfit,
  } = useTradingContext();

  const [showSettings, setShowSettings] = useState(true);
  const [showConfirmStop, setShowConfirmStop] = useState(false);
  const [showRealConfirm, setShowRealConfirm] = useState(false);

  const isConnected = connectionStatus === 'connected';
  const hasInsufficientBalance = accountInfo && accountInfo.balance < stakeAmount;

  const handleStart = () => {
    if (accountType === 'real' && !showRealConfirm) {
      setShowRealConfirm(true);
      return;
    }
    startBot();
    setShowRealConfirm(false);
  };

  const handleStop = () => {
    if (currentTrade) {
      setShowConfirmStop(true);
    } else {
      stopBot();
    }
  };

  const confirmStop = () => {
    stopBot();
    setShowConfirmStop(false);
  };

  // Calculate risk status
  const getRiskStatus = () => {
    if (totalTrades < 5) return { label: 'Warming Up', color: 'text-blue-400' };
    if (winRate >= 60) return { label: 'Safe', color: 'text-emerald-400' };
    if (winRate >= 50) return { label: 'Moderate', color: 'text-amber-400' };
    return { label: 'High Risk', color: 'text-red-400' };
  };

  const riskStatus = getRiskStatus();

  // Calculate profit factor
  const wins = totalTrades > 0 ? Math.round((winRate / 100) * totalTrades) : 0;
  const losses = totalTrades - wins;

  return (
    <div className="bg-[#0f1629] rounded-xl border border-[#1e2a4a] p-4 sm:p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isRunning ? 'bg-emerald-500/20' : 'bg-slate-700/50'}`}>
              <Zap className={`w-5 h-5 ${isRunning ? 'text-emerald-400' : 'text-slate-400'}`} />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base sm:text-lg text-nowrap">Bot Controls</h3>
              <p className="text-slate-400 text-xs sm:text-sm">
                {isRunning ? 'Bot is active' : 'Ready to trade'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="sm:hidden text-slate-400 hover:text-white transition-colors p-2"
          >
            {showSettings ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Performance Badges */}
          {totalTrades > 0 && (
            <div className="flex flex-wrap gap-2">
              {/* Win Rate Badge */}
              <div className={`px-2 py-1 rounded-md ${winRate >= 50 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <div className="flex items-center gap-1.5">
                  <Target className={`w-3 h-3 ${winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`} />
                  <span className={`text-[10px] sm:text-xs font-medium ${winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {winRate.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* P/L Badge */}
              <div className={`px-2 py-1 rounded-md ${totalProfit >= 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className={`w-3 h-3 ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
                  <span className={`text-[10px] sm:text-xs font-bold font-mono ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${totalProfit.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Risk Status Badge */}
              <div className="px-2 py-1 rounded-md bg-slate-700/30 border border-slate-600/30 hidden min-[400px]:block">
                <span className={`text-[10px] sm:text-xs font-medium ${riskStatus.color}`}>
                  {riskStatus.label}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="hidden sm:block text-slate-400 hover:text-white transition-colors p-2"
          >
            {showSettings ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="space-y-4 mb-4">
          {/* Contract Type / Strategy */}
          <div>
            <label className="text-slate-400 text-sm mb-2 block">Trading Strategy</label>


            <div className="mt-3">
              <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2 block">Kyros Premium Strategies</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => setContractType('kyros_trend')}
                  disabled={isRunning}
                  className={`py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-between gap-2 ${contractType === 'kyros_trend'
                    ? 'bg-amber-500/20 border-2 border-amber-500 text-amber-400'
                    : 'bg-[#0a0e27] border border-[#1e2a4a] text-slate-400 hover:border-slate-600'
                    } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <BarChart className="w-4 h-4" />
                    <span>Kyros Trend</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-500">PRO</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setContractType('kyros_scalper')}
                    disabled={isRunning}
                    className={`py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${contractType === 'kyros_scalper'
                      ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400'
                      : 'bg-[#0a0e27] border border-[#1e2a4a] text-slate-400 hover:border-slate-600'
                      } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Target className="w-4 h-4" />
                    <span>Scalper</span>
                  </button>
                  <button
                    onClick={() => setContractType('kyros_reversal')}
                    disabled={isRunning}
                    className={`py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${contractType === 'kyros_reversal'
                      ? 'bg-rose-500/20 border-2 border-rose-500 text-rose-400'
                      : 'bg-[#0a0e27] border border-[#1e2a4a] text-slate-400 hover:border-slate-600'
                      } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Repeat className="w-4 h-4" />
                    <span>Reversal</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Symbol Selection */}
          <div>
            <label className="text-slate-400 text-sm mb-2 block">Trading Symbol</label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              disabled={isRunning}
              className={`w-full bg-[#0a0e27] border border-[#1e2a4a] rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-all ${isRunning ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {SYMBOLS.map((symbol) => (
                <option key={symbol.value} value={symbol.value}>
                  {symbol.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stake Amount */}
          <div>
            <label className="text-slate-400 text-sm mb-2 block">
              Stake Amount (USD)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                min="0.35"
                max="5000"
                step="0.01"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Math.max(0.35, Math.min(5000, parseFloat(e.target.value) || 0.35)))}
                disabled={isRunning}
                className={`w-full bg-[#0a0e27] border border-[#1e2a4a] rounded-lg py-3 pl-8 pr-4 text-white font-mono focus:outline-none focus:border-blue-500 transition-all ${isRunning ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {[1, 5, 10, 25, 50, 100, 250, 500].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setStakeAmount(amount)}
                  disabled={isRunning}
                  className={`flex-1 min-w-[60px] py-1.5 text-xs rounded-md transition-all ${stakeAmount === amount
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                    : 'bg-[#0a0e27] text-slate-400 border border-[#1e2a4a] hover:border-slate-600'
                    } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Warning Messages */}
      {hasInsufficientBalance && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-amber-400 text-sm">
            Insufficient balance for stake amount
          </span>
        </div>
      )}

      {/* Current Trade Status */}
      {currentTrade && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-blue-400 text-sm font-medium">Trade in Progress</span>
          </div>
          <p className="text-slate-400 text-xs">
            {currentTrade.direction} @ {currentTrade.entryPrice?.toFixed(2)}
          </p>
        </div>
      )}

      {/* Main Control Buttons */}
      <div className="space-y-3">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={!isConnected || hasInsufficientBalance}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Play className="w-5 h-5" />
            Start Bot
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold py-4 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
          >
            <Square className="w-5 h-5" />
            Stop Bot
          </button>
        )}
      </div>

      {/* Real Account Safety Confirmation */}
      {showRealConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1629] border-2 border-amber-500 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-4 text-amber-500">
              <div className="p-3 bg-amber-500/20 rounded-full">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">Real Money Trading</h3>
            </div>

            <p className="text-slate-300 mb-6 leading-relaxed">
              You are about to start the bot on a <span className="text-amber-400 font-bold uppercase">Real Account</span>.
              Please ensure you understand the risks involved. Trading can result in financial loss.
            </p>

            <div className="bg-[#0a0e27] rounded-xl p-4 mb-6 border border-[#1e2a4a]">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Selected Strategy:</span>
                <span className="text-white font-medium capitalize">{contractType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Stake Amount:</span>
                <span className="text-amber-400 font-bold">${stakeAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRealConfirm(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                className="flex-1 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0a0e27] font-bold transition-colors"
              >
                I Understand, Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Stop Modal */}
      {showConfirmStop && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-white font-semibold text-lg">Confirm Stop</h3>
            </div>
            <p className="text-slate-400 mb-6">
              There's an active trade. Stopping the bot won't cancel the trade, but no new trades will be placed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmStop(false)}
                className="flex-1 py-3 px-4 rounded-lg bg-[#0a0e27] border border-[#1e2a4a] text-slate-400 hover:text-white hover:border-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmStop}
                className="flex-1 py-3 px-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
              >
                Stop Bot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotControls;
