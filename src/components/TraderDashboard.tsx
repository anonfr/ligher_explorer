import {
  ArrowLeft,
  ArrowRightLeft,
  Bookmark,
  BookmarkCheck,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { useState } from 'react'
import { NETWORKS, type NetworkId } from '../config/networks.ts'
import type {
  ExplorerLog,
  LighterAccount,
  LighterAssetDetail,
  LighterMarket,
  PnlPoint,
  PnlTimeframe,
  WsAccountVolumeStats,
} from '../types/lighter.ts'
import { formatInt, formatUsd, shortenAddress } from '../utils/format.ts'
import type {
  ComputedPosition,
  ResolvedTrade,
  TradeAnalyticsSummary,
  TraderSummaryStats,
} from '../utils/tradeMath.ts'
import { AnalyticsPanel } from './AnalyticsPanel.tsx'
import { AssetsAndLogs } from './AssetsAndLogs.tsx'
import { PnlChart } from './PnlChart.tsx'
import { PositionsTable } from './PositionsTable.tsx'
import { TradesTable } from './TradesTable.tsx'

export type DashboardTab = 'positions' | 'trades' | 'analytics' | 'assets'

interface TraderDashboardProps {
  network: NetworkId
  accounts: LighterAccount[]
  activeAccount: LighterAccount
  onSelectSubAccount: (index: number) => void
  crossNetworkInfo: {
    targetNetwork: NetworkId
    hasAccount: boolean
    totalAssetValue: number
  } | null
  onSwitchToCrossNetwork: () => void
  onBackHome: () => void
  onRefresh: () => void
  refreshing: boolean
  isWatchlisted: boolean
  onToggleWatchlist: () => void
  summary: TraderSummaryStats
  volumeStats: WsAccountVolumeStats
  positions: ComputedPosition[]
  trades: ResolvedTrade[]
  hasMoreTrades: boolean
  loadingMoreTrades: boolean
  onLoadMoreTrades: () => void
  liveTradeIds: Set<number>
  pnlPoints: PnlPoint[]
  pnlTimeframe: PnlTimeframe
  onPnlTimeframeChange: (tf: PnlTimeframe) => void
  loadingPnl: boolean
  analytics: TradeAnalyticsSummary
  assetsBySymbol: Record<string, LighterAssetDetail>
  marketsById: Record<number, LighterMarket>
  logs: ExplorerLog[]
  loadingLogs: boolean
  hasMoreLogs: boolean
  onLoadMoreLogs: () => void
}

export function TraderDashboard({
  network,
  accounts,
  activeAccount,
  onSelectSubAccount,
  crossNetworkInfo,
  onSwitchToCrossNetwork,
  onBackHome,
  onRefresh,
  refreshing,
  isWatchlisted,
  onToggleWatchlist,
  summary,
  volumeStats,
  positions,
  trades,
  hasMoreTrades,
  loadingMoreTrades,
  onLoadMoreTrades,
  liveTradeIds,
  pnlPoints,
  pnlTimeframe,
  onPnlTimeframeChange,
  loadingPnl,
  analytics,
  assetsBySymbol,
  marketsById,
  logs,
  loadingLogs,
  hasMoreLogs,
  onLoadMoreLogs,
}: TraderDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('positions')
  const [copied, setCopied] = useState(false)

  const netCfg = NETWORKS[network]
  const hasRealL1 =
    activeAccount.l1_address &&
    activeAccount.l1_address !== '0x0000000000000000000000000000000000000000'

  const copyAddress = async () => {
    const val = hasRealL1 ? activeAccount.l1_address : String(activeAccount.index)
    try {
      await navigator.clipboard.writeText(val)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // ignore clipboard restrictions
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Trader Identity Header */}
      <div className="lighter-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onBackHome}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--color-line)] bg-[var(--color-fill)] px-2 py-1 text-[11.5px] text-[var(--color-dim)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Explorer</span>
              </button>

              <span className="rounded-md bg-[var(--color-fill)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-dim)] border border-[var(--color-line)]">
                {netCfg.label}
              </span>

              <span className="rounded-md bg-[#d2f2ff]/10 px-2 py-0.5 font-mono-num text-[11px] font-medium text-[#d2f2ff]">
                Account #{activeAccount.index}
              </span>

              {activeAccount.name && (
                <span className="rounded-md bg-[var(--color-up)]/12 px-2 py-0.5 text-[11px] font-medium text-[var(--color-up)]">
                  {activeAccount.name}
                </span>
              )}

              {crossNetworkInfo?.hasAccount && (
                <button
                  type="button"
                  onClick={onSwitchToCrossNetwork}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-up)]/35 bg-[var(--color-up)]/10 px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-up-bright)] hover:bg-[var(--color-up)]/20 transition-colors cursor-pointer"
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  <span>
                    Also on {NETWORKS[crossNetworkInfo.targetNetwork].shortLabel} (
                    {formatUsd(crossNetworkInfo.totalAssetValue, { compact: true })})
                  </span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-mono-num text-[16px] font-semibold text-[var(--color-ink)] sm:text-[18px] break-all">
                {hasRealL1 ? activeAccount.l1_address : `Account #${activeAccount.index}`}
              </h1>
              <button
                type="button"
                onClick={copyAddress}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--color-line)] bg-[var(--color-fill)] px-2 py-1 text-[11px] text-[var(--color-dim)] hover:text-[var(--color-ink)] cursor-pointer"
                title="Copy address"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-[var(--color-up)]" />
                    <span className="text-[var(--color-up)]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleWatchlist}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
                isWatchlisted
                  ? 'border-[var(--color-up)]/40 bg-[var(--color-up)]/15 text-[var(--color-up-bright)]'
                  : 'border-[var(--color-line)] bg-[var(--color-fill)] text-[var(--color-ink)] hover:bg-[var(--color-fill-hover)]'
              }`}
            >
              {isWatchlisted ? (
                <>
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  <span>Tracked</span>
                </>
              ) : (
                <>
                  <Bookmark className="h-3.5 w-3.5" />
                  <span>Track Address</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-fill)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-dim)] hover:bg-[var(--color-fill-hover)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <a
              href={`${netCfg.explorerWebUrl}/accounts/${activeAccount.index}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-fill)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-link)] hover:bg-[var(--color-fill-hover)] transition-colors"
            >
              <span>Explorer</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Sub-account selector pills if address owns multiple accounts */}
        {accounts.length > 1 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] pt-3">
            <span className="text-[11px] font-medium text-[var(--color-meta)]">
              Sub-Accounts ({accounts.length}):
            </span>
            {accounts.map((acc, i) => {
              const selected = acc.index === activeAccount.index
              return (
                <button
                  key={acc.index}
                  type="button"
                  onClick={() => onSelectSubAccount(acc.index)}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1 text-[11.5px] transition-colors cursor-pointer ${
                    selected
                      ? 'border-[var(--color-up)]/40 bg-[var(--color-up)]/12 text-[var(--color-ink)]'
                      : 'border-[var(--color-line)] bg-[var(--color-surface-2)] text-[var(--color-meta)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  <span className="font-mono-num font-medium">
                    {i === 0 && acc.account_type === 0 ? 'Master' : `Sub #${i}`} (
                    #{acc.index})
                  </span>
                  <span className="font-mono-num text-[var(--color-dim)]">
                    {formatUsd(Number.parseFloat(acc.total_asset_value || acc.collateral || '0'), {
                      compact: true,
                    })}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Hyperdash KPI Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lighter-card p-4">
          <div className="text-[11.5px] text-[var(--color-meta)]">
            Account Equity
          </div>
          <div className="mt-1 font-mono-num text-[22px] font-semibold tracking-tight text-[var(--color-ink)]">
            {formatUsd(summary.equity)}
          </div>
          <div className="mt-1.5 flex items-center justify-between font-mono-num text-[11px] text-[var(--color-meta)]">
            <span>Collateral: {formatUsd(summary.collateral)}</span>
            <span>{netCfg.collateralSymbol}</span>
          </div>
        </div>

        <div className="lighter-card p-4">
          <div className="text-[11.5px] text-[var(--color-meta)]">
            Unrealized PnL
          </div>
          <div
            className={`mt-1 font-mono-num text-[22px] font-semibold tracking-tight ${
              summary.unrealizedPnl >= 0
                ? 'text-[var(--color-up)]'
                : 'text-[var(--color-down)]'
            }`}
          >
            {formatUsd(summary.unrealizedPnl, { showSign: true })}
          </div>
          <div className="mt-1.5 flex items-center justify-between font-mono-num text-[11px] text-[var(--color-meta)]">
            <span>Open Positions: {summary.openPositionsCount}</span>
            <span>Notional: {formatUsd(summary.totalNotional, { compact: true })}</span>
          </div>
        </div>

        <div className="lighter-card p-4">
          <div className="flex items-center justify-between text-[11.5px] text-[var(--color-meta)]">
            <span>Margin &amp; Leverage</span>
            <span className="font-mono-num text-[var(--color-ink)]">
              {summary.effectiveLeverage.toFixed(2)}x
            </span>
          </div>
          <div className="mt-1 font-mono-num text-[22px] font-semibold tracking-tight text-[var(--color-ink)]">
            {summary.marginUsagePct.toFixed(1)}%
            <span className="ml-1.5 text-[12px] font-normal text-[var(--color-meta)]">
              used
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-fill)]">
            <div
              className={`h-full transition-all ${
                summary.marginUsagePct > 80
                  ? 'bg-[var(--color-down)]'
                  : summary.marginUsagePct > 50
                    ? 'bg-[var(--color-warn)]'
                    : 'bg-[var(--color-up)]'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, summary.marginUsagePct))}%` }}
            />
          </div>
          <div className="mt-1.5 font-mono-num text-[11px] text-[var(--color-meta)]">
            Available: {formatUsd(summary.availableBalance)}
          </div>
        </div>

        <div className="lighter-card p-4">
          <div className="flex items-center justify-between text-[11.5px] text-[var(--color-meta)]">
            <span>Directional Bias</span>
            <span className="font-mono-num text-[11px] text-[var(--color-dim)]">
              {summary.totalNotional > 0
                ? `${summary.longPct.toFixed(0)}% L / ${summary.shortPct.toFixed(0)}% S`
                : 'Flat'}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between font-mono-num text-[12.5px] font-semibold">
            <span className="text-[var(--color-up)]">
              {formatUsd(summary.longNotional, { compact: true })}
            </span>
            <span className="text-[var(--color-down)]">
              {formatUsd(summary.shortNotional, { compact: true })}
            </span>
          </div>
          <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-[var(--color-fill)]">
            {summary.totalNotional > 0 && (
              <>
                <div
                  className="h-full bg-[var(--color-up)]"
                  style={{ width: `${summary.longPct}%` }}
                />
                <div
                  className="h-full bg-[var(--color-down)]"
                  style={{ width: `${summary.shortPct}%` }}
                />
              </>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between font-mono-num text-[11px] text-[var(--color-meta)]">
            <span>Total Vol: {formatUsd(volumeStats.total_volume ?? 0, { compact: true })}</span>
            <span>{formatInt(volumeStats.total_trades_count ?? 0)} fills</span>
          </div>
        </div>
      </div>

      {/* Chart + Live Volume Stats Row */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-9">
          <PnlChart
            points={pnlPoints}
            timeframe={pnlTimeframe}
            onTimeframeChange={onPnlTimeframeChange}
            loading={loadingPnl}
          />
        </div>

        <div className="lighter-card lg:col-span-3 flex flex-col justify-between p-4 sm:p-5">
          <div>
            <div className="text-[12px] font-semibold text-[var(--color-ink)]">
              Trader Activity Stats
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--color-meta)]">
              Real-time rollup volume &amp; fills
            </div>

            <div className="mt-4 space-y-3">
              <div className="lighter-card-2 flex items-center justify-between px-3 py-2.5">
                <span className="text-[11.5px] text-[var(--color-meta)]">24h Volume</span>
                <span className="font-mono-num text-[12.5px] font-medium text-[var(--color-ink)]">
                  {formatUsd(volumeStats.daily_volume ?? 0, { compact: true })}
                </span>
              </div>
              <div className="lighter-card-2 flex items-center justify-between px-3 py-2.5">
                <span className="text-[11.5px] text-[var(--color-meta)]">7d Volume</span>
                <span className="font-mono-num text-[12.5px] font-medium text-[var(--color-ink)]">
                  {formatUsd(volumeStats.weekly_volume ?? 0, { compact: true })}
                </span>
              </div>
              <div className="lighter-card-2 flex items-center justify-between px-3 py-2.5">
                <span className="text-[11.5px] text-[var(--color-meta)]">30d Volume</span>
                <span className="font-mono-num text-[12.5px] font-medium text-[var(--color-ink)]">
                  {formatUsd(volumeStats.monthly_volume ?? 0, { compact: true })}
                </span>
              </div>
              <div className="lighter-card-2 flex items-center justify-between px-3 py-2.5">
                <span className="text-[11.5px] text-[var(--color-meta)]">All-Time Vol</span>
                <span className="font-mono-num text-[12.5px] font-semibold text-[var(--color-up)]">
                  {formatUsd(volumeStats.total_volume ?? 0, { compact: true })}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-[var(--color-line)] pt-3 flex items-center justify-between font-mono-num text-[11px] text-[var(--color-meta)]">
            <span>24h Fills: {formatInt(volumeStats.daily_trades_count ?? 0)}</span>
            <span>
              Addr: {hasRealL1 ? shortenAddress(activeAccount.l1_address) : `#${activeAccount.index}`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--color-line)] pb-2.5">
        {(
          [
            ['positions', `Positions (${positions.length})`],
            ['trades', `Trades & Live Fills (${trades.length}${hasMoreTrades ? '+' : ''})`],
            ['analytics', 'Trade Analytics'],
            ['assets', `Assets & ZK Logs (${logs.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-colors cursor-pointer ${
              activeTab === id
                ? 'bg-[var(--color-elevated)] text-[var(--color-ink)] border border-[var(--color-line-strong)]'
                : 'text-[var(--color-meta)] hover:bg-[var(--color-fill)] hover:text-[var(--color-ink)] border border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'positions' && <PositionsTable positions={positions} />}

      {activeTab === 'trades' && (
        <TradesTable
          network={network}
          accountIndex={activeAccount.index}
          trades={trades}
          hasMore={hasMoreTrades}
          loadingMore={loadingMoreTrades}
          onLoadMore={onLoadMoreTrades}
          liveTradeIds={liveTradeIds}
        />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsPanel
          analytics={analytics}
          positions={positions}
          hasMoreTrades={hasMoreTrades}
        />
      )}

      {activeTab === 'assets' && (
        <AssetsAndLogs
          network={network}
          account={activeAccount}
          assetsBySymbol={assetsBySymbol}
          marketsById={marketsById}
          logs={logs}
          loadingLogs={loadingLogs}
          hasMoreLogs={hasMoreLogs}
          onLoadMoreLogs={onLoadMoreLogs}
        />
      )}
    </div>
  )
}
