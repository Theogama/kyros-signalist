import type { TickData } from '@/lib/derivWebSocket';

export interface TickCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Build OHLC candles from raw ticks (N ticks per bar). */
export function buildTickCandles(ticks: TickData[], ticksPerCandle = 8): TickCandle[] {
  if (ticks.length === 0) return [];

  const candles: TickCandle[] = [];
  const baseEpoch = ticks[0].epoch;

  for (let i = 0; i < ticks.length; i += ticksPerCandle) {
    const chunk = ticks.slice(i, i + ticksPerCandle);
    const quotes = chunk.map(t => t.quote);
    if (quotes.length === 0) continue;

    candles.push({
      time: baseEpoch + Math.floor(i / ticksPerCandle),
      open: quotes[0],
      high: Math.max(...quotes),
      low: Math.min(...quotes),
      close: quotes[quotes.length - 1],
    });
  }

  return candles;
}

export function getLastCandleStats(candles: TickCandle[]) {
  const last = candles[candles.length - 1];
  if (!last) return null;

  const change = last.close - last.open;
  const changePercent = last.open !== 0 ? (change / last.open) * 100 : 0;
  const bullish = last.close >= last.open;

  return { ...last, change, changePercent, bullish };
}
