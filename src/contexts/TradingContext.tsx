import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { derivWS, TickData, TradeResult, AccountInfo, ConnectionStatus } from '@/lib/derivWebSocket';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@clerk/clerk-react';
import {
  loadKyrosConfig,
  KyrosConfig,
  loadProfitabilityConfig,
  type ProfitabilityConfig,
} from '@/config/kyrosConfig';
import {
  calibrateProfitability,
  loadCalibratedProfitability,
  mergeProfitabilityConfig,
  saveCalibratedProfitability,
} from '@/lib/simulationCalibrator';
import { computeSessionPerformance } from '@/lib/performanceTracker';
import {
  analyzeMarket,
  buildSafetyState,
  getDynamicStake,
} from '@/lib/marketIntelligence';
import type { ChartAnalysis, SafetyState } from '@/lib/marketIntelligence';
import {
  clearWorkspaceSession,
  loadWorkspaceSession,
  migrateAnonymousSession,
  saveWorkspaceSession,
} from '@/lib/sessionPersistence';

export type ContractType = 'scalping' | 'rise_fall' | 'kyros_ai' | 'kyros_trend' | 'kyros_scalper' | 'kyros_reversal';
export type AccountType = 'demo' | 'real';

interface TradingContextType {
  // Connection state
  connectionStatus: ConnectionStatus;
  accountInfo: AccountInfo | null;
  accountType: AccountType;

  // Trading state
  ticks: TickData[];
  tradeHistory: TradeResult[];
  isRunning: boolean;
  currentTrade: any | null;
  aiAnalysis: ChartAnalysis | null;
  safetyState: SafetyState | null;
  sessionPerformance: ReturnType<typeof computeSessionPerformance> | null;

  // Settings
  contractType: ContractType;
  stakeAmount: number;
  selectedSymbol: string;

  // Stats
  totalProfit: number;
  winRate: number;
  totalTrades: number;

