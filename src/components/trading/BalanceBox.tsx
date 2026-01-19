import React, { useEffect, useState } from 'react';
import { useTradingContext } from '@/contexts/TradingContext';
import { Wallet, TrendingUp, TrendingDown, DollarSign, User } from 'lucide-react';

const BalanceBox: React.FC = () => {
  const { accountInfo, totalProfit, connectionStatus, accountType } = useTradingContext();
  const [displayBalance, setDisplayBalance] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate balance changes
  useEffect(() => {
    if (accountInfo?.balance !== undefined) {
      const targetBalance = accountInfo.balance;
      const startBalance = displayBalance;
      const diff = targetBalance - startBalance;

      if (Math.abs(diff) > 0.01) {
        setIsAnimating(true);
        const steps = 20;
        const stepValue = diff / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
          currentStep++;
          if (currentStep >= steps) {
            setDisplayBalance(targetBalance);
            setIsAnimating(false);
            clearInterval(interval);
          } else {
            setDisplayBalance(prev => prev + stepValue);
          }
        }, 30);

        return () => clearInterval(interval);
      } else {
        setDisplayBalance(targetBalance);
      }
    }
  }, [accountInfo?.balance]);

  const isConnected = connectionStatus === 'connected';
  const isProfitable = totalProfit > 0;

  return (
    <div className="bg-[#0f1629] rounded-xl border border-[#1e2a4a] p-5 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-amber-500/20">
          <Wallet className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">Account Balance</h3>
          <p className="text-slate-400 text-sm">
            {isConnected ? 'Live balance' : 'Not connected'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Main Balance */}
        <div className="bg-gradient-to-br from-[#0a0e27] to-[#111827] rounded-lg p-3 sm:p-4 border border-[#1e2a4a]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs sm:text-sm capitalize">{accountType} Account</span>
            <span className="text-slate-500 text-[10px] sm:text-xs font-mono">
              {accountInfo?.currency || 'USD'}
            </span>
          </div>
          <div className={`text-2xl sm:text-3xl font-bold font-mono transition-all duration-300 ${isAnimating ? (accountType === 'real' ? 'text-emerald-400' : 'text-blue-400') : 'text-white'
            }`}>
            {isConnected ? (
              <>
                <span className="text-slate-500 text-lg sm:text-xl mr-1">$</span>
                {displayBalance.toFixed(2)}
              </>
            ) : (
              <span className="text-slate-600 font-sans text-xl sm:text-2xl">Not Connected</span>
            )}
          </div>
        </div>

        {/* Session P&L */}
        <div className="bg-[#0a0e27] rounded-lg p-3 sm:p-4 border border-[#1e2a4a]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-xs sm:text-sm">Session P&L</span>
            {totalProfit !== 0 && (
              isProfitable ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )
            )}
          </div>
          <div className={`text-xl sm:text-2xl font-bold font-mono ${totalProfit > 0 ? 'text-emerald-400' : totalProfit < 0 ? 'text-red-400' : 'text-slate-500'
            }`}>
            {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
          </div>
        </div>

        {/* MT5 Information */}
        {isConnected && accountInfo?.mt5Accounts && accountInfo.mt5Accounts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">MT5 Accounts</span>
              <div className="flex-1 h-[1px] bg-[#1e2a4a]"></div>
            </div>
            {accountInfo.mt5Accounts
              .filter(mt5 => mt5.account_type === 'demo')
              .map((mt5, idx) => (
                <div key={idx} className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
                      <span className="text-blue-400 text-xs font-semibold">Demo {mt5.mt5_account_type === 'demo' ? 'Standard' : mt5.mt5_account_type}</span>
                    </div>
                    <span className="text-slate-500 text-[10px] font-mono bg-[#0a0e27] px-1.5 py-0.5 rounded border border-[#1e2a4a]">{mt5.display_login}</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-white flex items-baseline gap-1">
                    <span className="text-blue-500/70 text-sm">$</span>
                    {mt5.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            {accountInfo.mt5Accounts
              .filter(mt5 => mt5.account_type !== 'demo')
              .map((mt5, idx) => (
                <div key={`real-${idx}`} className="bg-[#0a0e27]/50 rounded-lg p-3 border border-[#1e2a4a] hover:border-[#2e3a5a] transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400 text-xs font-medium">{mt5.mt5_account_type === 'demo' ? 'Demo' : 'Real'} {mt5.account_type}</span>
                    <span className="text-slate-500 text-[10px] font-mono">{mt5.display_login}</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    <span className="text-slate-500 text-sm mr-1">$</span>
                    {mt5.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Quick Stats */}
        {isConnected && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0a0e27] rounded-lg p-3 border border-[#1e2a4a]">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-3 h-3 text-emerald-400" />
                <span className="text-slate-500 text-xs">Wins</span>
              </div>
              <span className="text-emerald-400 font-mono font-semibold">
                +${Math.max(0, totalProfit > 0 ? totalProfit : 0).toFixed(2)}
              </span>
            </div>
            <div className="bg-[#0a0e27] rounded-lg p-3 border border-[#1e2a4a]">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-3 h-3 text-red-400" />
                <span className="text-slate-500 text-xs">Losses</span>
              </div>
              <span className="text-red-400 font-mono font-semibold">
                -${Math.abs(Math.min(0, totalProfit < 0 ? totalProfit : 0)).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BalanceBox;
