import { ExternalLink, Loader2, Wallet } from 'lucide-react'
import { NETWORKS, type NetworkId } from '../config/networks.ts'
import type {
  ExplorerLog,
  LighterAccount,
  LighterAssetDetail,
  LighterMarket,
} from '../types/lighter.ts'
import { formatRelativeTime, formatSize, formatUsd, shortenAddress, toNum } from '../utils/format.ts'

interface AssetsAndLogsProps {
  network: NetworkId
  account: LighterAccount
  assetsBySymbol: Record<string, LighterAssetDetail>
  marketsById: Record<number, LighterMarket>
  logs: ExplorerLog[]
  loadingLogs: boolean
  onLoadMoreLogs: () => void
  hasMoreLogs: boolean
}

export function AssetsAndLogs({
  network,
  account,
  assetsBySymbol,
  marketsById,
  logs,
  loadingLogs,
  onLoadMoreLogs,
  hasMoreLogs,
}: AssetsAndLogsProps) {
  const netCfg = NETWORKS[network]

  const describeLog = (log: ExplorerLog): string => {
    const pd = log.pubdata ?? {}
    if (log.pubdata_type === 'Trade' && pd.trade_pubdata) {
      const tp = pd.trade_pubdata as {
        market_index?: number
        price?: string
        size?: string
        is_taker_ask?: number
      }
      const m = tp.market_index !== undefined ? marketsById[tp.market_index]?.symbol : undefined
      return `${m || `Mkt #${tp.market_index ?? '?'}`} · ${tp.size ?? '?'} @ $${tp.price ?? '?'}`
    }
    if (pd.l1_deposit_pubdata) {
      const dp = pd.l1_deposit_pubdata as { accepted_amount?: string }
      return `L1 Deposit · ${dp.accepted_amount ?? ''}`
    }
    if (pd.withdraw_pubdata) {
      const wp = pd.withdraw_pubdata as { amount?: string }
      return `Withdraw · ${wp.amount ?? ''}`
    }
    if (pd.transfer_pubdata) {
      const tr = pd.transfer_pubdata as { amount?: string; to_account_index?: string }
      return `Transfer ${tr.amount ?? ''} → #${tr.to_account_index ?? '?'}`
    }
    return log.pubdata_type || log.tx_type
  }

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Assets & Vault Shares */}
      <div className="lighter-card lg:col-span-5 overflow-hidden self-start">
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[var(--color-up)]" />
            <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">
              Spot &amp; Margin Assets
            </h3>
          </div>
          <span className="font-mono-num text-[11px] text-[var(--color-meta)]">
            {account.assets?.length ?? 0} assets
          </span>
        </div>

        <div className="divide-y divide-[var(--color-line)]">
          {!account.assets || account.assets.length === 0 ? (
            <div className="p-6 text-center text-[12px] text-[var(--color-meta)]">
              No asset balances reported.
            </div>
          ) : (
            account.assets.map((asset) => {
              const spotBal = toNum(asset.balance)
              const marginBal = toNum(asset.margin_balance)
              const lockedBal = toNum(asset.locked_balance)
              const totalUnits = spotBal + marginBal
              const detail = assetsBySymbol[asset.symbol.toUpperCase()]
              const isStable =
                asset.symbol.toUpperCase() === 'USDC' ||
                asset.symbol.toUpperCase() === 'USDG'
              const unitPrice = isStable ? 1 : toNum(detail?.index_price)
              const usdVal = unitPrice > 0 ? totalUnits * unitPrice : 0

              return (
                <div
                  key={asset.asset_id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--color-ink)]">
                        {asset.symbol}
                      </span>
                      <span className="rounded bg-[var(--color-fill)] px-1.5 py-0.5 text-[10px] text-[var(--color-meta)] border border-[var(--color-line)]">
                        margin {asset.margin_mode}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono-num text-[11px] text-[var(--color-meta)]">
                      Spot: {formatSize(spotBal, 4)} · Margin: {formatSize(marginBal, 4)}
                      {lockedBal > 0 ? ` · Locked: ${formatSize(lockedBal, 4)}` : ''}
                    </div>
                  </div>
                  <div className="text-right font-mono-num">
                    <div className="text-[12.5px] font-medium text-[var(--color-ink)]">
                      {formatSize(totalUnits, 4)}
                    </div>
                    {usdVal > 0 && (
                      <div className="text-[11px] text-[var(--color-meta)]">
                        {formatUsd(usdVal)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {account.shares && account.shares.length > 0 && (
          <div className="border-t border-[var(--color-line)] px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-meta)]">
              Liquidity Pool Shares
            </div>
            <div className="mt-2 space-y-1.5">
              {account.shares.map((s) => (
                <div
                  key={s.public_pool_index}
                  className="flex items-center justify-between text-[12px]"
                >
                  <span className="font-mono-num text-[var(--color-dim)]">
                    Pool #{s.public_pool_index}
                  </span>
                  <span className="font-mono-num text-[var(--color-ink)]">
                    {formatSize(s.shares_amount, 2)} shares · Entry{' '}
                    {formatUsd(toNum(s.entry_usdc))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Raw Explorer ZK Logs */}
      <div className="lighter-card lg:col-span-7 overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
          <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">
            ZK Explorer Account Logs
          </h3>
          <a
            href={`${netCfg.explorerWebUrl}/accounts/${account.index}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11.5px] text-[var(--color-link)] hover:underline"
          >
            View on {netCfg.shortLabel} Explorer
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-[11px] font-medium text-[var(--color-meta)]">
                <th className="px-4 py-2.5">Time</th>
                <th className="px-3 py-2.5">Tx Type</th>
                <th className="px-3 py-2.5">Event</th>
                <th className="px-3 py-2.5">Details</th>
                <th className="px-4 py-2.5 text-right">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)] text-[12px]">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-[var(--color-meta)]"
                  >
                    {loadingLogs ? 'Loading ZK logs...' : 'No explorer logs found.'}
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => {
                  const ts = Date.parse(log.time)
                  return (
                    <tr
                      key={`${log.hash}-${i}`}
                      className="hover:bg-[var(--color-fill)] transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono-num text-[11px] text-[var(--color-dim)] whitespace-nowrap">
                        {Number.isFinite(ts) ? formatRelativeTime(ts) : log.time}
                      </td>
                      <td className="px-3 py-2.5 font-mono-num text-[11px] text-[var(--color-ink)]">
                        {log.tx_type}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded bg-[var(--color-fill)] px-1.5 py-0.5 text-[10.5px] text-[var(--color-dim)] border border-[var(--color-line)]">
                          {log.pubdata_type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono-num text-[11.5px] text-[var(--color-meta)]">
                        {describeLog(log)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <a
                          href={`${netCfg.explorerWebUrl}/logs/${log.hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono-num text-[11px] text-[var(--color-link)] hover:underline"
                        >
                          {shortenAddress(log.hash, 6, 4)}
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

        {hasMoreLogs && (
          <div className="border-t border-[var(--color-line)] px-4 py-3 text-center">
            <button
              type="button"
              onClick={onLoadMoreLogs}
              disabled={loadingLogs}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-fill)] px-4 py-1.5 text-[12px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-fill-hover)] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loadingLogs && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Load More Logs</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
