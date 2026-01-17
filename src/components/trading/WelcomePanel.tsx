import {
  Shield, 
  Zap, 
  TrendingUp, 
  Clock, 
  BarChart3,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import Logo from './Logo';
import React from "react";

const WelcomePanel: React.FC = () => {
  return (
    <div className="bg-[#0f1629] rounded-xl border border-[#1e2a4a] p-6 shadow-lg">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center mb-4">
          <Logo showText={true} className="h-16 w-auto" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Welcome to Kyros <span className="text-blue-400">Signalist</span>
        </h2>
        <p className="text-slate-400 max-w-md mx-auto">
          Your automated trading companion for Deriv synthetic indices. 
          Connect your account to start trading.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-[#0a0e27] rounded-lg p-4 border border-[#1e2a4a]">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 flex-shrink-0">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">Automated Trading</h3>
              <p className="text-slate-500 text-sm">
                Execute trades automatically based on real-time tick analysis
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#0a0e27] rounded-lg p-4 border border-[#1e2a4a]">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">Multiple Strategies</h3>
              <p className="text-slate-500 text-sm">
                Choose between Scalping and Rise/Fall contract types
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#0a0e27] rounded-lg p-4 border border-[#1e2a4a]">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 flex-shrink-0">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">Real-Time Data</h3>
              <p className="text-slate-500 text-sm">
                Live tick streaming with instant trade execution
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#0a0e27] rounded-lg p-4 border border-[#1e2a4a]">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">Risk Controls</h3>
              <p className="text-slate-500 text-sm">
                Set profit targets and loss limits to protect your capital
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-5 border border-blue-500/20">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          Getting Started
        </h3>
        <ol className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium">
              1
            </span>
            <div>
              <span className="text-white">Get your API token from </span>
              <a
                href="https://app.deriv.com/account/api-token"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
              >
                Deriv Settings
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium">
              2
            </span>
            <span className="text-slate-400">
              Open Settings (gear icon) and save your API tokens for Demo and Real accounts
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium">
              3
            </span>
            <span className="text-slate-400">
              Select your account type (Demo/Real) in the connection form and click Connect
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium">
              4
            </span>
            <span className="text-slate-400">
              Click Start Bot and watch the automated trading begin!
            </span>
          </li>
        </ol>
      </div>

      {/* Warning */}
      <div className="mt-4 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
        <p className="text-amber-400 text-sm flex items-start gap-2">
          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Risk Warning:</strong> Trading involves significant risk. 
            Only trade with funds you can afford to lose. Start with small stakes 
            to understand the bot's behavior.
          </span>
        </p>
      </div>
    </div>
  );
};

export default WelcomePanel;
