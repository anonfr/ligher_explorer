import { AlertTriangle, ArrowRightLeft } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LandingView } from './components/LandingView.tsx'
import { TopNav } from './components/TopNav.tsx'
import { TraderDashboard } from './components/TraderDashboard.tsx'
import { WatchlistDrawer } from './components/WatchlistDrawer.tsx'
import { NETWORKS, type NetworkId } from './config/networks.ts'
import {
  checkCrossNetworkPresence,
  fetchAccountPnl,
  fetchAccountTrades,
  fetchExplorerLogs,
  fetchExplorerTotals,
  fetchLiveActiveTraders,
  fetchMarketRegistry,
  isValidL1Address,
  resolveAccounts,
  type MarketRegistry,
} from './services/lighterApi.ts'
import { LighterWsClient, type AccountAllMessage } from './services/lighterWs.ts'
import { loadWatchlist, makeWatchlistId, saveWatchlist } from './services/watchlist.ts'
import type {
  ActiveTraderSample,
  ExplorerLog,
  ExplorerTotals,
  LighterAccount,
  LighterTrade,
  PnlPoint,
  PnlTimeframe,
  WatchlistEntry,
  WsAccountVolumeStats,
  WsMarketStat,
  WsUserStats,
} from './types/lighter.ts'
import { shortenAddress } from './utils/format.ts'
import {
  computeAccountSummary,
  computePositions,
  computeTradeAnalytics,
  resolveTradeForAccount,
} from './utils/tradeMath.ts'

function readUrlState(): { network: NetworkId; address: string } {
  const params = new URLSearchParams(window.location.search)
  const net = params.get('network') === 'robinhood' ? 'robinhood' : 'mainnet'
  const addr = params.get('address') ?? ''
  return { network: net, address: addr }
}

function writeUrlState(network: NetworkId, address: string) {
  const params = new URLSearchParams()
  params.set('network', network)
  if (address) params.set('address', address)
  const next = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState(null, '', next)
}

