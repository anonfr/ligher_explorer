import type {
  LighterAccount,
  LighterMarket,
  LighterPosition,
  LighterTrade,
  WsMarketStat,
} from '../types/lighter.ts'
import { toNum } from './format.ts'

export interface ComputedPosition {
  marketId: number
  symbol: string
  marketType: string
  side: 'LONG' | 'SHORT'
  size: number
  entryPrice: number
  markPrice: number
  notionalUsd: number
  leverage: number
  initialMarginFraction: number
  marginMode: 'Cross' | 'Isolated'
  allocatedMargin: number
  unrealizedPnl: number
  roePct: number
  liquidationPrice: number
  fundingPaid: number
  openOrderCount: number
  fundingRateHourly?: number
}

export function computePositions(
  positions: LighterPosition[],
  marketsById: Record<number, LighterMarket>,
  liveStats: Record<string, WsMarketStat>,
): ComputedPosition[] {
  const result: ComputedPosition[] = []

  for (const pos of positions) {
    const size = Math.abs(toNum(pos.position))
    if (size <= 0) continue

    const market = marketsById[pos.market_id]
    const live = liveStats[String(pos.market_id)]
    const entryPrice = toNum(pos.avg_entry_price)
    const liveMark =
      toNum(live?.mark_price) ||
      toNum(live?.mid_price) ||
      toNum(market?.mark_price) ||
      toNum(market?.last_trade_price)
    const fallbackMark = size > 0 ? Math.abs(toNum(pos.position_value)) / size : 0
    const markPrice = liveMark > 0 ? liveMark : fallbackMark

    const notionalUsd = Math.abs(toNum(pos.position_value)) || size * markPrice
    const imf = toNum(pos.initial_margin_fraction)
    const leverage = imf > 0 ? 100 / imf : 0
    const allocatedMargin =
      pos.margin_mode === 1
        ? toNum(pos.allocated_margin)
        : imf > 0
          ? (notionalUsd * imf) / 100
          : 0
    const unrealizedPnl = toNum(pos.unrealized_pnl)
    const roePct = allocatedMargin > 0 ? (unrealizedPnl / allocatedMargin) * 100 : 0
    const fundingRateRaw =
      live?.current_funding_rate !== undefined
        ? toNum(live.current_funding_rate)
        : live?.funding_rate !== undefined
          ? toNum(live.funding_rate)
          : market?.funding_rate

    result.push({
      marketId: pos.market_id,
      symbol: pos.symbol || market?.symbol || `#${pos.market_id}`,
      marketType: market?.market_type ?? 'perp',
      side: pos.sign >= 0 ? 'LONG' : 'SHORT',
      size,
      entryPrice,
      markPrice,
      notionalUsd,
      leverage,
      initialMarginFraction: imf,
      marginMode: pos.margin_mode === 1 ? 'Isolated' : 'Cross',
      allocatedMargin,
      unrealizedPnl,
      roePct,
      liquidationPrice: toNum(pos.liquidation_price),
      fundingPaid: toNum(pos.total_funding_paid_out),
      openOrderCount: pos.open_order_count ?? 0,
      fundingRateHourly: fundingRateRaw,
    })
  }

  result.sort((a, b) => b.notionalUsd - a.notionalUsd)
  return result
}

export interface ResolvedTrade {
  trade: LighterTrade
  side: 'BUY' | 'SELL' | 'SELF'
  role: 'MAKER' | 'TAKER'
  size: number
  price: number
  usdAmount: number
  realizedPnl: number
  hasRealizedPnl: boolean
  feeUsd: number
  feeRatePct: number
}

