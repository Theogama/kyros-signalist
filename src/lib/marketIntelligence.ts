import type { AccountInfo, TickData, TradeResult } from '@/lib/derivWebSocket';
import type {
  AccountType,
  ContractType,
} from '@/contexts/TradingContext';
import {
  AGGRESSIVE_PROFITABILITY,
  calculateMomentum,
  calculateSMA,
  calculateTrendStrength,
  calculateVolatility,
  type EdgeTier,
  type ProfitabilityConfig,
} from '@/config/kyrosConfig';
import { getStrategyWinRate } from '@/lib/performanceTracker';

export type TradeVerdict = 'GOOD TO TRADE' | 'RISKY' | 'AVOID TRADE';
export type MarketRegime = 'trending' | 'scalping' | 'volatile' | 'ranging' | 'unclear';
export type TrendDirection = 'up' | 'down' | 'sideways';
export type SuggestedStrategy = 'kyros_trend' | 'kyros_scalper' | 'kyros_reversal' | 'standby';

export interface MarketStructure {
  trendDirection: TrendDirection;
  regime: MarketRegime;
  support: number | null;
  resistance: number | null;
  liquidityZones: string[];
  candlestickPattern: string;
  breakoutSignal: 'bullish' | 'bearish' | 'none';
  reversalSignal: 'bullish' | 'bearish' | 'none';
}

export interface SafetyState {
  dailyPnL: number;
  dailyPnLPercent: number;
  dailyTargetProgress: number;
  riskExposurePercent: number;
  consecutiveLosses: number;
  dailyLossLimitHit: boolean;
  maxDrawdownHit: boolean;
  pauseRequired: boolean;
  emergencyStop: boolean;
  accountModeLabel: string;
}

export interface ChartAnalysis {
  verdict: TradeVerdict;
  confidence: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  recommendedDirection: 'CALL' | 'PUT' | null;
  recommendedStrategy: SuggestedStrategy;
  activeStrategy: SuggestedStrategy;
  marketCondition: string;
  structure: MarketStructure;
  momentumStrength: number;
  volatilityPercent: number;
  volumeActivity: number;
  fakeoutRisk: number;
  manipulationRisk: number;
  riskRewardRatio: number;
  entryQuality: number;
  confirmations: string[];
  warnings: string[];
  smartAlerts: string[];
  safeToTrade: boolean;
  stakeMultiplier: number;
  suggestedDuration: number;
  generatedAt: number;
  edgeScore: number;
  edgeTier: EdgeTier;
  passesEdgeGate: boolean;
  shouldPlaceTrade: boolean;
  setupQuality: 'premium' | 'good' | 'marginal' | 'skip';
  strategyWinRate: number;
  expectedProfitFactor: number;
}

