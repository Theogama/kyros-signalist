import React, { useState, useEffect } from 'react';
import { useTradingContext } from '@/contexts/TradingContext';
import {
  Settings,
  X,
  Bell,
  Volume2,
  Moon,
  Sun,
  Monitor,
  Save,
  Key,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@clerk/clerk-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, isLoaded } = useUser();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  
  // Deriv Tokens
  const [demoToken, setDemoToken] = useState('');
  const [realToken, setRealToken] = useState('');
  const [showDemoToken, setShowDemoToken] = useState(false);
  const [showRealToken, setShowRealToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      const metadata = user.unsafeMetadata as {
        demoToken?: string;
        realToken?: string;
        settings?: any;
      };
      
      if (metadata.demoToken) setDemoToken(metadata.demoToken);
      if (metadata.realToken) setRealToken(metadata.realToken);
      
      if (metadata.settings) {
        setSoundEnabled(metadata.settings.soundEnabled ?? true);
        setNotifications(metadata.settings.notifications ?? true);
        setAutoReconnect(metadata.settings.autoReconnect ?? true);
        setTheme(metadata.settings.theme ?? 'dark');
      }
    }
  }, [isLoaded, user]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          demoToken: demoToken.trim(),
          realToken: realToken.trim(),
          settings: {
            soundEnabled,
            notifications,
            autoReconnect,
            theme
          }
        }
      });
      
      // Also save to localStorage for immediate non-auth related settings
      localStorage.setItem('kyros-settings', JSON.stringify({
        soundEnabled,
        notifications,
        autoReconnect,
        theme
      }));
      
      toast.success('Settings and tokens saved successfully');
      onClose();
    } catch (error: any) {
      toast.error('Failed to save settings', {
        description: error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1629] border border-[#1e2a4a] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1e2a4a] sticky top-0 bg-[#0f1629] z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-700/50">
              <Settings className="w-5 h-5 text-slate-400" />
            </div>
            <h2 className="text-white font-semibold text-lg">Settings & Tokens</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Tokens Section */}
          <div className="space-y-4">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Key className="w-3 h-3" />
              Deriv API Tokens
            </h3>
            
            <div className="space-y-3">
              {/* Demo Token */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 ml-1">Demo Account Token</label>
                <div className="relative">
                  <input
                    type={showDemoToken ? 'text' : 'password'}
                    value={demoToken}
                    onChange={(e) => setDemoToken(e.target.value)}
                    placeholder="Enter Demo API Token"
                    className="w-full bg-[#0a0e27] border border-[#1e2a4a] rounded-lg py-2.5 pl-3 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                  />
                  <button
                    onClick={() => setShowDemoToken(!showDemoToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showDemoToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Real Token */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 ml-1">Real Account Token</label>
                <div className="relative">
                  <input
                    type={showRealToken ? 'text' : 'password'}
                    value={realToken}
                    onChange={(e) => setRealToken(e.target.value)}
                    placeholder="Enter Real API Token"
                    className="w-full bg-[#0a0e27] border border-[#1e2a4a] rounded-lg py-2.5 pl-3 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
                  />
                  <button
                    onClick={() => setShowRealToken(!showRealToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showRealToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <p className="text-[10px] text-slate-500 italic bg-blue-500/5 p-2 rounded border border-blue-500/10">
                Tokens are stored securely in your private user metadata and used for automatic connection.
              </p>
            </div>
          </div>

          <div className="h-px bg-[#1e2a4a]" />

          {/* Preferences Section */}
          <div className="space-y-4">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-3 h-3" />
              App Preferences
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {/* Sound */}
              <div className="flex items-center justify-between p-3 bg-[#0a0e27] rounded-lg border border-[#1e2a4a]">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-white text-sm font-medium">Sound Effects</p>
                    <p className="text-slate-500 text-[10px]">Play sounds on trade events</p>
                  </div>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    soundEnabled ? 'bg-blue-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md absolute top-0.5 transition-all ${
                    soundEnabled ? 'left-[22px]' : 'left-0.5'
                  }`} />
                </button>
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between p-3 bg-[#0a0e27] rounded-lg border border-[#1e2a4a]">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-white text-sm font-medium">Notifications</p>
                    <p className="text-slate-500 text-[10px]">Show toast notifications</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    notifications ? 'bg-blue-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md absolute top-0.5 transition-all ${
                    notifications ? 'left-[22px]' : 'left-0.5'
                  }`} />
                </button>
              </div>

              {/* Auto Reconnect */}
              <div className="flex items-center justify-between p-3 bg-[#0a0e27] rounded-lg border border-[#1e2a4a]">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-white text-sm font-medium">Auto Reconnect</p>
                    <p className="text-slate-500 text-[10px]">Reconnect on disconnection</p>
                  </div>
                </div>
                <button
                  onClick={() => setAutoReconnect(!autoReconnect)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    autoReconnect ? 'bg-blue-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md absolute top-0.5 transition-all ${
                    autoReconnect ? 'left-[22px]' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>

            {/* Theme */}
            <div className="p-3 bg-[#0a0e27] rounded-lg border border-[#1e2a4a]">
              <div className="flex items-center gap-3 mb-3">
                <Moon className="w-5 h-5 text-slate-400" />
                <p className="text-white text-sm font-medium">Theme</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTheme('dark')}
                  className={`py-2 px-1 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all ${
                    theme === 'dark'
                      ? 'bg-blue-500/20 border border-blue-500 text-blue-400'
                      : 'bg-[#0f1629] border border-[#1e2a4a] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  Dark
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`py-2 px-1 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all ${
                    theme === 'light'
                      ? 'bg-blue-500/20 border border-blue-500 text-blue-400'
                      : 'bg-[#0f1629] border border-[#1e2a4a] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  Light
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`py-2 px-1 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all ${
                    theme === 'system'
                      ? 'bg-blue-500/20 border border-blue-500 text-blue-400'
                      : 'bg-[#0f1629] border border-[#1e2a4a] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  System
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#1e2a4a] flex gap-3 sticky bottom-0 bg-[#0f1629]">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-3 px-4 rounded-lg bg-[#0a0e27] border border-[#1e2a4a] text-slate-400 hover:text-white hover:border-slate-600 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save All
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