export function resolveTradeForAccount(
  trade: LighterTrade,
  accountIndex: number,
): ResolvedTrade {
  const isBid = trade.bid_account_id === accountIndex
  const isAsk = trade.ask_account_id === accountIndex
  const usdAmount = toNum(trade.usd_amount)
  const size = toNum(trade.size)
  const price = toNum(trade.price)

  let side: 'BUY' | 'SELL' | 'SELF' = 'BUY'
  let role: 'MAKER' | 'TAKER' = 'TAKER'
  let realizedPnl = 0
  let hasRealizedPnl = false
  let feeUnits = 0

  if (isBid && isAsk) {
    side = 'SELF'
    role = 'MAKER'
    realizedPnl = toNum(trade.bid_account_pnl) + toNum(trade.ask_account_pnl)
    hasRealizedPnl =
      trade.bid_account_pnl !== undefined || trade.ask_account_pnl !== undefined
    feeUnits = (trade.maker_fee ?? 0) + (trade.taker_fee ?? 0)
  } else if (isBid) {
    side = 'BUY'
    role = trade.is_maker_ask ? 'TAKER' : 'MAKER'
    realizedPnl = toNum(trade.bid_account_pnl)
    hasRealizedPnl = trade.bid_account_pnl !== undefined
    feeUnits = role === 'MAKER' ? (trade.maker_fee ?? 0) : (trade.taker_fee ?? 0)
  } else {
    side = 'SELL'
    role = trade.is_maker_ask ? 'MAKER' : 'TAKER'
    realizedPnl = toNum(trade.ask_account_pnl)
    hasRealizedPnl = trade.ask_account_pnl !== undefined
    feeUnits = role === 'MAKER' ? (trade.maker_fee ?? 0) : (trade.taker_fee ?? 0)
  }

  // Lighter fee units scale: 100 = 1 bp (0.01%), 1_000_000 = 100%
  const feeRateRatio = feeUnits / 1_000_000
  const feeRatePct = feeRateRatio * 100
  const feeUsd = usdAmount * feeRateRatio

  return {
    trade,
    side,
    role,
    size,
    price,
    usdAmount,
    realizedPnl,
    hasRealizedPnl,
    feeUsd,
    feeRatePct,
  }
}

export interface TraderSummaryStats {
  equity: number
  collateral: number
  availableBalance: number
  unrealizedPnl: number
  totalNotional: number
  longNotional: number
  shortNotional: number
  longPct: number
  shortPct: number
  effectiveLeverage: number
  marginUsagePct: number
  openPositionsCount: number
  totalOrdersCount: number
}

export function computeAccountSummary(
  account: LighterAccount,
  positions: ComputedPosition[],
  liveUserStats?: {
    collateral: string
    portfolio_value: string
    leverage: string
    available_balance: string
    margin_usage: string
  } | null,
): TraderSummaryStats {
  const collateral = liveUserStats
    ? toNum(liveUserStats.collateral)
    : toNum(account.collateral)
  const availableBalance = liveUserStats
    ? toNum(liveUserStats.available_balance)
    : toNum(account.available_balance)
  const unrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0)

  const equity = liveUserStats
    ? toNum(liveUserStats.portfolio_value)
    : toNum(account.total_asset_value) || collateral + unrealizedPnl

  let longNotional = 0
  let shortNotional = 0
  for (const p of positions) {
    if (p.side === 'LONG') longNotional += p.notionalUsd
    else shortNotional += p.notionalUsd
  }
  const totalNotional = longNotional + shortNotional
  const longPct = totalNotional > 0 ? (longNotional / totalNotional) * 100 : 50
  const shortPct = totalNotional > 0 ? (shortNotional / totalNotional) * 100 : 50

  const effectiveLeverage = liveUserStats
    ? toNum(liveUserStats.leverage)
    : equity > 0
      ? totalNotional / equity
      : 0

  const marginUsagePct = liveUserStats
    ? toNum(liveUserStats.margin_usage)
    : collateral > 0
      ? Math.max(0, Math.min(100, ((collateral - availableBalance) / collateral) * 100))
      : 0

  return {
    equity,
    collateral,
    availableBalance,
    unrealizedPnl,
    totalNotional,
    longNotional,
    shortNotional,
    longPct,
    shortPct,
    effectiveLeverage,
    marginUsagePct,
    openPositionsCount: positions.length,
    totalOrdersCount: account.total_order_count ?? 0,
  }
}

export interface MarketBreakdownRow {
  marketId: number
  symbol: string
  tradesCount: number
  volumeUsd: number
  realizedPnl: number
  feesUsd: number
  makerCount: number
  takerCount: number
  wins: number
  losses: number
}

