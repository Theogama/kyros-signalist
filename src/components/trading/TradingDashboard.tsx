import React, { useState } from 'react';
import { useTradingContext } from '@/contexts/TradingContext';
import Header from './Header';
import StatusBar from './StatusBar';
import ConnectForm from './ConnectForm';
import BalanceBox from './BalanceBox';
import BotControls from './BotControls';
import TickStream from './TickStream';
import TradeLog from './TradeLog';
import PerformanceChart from './PerformanceChart';
import QuickActions from './QuickActions';
import WelcomePanel from './WelcomePanel';
import LiveIndicator from './LiveIndicator';

const TradingDashboard: React.FC = () => {
  const { connectionStatus, isRunning } = useTradingContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isConnected = connectionStatus === 'connected';

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen bg-[#0a0e27] flex flex-col">
      {/* Header */}
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Status Bar */}
      <StatusBar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-80 bg-[#0a0e27] border-r border-[#1e2a4a]
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col overflow-y-auto
          pt-[120px] lg:pt-0
        `}>
          <div className="p-4 space-y-4 flex-1">
            {/* Connection Form */}
            <ConnectForm />

            {/* Balance Box */}
            <BalanceBox />

            {/* Bot Controls */}
            <BotControls />

            {/* Quick Actions */}
            <QuickActions />
          </div>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {!isConnected ? (
            <WelcomePanel />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 h-full">
              {/* Left Column */}
              <div className="space-y-4 lg:space-y-6">
                {/* Tick Stream */}
                <div className="h-[400px] lg:h-[500px]">
                  <TickStream />
                </div>

                {/* Performance Chart */}
                <PerformanceChart />
              </div>

              {/* Right Column */}
              <div className="h-[600px] lg:h-full">
                <TradeLog />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Live Indicator (floating) */}
      {isRunning && <LiveIndicator />}

      {/* Footer */}
      <footer className="bg-[#0a0e27] border-t border-[#1e2a4a] px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Kyros Signalist v1.0</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Powered by Deriv API</span>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="https://api.deriv.com/docs" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              API Docs
            </a>
            <a 
              href="https://deriv.com/terms-and-conditions" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Terms
            </a>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TradingDashboard;
