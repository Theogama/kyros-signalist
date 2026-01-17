import React, { useState } from 'react';
import { useTradingContext } from '@/contexts/TradingContext';
import { Loader2, Key, Wifi, WifiOff, Shield } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { toast } from 'sonner';

const ConnectForm: React.FC = () => {
  const [apiToken, setApiToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  
  const { connect, disconnect, connectionStatus, accountInfo, accountType, setAccountType } = useTradingContext();
  const { user, isLoaded } = useUser();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let tokenToUse = apiToken.trim();
    
    // If no token entered, try to use stored token
    if (!tokenToUse && isLoaded && user) {
      const metadata = user.unsafeMetadata as {
        demoToken?: string;
        realToken?: string;
      };
      tokenToUse = (accountType === 'real' ? metadata.realToken : metadata.demoToken) || '';
    }

    if (!tokenToUse) {
      toast.error('No API token provided', {
        description: 'Please enter a token or save one in settings'
      });
      return;
    }

    setIsLoading(true);
    try {
      await connect(tokenToUse);
    } catch (error) {
      // Error handled in context
    } finally {
      setIsLoading(false);
      setApiToken(''); // Clear token for security after attempt
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setApiToken('');
  };

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="bg-[#0f1629] rounded-xl border border-[#1e2a4a] p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-500/20' : 'bg-slate-700/50'}`}>
            {isConnected ? (
              <Wifi className="w-5 h-5 text-emerald-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">API Connection</h3>
            <p className="text-slate-400 text-sm">
              {isConnected ? 'Connected to Deriv' : 'Select account type & connect'}
            </p>
          </div>
        </div>
      </div>

      {!isConnected && (
        <div className="flex p-1 bg-[#0a0e27] rounded-lg border border-[#1e2a4a] mb-4">
          <button
            onClick={() => setAccountType('demo')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              accountType === 'demo'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Demo
          </button>
          <button
            onClick={() => setAccountType('real')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              accountType === 'real'
                ? 'bg-amber-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Real
          </button>
        </div>
      )}

      {!isConnected ? (
        <form onSubmit={handleConnect} className="space-y-4">
          <p className="text-xs text-slate-500 text-center">
            Get your API token from{' '}
            <a
              href="https://app.deriv.com/account/api-token"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Deriv Settings
            </a>
          </p>
        </form>
      ) : (
        <div className="space-y-4">
          <div className={`bg-[#0a0e27] rounded-lg p-4 border ${accountType === 'real' ? 'border-amber-500/50 bg-amber-500/5' : 'border-emerald-500/30'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${accountType === 'real' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className={`text-sm font-medium capitalize ${accountType === 'real' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {accountType} Account
                </span>
              </div>
              {accountType === 'real' && (
                <span className="bg-amber-500/20 text-amber-500 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30">LIVE</span>
              )}
            </div>
            <p className="text-white font-mono text-sm truncate">
              {accountInfo?.fullname || accountInfo?.loginid}
            </p>
            {accountInfo?.fullname && (
              <p className="text-slate-400 text-xs truncate mt-0.5">
                {accountInfo.loginid}
              </p>
            )}
            {accountInfo?.email && (
              <p className="text-slate-400 text-xs truncate mt-1 italic">
                {accountInfo.email}
              </p>
            )}
          </div>

          <button
            onClick={handleDisconnect}
            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <WifiOff className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectForm;
