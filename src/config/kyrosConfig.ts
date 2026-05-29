// Kyros Premium Strategy Configuration
// Advanced settings for profit-focused trading strategies

export type VolatilityLevel = 'low' | 'medium' | 'high';

// Base configuration for all strategies
export interface KyrosBaseConfig {
  // Risk Management
  maxConsecutiveLosses: number;
  dailyLossLimitPercent: number;
  minWinRateThreshold: number;
  autoPauseOnLossLimit: boolean;
  reduceStakeAfterLoss: boolean;
  stakeReductionPercent: number;
  
  // Trade Management
  minTradesBeforeEvaluation: number;
}

// Scalper Strategy Configuration
export interface ScalperConfig extends KyrosBaseConfig {
  momentumThreshold: number;
  tickConfirmationCount: number;
  volatilityFilter: VolatilityLevel;
  consecutiveTicksRequired: number;
  minVolatilityPercent: number;
  maxVolatilityPercent: number;
}

// Trend Strategy Configuration
export interface TrendConfig extends KyrosBaseConfig {
  trendConfirmationPeriod: number;
  minTrendStrength: number;
  emaWindow: number;
  trendConfidenceThreshold: number;
}

// Reversal Strategy Configuration
export interface ReversalConfig extends KyrosBaseConfig {
  overboughtThreshold: number;
  oversoldThreshold: number;
  reversalConfirmation: boolean;
  multiTimeframeAnalysis: boolean;
  shortWindow: number;
  mediumWindow: number;
  longWindow: number;
}

// All Kyros configurations
export interface KyrosConfig {
  scalper: ScalperConfig;
  trend: TrendConfig;
  reversal: ReversalConfig;
}

export type RiskProfile = 'conservative' | 'balanced' | 'aggressive';
export type EdgeTier = 'A' | 'B' | 'C' | 'reject';

/** AI profitability / edge-gating configuration */
export interface ProfitabilityConfig {
  riskProfile: RiskProfile;
  minEdgeScore: number;
  minEdgeForHighStake: number;
  minConfidenceOverride: number;
  tierAStakeMultiplier: number;
  tierBStakeMultiplier: number;
  tierCStakeMultiplier: number;
  lossCooldownMs: number;
  maxConsecutiveLossesBeforeCooldown: number;
  edgeDegradationWindow: number;
  edgeDegradationFloor: number;
  edgeDegradationPauseCount: number;
  minProfitFactorForCalibration: number;
  minExpectedProfitFactorForTrade: number;
  minStrategyWinRate: number;
  calibratedAt?: number;
}

export const PROFITABILITY_CALIBRATION_KEY = 'kyros_profitability_calibration';

export const DEFAULT_PROFITABILITY_CONFIG: ProfitabilityConfig = {
  riskProfile: 'aggressive',
  minEdgeScore: 62,
  minEdgeForHighStake: 78,
  minConfidenceOverride: 72,
  tierAStakeMultiplier: 1.35,
  tierBStakeMultiplier: 1.0,
  tierCStakeMultiplier: 0.65,
  lossCooldownMs: 25_000,
  maxConsecutiveLossesBeforeCooldown: 2,
  edgeDegradationWindow: 8,
  edgeDegradationFloor: 52,
  edgeDegradationPauseCount: 4,
  minProfitFactorForCalibration: 1.05,
  minExpectedProfitFactorForTrade: 0.92,
  minStrategyWinRate: 45,
};

export const CONSERVATIVE_PROFITABILITY: ProfitabilityConfig = {
  ...DEFAULT_PROFITABILITY_CONFIG,
  riskProfile: 'conservative',
  minEdgeScore: 72,
  minEdgeForHighStake: 85,
  minConfidenceOverride: 85,
  tierAStakeMultiplier: 0.85,
  tierBStakeMultiplier: 0.65,
  tierCStakeMultiplier: 0.45,
  lossCooldownMs: 60_000,
  maxConsecutiveLossesBeforeCooldown: 1,
};

export const AGGRESSIVE_PROFITABILITY: ProfitabilityConfig = {
  ...DEFAULT_PROFITABILITY_CONFIG,
  riskProfile: 'aggressive',
  minEdgeScore: 58,
  minEdgeForHighStake: 74,
  minConfidenceOverride: 68,
  tierAStakeMultiplier: 1.5,
  tierBStakeMultiplier: 1.1,
  tierCStakeMultiplier: 0.7,
  lossCooldownMs: 18_000,
  maxConsecutiveLossesBeforeCooldown: 3,
  edgeDegradationFloor: 48,
};

