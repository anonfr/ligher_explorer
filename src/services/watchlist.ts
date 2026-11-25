import type { NetworkId } from '../config/networks.ts'
import type { WatchlistEntry } from '../types/lighter.ts'

const STORAGE_KEY = 'lighter_explorer_watchlist_v1'

export function loadWatchlist(): WatchlistEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as WatchlistEntry[]) : []
  } catch {
    return []
  }
}

export function saveWatchlist(entries: WatchlistEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // ignore storage quota errors
  }
}

export function makeWatchlistId(network: NetworkId, addressOrIndex: string): string {
  return `${network}:${addressOrIndex.toLowerCase()}`
}
