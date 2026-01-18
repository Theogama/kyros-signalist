import React, { useState } from 'react';
import { useTradingContext } from '@/contexts/TradingContext';
import { 
  RefreshCw, 
  Download, 
  Trash2, 
  AlertTriangle,
  X,
  FileText,
  Settings2
} from 'lucide-react';
import { toast } from 'sonner';

const QuickActions: React.FC = () => {
  const { 
    resetHistory, 
    tradeHistory, 
    disconnect, 
    connectionStatus,
    isRunning,
    stopBot
  } = useTradingContext();

  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);

  const isConnected = connectionStatus === 'connected';

  const handleExportCSV = () => {
    if (tradeHistory.length === 0) {
      toast.info('No trades to export');
      return;
    }

    const headers = ['Timestamp', 'Contract Type', 'Symbol', 'Entry Price', 'Exit Price', 'Stake', 'Profit', 'Result'];
    const rows = tradeHistory.map(trade => [
      new Date(trade.timestamp).toISOString(),
      trade.contractType,
      trade.symbol,
      trade.entryPrice.toFixed(2),
      trade.exitPrice.toFixed(2),
      trade.stake.toFixed(2),
      trade.profit.toFixed(2),
      trade.result
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kyros-trades-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Trade history exported');
  };

  const handleReset = () => {
    resetHistory();
    setShowConfirmReset(false);
  };

  const handleDisconnect = () => {
    if (isRunning) {
      stopBot();
    }
    disconnect();
    setShowConfirmDisconnect(false);
  };

  return (
    <>
      <div className="bg-[#0f1629] rounded-xl border border-[#1e2a4a] p-5 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-slate-700/50">
            <Settings2 className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Quick Actions</h3>
            <p className="text-slate-400 text-sm">Manage your session</p>
          </div>
        </div>

        <div className="space-y-2">
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={tradeHistory.length === 0}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[#0a0e27] border border-[#1e2a4a] text-slate-300 hover:text-white hover:border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span className="flex-1 text-left text-sm">Export Trade History</span>
            <FileText className="w-4 h-4 text-slate-500" />
          </button>

          {/* Reset History */}
          <button
            onClick={() => setShowConfirmReset(true)}
            disabled={tradeHistory.length === 0}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[#0a0e27] border border-[#1e2a4a] text-slate-300 hover:text-white hover:border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4 text-amber-400" />
            <span className="flex-1 text-left text-sm">Clear Trade History</span>
            <span className="text-xs text-slate-500">{tradeHistory.length} trades</span>
          </button>

          {/* Disconnect */}
          {isConnected && (
            <button
              onClick={() => setShowConfirmDisconnect(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="flex-1 text-left text-sm">Disconnect & Reset</span>
            </button>
          )}
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-[#0a0e27] rounded-lg border border-[#1e2a4a]">
          <p className="text-slate-500 text-xs">
            Trade history is stored locally and will be lost when you close the browser.
            Export your data regularly.
          </p>
        </div>
      </div>

      {/* Confirm Reset Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-white font-semibold text-lg">Clear History?</h3>
              </div>
              <button
                onClick={() => setShowConfirmReset(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-400 mb-6">
              This will permanently delete all {tradeHistory.length} trade records. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 py-3 px-4 rounded-lg bg-[#0a0e27] border border-[#1e2a4a] text-slate-400 hover:text-white hover:border-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-3 px-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Disconnect Modal */}
      {showConfirmDisconnect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-white font-semibold text-lg">Disconnect?</h3>
              </div>
              <button
                onClick={() => setShowConfirmDisconnect(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-400 mb-6">
              {isRunning 
                ? 'This will stop the bot and disconnect from Deriv. Any active trades will continue to completion.'
                : 'This will disconnect from Deriv. You will need to re-enter your API token to reconnect.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDisconnect(false)}
                className="flex-1 py-3 px-4 rounded-lg bg-[#0a0e27] border border-[#1e2a4a] text-slate-400 hover:text-white hover:border-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                className="flex-1 py-3 px-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickActions;