  // Actions
  connect: (apiToken: string, type?: AccountType) => Promise<void>;
  disconnect: () => void;
  setAccountType: (type: AccountType) => void;
  startBot: () => void;
  stopBot: () => void;
  resetHistory: () => void;
  startNewSession: () => void;
  setContractType: (type: ContractType) => void;
  setStakeAmount: (amount: number) => void;
  setSelectedSymbol: (symbol: string) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const useTradingContext = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTradingContext must be used within TradingProvider');
  }
  return context;
};

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoaded } = useUser();
  const userId = user?.id;
  const hasHydratedRef = useRef(false);
  const resumeBotAfterReconnectRef = useRef(false);
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [accountType, setAccountTypeState] = useState<AccountType>('demo');

  // Trading state
  const [ticks, setTicks] = useState<TickData[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTrade, setCurrentTrade] = useState<any | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<ChartAnalysis | null>(null);
  const [safetyState, setSafetyState] = useState<SafetyState | null>(null);

  // Settings
  const [contractType, setContractType] = useState<ContractType>('kyros_ai');
  const [stakeAmount, setStakeAmount] = useState(1);
  const [selectedSymbol, setSelectedSymbol] = useState('R_100');

  // Refs for bot logic
  const isRunningRef = useRef(false);
  const lastTickRef = useRef<TickData | null>(null);
  const tickCountRef = useRef(0);
  const tradeInProgressRef = useRef(false);
  const currentTradeRef = useRef<any | null>(null);

  // Kyros strategy refs for risk management
  const kyrosConfigRef = useRef<KyrosConfig>(loadKyrosConfig());
  const profitabilityRef = useRef<ProfitabilityConfig>(
    mergeProfitabilityConfig(loadProfitabilityConfig(), loadCalibratedProfitability())
  );
  const consecutiveLossesRef = useRef(0);
  const sessionStartBalanceRef = useRef(0);
  const currentStakeRef = useRef(stakeAmount);
  const lastTradeTimeRef = useRef(0);
  const lossCooldownUntilRef = useRef(0);
  const recentEdgeSamplesRef = useRef<number[]>([]);
  const lastCalibrationRef = useRef(0);

  // Calculate stats
  const totalProfit = tradeHistory.reduce((sum, trade) => sum + trade.profit, 0);
  const wins = tradeHistory.filter(t => t.result === 'win').length;
  const winRate = tradeHistory.length > 0 ? (wins / tradeHistory.length) * 100 : 0;
  const totalTrades = tradeHistory.length;
  const sessionPerformance = computeSessionPerformance(
    tradeHistory,
    sessionStartBalanceRef.current,
    accountInfo?.balance ?? 0
  );

  const runCalibration = useCallback(() => {
    if (ticks.length < 40) return;
    const result = calibrateProfitability(
      ticks,
      tradeHistory,
      accountType,
      contractType,
      stakeAmount,
      profitabilityRef.current
    );
    if (!result) return;
    profitabilityRef.current = mergeProfitabilityConfig(profitabilityRef.current, result.appliedConfig);
    saveCalibratedProfitability(result);
    lastCalibrationRef.current = Date.now();
    toast.info('AI thresholds calibrated', {
      description: `Edge ${result.best.minEdgeScore}+ | Win rate ${result.best.winRate.toFixed(1)}% | PF ${result.best.profitFactor.toFixed(2)}`,
    });
  }, [ticks, tradeHistory, accountType, contractType, stakeAmount]);

  // Handle account info updates
  const handleAccountUpdate = useCallback((updatedInfo: AccountInfo) => {
    setAccountInfo(updatedInfo);
  }, []);

  // Handle MT5 specific updates
  const handleMT5Update = useCallback((mt5Accounts: any[]) => {
    setAccountInfo(prev => prev ? { ...prev, mt5Accounts } : null);
  }, []);

  // Connect to Deriv
  const connect = useCallback(async (apiToken: string) => {
    try {
      setConnectionStatus('connecting');
      const info = await derivWS.connect(apiToken);
      setAccountInfo(info);
      setConnectionStatus('connected');

      // Critical: Set account type based on actual is_virtual flag from API
      setAccountTypeState(info.is_virtual ? 'demo' : 'real');

      // Subscribe to balance updates
      derivWS.subscribeBalance();

      // Listen for account updates
      derivWS.on('account_info_updated', handleAccountUpdate);
      derivWS.on('mt5_accounts_updated', handleMT5Update);

      toast.success('Connected successfully!', {
        description: `Account: ${info.loginid} (${info.is_virtual ? 'Demo' : 'Real'})`,
      });
    } catch (error: any) {
      setConnectionStatus('error');
      toast.error('Connection failed', {
        description: error.message || 'Invalid API token or connection error',
      });
      throw error;
    }
  }, [handleAccountUpdate, handleMT5Update]);

  // Set Account Type
  const setAccountType = useCallback((type: AccountType) => {
    if (connectionStatus === 'connected') {
      toast.warning('Disconnect first to change account type');
      return;
    }
    setAccountTypeState(type);
  }, [connectionStatus]);

  // Disconnect
  const disconnect = useCallback(() => {
    derivWS.off('account_info_updated', handleAccountUpdate);
    derivWS.off('mt5_accounts_updated', handleMT5Update);
    derivWS.disconnect();
    setConnectionStatus('disconnected');
    setAccountInfo(null);
    setTicks([]);
    setIsRunning(false);
    setCurrentTrade(null);
    currentTradeRef.current = null;
    isRunningRef.current = false;
    toast.info('Disconnected from Deriv');
  }, [handleAccountUpdate, handleMT5Update]);

  // Execute trade based on tick analysis
  const executeTrade = useCallback(async (direction: 'CALL' | 'PUT', currentTick: TickData, analysis: ChartAnalysis) => {
    if (tradeInProgressRef.current || !accountInfo) return;

    const safety = buildSafetyState({
      ticks,
      tradeHistory,
      accountInfo,
      accountType,
      selectedStrategy: contractType,
      baseStake: stakeAmount,
      sessionStartBalance: sessionStartBalanceRef.current,
      consecutiveLosses: consecutiveLossesRef.current,
      lastTradeTime: lastTradeTimeRef.current,
    });
    const dynamicStake = getDynamicStake(
      stakeAmount,
      analysis,
      safety,
      accountType,
      profitabilityRef.current
    );

    if (!analysis.shouldPlaceTrade || dynamicStake <= 0) {
      return;
    }

    if (Date.now() < lossCooldownUntilRef.current) {
      return;
    }

    // Check balance
    if (accountInfo.balance < dynamicStake) {
      toast.error('Insufficient balance', {
        description: 'Please add funds or reduce stake amount',
      });
      setIsRunning(false);
      isRunningRef.current = false;
      return;
    }

    tradeInProgressRef.current = true;
    const tradeStartTime = Date.now();

    try {
      // Get proposal
      const duration = analysis.suggestedDuration || (contractType === 'scalping' ? 1 : 5);
      const durationUnit = 't';

      // Determine correct symbol parameters
      const isForex = selectedSymbol.startsWith('frx');
      const symbolDuration = isForex ? Math.max(duration, 1) : duration; // Forex might have different tick constraints but Deriv API generally supports ticks for many

      const proposal = await derivWS.getProposal({
        contractType: direction,
        amount: dynamicStake,
        duration: symbolDuration,
        durationUnit: durationUnit,
        symbol: selectedSymbol,
        basis: 'stake',
      });

      if (!proposal.proposal) {
        throw new Error('Failed to get proposal');
      }

      // Buy contract
      const buyResult = await derivWS.buyContract(
        proposal.proposal.id,
        proposal.proposal.ask_price
      );

      if (!buyResult.buy) {
        throw new Error('Failed to buy contract');
      }

      const contractId = buyResult.buy.contract_id;
      const entryPrice = currentTick.quote;

      const tradeSnapshot = {
        contractId,
        direction,
        entryPrice,
        stake: dynamicStake,
        timestamp: tradeStartTime,
        accountType,
        symbol: selectedSymbol,
        confidence: analysis.confidence,
        strategy: analysis.activeStrategy,
        marketCondition: analysis.marketCondition,
        edgeScore: analysis.edgeScore,
        edgeTier: analysis.edgeTier,
      };
      setCurrentTrade(tradeSnapshot);
      currentTradeRef.current = tradeSnapshot;
      lastTradeTimeRef.current = tradeStartTime;
      currentStakeRef.current = dynamicStake;

      // Subscribe to contract updates
      derivWS.subscribeToContract(contractId);

      toast.info('Trade placed', {
        description: `${direction} @ ${currentTick.quote.toFixed(2)} | Confidence ${analysis.confidence}%`,
      });

    } catch (error: any) {
      toast.error('Trade failed', {
        description: error.message,
      });
      tradeInProgressRef.current = false;
    }
  }, [accountInfo, stakeAmount, contractType, selectedSymbol, accountType, ticks, tradeHistory]);

  // Analyze tick and decide trade
  const analyzeTickAndTrade = useCallback((tick: TickData) => {
    if (!isRunningRef.current || tradeInProgressRef.current) return;

    const lastTick = lastTickRef.current;
    tickCountRef.current++;

    // Risk Management: Check consecutive losses
    const config = kyrosConfigRef.current;
    const strategyConfig = contractType === 'kyros_scalper' ? config.scalper :
      contractType === 'kyros_trend' ? config.trend :
        contractType === 'kyros_reversal' ? config.reversal : null;

    if (strategyConfig) {
      // Check if we hit consecutive loss limit
      if (consecutiveLossesRef.current >= strategyConfig.maxConsecutiveLosses) {
        if (strategyConfig.autoPauseOnLossLimit) {
          toast.warning('Risk Limit Reached', {
            description: `${strategyConfig.maxConsecutiveLosses} consecutive losses. Bot paused for safety.`,
          });
          setIsRunning(false);
          isRunningRef.current = false;
          return;
        }
      }

      // Check daily loss limit
      if (accountInfo && sessionStartBalanceRef.current > 0) {
        const currentBalance = accountInfo.balance;
        const lossPercent = ((sessionStartBalanceRef.current - currentBalance) / sessionStartBalanceRef.current) * 100;

        if (lossPercent >= strategyConfig.dailyLossLimitPercent) {
          toast.error('Daily Loss Limit Reached', {
            description: `${lossPercent.toFixed(1)}% loss reached. Bot stopped.`,
          });
          setIsRunning(false);
          isRunningRef.current = false;
          return;
        }
      }

      // Check minimum win rate threshold (after minimum trades)
      if (tradeHistory.length >= strategyConfig.minTradesBeforeEvaluation) {
        const wins = tradeHistory.filter(t => t.result === 'win').length;
        const currentWinRate = (wins / tradeHistory.length) * 100;

        if (currentWinRate < strategyConfig.minWinRateThreshold) {
          toast.warning('Low Win Rate Detected', {
            description: `Win rate: ${currentWinRate.toFixed(1)}%. Consider reviewing strategy.`,
          });
        }
      }
    }

    const analysisTicks = [...ticks.slice(-119), tick];
    const profitability = profitabilityRef.current;

    const analysis = analyzeMarket({
      ticks: analysisTicks,
      tradeHistory,
      accountInfo,
      accountType,
      selectedStrategy: contractType,
      baseStake: stakeAmount,
      sessionStartBalance: sessionStartBalanceRef.current,
      consecutiveLosses: consecutiveLossesRef.current,
      lastTradeTime: lastTradeTimeRef.current,
      profitability,
      recentEdgeSamples: recentEdgeSamplesRef.current,
    });
    const safety = buildSafetyState({
      ticks: analysisTicks,
      tradeHistory,
      accountInfo,
      accountType,
      selectedStrategy: contractType,
      baseStake: stakeAmount,
      sessionStartBalance: sessionStartBalanceRef.current,
      consecutiveLosses: consecutiveLossesRef.current,
      lastTradeTime: lastTradeTimeRef.current,
    });
    setAiAnalysis(analysis);
    setSafetyState(safety);

    recentEdgeSamplesRef.current = [...recentEdgeSamplesRef.current, analysis.edgeScore].slice(-profitability.edgeDegradationWindow);

    if (safety.emergencyStop || safety.dailyLossLimitHit || safety.maxDrawdownHit) {
      toast.error('Emergency stop activated', {
        description: 'AI risk controls halted trading to protect the account.',
      });
      setIsRunning(false);
      isRunningRef.current = false;
      derivWS.unsubscribeTicks();
      lastTickRef.current = tick;
      return;
    }

    if (safety.pauseRequired) {
      toast.warning('Auto pause activated', {
        description: `${safety.consecutiveLosses} consecutive losses detected.`,
      });
      setIsRunning(false);
      isRunningRef.current = false;
      derivWS.unsubscribeTicks();
      lastTickRef.current = tick;
      return;
    }

    if (!analysis.shouldPlaceTrade || !analysis.recommendedDirection) {
      lastTickRef.current = tick;
      return;
    }

    if (Date.now() < lossCooldownUntilRef.current) {
      lastTickRef.current = tick;
      return;
    }

    if (lastTick) {
      const priceDiff = tick.quote - lastTick.quote;
      const prices = analysisTicks.slice(-80).map(t => t.quote);
      const direction = analysis.recommendedDirection;
      const activeStrategy = analysis.activeStrategy;

      // Enhanced Kyros Strategies Logic
      if (activeStrategy === 'kyros_trend') {
        if (analysis.structure.regime === 'trending' && tickCountRef.current % 4 === 0) {
          executeTrade(direction, tick, analysis);
        }
      } else if (activeStrategy === 'kyros_scalper') {
        if (analysis.structure.regime === 'scalping' && tickCountRef.current % 3 === 0) {
          executeTrade(direction, tick, analysis);
        }
      } else if (activeStrategy === 'kyros_reversal') {
        if (analysis.structure.reversalSignal !== 'none' && tickCountRef.current % 4 === 0) {
          executeTrade(direction, tick, analysis);
        }
      } else if (contractType === 'scalping') {
        if (tickCountRef.current % 5 === 0 && Math.sign(priceDiff) !== 0) {
          executeTrade(direction, tick, analysis);
        }
      } else {
        if (tickCountRef.current % 6 === 0 && prices.length > 25) {
          executeTrade(direction, tick, analysis);
        }
      }
    }

    lastTickRef.current = tick;
  }, [contractType, executeTrade, ticks, accountInfo, tradeHistory, accountType, stakeAmount]);

  // Start bot
  const startBot = useCallback(() => {
    if (connectionStatus !== 'connected') {
      toast.error('Not connected', {
        description: 'Please connect to Deriv first',
      });
      return;
    }

    if (!accountInfo || accountInfo.balance < stakeAmount) {
      toast.error('Insufficient balance', {
        description: 'Please add funds or reduce stake amount',
      });
      return;
    }

    // Initialize session tracking
    sessionStartBalanceRef.current = accountInfo.balance;
    consecutiveLossesRef.current = 0;
    currentStakeRef.current = stakeAmount;
    lastTradeTimeRef.current = 0;
    kyrosConfigRef.current = loadKyrosConfig();
    profitabilityRef.current = mergeProfitabilityConfig(
      loadProfitabilityConfig(),
      loadCalibratedProfitability()
    );
    lossCooldownUntilRef.current = 0;

    runCalibration();

    setIsRunning(true);
    isRunningRef.current = true;
    tickCountRef.current = 0;
    lastTickRef.current = null;

    // Subscribe to ticks
    derivWS.subscribeTicks(selectedSymbol);

    toast.success('Bot started', {
      description: `Trading ${contractType.replace('_', ' ')} on ${selectedSymbol} (${accountType})`,
    });

    if (selectedSymbol.startsWith('frx')) {
      toast.info('Forex Trading', {
        description: 'Ensure your account has permissions for Forex/Commodities',
      });
    }
  }, [connectionStatus, accountInfo, stakeAmount, selectedSymbol, contractType, accountType, runCalibration]);

  // Stop bot
  const stopBot = useCallback(() => {
    setIsRunning(false);
    isRunningRef.current = false;
    derivWS.unsubscribeTicks();
    setCurrentTrade(null);
    currentTradeRef.current = null;
    toast.info('Bot stopped');
  }, []);

  // Reset history
  const resetHistory = useCallback(() => {
    setTradeHistory([]);
    toast.info('Trade history cleared');
  }, []);

  const startNewSession = useCallback(() => {
    derivWS.off('account_info_updated', handleAccountUpdate);
    derivWS.off('mt5_accounts_updated', handleMT5Update);
    derivWS.disconnect();
    clearWorkspaceSession(userId, 'new-session');
    setConnectionStatus('disconnected');
    setAccountInfo(null);
    setAccountTypeState('demo');
    setTicks([]);
    setTradeHistory([]);
    setIsRunning(false);
    setCurrentTrade(null);
    setAiAnalysis(null);
    setSafetyState(null);
    setContractType('kyros_ai');
    setStakeAmount(1);
    setSelectedSymbol('R_100');
    isRunningRef.current = false;
    lastTickRef.current = null;
    tickCountRef.current = 0;
    tradeInProgressRef.current = false;
    currentTradeRef.current = null;
    consecutiveLossesRef.current = 0;
    sessionStartBalanceRef.current = 0;
    currentStakeRef.current = 1;
    lastTradeTimeRef.current = 0;
    resumeBotAfterReconnectRef.current = false;
    profitabilityRef.current = mergeProfitabilityConfig(
      loadProfitabilityConfig(),
      loadCalibratedProfitability()
    );
    recentEdgeSamplesRef.current = [];
    lossCooldownUntilRef.current = 0;
    window.dispatchEvent(new CustomEvent('kyros:workspace-reset', { detail: { source: 'trading' } }));
    toast.success('New session started');
  }, [handleAccountUpdate, handleMT5Update, userId]);

  useEffect(() => {
    if (!isLoaded) return;

    migrateAnonymousSession(userId);
    const session = loadWorkspaceSession(userId);
    const trading = session?.trading;

    if (trading) {
      setAccountTypeState(trading.accountType ?? 'demo');
      setSelectedSymbol(trading.selectedSymbol ?? 'R_100');
      setContractType(trading.contractType ?? 'kyros_ai');
      setStakeAmount(trading.stakeAmount ?? 1);
      setTradeHistory(trading.tradeHistory ?? []);
      setTicks(trading.ticks ?? []);
      setCurrentTrade(trading.currentTrade ?? null);
      setAccountInfo(trading.accountInfo ?? null);
      setAiAnalysis(trading.aiAnalysis ?? null);
      setSafetyState(trading.safetyState ?? null);

      const restoredIsRunning = Boolean(trading.isRunning && trading.shouldReconnect);
      setIsRunning(restoredIsRunning);
      isRunningRef.current = restoredIsRunning;
      currentTradeRef.current = trading.currentTrade ?? null;
      sessionStartBalanceRef.current = trading.sessionStartBalance ?? 0;
      consecutiveLossesRef.current = trading.consecutiveLosses ?? 0;
      currentStakeRef.current = trading.currentStake ?? (trading.stakeAmount ?? 1);
      lastTradeTimeRef.current = trading.lastTradeTime ?? 0;
      resumeBotAfterReconnectRef.current = Boolean(trading.shouldResumeBot);
    }

    hasHydratedRef.current = true;
  }, [isLoaded, userId]);

  useEffect(() => {
    if (!hasHydratedRef.current || !isLoaded || !user) return;
    const session = loadWorkspaceSession(userId);
    const trading = session?.trading;

    if (!trading?.shouldReconnect || connectionStatus !== 'disconnected') return;

    const metadata = user.unsafeMetadata as {
      demoToken?: string;
      realToken?: string;
      settings?: { autoReconnect?: boolean };
    };
    const autoReconnect = metadata.settings?.autoReconnect ?? true;
    const tokenToUse = (trading.accountType === 'real' ? metadata.realToken : metadata.demoToken) || '';

    if (!autoReconnect || !tokenToUse) {
      setIsRunning(false);
      isRunningRef.current = false;
      resumeBotAfterReconnectRef.current = false;
      return;
    }

    connect(tokenToUse).catch(() => {
      setIsRunning(false);
      isRunningRef.current = false;
      resumeBotAfterReconnectRef.current = false;
    });
  }, [connect, connectionStatus, isLoaded, user, userId]);

  useEffect(() => {
    if (connectionStatus !== 'connected' || !resumeBotAfterReconnectRef.current || isRunning) return;

    resumeBotAfterReconnectRef.current = false;
    const timeout = window.setTimeout(() => {
      startBot();
      toast.success('Trading session restored', {
        description: 'Connection and bot state resumed from your last workspace.',
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [connectionStatus, isRunning, startBot]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;

    const snapshot = {
      accountType,
      selectedSymbol,
      contractType,
      stakeAmount,
      tradeHistory,
      ticks,
      isRunning,
      currentTrade,
      accountInfo,
      aiAnalysis,
      safetyState,
      sessionStartBalance: sessionStartBalanceRef.current,
      consecutiveLosses: consecutiveLossesRef.current,
      currentStake: currentStakeRef.current,
      lastTradeTime: lastTradeTimeRef.current,
      shouldReconnect: connectionStatus === 'connected' || connectionStatus === 'connecting' || isRunning,
      shouldResumeBot: isRunning,
    };

    const save = () => saveWorkspaceSession(userId, { trading: snapshot });
    const timeout = window.setTimeout(save, 250);

    return () => window.clearTimeout(timeout);
  }, [
    accountInfo,
    accountType,
    aiAnalysis,
    connectionStatus,
    contractType,
    currentTrade,
    isRunning,
    safetyState,
    selectedSymbol,
    stakeAmount,
    ticks,
    tradeHistory,
    userId,
  ]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;

    const saveBeforeUnload = () => {
      saveWorkspaceSession(userId, {
        trading: {
          accountType,
          selectedSymbol,
          contractType,
          stakeAmount,
          tradeHistory,
          ticks,
          isRunning,
          currentTrade,
          accountInfo,
          aiAnalysis,
          safetyState,
          sessionStartBalance: sessionStartBalanceRef.current,
          consecutiveLosses: consecutiveLossesRef.current,
          currentStake: currentStakeRef.current,
          lastTradeTime: lastTradeTimeRef.current,
          shouldReconnect: connectionStatus === 'connected' || connectionStatus === 'connecting' || isRunning,
          shouldResumeBot: isRunning,
        },
      });
    };

    window.addEventListener('beforeunload', saveBeforeUnload);
    window.addEventListener('pagehide', saveBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', saveBeforeUnload);
      window.removeEventListener('pagehide', saveBeforeUnload);
    };
  }, [
    accountInfo,
    accountType,
    aiAnalysis,
    connectionStatus,
    contractType,
    currentTrade,
    isRunning,
    safetyState,
    selectedSymbol,
    stakeAmount,
    ticks,
    tradeHistory,
    userId,
  ]);

  useEffect(() => {
    const handleWorkspaceReset = (event: Event) => {
      const source = (event as CustomEvent<{ source?: string }>).detail?.source;
      if (source === 'trading') return;

      derivWS.off('account_info_updated', handleAccountUpdate);
      derivWS.off('mt5_accounts_updated', handleMT5Update);
      derivWS.disconnect();
      setConnectionStatus('disconnected');
      setAccountInfo(null);
      setAccountTypeState('demo');
      setTicks([]);
      setTradeHistory([]);
      setIsRunning(false);
      setCurrentTrade(null);
      setAiAnalysis(null);
      setSafetyState(null);
      setContractType('kyros_ai');
      setStakeAmount(1);
      setSelectedSymbol('R_100');
      isRunningRef.current = false;
      lastTickRef.current = null;
      tickCountRef.current = 0;
      tradeInProgressRef.current = false;
      currentTradeRef.current = null;
      consecutiveLossesRef.current = 0;
      sessionStartBalanceRef.current = 0;
      currentStakeRef.current = 1;
      lastTradeTimeRef.current = 0;
      resumeBotAfterReconnectRef.current = false;
    };

    window.addEventListener('kyros:workspace-reset', handleWorkspaceReset);
    return () => window.removeEventListener('kyros:workspace-reset', handleWorkspaceReset);
  }, [handleAccountUpdate, handleMT5Update]);

  // Set up event listeners
  useEffect(() => {
    const handleStatus = (status: ConnectionStatus) => {
      setConnectionStatus(status);
    };

    const handleTick = (tick: TickData) => {
      // Filter ticks for currently selected symbol only
      if (tick.symbol !== selectedSymbol) return;

      setTicks(prev => {
        const newTicks = [...prev, tick];
        // Keep last 100 ticks
        return newTicks.slice(-100);
      });

      // Analyze tick if bot is running
      if (isRunningRef.current) {
        analyzeTickAndTrade(tick);
      }
    };

    const handleBalance = (balance: any) => {
      setAccountInfo(prev => prev ? { ...prev, balance: balance.balance } : null);
    };

    const handleAccountUpdate = (info: AccountInfo) => {
      setAccountInfo(info);
    };

    const handleContractUpdate = (contract: any) => {
      if (contract.is_sold || contract.status === 'sold') {
        const profit = contract.profit || (contract.sell_price - contract.buy_price);
        const result: TradeResult = {
          id: uuidv4(),
          contractId: contract.contract_id,
          contractType: contract.contract_type === 'CALL' ? 'CALL' : 'PUT',
          entryPrice: contract.entry_tick || 0,
          exitPrice: contract.exit_tick || contract.sell_spot || 0,
          stake: contract.buy_price || stakeAmount,
          payout: contract.payout || 0,
          profit: profit,
          result: profit > 0 ? 'win' : 'loss',
          timestamp: Date.now(),
          duration: contract.tick_count || 0,
          symbol: contract.underlying || selectedSymbol,
          accountType: accountType,
          confidence: currentTradeRef.current?.confidence,
          strategy: currentTradeRef.current?.strategy,
          marketCondition: currentTradeRef.current?.marketCondition,
          edgeScore: currentTradeRef.current?.edgeScore,
          edgeTier: currentTradeRef.current?.edgeTier,
        };

        setTradeHistory(prev => [result, ...prev].slice(0, 50));
        setCurrentTrade(null);
        currentTradeRef.current = null;
        tradeInProgressRef.current = false;

        // Update consecutive losses counter
        if (profit > 0) {
          consecutiveLossesRef.current = 0;
          toast.success('Trade won!', {
            description: `Profit: $${profit.toFixed(2)}`,
          });
        } else {
          consecutiveLossesRef.current++;
          const prof = profitabilityRef.current;
          if (consecutiveLossesRef.current >= prof.maxConsecutiveLossesBeforeCooldown) {
            lossCooldownUntilRef.current = Date.now() + prof.lossCooldownMs;
          }

          // Apply stake reduction if configured
          const config = kyrosConfigRef.current;
          const strategyConfig = contractType === 'kyros_scalper' ? config.scalper :
            contractType === 'kyros_trend' ? config.trend :
              contractType === 'kyros_reversal' ? config.reversal : null;

          if (strategyConfig?.reduceStakeAfterLoss && consecutiveLossesRef.current >= 2) {
            const reduction = 1 - (strategyConfig.stakeReductionPercent / 100);
            currentStakeRef.current = currentStakeRef.current * reduction;

            toast.warning('Stake Reduced', {
              description: `New stake: $${currentStakeRef.current.toFixed(2)} after ${consecutiveLossesRef.current} losses`,
            });
          }

          toast.error('Trade lost', {
            description: `Loss: $${Math.abs(profit).toFixed(2)}`,
          });
        }
      }
    };

    const handleError = (error: any) => {
      // Ignore 'Unrecognised request' errors as they are often harmless or triggered by cleanup
      if (error.message === 'Unrecognised request') {
        console.warn('API Error (ignored):', error.message);
        return;
      }

      toast.error('API Error', {
        description: error.message || 'An error occurred',
      });
      tradeInProgressRef.current = false;
    };

    derivWS.on('status', handleStatus);
    derivWS.on('tick', handleTick);
    derivWS.on('balance', handleBalance);
    derivWS.on('account_info_updated', handleAccountUpdate);
    derivWS.on('contract_update', handleContractUpdate);
    derivWS.on('error', handleError);

    const calibrationInterval = window.setInterval(() => {
      if (!isRunningRef.current || ticks.length < 40) return;
      if (Date.now() - lastCalibrationRef.current < 10 * 60 * 1000) return;
      runCalibration();
    }, 5 * 60 * 1000);

    return () => {
      window.clearInterval(calibrationInterval);
      derivWS.off('status', handleStatus);
      derivWS.off('tick', handleTick);
      derivWS.off('balance', handleBalance);
      derivWS.off('account_info_updated', handleAccountUpdate);
      derivWS.off('contract_update', handleContractUpdate);
      derivWS.off('error', handleError);
    };
  }, [analyzeTickAndTrade, stakeAmount, selectedSymbol, accountType, contractType, runCalibration, ticks.length]);

  return (
    <TradingContext.Provider
      value={{
        connectionStatus,
        accountInfo,
        accountType,
        ticks,
        tradeHistory,
        isRunning,
        currentTrade,
        aiAnalysis,
        safetyState,
        sessionPerformance,
        contractType,
        stakeAmount,
        selectedSymbol,
        totalProfit,
        winRate,
        totalTrades,
        connect,
        disconnect,
        setAccountType,
        startBot,
        stopBot,
        resetHistory,
        startNewSession,
        setContractType,
        setStakeAmount,
        setSelectedSymbol,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};
