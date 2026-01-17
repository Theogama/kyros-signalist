import React, { useState } from 'react';
import { useTradingContext } from '@/contexts/TradingContext';
import { 
  Settings, 
  HelpCircle, 
  ExternalLink,
  Menu,
  X
} from 'lucide-react';
import HelpModal from './HelpModal';
import SettingsModal from './SettingsModal';
import Logo from './Logo';
import { UserButton } from '@clerk/clerk-react';

interface HeaderProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ sidebarOpen, toggleSidebar }) => {
  const { connectionStatus, accountInfo, accountType } = useTradingContext();
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const isConnected = connectionStatus === 'connected';

  return (
    <>
      <header className="bg-[#0f1629] border-b border-[#1e2a4a] px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left - Logo & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg bg-[#0a0e27] border border-[#1e2a4a] text-slate-400 hover:text-white transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Logo showText={false} className="w-10 h-10 flex items-center justify-center" />
                {isConnected && (
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0f1629] ${
                    accountType === 'real' ? 'bg-amber-400' : 'bg-blue-400'
                  }`} />
                )}
              </div>
              <div>
                <h1 className="text-white font-bold text-xl tracking-tight">
                  Kyros <span className="text-blue-400">Signalist</span>
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-slate-500 text-xs">
                    Automated Trading Bot
                  </p>
                  {isConnected && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      accountType === 'real' 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    }`}>
                      {accountType}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center - Quick Stats (Desktop) */}
          {isConnected && accountInfo && (
            <div className="hidden md:flex items-center gap-6">
              <div className="text-center">
                <p className="text-slate-500 text-xs">Balance</p>
                <p className={`font-semibold font-mono ${
                  accountType === 'real' ? 'text-emerald-400' : 'text-blue-400'
                }`}>
                  ${accountInfo.balance.toFixed(2)}
                </p>
              </div>
              <div className="h-8 w-px bg-[#1e2a4a]" />
              <div className="text-center">
                <p className="text-slate-500 text-xs">Account</p>
                <p className="text-white font-semibold capitalize">
                  {accountType}
                </p>
              </div>
            </div>
          )}

          {/* Right - Actions */}
          <div className="flex items-center gap-2">
            <a
              href="https://app.deriv.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0a0e27] border border-[#1e2a4a] text-slate-400 hover:text-white hover:border-slate-600 transition-all text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Deriv</span>
            </a>
            
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 rounded-lg bg-[#0a0e27] border border-[#1e2a4a] text-slate-400 hover:text-white hover:border-slate-600 transition-all"
              title="Help"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-[#0a0e27] border border-[#1e2a4a] text-slate-400 hover:text-white hover:border-slate-600 transition-all"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            <div className="pl-2 border-l border-[#1e2a4a] flex items-center">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
};

export default Header;