export interface IntelligenceInput {
  ticks: TickData[];
  tradeHistory: TradeResult[];
  accountInfo: AccountInfo | null;
  accountType: AccountType;
  selectedStrategy: ContractType;
  baseStake: number;
  sessionStartBalance: number;
  consecutiveLosses: number;
  lastTradeTime: number;
  profitability?: ProfitabilityConfig;
  recentEdgeSamples?: number[];
  calibrationMode?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const classifyEdgeTier = (edgeScore: number, minEdge: number, minHigh: number): EdgeTier => {
  if (edgeScore < minEdge) return 'reject';
  if (edgeScore >= minHigh) return 'A';
  if (edgeScore >= minEdge + (minHigh - minEdge) * 0.45) return 'B';
  return 'C';
};

/** Composite expected-edge score (0-100) for trade-quality gating */
export const calculateEdgeScore = (params: {
  confidence: number;
  trendStrength: number;
  riskRewardRatio: number;
  fakeoutRisk: number;
  manipulationRisk: number;
  confirmationsCount: number;
  warningsCount: number;
  strategyWinRate: number;
  regime: MarketRegime;
  recentEdgeAvg?: number;
  profitability: ProfitabilityConfig;
}): number => {
  const {
    confidence,
    trendStrength,
    riskRewardRatio,
    fakeoutRisk,
    manipulationRisk,
    confirmationsCount,
    warningsCount,
    strategyWinRate,
    regime,
    recentEdgeAvg = 0,
    profitability,
  } = params;

  const regimeBonus =
    regime === 'trending' ? 8 : regime === 'scalping' ? 6 : regime === 'ranging' ? -6 : -4;
  const winRateBonus = clamp((strategyWinRate - 50) * 0.35, -12, 14);
  const rrBonus = clamp(riskRewardRatio * 6, 0, 18);
  const recentBonus = recentEdgeAvg > 0 ? clamp((recentEdgeAvg - 55) * 0.2, -8, 8) : 0;

  let edge =
    confidence * 0.42 +
    trendStrength * 22 +
    confirmationsCount * 2.5 +
    rrBonus +
    regimeBonus +
    winRateBonus +
    recentBonus -
    fakeoutRisk * 0.12 -
    manipulationRisk * 0.08 -
    warningsCount * 4;

  if (strategyWinRate < profitability.minStrategyWinRate && confirmationsCount < 5) {
    edge -= 10;
  }

  return Math.round(clamp(edge, 0, 100));
};

export const getExpectedProfitFactor = (edgeScore: number, strategyWinRate: number): number => {
  const impliedWin = clamp((edgeScore * 0.55 + strategyWinRate * 0.45) / 100, 0.35, 0.92);
  const payout = 0.85;
  return impliedWin > 0 ? (impliedWin * payout) / (1 - impliedWin) : 0;
};

const percentDistance = (price: number, reference: number | null) => {
  if (!reference) return 100;
  return Math.abs((price - reference) / reference) * 100;
};

const getCurrentStreak = (tradeHistory: TradeResult[], result: 'win' | 'loss') => {
  let streak = 0;
  for (const trade of tradeHistory) {
    if (trade.result !== result) break;
    streak++;
  }
  return streak;
};

const detectCandlePattern = (prices: number[]) => {
  if (prices.length < 6) return 'Building data';

  const recent = prices.slice(-6);
  const body = recent[recent.length - 1] - recent[0];
  const range = Math.max(...recent) - Math.min(...recent);
  const previousBody = recent[3] - recent[0];
  const latestBody = recent[5] - recent[3];

  if (range === 0) return 'Doji compression';
  if (Math.abs(body) / range < 0.2) return 'Indecision doji';
  if (previousBody < 0 && latestBody > Math.abs(previousBody) * 0.8) return 'Bullish engulfing pressure';
  if (previousBody > 0 && latestBody < -Math.abs(previousBody) * 0.8) return 'Bearish engulfing pressure';
  if (body > 0) return 'Bullish continuation candles';
  return 'Bearish continuation candles';
};

const detectBreakout = (prices: number[], support: number | null, resistance: number | null) => {
  if (prices.length < 20 || support === null || resistance === null) return 'none';

  const current = prices[prices.length - 1];
  const previous = prices[prices.length - 4];
  const range = resistance - support;
  const buffer = range * 0.04;

  if (previous <= resistance && current > resistance + buffer) return 'bullish';
  if (previous >= support && current < support - buffer) return 'bearish';
  return 'none';
};

const getPriceVelocity = (ticks: TickData[]) => {
  if (ticks.length < 8) return 0;
  const recent = ticks.slice(-12);
  const elapsed = Math.max(1, recent[recent.length - 1].epoch - recent[0].epoch);
  const moves = recent.reduce((sum, tick, index) => {
    if (index === 0) return sum;
    return sum + Math.abs(tick.quote - recent[index - 1].quote);
  }, 0);
  return moves / elapsed;
};

const getAccountProfile = (accountType: AccountType) => {
  if (accountType === 'real') {
    return {
      minConfidence: 88,
      dailyLossLimit: 3,
      maxDrawdown: 6,
      targetLow: 10,
      targetHigh: 20,
      maxRiskPerTrade: 1,
      cooldownMs: 45_000,
      maxConsecutiveLosses: 2,
      label: 'Capital protection',
    };
  }

  return {
    minConfidence: 72,
    dailyLossLimit: 8,
    maxDrawdown: 15,
    targetLow: 10,
    targetHigh: 20,
    maxRiskPerTrade: 2.5,
    cooldownMs: 18_000,
    maxConsecutiveLosses: 4,
    label: 'Adaptive testing',
  };
};

export const buildSafetyState = (input: IntelligenceInput): SafetyState => {
  const profile = getAccountProfile(input.accountType);
  const balance = input.accountInfo?.balance ?? 0;
  const startBalance = input.sessionStartBalance || balance;
  const dailyPnL = startBalance > 0 && balance > 0 ? balance - startBalance : 0;
  const dailyPnLPercent = startBalance > 0 ? (dailyPnL / startBalance) * 100 : 0;
  const dailyTargetProgress = clamp((dailyPnLPercent / profile.targetLow) * 100, 0, 200);
  const riskExposurePercent = balance > 0 ? (input.baseStake / balance) * 100 : 0;
  const losses = getCurrentStreak(input.tradeHistory, 'loss') || input.consecutiveLosses;

  return {
    dailyPnL,
    dailyPnLPercent,
    dailyTargetProgress,
    riskExposurePercent,
    consecutiveLosses: losses,
    dailyLossLimitHit: dailyPnLPercent <= -profile.dailyLossLimit,
    maxDrawdownHit: dailyPnLPercent <= -profile.maxDrawdown,
    pauseRequired: losses >= profile.maxConsecutiveLosses,
    emergencyStop: dailyPnLPercent <= -profile.maxDrawdown || losses > profile.maxConsecutiveLosses,
    accountModeLabel: profile.label,
  };
};

export const analyzeMarket = (input: IntelligenceInput): ChartAnalysis => {
  const ticks = input.ticks.slice(-120);
  const prices = ticks.map(t => t.quote);
  const current = prices[prices.length - 1] ?? 0;
  const profile = getAccountProfile(input.accountType);
  const profitability = input.profitability ?? AGGRESSIVE_PROFITABILITY;
  const safety = buildSafetyState(input);
  const confirmations: string[] = [];
  const warnings: string[] = [];
  const smartAlerts: string[] = [];

  if (prices.length < 25) {
    return {
      verdict: 'AVOID TRADE',
      confidence: 0,
      sentiment: 'NEUTRAL',
      recommendedDirection: null,
      recommendedStrategy: 'standby',
      activeStrategy: 'standby',
      marketCondition: 'Collecting chart data',
      structure: {
        trendDirection: 'sideways',
        regime: 'unclear',
        support: null,
        resistance: null,
        liquidityZones: ['Insufficient price history'],
        candlestickPattern: 'Building data',
        breakoutSignal: 'none',
        reversalSignal: 'none',
      },
      momentumStrength: 0,
      volatilityPercent: 0,
      volumeActivity: 0,
      fakeoutRisk: 100,
      manipulationRisk: 100,
      riskRewardRatio: 0,
      entryQuality: 0,
      confirmations,
      warnings: ['Waiting for at least 25 ticks before trading'],
      smartAlerts: ['AI reader warming up'],
      safeToTrade: false,
      stakeMultiplier: 0,
      suggestedDuration: 5,
      generatedAt: Date.now(),
      edgeScore: 0,
      edgeTier: 'reject',
      passesEdgeGate: false,
      shouldPlaceTrade: false,
      setupQuality: 'skip',
      strategyWinRate: 50,
      expectedProfitFactor: 0,
    };
  }

  const shortPrices = prices.slice(-12);
  const mediumPrices = prices.slice(-30);
  const longPrices = prices.slice(-80);
  const shortSma = calculateSMA(shortPrices, Math.min(8, shortPrices.length));
  const mediumSma = calculateSMA(mediumPrices, Math.min(20, mediumPrices.length));
  const longSma = calculateSMA(longPrices, Math.min(50, longPrices.length));
  const momentum = calculateMomentum(shortPrices);
  const mediumMomentum = calculateMomentum(mediumPrices);
  const lastMovePercent = prices.length > 1
    ? Math.abs((prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]) * 100
    : 0;
  const trendStrength = calculateTrendStrength(mediumPrices, Math.min(24, mediumPrices.length));
  const volatility = calculateVolatility(mediumPrices);
  const volumeActivity = getPriceVelocity(ticks);
  const support = Math.min(...mediumPrices.slice(0, -1));
  const resistance = Math.max(...mediumPrices.slice(0, -1));
  const rangePercent = support > 0 ? ((resistance - support) / support) * 100 : 0;
  const candlePattern = detectCandlePattern(shortPrices);
  const breakoutSignal = detectBreakout(prices, support, resistance);
  const nearSupport = percentDistance(current, support) < rangePercent * 0.18;
  const nearResistance = percentDistance(current, resistance) < rangePercent * 0.18;
  const priceAboveMAs = current > shortSma && shortSma > mediumSma && mediumSma >= longSma;
  const priceBelowMAs = current < shortSma && shortSma < mediumSma && mediumSma <= longSma;
  const trendDirection: TrendDirection = priceAboveMAs && momentum > 0
    ? 'up'
    : priceBelowMAs && momentum < 0
      ? 'down'
      : 'sideways';

  const highVolatility = volatility > 0.18;
  const lowVolatility = volatility < 0.015;
  const choppy = trendStrength < 0.35 && Math.abs(momentum) < 0.025;
  const regime: MarketRegime = highVolatility
    ? 'volatile'
    : choppy
      ? 'ranging'
      : trendStrength > 0.62
        ? 'trending'
        : Math.abs(momentum) > 0.04 && volatility >= 0.02
          ? 'scalping'
          : 'unclear';

  const reversalSignal = nearSupport && momentum > 0
    ? 'bullish'
    : nearResistance && momentum < 0
      ? 'bearish'
      : 'none';

  const fakeoutRisk = clamp(
    35
    + (breakoutSignal !== 'none' && volumeActivity < 0.0003 ? 25 : 0)
    + (highVolatility ? 18 : 0)
    + (choppy ? 20 : 0)
    - (trendStrength * 25),
    0,
    100
  );
  const manipulationRisk = clamp(fakeoutRisk + (rangePercent < 0.04 ? 12 : 0) + (volumeActivity > 0.02 ? 12 : 0), 0, 100);

  const recommendedStrategy: SuggestedStrategy = regime === 'trending'
    ? 'kyros_trend'
    : regime === 'scalping'
      ? 'kyros_scalper'
      : reversalSignal !== 'none'
        ? 'kyros_reversal'
        : 'standby';

  const selectedStrategy = input.selectedStrategy === 'kyros_ai'
    ? recommendedStrategy
    : input.selectedStrategy === 'kyros_trend' || input.selectedStrategy === 'kyros_scalper' || input.selectedStrategy === 'kyros_reversal'
      ? input.selectedStrategy
      : recommendedStrategy;

  const recommendedDirection = trendDirection === 'up' || breakoutSignal === 'bullish' || reversalSignal === 'bullish'
    ? 'CALL'
    : trendDirection === 'down' || breakoutSignal === 'bearish' || reversalSignal === 'bearish'
      ? 'PUT'
      : null;

  if (trendDirection !== 'sideways') confirmations.push(`Trend aligned ${trendDirection}`);
  if (Math.abs(momentum) > 0.025) confirmations.push('Momentum confirmation');
  if (volumeActivity > 0.00015) confirmations.push('Active tick volume proxy');
  if (breakoutSignal !== 'none') confirmations.push(`${breakoutSignal} breakout detected`);
  if (reversalSignal !== 'none') confirmations.push(`${reversalSignal} reversal zone`);
  if (trendStrength > 0.55) confirmations.push('Clean market structure');
  if (!highVolatility && !lowVolatility) confirmations.push('Volatility in tradable range');

  if (choppy) warnings.push('Sideways or choppy market');
  if (highVolatility) warnings.push('Volatility spike detected');
  if (lastMovePercent > Math.max(0.04, volatility * 1.4)) warnings.push('High spread/slippage proxy');
  if (lowVolatility) warnings.push('Low momentum and low volatility');
  if (fakeoutRisk > 65) warnings.push('Elevated fakeout risk');
  if (manipulationRisk > 70) warnings.push('Possible manipulation/liquidity sweep risk');
  if (!recommendedDirection) warnings.push('No directional edge');
  if (safety.dailyLossLimitHit) warnings.push('Daily loss limit reached');
  if (safety.pauseRequired) warnings.push('Consecutive loss protection active');
  if (Date.now() - input.lastTradeTime < profile.cooldownMs) warnings.push('Trade cooldown active');
  if (safety.riskExposurePercent > profile.maxRiskPerTrade) warnings.push('Stake risk exceeds account profile');

  const riskDistance = recommendedDirection === 'CALL'
    ? Math.max(current - support, current * 0.0001)
    : Math.max(resistance - current, current * 0.0001);
  const rewardDistance = recommendedDirection === 'CALL'
    ? Math.max(resistance - current, current * 0.0001)
    : Math.max(current - support, current * 0.0001);
  const riskRewardRatio = recommendedDirection ? clamp(rewardDistance / riskDistance, 0, 5) : 0;

  if (riskRewardRatio >= 1.2) confirmations.push('Risk-to-reward acceptable');
  if (riskRewardRatio > 0 && riskRewardRatio < 1) warnings.push('Weak risk-to-reward');

  let confidence = 48;
  confidence += trendStrength * 18;
  confidence += clamp(Math.abs(momentum) * 420, 0, 14);
  confidence += clamp(volumeActivity * 1200, 0, 8);
  confidence += confirmations.length * 4;
  confidence += riskRewardRatio >= 1.2 ? 8 : -8;
  confidence -= warnings.length * 6;
  confidence -= fakeoutRisk * 0.15;
  confidence -= input.accountType === 'real' ? 5 : 0;
  confidence = Math.round(clamp(confidence, 0, 100));

  const minConfidence = input.calibrationMode
    ? profitability.minConfidenceOverride
    : Math.max(profile.minConfidence, profitability.minConfidenceOverride);
  const strategyWinRate = getStrategyWinRate(input.tradeHistory, selectedStrategy);
  const recentEdgeAvg =
    input.recentEdgeSamples && input.recentEdgeSamples.length > 0
      ? input.recentEdgeSamples.reduce((a, b) => a + b, 0) / input.recentEdgeSamples.length
      : 0;

  const edgeScore = calculateEdgeScore({
    confidence,
    trendStrength,
    riskRewardRatio,
    fakeoutRisk,
    manipulationRisk,
    confirmationsCount: confirmations.length,
    warningsCount: warnings.length,
    strategyWinRate,
    regime,
    recentEdgeAvg,
    profitability,
  });

  const edgeTier = classifyEdgeTier(
    edgeScore,
    profitability.minEdgeScore,
    profitability.minEdgeForHighStake
  );
  const expectedProfitFactor = getExpectedProfitFactor(edgeScore, strategyWinRate);
  const passesEdgeGate =
    edgeTier !== 'reject' &&
    edgeScore >= profitability.minEdgeScore &&
    expectedProfitFactor >= profitability.minExpectedProfitFactorForTrade &&
    strategyWinRate >= profitability.minStrategyWinRate - 15;

  const passesSafetyGate =
    !safety.dailyLossLimitHit &&
    !safety.maxDrawdownHit &&
    !safety.pauseRequired &&
    !safety.emergencyStop &&
    Date.now() - input.lastTradeTime >= profile.cooldownMs &&
    safety.riskExposurePercent <= profile.maxRiskPerTrade;

  const passesMarketStructure =
    recommendedDirection !== null &&
    selectedStrategy !== 'standby' &&
    confirmations.length >= (input.accountType === 'real' ? 4 : 3) &&
    warnings.length <= (input.accountType === 'real' ? 2 : 3);

  const shouldPlaceTrade =
    passesEdgeGate &&
    passesSafetyGate &&
    passesMarketStructure &&
    confidence >= minConfidence;

  const setupQuality: ChartAnalysis['setupQuality'] = !passesEdgeGate || edgeTier === 'reject'
    ? 'skip'
    : edgeTier === 'A'
      ? 'premium'
      : edgeTier === 'B'
        ? 'good'
        : 'marginal';

  const safeToTrade = passesSafetyGate && passesMarketStructure && confidence >= minConfidence - 8;

  const verdict: TradeVerdict = shouldPlaceTrade
    ? 'GOOD TO TRADE'
    : safeToTrade && !passesEdgeGate
      ? 'RISKY'
      : safeToTrade
        ? 'RISKY'
        : 'AVOID TRADE';

  if (confidence >= 90 && shouldPlaceTrade) smartAlerts.push('Strong trade profile');
  if (edgeTier === 'A' && shouldPlaceTrade) smartAlerts.push(`Tier-A edge (${edgeScore}) — high expectancy setup`);
  if (edgeTier === 'B' && shouldPlaceTrade) smartAlerts.push(`Tier-B edge (${edgeScore}) — quality setup`);
  if (edgeTier === 'C' && shouldPlaceTrade) smartAlerts.push(`Tier-C edge (${edgeScore}) — reduced size entry`);
  if (safeToTrade && !shouldPlaceTrade) {
    smartAlerts.push(`Scanning — edge ${edgeScore}/${profitability.minEdgeScore} (waiting for quality setup)`);
  }
  if (confidence >= 70 && confidence < 90 && shouldPlaceTrade) smartAlerts.push('Moderate setup confirmed');
  if (verdict === 'AVOID TRADE' && !passesSafetyGate) smartAlerts.push('Safety limits active — bot still monitoring');
  if (safety.dailyTargetProgress >= 100) smartAlerts.push('Daily target reached. Consider locking profit.');

  const tierMultiplier =
    edgeTier === 'A'
      ? profitability.tierAStakeMultiplier
      : edgeTier === 'B'
        ? profitability.tierBStakeMultiplier
        : edgeTier === 'C'
          ? profitability.tierCStakeMultiplier
          : 0;

  const stakeMultiplier = shouldPlaceTrade
    ? input.accountType === 'real'
      ? clamp(tierMultiplier * (confidence / 100), 0.35, profitability.tierAStakeMultiplier)
      : clamp(tierMultiplier * (confidence / 88), 0.45, profitability.tierAStakeMultiplier)
    : 0;

  return {
    verdict,
    confidence,
    sentiment: recommendedDirection === 'CALL' ? 'BULLISH' : recommendedDirection === 'PUT' ? 'BEARISH' : 'NEUTRAL',
    recommendedDirection,
    recommendedStrategy,
    activeStrategy: selectedStrategy,
    marketCondition: regime === 'trending'
      ? 'Trending market'
      : regime === 'scalping'
        ? 'Fast scalping window'
        : regime === 'volatile'
          ? 'Volatile market'
          : regime === 'ranging'
            ? 'Ranging market'
            : 'Unclear market',
    structure: {
      trendDirection,
      regime,
      support,
      resistance,
      liquidityZones: [
        support ? `Buy-side reaction near ${support.toFixed(2)}` : 'Support pending',
        resistance ? `Sell-side reaction near ${resistance.toFixed(2)}` : 'Resistance pending',
      ],
      candlestickPattern: candlePattern,
      breakoutSignal,
      reversalSignal,
    },
    momentumStrength: Math.abs(momentum),
    volatilityPercent: volatility,
    volumeActivity,
    fakeoutRisk,
    manipulationRisk,
    riskRewardRatio,
    entryQuality: confidence,
    confirmations,
    warnings,
    smartAlerts,
    safeToTrade,
    stakeMultiplier,
    suggestedDuration: selectedStrategy === 'kyros_scalper' ? 1 : selectedStrategy === 'kyros_trend' ? 5 : 3,
    generatedAt: Date.now(),
    edgeScore,
    edgeTier,
    passesEdgeGate,
    shouldPlaceTrade,
    setupQuality,
    strategyWinRate,
    expectedProfitFactor,
  };
};

export const getDynamicStake = (
  baseStake: number,
  analysis: ChartAnalysis,
  safety: SafetyState,
  accountType: AccountType,
  profitability?: ProfitabilityConfig
) => {
  if (!analysis.shouldPlaceTrade) return 0;

  const prof = profitability ?? AGGRESSIVE_PROFITABILITY;
  let multiplier = analysis.stakeMultiplier;

  if (safety.consecutiveLosses > 0) multiplier *= Math.pow(0.6, safety.consecutiveLosses);
  if (safety.dailyPnLPercent < 0) multiplier *= 0.7;
  if (safety.dailyTargetProgress >= 100) multiplier *= accountType === 'real' ? 0.2 : 0.5;
  if (analysis.expectedProfitFactor < prof.minExpectedProfitFactorForTrade) multiplier *= 0.5;

  const minStake = accountType === 'real' ? 0.5 : 0.35;
  const maxMultiplier = prof.tierAStakeMultiplier;
  return Math.max(minStake, Number((baseStake * clamp(multiplier, 0.1, maxMultiplier)).toFixed(2)));
};
