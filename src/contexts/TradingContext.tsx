import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { derivWS, TickData, TradeResult, AccountInfo, ConnectionStatus } from '@/lib/derivWebSocket';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@clerk/clerk-react';

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
        description: `${direction} contract at ${currentTick.quote.toFixed(4)}`,
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

    if (lastTick) {
      const priceDiff = tick.quote - lastTick.quote;
      
      // Kyros Strategies Logic
      if (contractType === 'kyros_trend') {
        // Trend strategy: Look at last 10 ticks to determine trend
        const recentTicks = ticks.slice(-10);
        if (recentTicks.length >= 10 && tickCountRef.current % 5 === 0) {
          const firstPrice = recentTicks[0].quote;
          const currentPrice = tick.quote;
          const trend = currentPrice - firstPrice;
          
          if (Math.abs(trend) > (currentPrice * 0.0001)) { // Minimum threshold
            const direction = trend > 0 ? 'CALL' : 'PUT';
            executeTrade(direction, tick);
          }
        }
      } else if (contractType === 'kyros_scalper') {
        // Scalper strategy: Look for quick momentum (3 ticks)
        const recentTicks = ticks.slice(-3);
        if (recentTicks.length >= 3) {
          const prices = recentTicks.map(t => t.quote);
          const isUp = prices[2] > prices[1] && prices[1] > prices[0];
          const isDown = prices[2] < prices[1] && prices[1] < prices[0];
          
          if (isUp) executeTrade('CALL', tick);
          else if (isDown) executeTrade('PUT', tick);
        }
      } else if (contractType === 'kyros_reversal') {
        // Reversal strategy: Look for overextended move in 7 ticks
        const recentTicks = ticks.slice(-7);
        if (recentTicks.length >= 7 && tickCountRef.current % 3 === 0) {
          const firstPrice = recentTicks[0].quote;
          const currentPrice = tick.quote;
          const change = ((currentPrice - firstPrice) / firstPrice) * 100;
          
          if (change > 0.05) executeTrade('PUT', tick); // Overbought
          else if (change < -0.05) executeTrade('CALL', tick); // Oversold
        }
      } else if (contractType === 'scalping') {
        // Scalping: Trade every 3 ticks based on direction
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
  }, [contractType, executeTrade, ticks]);

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

        if (profit > 0) {
          toast.success('Trade won!', {
            description: `Profit: $${profit.toFixed(2)}`,
          });
        } else {
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
