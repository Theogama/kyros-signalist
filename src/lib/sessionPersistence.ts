import type { AccountType, ContractType } from '@/contexts/TradingContext';
import type { AccountInfo, TickData, TradeResult } from '@/lib/derivWebSocket';
import type { ChartAnalysis, SafetyState } from '@/lib/marketIntelligence';

const STORAGE_VERSION = 1;
const STORAGE_KEY_PREFIX = 'kyros-session-state';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export interface PersistedTradingState {
  accountType: AccountType;
  selectedSymbol: string;
  contractType: ContractType;
  stakeAmount: number;
  tradeHistory: TradeResult[];
  ticks: TickData[];
  isRunning: boolean;
  currentTrade: any | null;
  accountInfo: AccountInfo | null;
  aiAnalysis: ChartAnalysis | null;
  safetyState: SafetyState | null;
  sessionStartBalance: number;
  consecutiveLosses: number;
  currentStake: number;
  lastTradeTime: number;
  shouldReconnect: boolean;
  shouldResumeBot: boolean;
}

export interface PersistedUiState {
  currentPath: string;
  navigationHistory: string[];
  sidebarOpen: boolean;
  botSettingsOpen: boolean;
  tradeLogPage: number;
  mainScrollTop: number;
  activeChart: string;
  dashboardWidgets: string[];
}

export interface PersistedWorkspaceSession {
  version: number;
  updatedAt: number;
  expiresAt: number;
  ui?: Partial<PersistedUiState>;
  trading?: Partial<PersistedTradingState>;
  resetReason?: 'logout' | 'new-session' | 'expired' | 'manual-reset';
}

const defaultUiState: PersistedUiState = {
  currentPath: '/',
  navigationHistory: ['/'],
  sidebarOpen: false,
  botSettingsOpen: true,
  tradeLogPage: 1,
  mainScrollTop: 0,
  activeChart: 'performance',
  dashboardWidgets: [
    'ai-smart-panel',
    'strategy-performance',
    'tick-stream',
    'performance-chart',
    'trade-log',
  ],
};

const isBrowser = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export const getSessionStorageKey = (userId?: string | null) =>
  `${STORAGE_KEY_PREFIX}:${userId || 'anonymous'}`;

export const getDefaultUiState = (): PersistedUiState => ({ ...defaultUiState });

export const loadWorkspaceSession = (userId?: string | null): PersistedWorkspaceSession | null => {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(getSessionStorageKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedWorkspaceSession;
    if (parsed.version !== STORAGE_VERSION || Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(getSessionStorageKey(userId));
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('Unable to load Kyros workspace session:', error);
    return null;
  }
};

export const saveWorkspaceSession = (
  userId: string | null | undefined,
  patch: Partial<PersistedWorkspaceSession>
) => {
  if (!isBrowser()) return;

  try {
    const existing = loadWorkspaceSession(userId);
    const next: PersistedWorkspaceSession = {
      ...existing,
      ...patch,
      version: STORAGE_VERSION,
      updatedAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
      ui: {
        ...existing?.ui,
        ...patch.ui,
      },
      trading: {
        ...existing?.trading,
        ...patch.trading,
      },
    };

    window.localStorage.setItem(getSessionStorageKey(userId), JSON.stringify(next));
  } catch (error) {
    console.warn('Unable to save Kyros workspace session:', error);
  }
};

export const clearWorkspaceSession = (
  userId?: string | null,
  resetReason: PersistedWorkspaceSession['resetReason'] = 'manual-reset'
) => {
  if (!isBrowser()) return;

  try {
    window.localStorage.removeItem(getSessionStorageKey(userId));
    window.sessionStorage.setItem('kyros-session-reset-reason', resetReason);
  } catch (error) {
    console.warn('Unable to clear Kyros workspace session:', error);
  }
};

export const migrateAnonymousSession = (userId?: string | null) => {
  if (!isBrowser() || !userId) return;

  const userSession = loadWorkspaceSession(userId);
  const anonymousSession = loadWorkspaceSession(null);

  if (!userSession && anonymousSession) {
    saveWorkspaceSession(userId, anonymousSession);
  }
};
