import { formatPct, formatUsd } from '../utils/format.ts'
import type { ComputedPosition, TradeAnalyticsSummary } from '../utils/tradeMath.ts'

interface AnalyticsPanelProps {
  analytics: TradeAnalyticsSummary
  positions: ComputedPosition[]
  hasMoreTrades: boolean
}

export function AnalyticsPanel({
  analytics,
  positions,
  hasMoreTrades,
}: AnalyticsPanelProps) {
  return (
    <div className="space-y-5">
      {/* Top Analytics KPI Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lighter-card p-4">
          <div className="text-[11px] text-[var(--color-meta)]">
            Closed Fill Win Rate
          </div>
          <div className="mt-1 font-mono-num text-[18px] font-semibold text-[var(--color-ink)]">
            {analytics.closedTradesCount > 0
              ? formatPct(analytics.winRatePct, false)
              : '—'}
          </div>
          <div className="mt-1 font-mono-num text-[11px] text-[var(--color-meta)]">
            {analytics.winningTrades}W / {analytics.losingTrades}L (
            {analytics.closedTradesCount} closing fills)
          </div>
        </div>

        <div className="lighter-card p-4">
          <div className="text-[11px] text-[var(--color-meta)]">
            Sampled Realized PnL
          </div>
          <div
            className={`mt-1 font-mono-num text-[18px] font-semibold ${
              analytics.realizedPnlSum >= 0
                ? 'text-[var(--color-up)]'
                : 'text-[var(--color-down)]'
            }`}
          >
            {formatUsd(analytics.realizedPnlSum, { showSign: true })}
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-faint)]">
            Across {analytics.loadedTradesCount} loaded fills
            {hasMoreTrades ? ' (load more for deeper)' : ''}
          </div>
        </div>

        <div className="lighter-card p-4">
          <div className="text-[11px] text-[var(--color-meta)]">
            Maker / Taker Split
          </div>
          <div className="mt-1 font-mono-num text-[18px] font-semibold text-[var(--color-ink)]">
            {analytics.makerPct.toFixed(1)}% Maker
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-fill)]">
            <div
              className="h-full bg-[#d2f2ff]"
              style={{ width: `${Math.min(100, analytics.makerPct)}%` }}
            />
          </div>
        </div>

        <div className="lighter-card p-4">
          <div className="text-[11px] text-[var(--color-meta)]">
            Best / Worst Fill PnL
          </div>
          <div className="mt-1 font-mono-num text-[13px] font-semibold text-[var(--color-up)]">
            {analytics.bestTradePnl > 0
              ? formatUsd(analytics.bestTradePnl, { showSign: true })
              : '—'}
          </div>
          <div className="mt-0.5 font-mono-num text-[13px] font-semibold text-[var(--color-down)]">
            {analytics.worstTradePnl < 0
              ? formatUsd(analytics.worstTradePnl, { showSign: true })
              : '—'}
          </div>
        </div>

        <div className="lighter-card p-4">
          <div className="text-[11px] text-[var(--color-meta)]">
            Estimated Fees Paid
          </div>
          <div className="mt-1 font-mono-num text-[18px] font-semibold text-[var(--color-ink)]">
            {formatUsd(analytics.feesPaidSum)}
          </div>
          <div className="mt-1 font-mono-num text-[11px] text-[var(--color-meta)]">
            Vol: {formatUsd(analytics.loadedVolumeUsd, { compact: true })}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Per-Market Execution Breakdown */}
        <div className="lighter-card lg:col-span-8 overflow-hidden">
          <div className="border-b border-[var(--color-line)] px-4 py-3">
            <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">
              Per-Market Volume &amp; PnL Breakdown (Loaded Fills)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-[11px] font-medium text-[var(--color-meta)]">
                  <th className="px-4 py-2.5">Market</th>
                  <th className="px-3 py-2.5 text-right">Fills</th>
                  <th className="px-3 py-2.5 text-right">Volume</th>
                  <th className="px-3 py-2.5 text-right">Maker %</th>
                  <th className="px-3 py-2.5 text-right">Win / Loss</th>
                  <th className="px-4 py-2.5 text-right">Realized PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)] text-[12px]">
                {analytics.byMarket.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-[var(--color-meta)]"
                    >
                      No trade fills loaded yet.
                    </td>
                  </tr>
                ) : (
                  analytics.byMarket.map((row) => {
                    const makerRatio =
                      row.tradesCount > 0
                        ? (row.makerCount / row.tradesCount) * 100
                        : 0
                    return (
                      <tr
                        key={row.marketId}
                        className="hover:bg-[var(--color-fill)] transition-colors"
                      >
                        <td className="px-4 py-2.5 font-semibold text-[var(--color-ink)]">
                          {row.symbol}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-num text-[var(--color-dim)]">
                          {row.tradesCount}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-num text-[var(--color-ink)]">
                          {formatUsd(row.volumeUsd, { compact: true })}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-num text-[var(--color-meta)]">
                          {makerRatio.toFixed(0)}%
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-num text-[var(--color-dim)]">
                          {row.wins + row.losses > 0
                            ? `${row.wins} / ${row.losses}`
                            : '—'}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right font-mono-num font-medium ${
                            row.realizedPnl > 0
                              ? 'text-[var(--color-up)]'
                              : row.realizedPnl < 0
                                ? 'text-[var(--color-down)]'
                                : 'text-[var(--color-meta)]'
                          }`}
                        >
                          {row.realizedPnl !== 0
                            ? formatUsd(row.realizedPnl, { showSign: true })
                            : '$0.00'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Open Position Concentration & Funding */}
        <div className="lighter-card lg:col-span-4 overflow-hidden self-start">
          <div className="border-b border-[var(--color-line)] px-4 py-3">
            <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">
              Open Exposure Allocation
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {positions.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[var(--color-meta)]">
                No open exposure.
              </div>
            ) : (
              (() => {
                const total = positions.reduce((s, p) => s + p.notionalUsd, 0) || 1
                return positions.slice(0, 8).map((p) => {
                  const share = (p.notionalUsd / total) * 100
                  return (
                    <div key={p.marketId} className="space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[var(--color-ink)]">
                            {p.symbol}
                          </span>
                          <span
                            className={`text-[10px] font-semibold ${
                              p.side === 'LONG'
                                ? 'text-[var(--color-up)]'
                                : 'text-[var(--color-down)]'
                            }`}
                          >
                            {p.side}
                          </span>
                        </div>
                        <span className="font-mono-num text-[var(--color-dim)]">
                          {formatUsd(p.notionalUsd, { compact: true })} ({share.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-fill)]">
                        <div
                          className={
                            p.side === 'LONG'
                              ? 'h-full bg-[var(--color-up)]'
                              : 'h-full bg-[var(--color-down)]'
                          }
                          style={{ width: `${Math.min(100, share)}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              })()
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
