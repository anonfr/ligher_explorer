import { NETWORKS, type NetworkId } from '../config/networks.ts'
import type {
  LighterAssetBalance,
  LighterPosition,
  LighterTrade,
  WsAccountVolumeStats,
  WsMarketStat,
  WsUserStats,
} from '../types/lighter.ts'

export interface AccountAllMessage {
  channel: string
  account: number
  assets?: Record<string, LighterAssetBalance>
  positions?: Record<string, LighterPosition>
  trades?: Record<string, LighterTrade[]>
  daily_trades_count?: number
  daily_volume?: number
  weekly_trades_count?: number
  weekly_volume?: number
  monthly_trades_count?: number
  monthly_volume?: number
  total_trades_count?: number
  total_volume?: number
}

export interface LighterWsHandlers {
  onStatus?: (status: 'connecting' | 'connected' | 'disconnected') => void
  onMarketStats?: (stats: Record<string, WsMarketStat>) => void
  onUserStats?: (accountIndex: number, stats: WsUserStats) => void
  onAccountAll?: (accountIndex: number, payload: AccountAllMessage) => void
  onAccountTrades?: (
    accountIndex: number,
    trades: LighterTrade[],
    volumeStats: WsAccountVolumeStats,
  ) => void
}

export class LighterWsClient {
  private network: NetworkId
  private handlers: LighterWsHandlers
  private ws: WebSocket | null = null
  private accountIndex: number | null = null
  private closedManually = false
  private reconnectTimer: number | null = null

  constructor(network: NetworkId, handlers: LighterWsHandlers) {
    this.network = network
    this.handlers = handlers
  }

  public connect(accountIndex: number | null) {
    this.accountIndex = accountIndex
    this.closedManually = false
    this.openSocket()
  }

  public setAccountIndex(accountIndex: number | null) {
    if (this.accountIndex === accountIndex) return
    const prev = this.accountIndex
    this.accountIndex = accountIndex

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (prev !== null) {
        this.send({ type: 'unsubscribe', channel: `account_all/${prev}` })
        this.send({ type: 'unsubscribe', channel: `account_all_trades/${prev}` })
        this.send({ type: 'unsubscribe', channel: `user_stats/${prev}` })
      }
      if (accountIndex !== null) {
        this.subscribeAccountChannels(accountIndex)
      }
    }
  }

  public destroy() {
    this.closedManually = true
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onerror = null
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
  }

  private openSocket() {
    if (this.closedManually) return
    this.handlers.onStatus?.('connecting')

    const ws = new WebSocket(NETWORKS[this.network].wsUrl)
    this.ws = ws

    ws.onopen = () => {
      if (this.closedManually) return
      this.handlers.onStatus?.('connected')
      this.send({ type: 'subscribe', channel: 'market_stats/all', partial: true })
      if (this.accountIndex !== null) {
        this.subscribeAccountChannels(this.accountIndex)
      }
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as Record<string, unknown>
        const type = msg.type as string | undefined
        if (type === 'ping') {
          this.send({ type: 'pong' })
          return
        }
        const channel = msg.channel as string | undefined
        if (!channel) return

        if (channel === 'market_stats:all' && msg.market_stats) {
          this.handlers.onMarketStats?.(msg.market_stats as Record<string, WsMarketStat>)
        } else if (channel.startsWith('user_stats:') && msg.stats) {
          const idx = Number.parseInt(channel.split(':')[1] ?? '', 10)
          if (!Number.isNaN(idx)) {
            this.handlers.onUserStats?.(idx, msg.stats as WsUserStats)
          }
        } else if (channel.startsWith('account_all:')) {
          const idx = Number.parseInt(channel.split(':')[1] ?? '', 10)
          if (!Number.isNaN(idx)) {
            this.handlers.onAccountAll?.(idx, msg as unknown as AccountAllMessage)
          }
        } else if (channel.startsWith('account_all_trades:')) {
          const idx = Number.parseInt(channel.split(':')[1] ?? '', 10)
          if (!Number.isNaN(idx)) {
            const rawTrades = (msg.trades ?? {}) as Record<string, LighterTrade[]>
            const flat: LighterTrade[] = []
            for (const list of Object.values(rawTrades)) {
              if (Array.isArray(list)) flat.push(...list)
            }
            flat.sort((a, b) => b.timestamp - a.timestamp)
            this.handlers.onAccountTrades?.(idx, flat, {
              daily_volume: msg.daily_volume as number | undefined,
              weekly_volume: msg.weekly_volume as number | undefined,
              monthly_volume: msg.monthly_volume as number | undefined,
              total_volume: msg.total_volume as number | undefined,
            })
          }
        }
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      this.handlers.onStatus?.('disconnected')
      if (!this.closedManually) {
        this.reconnectTimer = window.setTimeout(() => {
          this.openSocket()
        }, 2500)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }

  private subscribeAccountChannels(accountIndex: number) {
    this.send({ type: 'subscribe', channel: `account_all/${accountIndex}` })
    this.send({ type: 'subscribe', channel: `account_all_trades/${accountIndex}` })
    this.send({ type: 'subscribe', channel: `user_stats/${accountIndex}` })
  }

  private send(payload: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload))
    }
  }
}