export function App() {
  const [network, setNetwork] = useState<NetworkId>(() => readUrlState().network)
  const [searchQuery, setSearchQuery] = useState(() => readUrlState().address)
  const [submittedQuery, setSubmittedQuery] = useState(() => readUrlState().address)

  // Explorer discovery & registry state
  const [totals, setTotals] = useState<ExplorerTotals | null>(null)
  const [registry, setRegistry] = useState<MarketRegistry>({
    byId: {},
    bySymbol: {},
    list: [],
    assetsBySymbol: {},
  })
  const [activeTraders, setActiveTraders] = useState<ActiveTraderSample[]>([])
  const [loadingTraders, setLoadingTraders] = useState(false)

  // Watchlist
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(() => loadWatchlist())
  const [watchlistOpen, setWatchlistOpen] = useState(false)

  // Active trader state
  const [loadingAccount, setLoadingAccount] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [fallbackNetworkHint, setFallbackNetworkHint] = useState<{
    network: NetworkId
    totalAssetValue: number
  } | null>(null)

  const [accounts, setAccounts] = useState<LighterAccount[]>([])
  const [activeAccountIndex, setActiveAccountIndex] = useState<number | null>(null)
  const [crossNetworkInfo, setCrossNetworkInfo] = useState<{
    targetNetwork: NetworkId
    hasAccount: boolean
    totalAssetValue: number
  } | null>(null)

  // Trades, PnL, Explorer Logs
  const [trades, setTrades] = useState<LighterTrade[]>([])
  const [tradesCursor, setTradesCursor] = useState<string | undefined>(undefined)
  const [loadingMoreTrades, setLoadingMoreTrades] = useState(false)
  const [liveTradeIds, setLiveTradeIds] = useState<Set<number>>(new Set())

  const [pnlTimeframe, setPnlTimeframe] = useState<PnlTimeframe>('30D')
  const [pnlPoints, setPnlPoints] = useState<PnlPoint[]>([])
  const [loadingPnl, setLoadingPnl] = useState(false)

  const [logs, setLogs] = useState<ExplorerLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [hasMoreLogs, setHasMoreLogs] = useState(false)

  // Live WS state
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>(
    'connecting',
  )
  const [liveMarketStats, setLiveMarketStats] = useState<Record<string, WsMarketStat>>({})
  const [liveUserStats, setLiveUserStats] = useState<WsUserStats | null>(null)
  const [volumeStats, setVolumeStats] = useState<WsAccountVolumeStats>({})

  const wsRef = useRef<LighterWsClient | null>(null)
  const lookupAbortRef = useRef<AbortController | null>(null)
  const activeAccountIdxRef = useRef<number | null>(null)

  const activeAccount = useMemo(() => {
    if (accounts.length === 0) return null
    return accounts.find((a) => a.index === activeAccountIndex) ?? accounts[0]
  }, [accounts, activeAccountIndex])

  // Load network totals, market registry & active traders whenever network changes
  const refreshNetworkHome = useCallback(async (net: NetworkId, signal?: AbortSignal) => {
    setLoadingTraders(true)
    const [totRes, regRes, tradersRes] = await Promise.allSettled([
      fetchExplorerTotals(net, signal),
      fetchMarketRegistry(net, signal),
      fetchLiveActiveTraders(net, signal),
    ])
    if (signal?.aborted) return
    if (totRes.status === 'fulfilled') setTotals(totRes.value)
    if (regRes.status === 'fulfilled') setRegistry(regRes.value)
    if (tradersRes.status === 'fulfilled') setActiveTraders(tradersRes.value)
    setLoadingTraders(false)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void refreshNetworkHome(network, controller.signal)
    return () => controller.abort()
  }, [network, refreshNetworkHome])

  // Manage WebSocket per network
  useEffect(() => {
    const client = new LighterWsClient(network, {
      onStatus: setWsStatus,
      onMarketStats: (stats) => {
        setLiveMarketStats((prev) => ({ ...prev, ...stats }))
      },
      onUserStats: (idx, stats) => {
        if (idx === activeAccountIdxRef.current) {
          setLiveUserStats(stats)
        }
      },
      onAccountAll: (idx, payload: AccountAllMessage) => {
        if (idx !== activeAccountIdxRef.current) return

        // Update volume & trade counts
        setVolumeStats((prev) => ({
          daily_trades_count: payload.daily_trades_count ?? prev.daily_trades_count,
          daily_volume: payload.daily_volume ?? prev.daily_volume,
          weekly_trades_count: payload.weekly_trades_count ?? prev.weekly_trades_count,
          weekly_volume: payload.weekly_volume ?? prev.weekly_volume,
          monthly_trades_count: payload.monthly_trades_count ?? prev.monthly_trades_count,
          monthly_volume: payload.monthly_volume ?? prev.monthly_volume,
          total_trades_count: payload.total_trades_count ?? prev.total_trades_count,
          total_volume: payload.total_volume ?? prev.total_volume,
        }))

        // Merge live position & asset updates into activeAccount
        if (payload.positions || payload.assets) {
          setAccounts((prevAccounts) =>
            prevAccounts.map((acc) => {
              if (acc.index !== idx) return acc
              let nextPositions = acc.positions
              if (payload.positions) {
                const posMap = new Map(acc.positions.map((p) => [p.market_id, p]))
                for (const p of Object.values(payload.positions)) {
                  posMap.set(p.market_id, p)
                }
                nextPositions = Array.from(posMap.values())
              }
              let nextAssets = acc.assets
              if (payload.assets) {
                const assetMap = new Map(acc.assets.map((a) => [a.asset_id, a]))
                for (const a of Object.values(payload.assets)) {
                  assetMap.set(a.asset_id, a)
                }
                nextAssets = Array.from(assetMap.values())
              }
              return { ...acc, positions: nextPositions, assets: nextAssets }
            }),
          )
        }
      },
      onAccountTrades: (idx, incoming, volStats) => {
        if (idx !== activeAccountIdxRef.current) return
        setVolumeStats((prev) => ({
          ...prev,
          daily_volume: volStats.daily_volume ?? prev.daily_volume,
          weekly_volume: volStats.weekly_volume ?? prev.weekly_volume,
          monthly_volume: volStats.monthly_volume ?? prev.monthly_volume,
          total_volume: volStats.total_volume ?? prev.total_volume,
        }))
        if (incoming.length > 0) {
          setTrades((prev) => {
            const seen = new Set(prev.map((t) => t.trade_id))
            const fresh = incoming.filter((t) => !seen.has(t.trade_id))
            if (fresh.length === 0) return prev
            setLiveTradeIds((old) => {
              const next = new Set(old)
              for (const f of fresh) next.add(f.trade_id)
              return next
            })
            return [...fresh, ...prev].slice(0, 500)
          })
        }
      },
    })

    wsRef.current = client
    client.connect(activeAccountIdxRef.current)

    return () => {
      client.destroy()
      wsRef.current = null
    }
  }, [network])

  // Sync WS account subscription when activeAccountIndex changes
  useEffect(() => {
    activeAccountIdxRef.current = activeAccountIndex
    wsRef.current?.setAccountIndex(activeAccountIndex)
  }, [activeAccountIndex])

  // Fetch account details (trades, pnl, logs) for a selected sub-account index
  const loadAccountDetails = useCallback(
    async (
      net: NetworkId,
      accIndex: number,
      tf: PnlTimeframe,
      signal?: AbortSignal,
    ) => {
      setLiveUserStats(null)
      setVolumeStats({})
      setLoadingPnl(true)
      setLoadingLogs(true)

      const [tradesRes, pnlRes, logsRes] = await Promise.allSettled([
        fetchAccountTrades(net, accIndex, 100, undefined, signal),
        fetchAccountPnl(net, accIndex, tf, signal),
        fetchExplorerLogs(net, accIndex, 40, 0, signal),
      ])
      if (signal?.aborted) return

      if (tradesRes.status === 'fulfilled') {
        setTrades(tradesRes.value.trades)
        setTradesCursor(tradesRes.value.next_cursor)
      } else {
        setTrades([])
        setTradesCursor(undefined)
      }

      if (pnlRes.status === 'fulfilled') {
        setPnlPoints(pnlRes.value)
      } else {
        setPnlPoints([])
      }
      setLoadingPnl(false)

      if (logsRes.status === 'fulfilled') {
        setLogs(logsRes.value)
        setHasMoreLogs(logsRes.value.length === 40)
      } else {
        setLogs([])
        setHasMoreLogs(false)
      }
      setLoadingLogs(false)
    },
    [],
  )

  const inspectAddress = useCallback(
    async (rawQuery: string, targetNet: NetworkId = network) => {
      const query = rawQuery.trim()
      if (!query) return

      lookupAbortRef.current?.abort()
      const controller = new AbortController()
      lookupAbortRef.current = controller

      setNetwork((prev) => {
        if (prev !== targetNet) setLiveMarketStats({})
        return targetNet
      })
      setSearchQuery(query)
      setSubmittedQuery(query)
      writeUrlState(targetNet, query)

      setLoadingAccount(true)
      setErrorMsg(null)
      setFallbackNetworkHint(null)
      setCrossNetworkInfo(null)
      setLiveTradeIds(new Set())

      try {
        const resolved = await resolveAccounts(targetNet, query, controller.signal)
        if (controller.signal.aborted) return

        const otherNet: NetworkId = targetNet === 'mainnet' ? 'robinhood' : 'mainnet'

        if (resolved.length === 0) {
          setAccounts([])
          setActiveAccountIndex(null)
          setTrades([])
          setPnlPoints([])
          setLogs([])

          if (isValidL1Address(query)) {
            const cross = await checkCrossNetworkPresence(otherNet, query, controller.signal)
            if (!controller.signal.aborted && cross.hasAccount) {
              setFallbackNetworkHint({
                network: otherNet,
                totalAssetValue: cross.totalAssetValue,
              })
            }
          }
          setErrorMsg(
            `No Lighter accounts found for "${query}" on ${NETWORKS[targetNet].label}.`,
          )
          setLoadingAccount(false)
          return
        }

        const primary = resolved[0]
        setAccounts(resolved)
        setActiveAccountIndex(primary.index)
        setLoadingAccount(false)

        // Load trades, pnl, logs + quiet cross-network check
        void loadAccountDetails(targetNet, primary.index, pnlTimeframe, controller.signal)

        const l1 = primary.l1_address
        if (isValidL1Address(l1)) {
          void checkCrossNetworkPresence(otherNet, l1, controller.signal).then((res) => {
            if (!controller.signal.aborted && res.hasAccount) {
              setCrossNetworkInfo({
                targetNetwork: otherNet,
                hasAccount: true,
                totalAssetValue: res.totalAssetValue,
              })
            }
          })
        }
      } catch (err) {
        if (controller.signal.aborted) return
        setAccounts([])
        setActiveAccountIndex(null)
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load account')
        setLoadingAccount(false)
      }
    },
    [network, loadAccountDetails, pnlTimeframe],
  )

  // Initial load if URL already had ?address=...
  useEffect(() => {
    const { address, network: net } = readUrlState()
    if (address) {
      void inspectAddress(address, net)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleNetworkChange = (nextNet: NetworkId) => {
    if (nextNet === network) return
    setLiveMarketStats({})
    if (submittedQuery) {
      void inspectAddress(submittedQuery, nextNet)
    } else {
      setNetwork(nextNet)
      writeUrlState(nextNet, '')
    }
  }

  const handleGoHome = () => {
    lookupAbortRef.current?.abort()
    setSubmittedQuery('')
    setSearchQuery('')
    setAccounts([])
    setActiveAccountIndex(null)
    setErrorMsg(null)
    setFallbackNetworkHint(null)
    setCrossNetworkInfo(null)
    writeUrlState(network, '')
  }

  const handleSelectSubAccount = (idx: number) => {
    if (idx === activeAccountIndex) return
    setActiveAccountIndex(idx)
    setLiveTradeIds(new Set())
    void loadAccountDetails(network, idx, pnlTimeframe)
  }

  const handlePnlTimeframeChange = async (tf: PnlTimeframe) => {
    setPnlTimeframe(tf)
    if (activeAccountIndex === null) return
    setLoadingPnl(true)
    try {
      const pts = await fetchAccountPnl(network, activeAccountIndex, tf)
      setPnlPoints(pts)
    } catch {
      // keep existing points on transient failure
    } finally {
      setLoadingPnl(false)
    }
  }

  const handleLoadMoreTrades = async () => {
    if (!tradesCursor || activeAccountIndex === null || loadingMoreTrades) return
    setLoadingMoreTrades(true)
    try {
      const res = await fetchAccountTrades(network, activeAccountIndex, 100, tradesCursor)
      setTrades((prev) => {
        const seen = new Set(prev.map((t) => t.trade_id))
        const next = res.trades.filter((t) => !seen.has(t.trade_id))
        return [...prev, ...next]
      })
      setTradesCursor(res.next_cursor)
    } finally {
      setLoadingMoreTrades(false)
    }
  }

  const handleLoadMoreLogs = async () => {
    if (activeAccountIndex === null || loadingLogs) return
    setLoadingLogs(true)
    try {
      const more = await fetchExplorerLogs(network, activeAccountIndex, 40, logs.length)
      setLogs((prev) => [...prev, ...more])
      setHasMoreLogs(more.length === 40)
    } finally {
      setLoadingLogs(false)
    }
  }

  // Watchlist actions
  const currentWatchlistId = activeAccount
    ? makeWatchlistId(
        network,
        activeAccount.l1_address !== '0x0000000000000000000000000000000000000000'
          ? activeAccount.l1_address
          : String(activeAccount.index),
      )
    : ''

  const isWatchlisted = watchlist.some((w) => w.id === currentWatchlistId)

  const handleToggleWatchlist = () => {
    if (!activeAccount) return
    const addr =
      activeAccount.l1_address !== '0x0000000000000000000000000000000000000000'
        ? activeAccount.l1_address
        : String(activeAccount.index)
    const id = makeWatchlistId(network, addr)

    let next: WatchlistEntry[]
    if (watchlist.some((w) => w.id === id)) {
      next = watchlist.filter((w) => w.id !== id)
    } else {
      next = [
        {
          id,
          network,
          address: addr,
          accountIndex: activeAccount.index,
          label: activeAccount.name || shortenAddress(addr),
          addedAt: Date.now(),
        },
        ...watchlist,
      ]
    }
    setWatchlist(next)
    saveWatchlist(next)
  }

  const handleRemoveWatchlist = (id: string) => {
    const next = watchlist.filter((w) => w.id !== id)
    setWatchlist(next)
    saveWatchlist(next)
  }

  const handleRenameWatchlist = (id: string, label: string) => {
    const next = watchlist.map((w) => (w.id === id ? { ...w, label } : w))
    setWatchlist(next)
    saveWatchlist(next)
  }

  // Computed trader metrics
  const computedPositions = useMemo(
    () =>
      activeAccount
        ? computePositions(activeAccount.positions ?? [], registry.byId, liveMarketStats)
        : [],
    [activeAccount, registry.byId, liveMarketStats],
  )

  const accountSummary = useMemo(
    () =>
      activeAccount
        ? computeAccountSummary(activeAccount, computedPositions, liveUserStats)
        : null,
    [activeAccount, computedPositions, liveUserStats],
  )

  const resolvedTrades = useMemo(() => {
    if (activeAccountIndex === null) return []
    return trades.map((t) => resolveTradeForAccount(t, activeAccountIndex))
  }, [trades, activeAccountIndex])

  const tradeAnalytics = useMemo(
    () => computeTradeAnalytics(resolvedTrades),
    [resolvedTrades],
  )

  return (
    <div className="min-h-screen bg-[#06060c] text-[var(--color-ink)] flex flex-col">
      <TopNav
        network={network}
        onNetworkChange={handleNetworkChange}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearchSubmit={(q) => void inspectAddress(q, network)}
        onGoHome={handleGoHome}
        wsStatus={wsStatus}
        watchlistCount={watchlist.length}
        isWatchlistOpen={watchlistOpen}
        onToggleWatchlist={() => setWatchlistOpen((o) => !o)}
        isLoading={loadingAccount}
      />

      <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 sm:px-6">
        {errorMsg && !loadingAccount && (
          <div className="lighter-card mb-6 flex flex-col gap-3 border-[var(--color-down)]/30 bg-[var(--color-down-fill)]/25 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-down)]" />
              <div>
                <div className="text-[13.5px] font-semibold text-[var(--color-ink)]">
                  Address Not Found on {NETWORKS[network].label}
                </div>
                <div className="mt-0.5 text-[12.5px] text-[var(--color-dim)]">
                  {errorMsg}
                </div>
              </div>
            </div>

            {fallbackNetworkHint && (
              <button
                type="button"
                onClick={() =>
                  void inspectAddress(submittedQuery, fallbackNetworkHint.network)
                }
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-up)] px-3.5 py-2 text-[12px] font-semibold text-[#06060c] hover:bg-[var(--color-up-bright)] transition-colors cursor-pointer shrink-0"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>
                  Found on {NETWORKS[fallbackNetworkHint.network].shortLabel} — Switch
                </span>
              </button>
            )}
          </div>
        )}

        {activeAccount && accountSummary ? (
          <TraderDashboard
            network={network}
            accounts={accounts}
            activeAccount={activeAccount}
            onSelectSubAccount={handleSelectSubAccount}
            crossNetworkInfo={crossNetworkInfo}
            onSwitchToCrossNetwork={() => {
              if (crossNetworkInfo) {
                void inspectAddress(
                  activeAccount.l1_address,
                  crossNetworkInfo.targetNetwork,
                )
              }
            }}
            onBackHome={handleGoHome}
            onRefresh={() => void inspectAddress(submittedQuery || String(activeAccount.index), network)}
            refreshing={loadingAccount}
            isWatchlisted={isWatchlisted}
            onToggleWatchlist={handleToggleWatchlist}
            summary={accountSummary}
            volumeStats={volumeStats}
            positions={computedPositions}
            trades={resolvedTrades}
            hasMoreTrades={Boolean(tradesCursor)}
            loadingMoreTrades={loadingMoreTrades}
            onLoadMoreTrades={() => void handleLoadMoreTrades()}
            liveTradeIds={liveTradeIds}
            pnlPoints={pnlPoints}
            pnlTimeframe={pnlTimeframe}
            onPnlTimeframeChange={(tf) => void handlePnlTimeframeChange(tf)}
            loadingPnl={loadingPnl}
            analytics={tradeAnalytics}
            assetsBySymbol={registry.assetsBySymbol}
            marketsById={registry.byId}
            logs={logs}
            loadingLogs={loadingLogs}
            hasMoreLogs={hasMoreLogs}
            onLoadMoreLogs={() => void handleLoadMoreLogs()}
          />
        ) : (
          <LandingView
            network={network}
            totals={totals}
            markets={registry.list}
            liveStats={liveMarketStats}
            activeTraders={activeTraders}
            loadingTraders={loadingTraders}
            onRefreshTraders={() => void refreshNetworkHome(network)}
            onSelectAddress={(q, targetNet) =>
              void inspectAddress(q, targetNet ?? network)
            }
            watchlist={watchlist}
          />
        )}
      </main>

      <footer className="border-t border-[var(--color-line)] bg-[#06060c]/80">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-2 px-4 py-3 text-[11.5px] text-[var(--color-meta)] sm:px-6">
          <span>
            Lighter &amp; Lighter RH Explorer · Read-only live address tracker
          </span>
          <a
            href="https://x.com/anonfrxbt"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 font-mono-num text-[11px] text-[var(--color-dim)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)] transition-colors"
          >
            <span>made by</span>
            <span className="font-semibold text-[var(--color-up)]">anonfrxbt</span>
            <span className="text-[var(--color-faint)]">·</span>
            <span className="text-[var(--color-link)]">x.com/anonfrxbt</span>
          </a>
        </div>
      </footer>

      <WatchlistDrawer
        open={watchlistOpen}
        onClose={() => setWatchlistOpen(false)}
        entries={watchlist}
        onSelect={(addr, net) => void inspectAddress(addr, net)}
        onRemove={handleRemoveWatchlist}
        onRename={handleRenameWatchlist}
      />
    </div>
  )
}

export default App
