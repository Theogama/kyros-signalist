import type { TickData, TradeResult } from '@/lib/derivWebSocket';
import type { AccountType, ContractType } from '@/contexts/TradingContext';
import {
  analyzeMarket,
  type ChartAnalysis,
  type IntelligenceInput,
} from '@/lib/marketIntelligence';
import {
  DEFAULT_PROFITABILITY_CONFIG,
  type ProfitabilityConfig,
  PROFITABILITY_CALIBRATION_KEY,
} from '@/config/kyrosConfig';

export interface CalibrationCandidate {
  minEdgeScore: number;
  minConfidence: number;
  tradesTaken: number;
  wins: number;
  losses: number;
  winRate: number;
  netProfit: number;
  profitFactor: number;
  maxDrawdown: number;
  score: number;
}

export interface CalibrationResult {
  calibratedAt: number;
  symbol: string;
  accountType: AccountType;
  selectedStrategy: ContractType;
  best: CalibrationCandidate;
  candidates: CalibrationCandidate[];
  appliedConfig: Partial<ProfitabilityConfig>;
}

const PAYOUT_RATIO = 0.85;

const simulateTradeOutcome = (
  analysis: ChartAnalysis,
  tick: TickData,
  nextTick: TickData | undefined
): 'win' | 'loss' | 'skip' => {
  if (!analysis.shouldPlaceTrade || !analysis.recommendedDirection) return 'skip';
  if (!nextTick) return 'skip';
  const moved = nextTick.quote - tick.quote;
  if (analysis.recommendedDirection === 'CALL') return moved > 0 ? 'win' : 'loss';
  return moved < 0 ? 'win' : 'loss';
};

const evaluateThresholds = (
  ticks: TickData[],
  tradeHistory: TradeResult[],
  accountType: AccountType,
  selectedStrategy: ContractType,
  baseStake: number,
  minEdgeScore: number,
  minConfidence: number,
  profitability: ProfitabilityConfig
): CalibrationCandidate => {
  let wins = 0;
  let losses = 0;
  let netProfit = 0;
  let peak = 0;
  let equity = 0;
  let maxDrawdown = 0;
  let lastTradeTime = 0;
  let consecutiveLosses = 0;
  const sessionStartBalance = 1000;

  for (let i = 25; i < ticks.length - 1; i++) {
    const window = ticks.slice(Math.max(0, i - 119), i + 1);
    const input: IntelligenceInput = {
      ticks: window,
      tradeHistory,
      accountInfo: { balance: 1000 + equity, currency: 'USD', loginid: 'sim', email: '', is_virtual: accountType === 'demo' },
      accountType,
      selectedStrategy,
      baseStake,
      sessionStartBalance,
      consecutiveLosses,
      lastTradeTime,
    };

    const analysis = analyzeMarket({
      ...input,
      calibrationMode: true,
      profitability: {
        ...profitability,
        minEdgeScore,
        minConfidenceOverride: minConfidence,
      },
    });

    const outcome = simulateTradeOutcome(analysis, ticks[i], ticks[i + 1]);
    if (outcome === 'skip') continue;

    const stake = baseStake * (analysis.edgeTier === 'A' ? profitability.tierAStakeMultiplier
      : analysis.edgeTier === 'B' ? profitability.tierBStakeMultiplier
        : profitability.tierCStakeMultiplier);

    if (outcome === 'win') {
      wins++;
      const profit = stake * PAYOUT_RATIO;
      netProfit += profit;
      equity += profit;
      consecutiveLosses = 0;
    } else {
      losses++;
      netProfit -= stake;
      equity -= stake;
      consecutiveLosses++;
    }

    if (equity > peak) peak = equity;
    const dd = peak > 0 ? ((peak - equity) / Math.max(peak, 1)) * 100 : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
    lastTradeTime = ticks[i].epoch * 1000;
  }

  const tradesTaken = wins + losses;
  const grossWin = wins * baseStake * PAYOUT_RATIO;
  const grossLoss = losses * baseStake;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;
  const winRate = tradesTaken > 0 ? (wins / tradesTaken) * 100 : 0;

  const score =
    profitFactor * 40 +
    winRate * 0.35 +
    netProfit * 0.5 -
    maxDrawdown * 2 -
    (tradesTaken < 5 ? 30 : 0);

  return {
    minEdgeScore,
    minConfidence,
    tradesTaken,
    wins,
    losses,
    winRate,
    netProfit,
    profitFactor,
    maxDrawdown,
    score,
  };
};

export const calibrateProfitability = (
  ticks: TickData[],
  tradeHistory: TradeResult[],
  accountType: AccountType,
  selectedStrategy: ContractType,
  baseStake: number,
  profitability: ProfitabilityConfig = DEFAULT_PROFITABILITY_CONFIG
): CalibrationResult | null => {
  if (ticks.length < 40) return null;

  const edgeCandidates = [58, 62, 66, 70, 74];
  const confidenceCandidates = [68, 72, 76, 80];
  const candidates: CalibrationCandidate[] = [];

  for (const minEdgeScore of edgeCandidates) {
    for (const minConfidence of confidenceCandidates) {
      candidates.push(
        evaluateThresholds(
          ticks,
          tradeHistory,
          accountType,
          selectedStrategy,
          baseStake,
          minEdgeScore,
          minConfidence,
          profitability
        )
      );
    }
  }

  const viable = candidates
    .filter(c => c.tradesTaken >= 5 && c.profitFactor >= profitability.minProfitFactorForCalibration)
    .sort((a, b) => b.score - a.score);

  const best = viable[0] ?? candidates.sort((a, b) => b.score - a.score)[0];
  if (!best) return null;

  const appliedConfig: Partial<ProfitabilityConfig> = {
    minEdgeScore: best.minEdgeScore,
    minConfidenceOverride: best.minConfidence,
    calibratedAt: Date.now(),
  };

  return {
    calibratedAt: Date.now(),
    symbol: ticks[ticks.length - 1]?.symbol ?? 'R_100',
    accountType,
    selectedStrategy,
    best,
    candidates: viable.slice(0, 8),
    appliedConfig,
  };
};

export const loadCalibratedProfitability = (): Partial<ProfitabilityConfig> | null => {
  try {
    const raw = localStorage.getItem(PROFITABILITY_CALIBRATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { appliedConfig?: Partial<ProfitabilityConfig>; expiresAt?: number };
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(PROFITABILITY_CALIBRATION_KEY);
      return null;
    }
    return parsed.appliedConfig ?? null;
  } catch {
    return null;
  }
};

export const saveCalibratedProfitability = (result: CalibrationResult, ttlHours = 12) => {
  try {
    localStorage.setItem(
      PROFITABILITY_CALIBRATION_KEY,
      JSON.stringify({
        appliedConfig: result.appliedConfig,
        best: result.best,
        calibratedAt: result.calibratedAt,
        expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
      })
    );
  } catch (error) {
    console.warn('Failed to save calibration:', error);
  }
};

export const mergeProfitabilityConfig = (
  base: ProfitabilityConfig,
  patch?: Partial<ProfitabilityConfig> | null
): ProfitabilityConfig => ({
  ...base,
  ...patch,
});
