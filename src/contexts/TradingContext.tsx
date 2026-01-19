import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { derivWS, TickData, TradeResult, AccountInfo, ConnectionStatus } from '@/lib/derivWebSocket';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@clerk/clerk-react';
import {
  loadKyrosConfig,
  KyrosConfig,
  calculateVolatility,
  calculateMomentum,
  detectConsecutiveDirection,
  calculateTrendStrength,
  calculateSMA
} from '@/config/kyrosConfig';

export type ContractType = 'scalping' | 'rise_fall' | 'kyros_trend' | 'kyros_scalper' | 'kyros_reversal';
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
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [accountType, setAccountTypeState] = useState<AccountType>('demo');

  // Trading state
  const [ticks, setTicks] = useState<TickData[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTrade, setCurrentTrade] = useState<any | null>(null);

  // Settings
  const [contractType, setContractType] = useState<ContractType>('rise_fall');
  const [stakeAmount, setStakeAmount] = useState(1);
  const [selectedSymbol, setSelectedSymbol] = useState('R_100');

  // Refs for bot logic
  const isRunningRef = useRef(false);
  const lastTickRef = useRef<TickData | null>(null);
  const tickCountRef = useRef(0);
  const tradeInProgressRef = useRef(false);

  // Kyros strategy refs for risk management
  const kyrosConfigRef = useRef<KyrosConfig>(loadKyrosConfig());
  const consecutiveLossesRef = useRef(0);
  const sessionStartBalanceRef = useRef(0);
  const currentStakeRef = useRef(stakeAmount);
  const lastTradeTimeRef = useRef(0);

  // Calculate stats
  const totalProfit = tradeHistory.reduce((sum, trade) => sum + trade.profit, 0);
  const wins = tradeHistory.filter(t => t.result === 'win').length;
  const winRate = tradeHistory.length > 0 ? (wins / tradeHistory.length) * 100 : 0;
  const totalTrades = tradeHistory.length;

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
    isRunningRef.current = false;
    toast.info('Disconnected from Deriv');
  }, [handleAccountUpdate, handleMT5Update]);

  // Execute trade based on tick analysis
  const executeTrade = useCallback(async (direction: 'CALL' | 'PUT', currentTick: TickData) => {
    if (tradeInProgressRef.current || !accountInfo) return;

    // Check balance
    if (accountInfo.balance < stakeAmount) {
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
      const duration = contractType === 'scalping' ? 1 : 5;
      const durationUnit = 't';

      // Determine correct symbol parameters
      const isForex = selectedSymbol.startsWith('frx');
      const symbolDuration = isForex ? Math.max(duration, 1) : duration; // Forex might have different tick constraints but Deriv API generally supports ticks for many

      const proposal = await derivWS.getProposal({
        contractType: direction,
        amount: stakeAmount,
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

      setCurrentTrade({
        contractId,
        direction,
        entryPrice,
        stake: stakeAmount,
        timestamp: tradeStartTime,
        accountType,
        symbol: selectedSymbol,
      });

      // Subscribe to contract updates
      derivWS.subscribeToContract(contractId);

      toast.info('Trade placed', {
        description: `${direction} contract at ${currentTick.quote.toFixed(2)}`,
      });

    } catch (error: any) {
      toast.error('Trade failed', {
        description: error.message,
      });
      tradeInProgressRef.current = false;
    }
  }, [accountInfo, stakeAmount, contractType, selectedSymbol]);

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

    if (lastTick) {
      const priceDiff = tick.quote - lastTick.quote;
      const prices = ticks.slice(-20).map(t => t.quote);
      prices.push(tick.quote);

      // Enhanced Kyros Strategies Logic
      if (contractType === 'kyros_trend') {
        // ENHANCED TREND STRATEGY: Multi-indicator approach
        const config = kyrosConfigRef.current.trend;
        const window = config.trendConfirmationPeriod;

        if (prices.length >= window) {
          const recentPrices = prices.slice(-window);

          // Calculate trend strength
          const trendStrength = calculateTrendStrength(recentPrices, window);
          const momentum = calculateMomentum(recentPrices);

          // Calculate moving average for trend confirmation
          const sma = calculateSMA(recentPrices, Math.floor(window / 2));
          const currentPrice = tick.quote;

          // Trend direction
          const isUptrend = currentPrice > sma && momentum > 0;
          const isDowntrend = currentPrice < sma && momentum < 0;

          // Only trade if trend strength is sufficient
          if (trendStrength >= config.trendConfidenceThreshold &&
            Math.abs(momentum) >= config.minTrendStrength) {

            // Trade on trend confirmation with reduced frequency for quality
            if (tickCountRef.current % 7 === 0) {
              if (isUptrend) {
                executeTrade('CALL', tick);
              } else if (isDowntrend) {
                executeTrade('PUT', tick);
              }
            }
          }
        }
      } else if (contractType === 'kyros_scalper') {
        // ENHANCED SCALPER STRATEGY: High-frequency with strict filters
        const config = kyrosConfigRef.current.scalper;
        const tickCount = config.tickConfirmationCount;

        if (prices.length >= tickCount + 2) {
          // Check consecutive direction
          const direction = detectConsecutiveDirection(prices, config.consecutiveTicksRequired);

          // Calculate volatility for filtering
          const recentPrices = prices.slice(-5);
          const volatility = calculateVolatility(recentPrices);

          // Volatility filter based on config
          const volatilityThresholds = {
            low: { min: 0.00005, max: 0.005 },
            medium: { min: 0.0001, max: 0.01 },
            high: { min: 0.0002, max: 0.02 }
          };

          const threshold = volatilityThresholds[config.volatilityFilter];
          const volatilityOk = volatility >= threshold.min && volatility <= threshold.max;

          // Calculate momentum
          const momentum = calculateMomentum(recentPrices);
          const momentumStrong = Math.abs(momentum) >= config.momentumThreshold;

          // Trade only when all conditions align
          if (direction !== 'none' && volatilityOk && momentumStrong) {
            const tradeDirection = direction === 'up' ? 'CALL' : 'PUT';
            executeTrade(tradeDirection, tick);
          }
        }
      } else if (contractType === 'kyros_reversal') {
        // ENHANCED REVERSAL STRATEGY: Multi-timeframe mean reversion
        const config = kyrosConfigRef.current.reversal;

        if (config.multiTimeframeAnalysis && prices.length >= config.longWindow) {
          // Analyze multiple timeframes
          const shortPrices = prices.slice(-config.shortWindow);
          const mediumPrices = prices.slice(-config.mediumWindow);
          const longPrices = prices.slice(-config.longWindow);

          // Calculate momentum for each timeframe
          const shortMomentum = calculateMomentum(shortPrices);
          const mediumMomentum = calculateMomentum(mediumPrices);
          const longMomentum = calculateMomentum(longPrices);

          // Calculate mean for mean reversion
          const longSMA = calculateSMA(longPrices, config.longWindow);
          const currentPrice = tick.quote;
          const deviation = ((currentPrice - longSMA) / longSMA) * 100;

          // Detect overbought/oversold conditions
          const isOverbought = deviation >= config.overboughtThreshold;
          const isOversold = deviation <= -config.oversoldThreshold;

          // Reversal confirmation: short-term momentum opposes longer-term
          let reversalConfirmed = true;
          if (config.reversalConfirmation) {
            if (isOverbought) {
              // For overbought, we want to see weakening momentum
              reversalConfirmed = shortMomentum < mediumMomentum;
            } else if (isOversold) {
              // For oversold, we want to see strengthening momentum
              reversalConfirmed = shortMomentum > mediumMomentum;
            }
          }

          // Execute reversal trades
          if (reversalConfirmed && tickCountRef.current % 4 === 0) {
            if (isOverbought) {
              executeTrade('PUT', tick); // Price too high, expect drop
            } else if (isOversold) {
              executeTrade('CALL', tick); // Price too low, expect rise
            }
          }
        }
      } else if (contractType === 'scalping') {
        // Basic Scalping: Trade every 3 ticks based on direction
        if (tickCountRef.current % 3 === 0) {
          const direction = priceDiff > 0 ? 'CALL' : 'PUT';
          executeTrade(direction, tick);
        }
      } else {
        // Rise/Fall: Trade every 5 ticks based on trend
        if (tickCountRef.current % 5 === 0) {
          const direction = priceDiff > 0 ? 'CALL' : 'PUT';
          executeTrade(direction, tick);
        }
      }
    }

    lastTickRef.current = tick;
  }, [contractType, executeTrade, ticks, accountInfo, tradeHistory]);

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
    kyrosConfigRef.current = loadKyrosConfig();

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
  }, [connectionStatus, accountInfo, stakeAmount, selectedSymbol, contractType, accountType]);

  // Stop bot
  const stopBot = useCallback(() => {
    setIsRunning(false);
    isRunningRef.current = false;
    derivWS.unsubscribeTicks();
    setCurrentTrade(null);
    toast.info('Bot stopped');
  }, []);

  // Reset history
  const resetHistory = useCallback(() => {
    setTradeHistory([]);
    toast.info('Trade history cleared');
  }, []);

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
        };

        setTradeHistory(prev => [result, ...prev].slice(0, 50));
        setCurrentTrade(null);
        tradeInProgressRef.current = false;

        // Update consecutive losses counter
        if (profit > 0) {
          consecutiveLossesRef.current = 0;
          toast.success('Trade won!', {
            description: `Profit: $${profit.toFixed(2)}`,
          });
        } else {
          consecutiveLossesRef.current++;

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

    return () => {
      derivWS.off('status', handleStatus);
      derivWS.off('tick', handleTick);
      derivWS.off('balance', handleBalance);
      derivWS.off('account_info_updated', handleAccountUpdate);
      derivWS.off('contract_update', handleContractUpdate);
      derivWS.off('error', handleError);
    };
  }, [analyzeTickAndTrade, stakeAmount, selectedSymbol, accountType]);

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
        setContractType,
        setStakeAmount,
        setSelectedSymbol,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};
