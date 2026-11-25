import { NETWORKS, type NetworkId } from '../config/networks.ts'
import type {
  ActiveTraderSample,
  ExplorerLog,
  ExplorerTotals,
  LighterAccount,
  LighterAssetDetail,
  LighterMarket,
  LighterTrade,
  PnlPoint,
  PnlTimeframe,
} from '../types/lighter.ts'

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const errBody = (await res.json()) as { message?: string }
      if (errBody?.message) message = errBody.message
    } catch {
      // ignore non-json error bodies
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

export async function fetchExplorerTotals(
  network: NetworkId,
  signal?: AbortSignal,
): Promise<ExplorerTotals> {
  const base = NETWORKS[network].explorerApiBaseUrl
  return fetchJson<ExplorerTotals>(`${base}/total`, signal)
}

export interface MarketRegistry {
  byId: Record<number, LighterMarket>
  bySymbol: Record<string, LighterMarket>
  list: LighterMarket[]
  assetsBySymbol: Record<string, LighterAssetDetail>
}

export async function fetchMarketRegistry(
  network: NetworkId,
  signal?: AbortSignal,
): Promise<MarketRegistry> {
  const rest = NETWORKS[network].restBaseUrl

  const [detailsRes, fundingRes, assetsRes] = await Promise.allSettled([
    fetchJson<{
      order_book_details?: LighterMarket[]
      spot_order_book_details?: LighterMarket[]
    }>(`${rest}/api/v1/orderBookDetails`, signal),
    fetchJson<{
      funding_rates?: Array<{ market_id: number; rate: number; symbol: string }>
    }>(`${rest}/api/v1/funding-rates`, signal),
    fetchJson<{
      asset_details?: LighterAssetDetail[]
    }>(`${rest}/api/v1/assetDetails`, signal),
  ])

  const fundingByMarket = new Map<number, number>()
  if (fundingRes.status === 'fulfilled' && fundingRes.value.funding_rates) {
    for (const item of fundingRes.value.funding_rates) {
      fundingByMarket.set(item.market_id, item.rate)
    }
  }

  const assetsBySymbol: Record<string, LighterAssetDetail> = {}
  if (assetsRes.status === 'fulfilled' && assetsRes.value.asset_details) {
    for (const asset of assetsRes.value.asset_details) {
      assetsBySymbol[asset.symbol.toUpperCase()] = asset
    }
  }

  const byId: Record<number, LighterMarket> = {}
  const bySymbol: Record<string, LighterMarket> = {}
  const list: LighterMarket[] = []

  if (detailsRes.status === 'fulfilled') {
    const combined = [
      ...(detailsRes.value.order_book_details ?? []),
      ...(detailsRes.value.spot_order_book_details ?? []),
    ]
    for (const m of combined) {
      const enriched: LighterMarket = {
        ...m,
        funding_rate: fundingByMarket.get(m.market_id),
      }
      byId[m.market_id] = enriched
      bySymbol[m.symbol] = enriched
      list.push(enriched)
    }
  }

  list.sort(
    (a, b) => (b.daily_quote_token_volume ?? 0) - (a.daily_quote_token_volume ?? 0),
  )

  return { byId, bySymbol, list, assetsBySymbol }
}

export function isValidL1Address(input: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(input.trim())
}

export function isNumericIndex(input: string): boolean {
  return /^\d+$/.test(input.trim().replace(/^#/, ''))
}

export async function resolveAccounts(
  network: NetworkId,
  rawQuery: string,
  signal?: AbortSignal,
): Promise<LighterAccount[]> {
  const q = rawQuery.trim()
  if (!q) return []
  const rest = NETWORKS[network].restBaseUrl

  if (isValidL1Address(q)) {
    try {
      const data = await fetchJson<{ accounts?: LighterAccount[] }>(
        `${rest}/api/v1/account?by=l1_address&value=${encodeURIComponent(q)}`,
        signal,
      )
      if (data.accounts && data.accounts.length > 0) {
        return data.accounts
      }
    } catch {
      // Fallback to accountsByL1Address for sub-account listing
    }

    try {
      const subRes = await fetchJson<{
        l1_address?: string
        sub_accounts?: Array<{ index: number }>
      }>(
        `${rest}/api/v1/accountsByL1Address?l1_address=${encodeURIComponent(q)}`,
        signal,
      )
      if (subRes.sub_accounts && subRes.sub_accounts.length > 0) {
        const detailed = await Promise.allSettled(
          subRes.sub_accounts.map((s) =>
            fetchJson<{ accounts?: LighterAccount[] }>(
              `${rest}/api/v1/account?by=index&value=${s.index}`,
              signal,
            ),
          ),
        )
        const accounts: LighterAccount[] = []
        for (const r of detailed) {
          if (r.status === 'fulfilled' && r.value.accounts?.[0]) {
            accounts.push(r.value.accounts[0])
          }
        }
        return accounts
      }
    } catch {
      return []
    }
    return []
  }

  if (isNumericIndex(q)) {
    const idx = q.replace(/^#/, '')
    const data = await fetchJson<{ accounts?: LighterAccount[] }>(
      `${rest}/api/v1/account?by=index&value=${encodeURIComponent(idx)}`,
      signal,
    )
    const accounts = data.accounts ?? []
    // If this index resolves to a real L1 address, also fetch sibling sub-accounts
    const l1 = accounts[0]?.l1_address
    if (l1 && l1 !== '0x0000000000000000000000000000000000000000') {
      try {
        const allForL1 = await fetchJson<{ accounts?: LighterAccount[] }>(
          `${rest}/api/v1/account?by=l1_address&value=${encodeURIComponent(l1)}`,
          signal,
        )
        if (allForL1.accounts && allForL1.accounts.length > 0) {
          return allForL1.accounts
        }
      } catch {
        // return single account
      }
    }
    return accounts
  }

  throw new Error('Enter a valid 0x Ethereum address or numeric Lighter account index.')
}

export async function checkCrossNetworkPresence(
  targetNetwork: NetworkId,
  l1Address: string,
  signal?: AbortSignal,
): Promise<{ hasAccount: boolean; count: number; totalAssetValue: number }> {
  if (!isValidL1Address(l1Address) || l1Address === '0x0000000000000000000000000000000000000000') {
    return { hasAccount: false, count: 0, totalAssetValue: 0 }
  }
  try {
    const accounts = await resolveAccounts(targetNetwork, l1Address, signal)
    const totalAssetValue = accounts.reduce(
      (sum, a) => sum + Number.parseFloat(a.total_asset_value || '0'),
      0,
    )
    return {
      hasAccount: accounts.length > 0,
      count: accounts.length,
      totalAssetValue,
    }
  } catch {
    return { hasAccount: false, count: 0, totalAssetValue: 0 }
  }
}

export async function fetchAccountTrades(
  network: NetworkId,
  accountIndex: number,
  limit = 100,
  cursor?: string,
  signal?: AbortSignal,
): Promise<{ trades: LighterTrade[]; next_cursor?: string }> {
  const rest = NETWORKS[network].restBaseUrl
  const params = new URLSearchParams({
    account_index: String(accountIndex),
    sort_by: 'timestamp',
    limit: String(limit),
  })
  if (cursor) params.set('cursor', cursor)

  const data = await fetchJson<{
    trades?: LighterTrade[]
    next_cursor?: string
  }>(`${rest}/api/v1/trades?${params.toString()}`, signal)

  return {
    trades: data.trades ?? [],
    next_cursor: data.next_cursor || undefined,
  }
}

export async function fetchAccountPnl(
  network: NetworkId,
  accountIndex: number,
  timeframe: PnlTimeframe,
  signal?: AbortSignal,
): Promise<PnlPoint[]> {
  const rest = NETWORKS[network].restBaseUrl
  const nowSec = Math.floor(Date.now() / 1000) + 86400

  let resolution = '1d'
  let startSec = 1700000000
  let countBack = 365

  if (timeframe === '24H') {
    resolution = '1h'
    startSec = nowSec - 86400 * 2
    countBack = 25
  } else if (timeframe === '7D') {
    resolution = '1h'
    startSec = nowSec - 86400 * 8
    countBack = 168
  } else if (timeframe === '30D') {
    resolution = '1d'
    startSec = nowSec - 86400 * 32
    countBack = 31
  }

  const params = new URLSearchParams({
    by: 'index',
    value: String(accountIndex),
    resolution,
    start_timestamp: String(startSec),
    end_timestamp: String(nowSec),
    count_back: String(countBack),
  })

  const data = await fetchJson<{ pnl?: PnlPoint[] }>(
    `${rest}/api/v1/pnl?${params.toString()}`,
    signal,
  )
  return data.pnl ?? []
}

export async function fetchExplorerLogs(
  network: NetworkId,
  accountIndex: number,
  limit = 40,
  offset = 0,
  signal?: AbortSignal,
): Promise<ExplorerLog[]> {
  const base = NETWORKS[network].explorerApiBaseUrl
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  const data = await fetchJson<ExplorerLog[]>(
    `${base}/accounts/${accountIndex}/logs?${params.toString()}`,
    signal,
  )
  return Array.isArray(data) ? data : []
}

export async function fetchLiveActiveTraders(
  network: NetworkId,
  signal?: AbortSignal,
): Promise<ActiveTraderSample[]> {
  const rest = NETWORKS[network].restBaseUrl
  const data = await fetchJson<{ trades?: LighterTrade[] }>(
    `${rest}/api/v1/trades?sort_by=timestamp&limit=40`,
    signal,
  )
  const trades = data.trades ?? []
  const seen = new Map<number, ActiveTraderSample>()

  for (const t of trades) {
    // Prefer takers/makers that are regular accounts (smaller account indices, skip system/insurance huge ids)
    const candidates: Array<{ id: number; side: 'BUY' | 'SELL' }> = [
      { id: t.bid_account_id, side: 'BUY' },
      { id: t.ask_account_id, side: 'SELL' },
    ]
    for (const c of candidates) {
      if (c.id <= 10 || c.id > 100_000_000) continue
      if (!seen.has(c.id)) {
        seen.set(c.id, {
          accountIndex: c.id,
          marketSymbol: t.market_symbol,
          lastUsd: Number.parseFloat(t.usd_amount || '0'),
          side: c.side,
          timestamp: t.timestamp,
        })
      }
    }
    if (seen.size >= 8) break
  }

  const samples = Array.from(seen.values()).slice(0, 6)
  // Resolve L1 addresses & collateral in parallel for the discovered active traders
  const enriched = await Promise.allSettled(
    samples.map(async (s): Promise<ActiveTraderSample | null> => {
      const acc = await fetchJson<{ accounts?: LighterAccount[] }>(
        `${rest}/api/v1/account?by=index&value=${s.accountIndex}`,
        signal,
      )
      const a = acc.accounts?.[0]
      if (
        !a ||
        !a.l1_address ||
        a.l1_address === '0x0000000000000000000000000000000000000000'
      ) {
        return null
      }
      return {
        ...s,
        l1Address: a.l1_address,
        collateral: a.total_asset_value || a.collateral,
      }
    }),
  )

  const result: ActiveTraderSample[] = []
  for (const item of enriched) {
    if (item.status === 'fulfilled' && item.value !== null) {
      result.push(item.value)
    }
  }
  return result
}
