import React, { useState } from 'react';
import { useTradingContext } from '@/contexts/TradingContext';
import { 
  History, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  Download,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';

const TradeLog: React.FC = () => {
  const { tradeHistory, resetHistory, totalProfit, winRate, totalTrades } = useTradingContext();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(tradeHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedTrades = tradeHistory.slice(startIndex, startIndex + itemsPerPage);

  const handleExportCSV = () => {
    if (tradeHistory.length === 0) return;

    const headers = ['Timestamp', 'Account', 'Contract Type', 'Symbol', 'Entry Price', 'Exit Price', 'Stake', 'Profit', 'Result'];
    const rows = tradeHistory.map(trade => [
      new Date(trade.timestamp).toLocaleString(),
      trade.accountType || 'unknown',
      trade.contractType,
      trade.symbol,
      trade.entryPrice.toFixed(4),
      trade.exitPrice.toFixed(4),
      trade.stake.toFixed(2),
      trade.profit.toFixed(2),
      trade.result
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wins = tradeHistory.filter(t => t.result === 'win').length;
  const losses = tradeHistory.filter(t => t.result === 'loss').length;

  return (
    <div className="bg-[#0f1629] rounded-xl border border-[#1e2a4a] p-5 shadow-lg h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/20">
            <History className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Trade History</h3>
            <p className="text-slate-400 text-sm">
              {totalTrades} trades recorded
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={tradeHistory.length === 0}
            className="p-2 rounded-lg bg-[#0a0e27] border border-[#1e2a4a] text-slate-400 hover:text-white hover:border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={resetHistory}
            disabled={tradeHistory.length === 0}
            className="p-2 rounded-lg bg-[#0a0e27] border border-[#1e2a4a] text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Clear History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-[#0a0e27] rounded-lg p-3 border border-[#1e2a4a]">
          <div className="text-slate-500 text-xs mb-1">Total</div>
          <div className="text-white font-semibold">{totalTrades}</div>
        </div>
        <div className="bg-[#0a0e27] rounded-lg p-3 border border-emerald-500/20">
          <div className="text-slate-500 text-xs mb-1">Wins</div>
          <div className="text-emerald-400 font-semibold">{wins}</div>
        </div>
        <div className="bg-[#0a0e27] rounded-lg p-3 border border-red-500/20">
          <div className="text-slate-500 text-xs mb-1">Losses</div>
          <div className="text-red-400 font-semibold">{losses}</div>
        </div>
        <div className="bg-[#0a0e27] rounded-lg p-3 border border-blue-500/20">
          <div className="text-slate-500 text-xs mb-1">Win Rate</div>
          <div className="text-blue-400 font-semibold">{winRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Trade Table */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {tradeHistory.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <FileText className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">No trades recorded yet</p>
            <p className="text-xs text-slate-600 mt-1">Start the bot to begin trading</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-[#0a0e27] rounded-t-lg border border-[#1e2a4a] text-xs text-slate-500 font-medium">
              <div className="col-span-1">Time</div>
              <div className="col-span-1">Acc</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Entry</div>
              <div className="col-span-2">Exit</div>
              <div className="col-span-2">P&L</div>
              <div className="col-span-2 text-right">Result</div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto border-x border-[#1e2a4a] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {displayedTrades.map((trade, index) => (
                <div
                  key={trade.id}
                  className={`grid grid-cols-12 gap-2 px-3 py-3 text-sm border-b border-[#1e2a4a] hover:bg-[#0a0e27] transition-colors ${
                    index === 0 && currentPage === 1 ? 'bg-blue-500/5' : ''
                  }`}
                >
                  <div className="col-span-1 text-slate-400 font-mono text-[10px] flex items-center">
                    {new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span className={`text-[10px] font-bold px-1 rounded ${
                      trade.accountType === 'real' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {trade.accountType === 'real' ? 'R' : 'D'}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    {trade.contractType === 'CALL' ? (
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                    <span className={`text-xs ${trade.contractType === 'CALL' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trade.contractType}
                    </span>
                  </div>
                  <div className="col-span-2 text-white font-mono text-xs">
                    {trade.entryPrice.toFixed(4)}
                  </div>
                  <div className="col-span-2 text-white font-mono text-xs">
                    {trade.exitPrice.toFixed(4)}
                  </div>
                  <div className={`col-span-2 font-mono font-medium ${
                    trade.profit > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {trade.profit > 0 ? '+' : ''}${trade.profit.toFixed(2)}
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      trade.result === 'win'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {trade.result.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Table Footer with Pagination */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#0a0e27] rounded-b-lg border border-[#1e2a4a]">
              <div className="text-xs text-slate-500">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, tradeHistory.length)} of {tradeHistory.length}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded bg-[#0a0e27] border border-[#1e2a4a] text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-400 px-2">
                  {currentPage} / {totalPages || 1}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1 rounded bg-[#0a0e27] border border-[#1e2a4a] text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Total P&L Footer */}
      <div className="mt-4 pt-4 border-t border-[#1e2a4a] flex items-center justify-between">
        <span className="text-slate-400 text-sm">Total P&L</span>
        <span className={`text-xl font-bold font-mono ${
          totalProfit > 0 ? 'text-emerald-400' : totalProfit < 0 ? 'text-red-400' : 'text-slate-500'
        }`}>
          {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

export default TradeLog;
