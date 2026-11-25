import { Activity, ArrowUpRight, Bookmark, Layers, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { NETWORKS, type NetworkId } from '../config/networks.ts'
import type {
  ActiveTraderSample,
  ExplorerTotals,
  LighterMarket,
  WatchlistEntry,
  WsMarketStat,
} from '../types/lighter.ts'
import {
  formatInt,
  formatPct,
  formatPrice,
  formatRelativeTime,
  formatUsd,
  shortenAddress,
  toNum,
} from '../utils/format.ts'

interface LandingViewProps {
  network: NetworkId
  totals: ExplorerTotals | null
  markets: LighterMarket[]
  liveStats: Record<string, WsMarketStat>
  activeTraders: ActiveTraderSample[]
  loadingTraders: boolean
  onRefreshTraders: () => void
  onSelectAddress: (query: string, targetNetwork?: NetworkId) => void
  watchlist: WatchlistEntry[]
}

export function LandingView({
  network,
  totals,
  markets,
  liveStats,
  activeTraders,
  loadingTraders,
  onRefreshTraders,
  onSelectAddress,
  watchlist,
}: LandingViewProps) {
  const [heroInput, setHeroInput] = useState('')
  const netCfg = NETWORKS[network]

  const handleHeroSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (heroInput.trim()) {
      onSelectAddress(heroInput.trim())
    }
  }

  const topMarkets = markets.slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Hero Lookup Panel */}
      <section className="lighter-card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(31,209,143,0.08),transparent_55%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-fill)] px-3 py-1 text-[11px] font-medium text-[var(--color-dim)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-up)]" />
              <span>{netCfg.label}</span>
              <span className="text-[var(--color-faint)]">•</span>
              <span className="font-mono-num text-[var(--color-meta)]">
                Chain {netCfg.chainId}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-[26px]">
              Track Any Lighter &amp; Lighter RH Trader by Address
            </h1>
            <p className="text-[13px] text-[var(--color-meta)] leading-relaxed">
              Inspect live positions, margin usage, cumulative &amp; daily PnL, real-time fill
              tape, and ZK-rollup account logs for any L1 Ethereum address or Lighter account
              index across Mainnet and Robinhood Chain.
            </p>

            <form onSubmit={handleHeroSubmit} className="pt-2 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-meta)]" />
                <input
                  type="text"
                  value={heroInput}
                  onChange={(e) => setHeroInput(e.target.value)}
                  placeholder="Paste L1 wallet (0x...) or Account Index (e.g. 702384)"
                  className="h-10 w-full rounded-lg border border-[var(--color-line-strong)] bg-[#06060c]/80 pl-10 pr-4 font-mono-num text-[12.5px] text-[var(--color-ink)] placeholder:font-sans placeholder:text-[var(--color-faint)] focus:border-[var(--color-up)]/60 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!heroInput.trim()}
                className="h-10 rounded-lg bg-[var(--color-up)] px-5 text-[13px] font-semibold text-[#06060c] hover:bg-[var(--color-up-bright)] disabled:opacity-40 transition-colors cursor-pointer"
              >
                Inspect Address
              </button>
            </form>
          </div>

          {/* Network Explorer Telemetry Strip (from explorer.elliot.ai / explorerapi.rh) */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2 lg:min-w-[340px]">
            <div className="lighter-card-2 p-3.5">
              <div className="text-[11px] text-[var(--color-meta)]">Blocks</div>
              <div className="mt-1 font-mono-num text-[16px] font-semibold text-[var(--color-ink)]">
                {totals ? formatInt(totals.blocks) : '—'}
              </div>
            </div>
            <div className="lighter-card-2 p-3.5">
              <div className="text-[11px] text-[var(--color-meta)]">ZK Batches</div>
              <div className="mt-1 font-mono-num text-[16px] font-semibold text-[var(--color-ink)]">
                {totals ? formatInt(totals.batches) : '—'}
              </div>
            </div>
            <div className="lighter-card-2 p-3.5">
              <div className="text-[11px] text-[var(--color-meta)]">Accounts</div>
              <div className="mt-1 font-mono-num text-[16px] font-semibold text-[var(--color-ink)]">
                {totals ? formatInt(totals.accounts) : '—'}
              </div>
            </div>
            <div className="lighter-card-2 p-3.5">
              <div className="text-[11px] text-[var(--color-meta)]">Total Txs</div>
              <div className="mt-1 font-mono-num text-[16px] font-semibold text-[var(--color-ink)]">
                {totals
                  ? totals.txs >= 1_000_000_000
                    ? `${(totals.txs / 1_000_000_000).toFixed(2)}B`
                    : `${(totals.txs / 1_000_000).toFixed(1)}M`
                  : '—'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Saved Watchlist (if any) */}
      {watchlist.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[var(--color-meta)]">
            <Bookmark className="h-3.5 w-3.5 text-[var(--color-up)]" />
            <span>Saved Tracked Addresses</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {watchlist.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelectAddress(entry.address, entry.network)}
                className="lighter-card flex items-center justify-between p-3.5 text-left hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-[var(--color-ink)]">
                      {entry.label || shortenAddress(entry.address)}
                    </span>
                    <span className="rounded bg-[var(--color-fill)] px-1.5 py-0.5 text-[10px] text-[var(--color-dim)] border border-[var(--color-line)]">
                      {NETWORKS[entry.network].shortLabel}
                    </span>
                  </div>
                  <div className="mt-0.5 font-mono-num text-[11px] text-[var(--color-meta)]">
                    {shortenAddress(entry.address, 8, 6)}
                    {entry.accountIndex ? ` · #${entry.accountIndex}` : ''}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--color-meta)]" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Two-Column Discovery: Live Active Traders + Top Markets */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Live Active Traders */}
        <section className="lighter-card lg:col-span-5 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--color-up)]" />
              <h2 className="text-[13px] font-semibold text-[var(--color-ink)]">
                Live Active Traders ({netCfg.shortLabel})
              </h2>
            </div>
            <button
              type="button"
              onClick={onRefreshTraders}
              disabled={loadingTraders}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[var(--color-meta)] hover:bg-[var(--color-fill)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${loadingTraders ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
          <div className="divide-y divide-[var(--color-line)]">
            {activeTraders.length === 0 ? (
              <div className="p-6 text-center text-[12px] text-[var(--color-meta)]">
                {loadingTraders
                  ? 'Discovering active addresses from live tape...'
                  : 'No recent public trader addresses discovered yet.'}
              </div>
            ) : (
              activeTraders.map((trader) => (
                <button
                  key={`${trader.accountIndex}-${trader.timestamp}`}
                  type="button"
                  onClick={() =>
                    onSelectAddress(trader.l1Address || String(trader.accountIndex))
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[var(--color-fill)] transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num text-[12.5px] font-medium text-[var(--color-link)]">
                        {trader.l1Address
                          ? shortenAddress(trader.l1Address, 8, 6)
                          : `#${trader.accountIndex}`}
                      </span>
                      <span className="rounded bg-[var(--color-fill)] px-1.5 py-0.5 font-mono-num text-[10px] text-[var(--color-meta)]">
                        #{trader.accountIndex}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--color-meta)]">
                      <span
                        className={
                          trader.side === 'BUY'
                            ? 'text-[var(--color-up)]'
                            : 'text-[var(--color-down)]'
                        }
                      >
                        {trader.side}
                      </span>
                      <span>{trader.marketSymbol}</span>
                      <span>·</span>
                      <span className="font-mono-num">
                        {formatUsd(trader.lastUsd)}
                      </span>
                      <span>·</span>
                      <span>{formatRelativeTime(trader.timestamp)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-3">
                    {trader.collateral && (
                      <div className="font-mono-num text-[12px] font-medium text-[var(--color-ink)]">
                        {formatUsd(toNum(trader.collateral), { compact: true })}
                      </div>
                    )}
                    <div className="text-[10px] text-[var(--color-faint)]">Equity</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Top Markets by 24h Volume */}
        <section className="lighter-card lg:col-span-7 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[var(--color-dim)]" />
              <h2 className="text-[13px] font-semibold text-[var(--color-ink)]">
                Top {netCfg.shortLabel} Markets (24h Volume)
              </h2>
            </div>
            <span className="font-mono-num text-[11px] text-[var(--color-meta)]">
              {markets.length} markets
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-[11px] font-medium text-[var(--color-meta)]">
                  <th className="px-4 py-2.5">Market</th>
                  <th className="px-3 py-2.5 text-right">Mark Price</th>
                  <th className="px-3 py-2.5 text-right">24h Change</th>
                  <th className="px-3 py-2.5 text-right">24h Volume</th>
                  <th className="px-4 py-2.5 text-right">Open Interest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)] text-[12px]">
                {topMarkets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-[var(--color-meta)]"
                    >
                      Loading market prices...
                    </td>
                  </tr>
                ) : (
                  topMarkets.map((m) => {
                    const live = liveStats[String(m.market_id)]
                    const mark =
                      toNum(live?.mark_price) ||
                      toNum(m.mark_price) ||
                      toNum(m.last_trade_price)
                    const chg = m.daily_price_change ?? 0
                    const oi = toNum(live?.open_interest_usd ?? m.open_interest_usd)
                    return (
                      <tr
                        key={m.market_id}
                        className="hover:bg-[var(--color-fill)] transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[var(--color-ink)]">
                              {m.symbol}
                            </span>
                            <span className="rounded bg-[var(--color-fill)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--color-meta)] border border-[var(--color-line)]">
                              {m.market_type}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-num text-[var(--color-ink)]">
                          {formatPrice(mark, m.price_decimals)}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right font-mono-num ${
                            chg > 0
                              ? 'text-[var(--color-up)]'
                              : chg < 0
                                ? 'text-[var(--color-down)]'
                                : 'text-[var(--color-meta)]'
                          }`}
                        >
                          {formatPct(chg)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-num text-[var(--color-dim)]">
                          {formatUsd(m.daily_quote_token_volume ?? 0, { compact: true })}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono-num text-[var(--color-dim)]">
                          {oi > 0 ? formatUsd(oi, { compact: true }) : '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
