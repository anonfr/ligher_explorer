import { useMemo, useState } from 'react'
import type { PnlPoint, PnlTimeframe } from '../types/lighter.ts'
import { formatUsd } from '../utils/format.ts'

interface PnlChartProps {
  points: PnlPoint[]
  timeframe: PnlTimeframe
  onTimeframeChange: (tf: PnlTimeframe) => void
  loading: boolean
}

type ChartMode = 'cumulative_pnl' | 'bucket_pnl' | 'volume'

const TIMEFRAMES: PnlTimeframe[] = ['24H', '7D', '30D', 'ALL']

export function PnlChart({
  points,
  timeframe,
  onTimeframeChange,
  loading,
}: PnlChartProps) {
  const [mode, setMode] = useState<ChartMode>('cumulative_pnl')
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const processed = useMemo(() => {
    if (points.length === 0) return []
    const basePnl = points[0].trade_pnl + points[0].trade_spot_pnl + points[0].pool_pnl

    return points.map((pt, idx) => {
      const totalCumPnl = pt.trade_pnl + pt.trade_spot_pnl + pt.pool_pnl
      const prev = idx > 0 ? points[idx - 1] : pt
      const prevCumPnl = prev.trade_pnl + prev.trade_spot_pnl + prev.pool_pnl
      const periodCumPnl =
        timeframe === 'ALL' ? totalCumPnl : totalCumPnl - basePnl
      const bucketPnl = idx === 0 ? 0 : totalCumPnl - prevCumPnl
      return {
        ...pt,
        totalCumPnl,
        periodCumPnl,
        bucketPnl,
      }
    })
  }, [points, timeframe])

  const summary = useMemo(() => {
    if (processed.length === 0) {
      return {
        periodPnl: 0,
        allTimePnl: 0,
        totalVolume: 0,
        netInflow: 0,
      }
    }
    const last = processed[processed.length - 1]
    const totalVolume = processed.reduce((s, p) => s + (p.volume || 0), 0)
    return {
      periodPnl: last.periodCumPnl,
      allTimePnl: last.totalCumPnl,
      totalVolume,
      netInflow: (last.inflow || 0) - (last.outflow || 0),
    }
  }, [processed])

  // SVG layout dimensions
  const width = 760
  const height = 220
  const padL = 12
  const padR = 12
  const padT = 16
  const padB = 22
  const innerW = width - padL - padR
  const innerH = height - padT - padB

  const values = processed.map((p) =>
    mode === 'cumulative_pnl'
      ? p.periodCumPnl
      : mode === 'bucket_pnl'
        ? p.bucketPnl
        : p.volume,
  )

  const minVal =
    values.length > 0
      ? mode === 'volume'
        ? 0
        : Math.min(0, ...values)
      : 0
  const maxVal =
    values.length > 0 ? Math.max(mode === 'volume' ? 1 : 0, ...values) : 1
  const span = maxVal - minVal || 1

  const toX = (i: number) =>
    processed.length <= 1
      ? padL + innerW / 2
      : padL + (i / (processed.length - 1)) * innerW
  const toY = (v: number) => padT + innerH - ((v - minVal) / span) * innerH
  const zeroY = toY(0)

  const linePath =
    processed.length > 1
      ? processed
          .map((_, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(values[i]).toFixed(1)}`)
          .join(' ')
      : ''

  const areaPath =
    processed.length > 1
      ? `${linePath} L ${toX(processed.length - 1).toFixed(1)} ${zeroY.toFixed(1)} L ${toX(0).toFixed(1)} ${zeroY.toFixed(1)} Z`
      : ''

  const lastValue = values[values.length - 1] ?? 0
  const isPositive = mode === 'volume' ? true : lastValue >= 0
  const strokeColor =
    mode === 'volume'
      ? '#d2f2ff'
      : isPositive
        ? 'oklch(82.8% 0.186 159)'
        : 'oklch(66% 0.19 19)'

  const hovered = hoverIdx !== null ? processed[hoverIdx] : null

  const formatBucketTime = (sec: number) => {
    const d = new Date(sec * 1000)
    if (timeframe === '24H' || timeframe === '7D') {
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    })
  }

  return (
    <div className="lighter-card flex flex-col justify-between p-4 sm:p-5">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-[var(--color-meta)]">
              {mode === 'cumulative_pnl'
                ? `${timeframe} PnL Curve`
                : mode === 'bucket_pnl'
                  ? `${timeframe} Period Delta PnL`
                  : `${timeframe} Trading Volume`}
            </span>
            {loading && (
              <span className="text-[11px] text-[var(--color-faint)]">Updating...</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <span
              className={`font-mono-num text-xl font-semibold ${
                mode === 'volume'
                  ? 'text-[var(--color-ink)]'
                  : summary.periodPnl >= 0
                    ? 'text-[var(--color-up)]'
                    : 'text-[var(--color-down)]'
              }`}
            >
              {mode === 'volume'
                ? formatUsd(summary.totalVolume, { compact: true })
                : formatUsd(summary.periodPnl, { showSign: true })}
            </span>
            <span className="font-mono-num text-[11.5px] text-[var(--color-meta)]">
              All-time PnL:{' '}
              <span
                className={
                  summary.allTimePnl >= 0
                    ? 'text-[var(--color-up)]'
                    : 'text-[var(--color-down)]'
                }
              >
                {formatUsd(summary.allTimePnl, { showSign: true })}
              </span>
            </span>
            <span className="font-mono-num text-[11.5px] text-[var(--color-meta)]">
              Net Flow: {formatUsd(summary.netInflow, { compact: true, showSign: true })}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Mode Tabs */}
          <div className="flex items-center rounded-lg bg-[var(--color-bg)] p-0.5 border border-[var(--color-line)]">
            {(
              [
                ['cumulative_pnl', 'PnL'],
                ['bucket_pnl', 'Delta'],
                ['volume', 'Volume'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`rounded-[6px] px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                  mode === id
                    ? 'bg-[var(--color-elevated)] text-[var(--color-ink)]'
                    : 'text-[var(--color-meta)] hover:text-[var(--color-ink)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Timeframe Tabs */}
          <div className="flex items-center rounded-lg bg-[var(--color-bg)] p-0.5 border border-[var(--color-line)]">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => onTimeframeChange(tf)}
                className={`rounded-[6px] px-2.5 py-1 font-mono-num text-[11px] font-medium transition-colors cursor-pointer ${
                  timeframe === tf
                    ? 'bg-[var(--color-elevated)] text-[var(--color-ink)]'
                    : 'text-[var(--color-meta)] hover:text-[var(--color-ink)]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative mt-4 h-[220px] w-full select-none">
        {processed.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[var(--color-line)] text-[12px] text-[var(--color-meta)]">
            {loading ? 'Loading PnL history...' : 'No historical PnL data for this timeframe'}
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
              className="h-full w-full overflow-visible"
              onMouseLeave={() => setHoverIdx(null)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const relX = ((e.clientX - rect.left) / rect.width) * width
                const ratio = Math.max(0, Math.min(1, (relX - padL) / innerW))
                const idx = Math.round(ratio * (processed.length - 1))
                setHoverIdx(idx)
              }}
            >
              <defs>
                <linearGradient id="pnlAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Zero baseline */}
              {mode !== 'volume' && (
                <line
                  x1={padL}
                  y1={zeroY}
                  x2={width - padR}
                  y2={zeroY}
                  stroke="rgba(255,255,255,0.12)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
              )}

              {mode === 'cumulative_pnl' ? (
                <>
                  <path d={areaPath} fill="url(#pnlAreaGrad)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              ) : (
                processed.map((pt, i) => {
                  const val = mode === 'volume' ? pt.volume : pt.bucketPnl
                  const barW = Math.max(2, (innerW / processed.length) * 0.68)
                  const x = toX(i) - barW / 2
                  const yVal = toY(val)
                  const barY = Math.min(yVal, zeroY)
                  const barH = Math.max(1.5, Math.abs(zeroY - yVal))
                  const fill =
                    mode === 'volume'
                      ? 'rgba(210, 242, 255, 0.72)'
                      : val >= 0
                        ? 'oklch(82.8% 0.186 159 / 0.8)'
                        : 'oklch(66% 0.19 19 / 0.8)'
                  return (
                    <rect
                      key={pt.timestamp}
                      x={x}
                      y={barY}
                      width={barW}
                      height={barH}
                      rx={1.5}
                      fill={fill}
                      opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.45}
                    />
                  )
                })
              )}

              {/* Hover Crosshair */}
              {hoverIdx !== null && processed[hoverIdx] && (
                <g>
                  <line
                    x1={toX(hoverIdx)}
                    y1={padT}
                    x2={toX(hoverIdx)}
                    y2={height - padB}
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  {mode === 'cumulative_pnl' && (
                    <circle
                      cx={toX(hoverIdx)}
                      cy={toY(values[hoverIdx])}
                      r="4"
                      fill={strokeColor}
                      stroke="#06060c"
                      strokeWidth="2"
                    />
                  )}
                </g>
              )}
            </svg>

            {/* Bottom Timestamp Range Labels */}
            <div className="pointer-events-none absolute bottom-0 left-3 right-3 flex justify-between font-mono-num text-[10px] text-[var(--color-faint)]">
              <span>{formatBucketTime(processed[0].timestamp)}</span>
              <span>
                {formatBucketTime(
                  processed[Math.floor(processed.length / 2)].timestamp,
                )}
              </span>
              <span>{formatBucketTime(processed[processed.length - 1].timestamp)}</span>
            </div>

            {/* Interactive Hover Tooltip */}
            {hovered && hoverIdx !== null && (
              <div
                className="pointer-events-none absolute top-2 z-20 rounded-lg border border-[var(--color-line-strong)] bg-[#0b0b14]/95 px-3 py-2 shadow-xl backdrop-blur-md"
                style={{
                  left:
                    hoverIdx > processed.length * 0.6
                      ? 'auto'
                      : `${Math.min(72, (hoverIdx / Math.max(1, processed.length - 1)) * 100)}%`,
                  right:
                    hoverIdx > processed.length * 0.6 ? '8px' : 'auto',
                }}
              >
                <div className="font-mono-num text-[10px] text-[var(--color-meta)]">
                  {formatBucketTime(hovered.timestamp)}
                </div>
                <div className="mt-1 space-y-0.5 font-mono-num text-[11.5px]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[var(--color-meta)]">Period PnL</span>
                    <span
                      className={
                        hovered.periodCumPnl >= 0
                          ? 'text-[var(--color-up)]'
                          : 'text-[var(--color-down)]'
                      }
                    >
                      {formatUsd(hovered.periodCumPnl, { showSign: true })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[var(--color-meta)]">Delta</span>
                    <span
                      className={
                        hovered.bucketPnl >= 0
                          ? 'text-[var(--color-up)]'
                          : 'text-[var(--color-down)]'
                      }
                    >
                      {formatUsd(hovered.bucketPnl, { showSign: true })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[var(--color-meta)]">Volume</span>
                    <span className="text-[var(--color-ink)]">
                      {formatUsd(hovered.volume, { compact: true })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
