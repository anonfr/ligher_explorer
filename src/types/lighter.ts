import type { NetworkId } from '../config/networks.ts'

export interface LighterPosition {
  market_id: number
  symbol: string
  initial_margin_fraction: string
  open_order_count: number
  pending_order_count: number
  position_tied_order_count: number
  sign: 1 | -1 | number
  position: string
  avg_entry_price: string
  position_value: string
  unrealized_pnl: string
  realized_pnl: string
  liquidation_price: string
  total_funding_paid_out?: string
  margin_mode: number // 0 = cross, 1 = isolated
  margin_set_flag?: number
  allocated_margin: string
}

export interface LighterAssetBalance {
  symbol: string
  asset_id: number
  balance: string
  locked_balance: string
  margin_mode: string
  margin_balance: string
  multiplier?: string
}

export interface LighterPoolShare {
  public_pool_index: number
  shares_amount: number
  entry_usdc: string
}

export interface LighterAccount {
  code?: number
  account_type: number
  index: number
  account_index?: number
  l1_address: string
  cancel_all_time?: number
  total_order_count: number
  total_isolated_order_count: number
  pending_order_count: number
  available_balance: string
  status: number
  collateral: string
  transaction_time?: number
  account_trading_mode?: number
  name?: string
  description?: string
  positions: LighterPosition[]
  assets: LighterAssetBalance[]
  total_asset_value: string
  cross_asset_value: string
  cross_initial_margin_requirement?: string
  cross_maintenance_margin_requirement?: string
  shares?: LighterPoolShare[]
}

export interface LighterMarket {
  market_id: number
  symbol: string
  market_type: 'perp' | 'spot' | string
  status: string
  size_decimals: number
  price_decimals: number
  default_initial_margin_fraction?: number
  min_initial_margin_fraction?: number
  maintenance_margin_fraction?: number
  mark_price?: string
  index_price?: string
  last_trade_price?: number
  daily_trades_count?: number
  daily_quote_token_volume?: number
  daily_price_change?: number
  open_interest_usd?: string
  funding_rate?: number
}

export interface LighterAssetDetail {
  asset_id: number
  symbol: string
  decimals: number
  margin_mode: string
  index_price: string
  l1_address?: string
}

export interface LighterTrade {
  trade_id: number
  trade_id_str?: string
  tx_hash: string
  type: string
  market_id: number
  market_symbol: string
  market_kind: string
  size: string
  price: string
  usd_amount: string
  ask_id?: number
  bid_id?: number
  ask_account_id: number
  bid_account_id: number
  is_maker_ask: boolean
  block_height: number
  timestamp: number
  transaction_time?: number
  ask_account_pnl?: string
  bid_account_pnl?: string
  maker_fee?: number
  taker_fee?: number
  maker_position_size_before?: string
  taker_position_size_before?: string
  maker_entry_quote_before?: string
  taker_entry_quote_before?: string
}

export interface PnlPoint {
  timestamp: number
  trade_pnl: number
  trade_spot_pnl: number
  inflow: number
  outflow: number
  spot_inflow: number
  spot_outflow: number
  pool_pnl: number
  pool_inflow: number
  pool_outflow: number
  staking_pnl: number
  volume: number
}

export type PnlTimeframe = '24H' | '7D' | '30D' | 'ALL'

export interface ExplorerLog {
  tx_type: string
  hash: string
  time: string
  pubdata_type: string
  status: string | null
  pubdata: Record<string, unknown>
}

export interface ExplorerTotals {
  blocks: number
  batches: number
  accounts: number
  txs: number
}

export interface WsUserStats {
  collateral: string
  portfolio_value: string
  leverage: string
  available_balance: string
  margin_usage: string
  buying_power: string
  account_trading_mode?: number
}

export interface WsMarketStat {
  market_id: number
  symbol: string
  index_price?: string
  mark_price?: string
  mid_price?: string
  last_trade_price?: string
  current_funding_rate?: string
  funding_rate?: string
  daily_quote_token_volume?: number
  daily_price_change?: number
  open_interest_usd?: string
}

export interface WsAccountVolumeStats {
  daily_trades_count?: number
  daily_volume?: number
  weekly_trades_count?: number
  weekly_volume?: number
  monthly_trades_count?: number
  monthly_volume?: number
  total_trades_count?: number
  total_volume?: number
}

export interface WatchlistEntry {
  id: string
  network: NetworkId
  address: string
  accountIndex?: number
  label: string
  addedAt: number
}

export interface ActiveTraderSample {
  accountIndex: number
  l1Address?: string
  marketSymbol: string
  lastUsd: number
  side: 'BUY' | 'SELL'
  timestamp: number
  collateral?: string
}
