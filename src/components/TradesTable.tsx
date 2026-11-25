import { Download, ExternalLink, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NETWORKS, type NetworkId } from '../config/networks.ts'
import {
  formatExactTime,
  formatPrice,
  formatRelativeTime,
  formatSize,
  formatUsd,
  shortenAddress,
} from '../utils/format.ts'
import { exportTradesCsv, type ResolvedTrade } from '../utils/tradeMath.ts'

interface TradesTableProps {
  network: NetworkId
  accountIndex: number
  trades: ResolvedTrade[]
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  liveTradeIds: Set<number>
}

export function TradesTable({
  network,
  accountIndex,
  trades,
  hasMore,
  loadingMore,
  onLoadMore,
  liveTradeIds,
}: TradesTableProps) {
  const [marketFilter, setMarketFilter] = useState('ALL')
  const [sideFilter, setSideFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'MAKER' | 'TAKER'>('ALL')

  const netCfg = NETWORKS[network]

  const marketOptions = useMemo(() => {
    const set = new Set<string>()
    for (const t of trades) {
      if (t.trade.market_symbol) set.add(t.trade.market_symbol)
    }
    return Array.from(set).sort()
  }, [trades])

  const filtered = useMemo(() => {
    return trades.filter((r) => {
      if (marketFilter !== 'ALL' && r.trade.market_symbol !== marketFilter) return false
      if (sideFilter !== 'ALL' && r.side !== sideFilter) return false
      if (roleFilter !== 'ALL' && r.role !== roleFilter) return false
      return true
    })
  }, [trades, marketFilter, sideFilter, roleFilter])

  return (
    <div className="lighter-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">
            Trade History &amp; Live Fills
          </h3>
          <span className="rounded bg-[var(--color-fill)] px-1.5 py-0.5 font-mono-num text-[11px] text-[var(--color-dim)]">
            {filtered.length}
            {hasMore ? '+' : ''}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value)}
            className="h-7.5 rounded-md border border-[var(--color-line)] bg-[#06060c] px-2 text-[11.5px] text-[var(--color-ink)] focus:outline-none"
          >
            <option value="ALL">All Markets</option>
            {marketOptions.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>

          <select
            value={sideFilter}
            onChange={(e) => setSideFilter(e.target.value as 'ALL' | 'BUY' | 'SELL')}
            className="h-7.5 rounded-md border border-[var(--color-line)] bg-[#06060c] px-2 text-[11.5px] text-[var(--color-ink)] focus:outline-none"
          >
            <option value="ALL">All Sides</option>
            <option value="BUY">Buy / Long</option>
            <option value="SELL">Sell / Short</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'ALL' | 'MAKER' | 'TAKER')}
            className="h-7.5 rounded-md border border-[var(--color-line)] bg-[#06060c] px-2 text-[11.5px] text-[var(--color-ink)] focus:outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="MAKER">Maker</option>
            <option value="TAKER">Taker</option>
          </select>

          <button
            type="button"
            onClick={() => exportTradesCsv(filtered, accountIndex, netCfg.shortLabel)}
            disabled={filtered.length === 0}
            className="inline-flex h-7.5 items-center gap-1.5 rounded-md border border-[var(--color-line)] bg-[var(--color-fill)] px-2.5 text-[11.5px] text-[var(--color-dim)] hover:bg-[var(--color-fill-hover)] hover:text-[var(--color-ink)] disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Download className="h-3 w-3" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-line)] text-[11px] font-medium text-[var(--color-meta)]">
              <th className="px-4 py-2.5">Time</th>
              <th className="px-3 py-2.5">Market</th>
              <th className="px-3 py-2.5">Side</th>
              <th className="px-3 py-2.5">Role</th>
              <th className="px-3 py-2.5 text-right">Size</th>
              <th className="px-3 py-2.5 text-right">Price</th>
              <th className="px-3 py-2.5 text-right">Notional</th>
              <th className="px-3 py-2.5 text-right">Realized PnL</th>
              <th className="px-3 py-2.5 text-right">Fee</th>
              <th className="px-4 py-2.5 text-right">Tx</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line)] text-[12px]">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-10 text-center text-[var(--color-meta)]"
                >
                  No executed trades found for this filter.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const { trade } = r
                const isLive = liveTradeIds.has(trade.trade_id)
                const showPnl = r.hasRealizedPnl && Math.abs(r.realizedPnl) > 1e-8
                return (
                  <tr
                    key={`${trade.trade_id}-${trade.tx_hash}`}
                    className={`hover:bg-[var(--color-fill)] transition-colors ${
                      isLive ? 'animate-trade-flash' : ''
                    }`}
                  >
                    <td
                      className="px-4 py-2.5 font-mono-num text-[11.5px] text-[var(--color-dim)] whitespace-nowrap"
                      title={formatExactTime(trade.timestamp)}
                    >
                      {formatRelativeTime(trade.timestamp)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[var(--color-ink)]">
                          {trade.market_symbol || `#${trade.market_id}`}
                        </span>
                        <span className="text-[10px] uppercase text-[var(--color-faint)]">
                          {trade.market_kind}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono-num text-[10px] font-semibold ${
                          r.side === 'BUY'
                            ? 'bg-[var(--color-up)]/15 text-[var(--color-up)]'
                            : r.side === 'SELL'
                              ? 'bg-[var(--color-down)]/15 text-[var(--color-down)]'
                              : 'bg-[var(--color-fill)] text-[var(--color-dim)]'
                        }`}
                      >
                        {r.side}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono-num text-[10px] ${
                          r.role === 'MAKER'
                            ? 'bg-[#d2f2ff]/10 text-[#d2f2ff]'
                            : 'bg-[var(--color-fill)] text-[var(--color-meta)]'
                        }`}
                      >
                        {r.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono-num text-[var(--color-ink)]">
                      {formatSize(r.size)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono-num text-[var(--color-dim)]">
                      {formatPrice(r.price)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono-num text-[var(--color-ink)]">
                      {formatUsd(r.usdAmount)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono-num font-medium ${
                        showPnl
                          ? r.realizedPnl >= 0
                            ? 'text-[var(--color-up)]'
                            : 'text-[var(--color-down)]'
                          : 'text-[var(--color-faint)]'
                      }`}
                    >
                      {showPnl
                        ? formatUsd(r.realizedPnl, { showSign: true })
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono-num text-[11.5px] text-[var(--color-meta)]">
                      {r.feeUsd > 0 ? formatUsd(r.feeUsd, { decimals: 4 }) : '$0.00'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <a
                        href={`${netCfg.explorerWebUrl}/logs/${trade.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono-num text-[11px] text-[var(--color-link)] hover:underline"
                        title={`Block #${trade.block_height} · ${trade.tx_hash}`}
                      >
                        {shortenAddress(trade.tx_hash, 6, 4)}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="border-t border-[var(--color-line)] px-4 py-3 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-fill)] px-4 py-1.5 text-[12px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-fill-hover)] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{loadingMore ? 'Loading older fills...' : 'Load Older Trades'}</span>
          </button>
        </div>
      )}
    </div>
  )
}
