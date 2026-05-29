import { useEffect, useRef, useMemo } from 'react';
import {
  createChart,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { TickData } from '@/lib/derivWebSocket';
import { buildTickCandles, getLastCandleStats } from '@/lib/tickCandleBuilder';

interface TickCandlestickChartProps {
  ticks: TickData[];
  symbol?: string;
  ticksPerCandle?: number;
  className?: string;
}

const TV_COLORS = {
  background: '#0a0e27',
  surface: '#0f1629',
  grid: '#1e2a4a',
  text: '#94a3b8',
  crosshair: '#475569',
  up: '#26a69a',
  down: '#ef5350',
  border: '#1e2a4a',
};

export function TickCandlestickChart({
  ticks,
  symbol = 'R_100',
  ticksPerCandle = 8,
  className = '',
}: TickCandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const candles = useMemo(
    () => buildTickCandles(ticks, ticksPerCandle),
    [ticks, ticksPerCandle]
  );

  const lastStats = useMemo(() => getLastCandleStats(candles), [candles]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: TV_COLORS.background },
        textColor: TV_COLORS.text,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: TV_COLORS.grid, style: 1, visible: true },
        horzLines: { color: TV_COLORS.grid, style: 1, visible: true },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: TV_COLORS.crosshair,
          width: 1,
          style: 2,
          labelBackgroundColor: TV_COLORS.surface,
        },
        horzLine: {
          color: TV_COLORS.crosshair,
          width: 1,
          style: 2,
          labelBackgroundColor: TV_COLORS.surface,
        },
      },
      rightPriceScale: {
        borderColor: TV_COLORS.border,
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor: TV_COLORS.border,
        timeVisible: true,
        secondsVisible: true,
        fixLeftEdge: false,
        fixRightEdge: false,
        rightOffset: 8,
        barSpacing: 10,
        minBarSpacing: 4,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: TV_COLORS.up,
      downColor: TV_COLORS.down,
      borderUpColor: TV_COLORS.up,
      borderDownColor: TV_COLORS.down,
      wickUpColor: TV_COLORS.up,
      wickDownColor: TV_COLORS.down,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry || !chartRef.current) return;
      const { width, height } = entry.contentRect;
      chartRef.current.applyOptions({ width, height });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    const data: CandlestickData<UTCTimestamp>[] = candles.map(c => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    seriesRef.current.setData(data);
    chartRef.current?.timeScale().scrollToRealTime();
  }, [candles]);

  return (
    <div className={`flex flex-col h-full min-h-0 ${className}`}>
      {/* TradingView-style toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[#1e2a4a] bg-[#0f1629] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm">{symbol}</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-[#0a0e27] px-2 py-0.5 rounded border border-[#1e2a4a]">
            Tick · {ticksPerCandle} ticks/bar
          </span>
        </div>
        {lastStats && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-slate-500">
              O <span className="text-slate-300">{lastStats.open.toFixed(2)}</span>
            </span>
            <span className="text-slate-500">
              H <span className="text-emerald-400">{lastStats.high.toFixed(2)}</span>
            </span>
            <span className="text-slate-500">
              L <span className="text-red-400">{lastStats.low.toFixed(2)}</span>
            </span>
            <span className="text-slate-500">
              C{' '}
              <span className={lastStats.bullish ? 'text-emerald-400' : 'text-red-400'}>
                {lastStats.close.toFixed(2)}
              </span>
            </span>
            <span className={lastStats.bullish ? 'text-emerald-400' : 'text-red-400'}>
              {lastStats.change >= 0 ? '+' : ''}
              {lastStats.change.toFixed(2)} ({lastStats.changePercent >= 0 ? '+' : ''}
              {lastStats.changePercent.toFixed(3)}%)
            </span>
          </div>
        )}
      </div>

      {/* Chart canvas */}
      <div ref={containerRef} className="flex-1 min-h-[240px] w-full" />

      {/* Footer legend */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#1e2a4a] bg-[#0f1629] text-[10px] text-slate-500 shrink-0">
        <span>{candles.length} bars · {ticks.length} ticks</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-[#26a69a]" /> Bullish
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-[#ef5350]" /> Bearish
          </span>
        </span>
      </div>
    </div>
  );
}

export default TickCandlestickChart;
