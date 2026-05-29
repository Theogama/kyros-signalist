import type { TradeResult } from '@/lib/derivWebSocket';
import type { SuggestedStrategy } from '@/lib/marketIntelligence';

export interface StrategyPerformance {
  strategy: string;
  wins: number;
  losses: number;
  totalTrades: number;
  winRate: number;
  netProfit: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  recentEdgeSum: number;
  recentEdgeCount: number;
  avgRecentEdge: number;
}

export interface SessionPerformance {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netProfit: number;
  profitFactor: number;
  maxDrawdown: number;
  byStrategy: Record<string, StrategyPerformance>;
}

const emptyStrategy = (strategy: string): StrategyPerformance => ({
  strategy,
  wins: 0,
  losses: 0,
  totalTrades: 0,
  winRate: 0,
  netProfit: 0,
  profitFactor: 0,
  avgWin: 0,
  avgLoss: 0,
  recentEdgeSum: 0,
  recentEdgeCount: 0,
  avgRecentEdge: 0,
});

export const getStrategyKey = (strategy?: string | null): string =>
  strategy && strategy !== 'standby' ? strategy : 'kyros_ai';

export const computeSessionPerformance = (
  tradeHistory: TradeResult[],
  sessionStartBalance: number,
  currentBalance: number
): SessionPerformance => {
  const wins = tradeHistory.filter(t => t.result === 'win');
  const losses = tradeHistory.filter(t => t.result === 'loss');
  const grossWin = wins.reduce((s, t) => s + Math.max(0, t.profit), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + Math.min(0, t.profit), 0));
  const netProfit = tradeHistory.reduce((s, t) => s + t.profit, 0);
  const byStrategy: Record<string, StrategyPerformance> = {};

  for (const trade of tradeHistory) {
    const key = getStrategyKey(trade.strategy);
    if (!byStrategy[key]) byStrategy[key] = emptyStrategy(key);
    const row = byStrategy[key];
    row.totalTrades++;
    if (trade.result === 'win') row.wins++;
    else row.losses++;
    row.netProfit += trade.profit;
  }

  for (const key of Object.keys(byStrategy)) {
    const row = byStrategy[key];
    row.winRate = row.totalTrades > 0 ? (row.wins / row.totalTrades) * 100 : 0;
    const stratWins = tradeHistory.filter(t => getStrategyKey(t.strategy) === key && t.result === 'win');
    const stratLosses = tradeHistory.filter(t => getStrategyKey(t.strategy) === key && t.result === 'loss');
    const sWin = stratWins.reduce((s, t) => s + t.profit, 0);
    const sLoss = Math.abs(stratLosses.reduce((s, t) => s + t.profit, 0));
    row.avgWin = stratWins.length > 0 ? sWin / stratWins.length : 0;
    row.avgLoss = stratLosses.length > 0 ? sLoss / stratLosses.length : 0;
    row.profitFactor = sLoss > 0 ? sWin / sLoss : sWin > 0 ? 99 : 0;
  }

  let peak = sessionStartBalance || currentBalance;
  let maxDrawdown = 0;
  let running = sessionStartBalance || currentBalance;
  for (const trade of [...tradeHistory].reverse()) {
    running -= trade.profit;
    if (running > peak) peak = running;
    const dd = peak > 0 ? ((peak - running) / peak) * 100 : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return {
    totalTrades: tradeHistory.length,
    wins: wins.length,
    losses: losses.length,
    winRate: tradeHistory.length > 0 ? (wins.length / tradeHistory.length) * 100 : 0,
    netProfit,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0,
    maxDrawdown,
    byStrategy,
  };
};

export const getStrategyWinRate = (
  tradeHistory: TradeResult[],
  strategy: SuggestedStrategy | string,
  lookback = 20
): number => {
  const key = getStrategyKey(strategy);
  const relevant = tradeHistory
    .filter(t => getStrategyKey(t.strategy) === key)
    .slice(0, lookback);
  if (relevant.length === 0) return 50;
  const wins = relevant.filter(t => t.result === 'win').length;
  return (wins / relevant.length) * 100;
};

export const recordEdgeSample = (
  tracker: Record<string, StrategyPerformance>,
  strategy: string,
  edgeScore: number,
  windowSize = 12
) => {
  const key = getStrategyKey(strategy);
  if (!tracker[key]) tracker[key] = emptyStrategy(key);
  const row = tracker[key];
  row.recentEdgeSum += edgeScore;
  row.recentEdgeCount++;
  if (row.recentEdgeCount > windowSize) {
    const overflow = row.recentEdgeCount - windowSize;
    row.recentEdgeSum -= (row.recentEdgeSum / row.recentEdgeCount) * overflow;
    row.recentEdgeCount = windowSize;
  }
  row.avgRecentEdge = row.recentEdgeCount > 0 ? row.recentEdgeSum / row.recentEdgeCount : edgeScore;
};
