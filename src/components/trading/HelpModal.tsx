import React, { useState } from 'react';
import { 
  HelpCircle, 
  X, 
  Zap, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('getting-started');

  if (!isOpen) return null;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Zap className="w-4 h-4 text-blue-400" />,
      content: (
        <div className="space-y-3 text-sm text-slate-400">
          <p>1. <strong className="text-white">Get your API Token:</strong> Visit Deriv Settings → API Token and create a token with "Trade" and "Read" permissions.</p>
          <p>2. <strong className="text-white">Connect:</strong> Enter your token in the connection form and click Connect.</p>
          <p>3. <strong className="text-white">Configure:</strong> Select your preferred contract type and stake amount.</p>
          <p>4. <strong className="text-white">Start Trading:</strong> Click "Start Bot" to begin automated trading.</p>
        </div>
      )
    },
    {
      id: 'contract-types',
      title: 'Contract Types',
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
      content: (
        <div className="space-y-3 text-sm text-slate-400">
          <div>
            <p className="text-white font-medium mb-1">Rise/Fall</p>
            <p>Predict if the market will rise or fall over a specified duration. The bot analyzes tick momentum to determine direction.</p>
          </div>
          <div>
            <p className="text-white font-medium mb-1">Scalping</p>
            <p>Short-duration trades (1-3 ticks) for quick profits. Higher frequency trading with smaller individual gains.</p>
          </div>
        </div>
      )
    },
    {
      id: 'trading-logic',
      title: 'Trading Logic',
      icon: <Shield className="w-4 h-4 text-purple-400" />,
      content: (
        <div className="space-y-3 text-sm text-slate-400">
          <p>The Kyros Signalist bot uses momentum-based analysis:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Monitors real-time tick data from Deriv</li>
            <li>Analyzes price direction between consecutive ticks</li>
            <li>Places trades based on detected momentum</li>
            <li>Ensures only one trade is active at a time</li>
            <li>Automatically tracks results and updates statistics</li>
          </ul>
        </div>
      )
    },
    {
      id: 'risk-warning',
      title: 'Risk Warning',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
      content: (
        <div className="space-y-3 text-sm text-slate-400">
          <p className="text-amber-400 font-medium">Important:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Trading involves significant risk of loss</li>
            <li>Only trade with funds you can afford to lose</li>
            <li>Past performance does not guarantee future results</li>
            <li>Start with small stakes to understand the bot's behavior</li>
            <li>Monitor your trades and stop the bot if needed</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1e2a4a]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <HelpCircle className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-white font-semibold text-lg">Help & Documentation</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {sections.map((section) => (
            <div key={section.id} className="bg-[#0a0e27] rounded-lg border border-[#1e2a4a]">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  {section.icon}
                  <span className="text-white font-medium">{section.title}</span>
                </div>
                {expandedSection === section.id ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {expandedSection === section.id && (
                <div className="px-4 pb-4 border-t border-[#1e2a4a] pt-3">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#1e2a4a]">
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://api.deriv.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[#0a0e27] border border-[#1e2a4a] text-slate-400 hover:text-white hover:border-slate-600 transition-all text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Deriv API Docs
            </a>
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all text-sm"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