export interface TradeAnalyticsSummary {
  loadedTradesCount: number
  loadedVolumeUsd: number
  realizedPnlSum: number
  feesPaidSum: number
  makerPct: number
  winRatePct: number
  closedTradesCount: number
  winningTrades: number
  losingTrades: number
  bestTradePnl: number
  worstTradePnl: number
  byMarket: MarketBreakdownRow[]
}

export function computeTradeAnalytics(
  resolvedTrades: ResolvedTrade[],
): TradeAnalyticsSummary {
  const byMarketMap = new Map<number, MarketBreakdownRow>()
  let loadedVolumeUsd = 0
  let realizedPnlSum = 0
  let feesPaidSum = 0
  let makerCount = 0
  let wins = 0
  let losses = 0
  let bestTradePnl = 0
  let worstTradePnl = 0

  for (const r of resolvedTrades) {
    loadedVolumeUsd += r.usdAmount
    feesPaidSum += r.feeUsd
    if (r.role === 'MAKER') makerCount++

    if (r.hasRealizedPnl && Math.abs(r.realizedPnl) > 1e-9) {
      realizedPnlSum += r.realizedPnl
      if (r.realizedPnl > 0) wins++
      else losses++
      if (r.realizedPnl > bestTradePnl) bestTradePnl = r.realizedPnl
      if (r.realizedPnl < worstTradePnl) worstTradePnl = r.realizedPnl
    }

    const mid = r.trade.market_id
    let row = byMarketMap.get(mid)
    if (!row) {
      row = {
        marketId: mid,
        symbol: r.trade.market_symbol || `#${mid}`,
        tradesCount: 0,
        volumeUsd: 0,
        realizedPnl: 0,
        feesUsd: 0,
        makerCount: 0,
        takerCount: 0,
        wins: 0,
        losses: 0,
      }
      byMarketMap.set(mid, row)
    }

    row.tradesCount++
    row.volumeUsd += r.usdAmount
    row.feesUsd += r.feeUsd
    if (r.role === 'MAKER') row.makerCount++
    else row.takerCount++

    if (r.hasRealizedPnl && Math.abs(r.realizedPnl) > 1e-9) {
      row.realizedPnl += r.realizedPnl
      if (r.realizedPnl > 0) row.wins++
      else row.losses++
    }
  }

  const closedTradesCount = wins + losses
  const byMarket = Array.from(byMarketMap.values()).sort(
    (a, b) => b.volumeUsd - a.volumeUsd,
  )

  return {
    loadedTradesCount: resolvedTrades.length,
    loadedVolumeUsd,
    realizedPnlSum,
    feesPaidSum,
    makerPct:
      resolvedTrades.length > 0 ? (makerCount / resolvedTrades.length) * 100 : 0,
    winRatePct: closedTradesCount > 0 ? (wins / closedTradesCount) * 100 : 0,
    closedTradesCount,
    winningTrades: wins,
    losingTrades: losses,
    bestTradePnl,
    worstTradePnl,
    byMarket,
  }
}

export function exportTradesCsv(
  trades: ResolvedTrade[],
  accountIndex: number,
  networkLabel: string,
) {
  const headers = [
    'timestamp_iso',
    'trade_id',
    'market',
    'kind',
    'side',
    'role',
    'size',
    'price',
    'usd_amount',
    'realized_pnl',
    'fee_usd',
    'block_height',
    'tx_hash',
  ]
  const rows = trades.map((r) => [
    new Date(r.trade.timestamp).toISOString(),
    r.trade.trade_id_str || String(r.trade.trade_id),
    r.trade.market_symbol,
    r.trade.market_kind,
    r.side,
    r.role,
    r.size,
    r.price,
    r.usdAmount,
    r.hasRealizedPnl ? r.realizedPnl : '',
    r.feeUsd.toFixed(6),
    r.trade.block_height,
    r.trade.tx_hash,
  ])
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `lighter-${networkLabel.toLowerCase().replace(/\s+/g, '-')}-account-${accountIndex}-trades.csv`
  link.click()
  URL.revokeObjectURL(url)
}