export const loadProfitabilityConfig = (): ProfitabilityConfig => {
  try {
    const stored = localStorage.getItem('kyros_profitability_config');
    if (stored) {
      return { ...AGGRESSIVE_PROFITABILITY, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return { ...AGGRESSIVE_PROFITABILITY };
};

export const saveProfitabilityConfig = (config: ProfitabilityConfig): void => {
  try {
    localStorage.setItem('kyros_profitability_config', JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save profitability config:', error);
  }
};

// Default configurations optimized for profitability
export const DEFAULT_KYROS_CONFIG: KyrosConfig = {
  scalper: {
    // Risk Management
    maxConsecutiveLosses: 3,
    dailyLossLimitPercent: 10,
    minWinRateThreshold: 60,
    autoPauseOnLossLimit: true,
    reduceStakeAfterLoss: true,
    stakeReductionPercent: 30,
    minTradesBeforeEvaluation: 10,
    
    // Scalper Specific
    momentumThreshold: 0.0002,
    tickConfirmationCount: 3,
    volatilityFilter: 'medium',
    consecutiveTicksRequired: 3,
    minVolatilityPercent: 0.0001,
    maxVolatilityPercent: 0.01,
  },
  
  trend: {
    // Risk Management
    maxConsecutiveLosses: 3,
    dailyLossLimitPercent: 10,
    minWinRateThreshold: 60,
    autoPauseOnLossLimit: true,
    reduceStakeAfterLoss: true,
    stakeReductionPercent: 30,
    minTradesBeforeEvaluation: 10,
    
    // Trend Specific
    trendConfirmationPeriod: 15,
    minTrendStrength: 0.0003,
    emaWindow: 15,
    trendConfidenceThreshold: 0.7,
  },
  
  reversal: {
    // Risk Management
    maxConsecutiveLosses: 3,
    dailyLossLimitPercent: 10,
    minWinRateThreshold: 60,
    autoPauseOnLossLimit: true,
    reduceStakeAfterLoss: true,
    stakeReductionPercent: 30,
    minTradesBeforeEvaluation: 10,
    
    // Reversal Specific
    overboughtThreshold: 0.08,
    oversoldThreshold: 0.08,
    reversalConfirmation: true,
    multiTimeframeAnalysis: true,
    shortWindow: 3,
    mediumWindow: 7,
    longWindow: 15,
  },
};

// Helper function to calculate volatility
export const calculateVolatility = (prices: number[]): number => {
  if (prices.length < 2) return 0;
  
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  
  return (stdDev / mean) * 100;
};

// Helper function to calculate simple moving average
export const calculateSMA = (prices: number[], period: number): number => {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  
  const relevantPrices = prices.slice(-period);
  return relevantPrices.reduce((a, b) => a + b, 0) / period;
};

// Helper function to calculate momentum
export const calculateMomentum = (prices: number[]): number => {
  if (prices.length < 2) return 0;
  
  const current = prices[prices.length - 1];
  const previous = prices[0];
  
  return ((current - previous) / previous) * 100;
};

// Helper function to detect consecutive direction
export const detectConsecutiveDirection = (prices: number[], count: number): 'up' | 'down' | 'none' => {
  if (prices.length < count + 1) return 'none';
  
  const recentPrices = prices.slice(-(count + 1));
  let isUp = true;
  let isDown = true;
  
  for (let i = 1; i < recentPrices.length; i++) {
    if (recentPrices[i] <= recentPrices[i - 1]) isUp = false;
    if (recentPrices[i] >= recentPrices[i - 1]) isDown = false;
  }
  
  if (isUp) return 'up';
  if (isDown) return 'down';
  return 'none';
};

// Helper function to calculate trend strength
export const calculateTrendStrength = (prices: number[], period: number): number => {
  if (prices.length < period) return 0;
  
  const recentPrices = prices.slice(-period);
  const firstPrice = recentPrices[0];
  const lastPrice = recentPrices[recentPrices.length - 1];
  
  // Calculate directional movement
  const totalMove = Math.abs(lastPrice - firstPrice);
  
  // Calculate volatility/noise
  let noise = 0;
  for (let i = 1; i < recentPrices.length; i++) {
    noise += Math.abs(recentPrices[i] - recentPrices[i - 1]);
  }
  
  // Trend strength is the ratio of directional movement to total movement
  return noise > 0 ? totalMove / noise : 0;
};

// Validation function for config
export const validateKyrosConfig = (config: Partial<KyrosConfig>): boolean => {
  // Add validation logic as needed
  return true;
};

// Storage keys
export const KYROS_CONFIG_STORAGE_KEY = 'kyros_strategy_config';

// Load config from localStorage
export const loadKyrosConfig = (): KyrosConfig => {
  try {
    const stored = localStorage.getItem(KYROS_CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_KYROS_CONFIG, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load Kyros config:', error);
  }
  return DEFAULT_KYROS_CONFIG;
};

// Save config to localStorage
export const saveKyrosConfig = (config: KyrosConfig): void => {
  try {
    localStorage.setItem(KYROS_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save Kyros config:', error);
  }
};
