import { Bookmark, ExternalLink, Search, X } from 'lucide-react'
import { useEffect, useRef, type FormEvent } from 'react'
import { NETWORK_LIST, NETWORKS, type NetworkId } from '../config/networks.ts'

interface TopNavProps {
  network: NetworkId
  onNetworkChange: (network: NetworkId) => void
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  onSearchSubmit: (q: string) => void
  onGoHome: () => void
  wsStatus: 'connecting' | 'connected' | 'disconnected'
  watchlistCount: number
  isWatchlistOpen: boolean
  onToggleWatchlist: () => void
  isLoading: boolean
}

export function TopNav({
  network,
  onNetworkChange,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  onGoHome,
  wsStatus,
  watchlistCount,
  isWatchlistOpen,
  onToggleWatchlist,
  isLoading,
}: TopNavProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const netCfg = NETWORKS[network]

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onSearchSubmit(searchQuery.trim())
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[#06060c]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {/* Left: Lighter Brand Mark + Network Switcher */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onGoHome}
            className="group flex items-center gap-2.5 text-left transition-opacity hover:opacity-90 cursor-pointer"
          >
            {/* Geometric Lighter Logomark */}
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-white text-[#06060c] shadow-sm">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M3 2.5H6.2V13.5H3V2.5Z" fill="currentColor" />
                <path d="M9.4 5.5H12.6V13.5H9.4V5.5Z" fill="currentColor" />
                <path d="M9.4 2.5H12.6V4.2H9.4V2.5Z" fill="currentColor" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
                Lighter
              </span>
              <span className="rounded bg-[var(--color-fill)] px-1.5 py-0.5 font-mono-num text-[10px] font-medium tracking-wider text-[var(--color-dim)] uppercase border border-[var(--color-line)]">
                Explorer
              </span>
            </div>
          </button>

          {/* Network Switcher Pill */}
          <div className="flex items-center rounded-lg bg-[var(--color-surface)] p-0.5 border border-[var(--color-line)]">
            {NETWORK_LIST.map((item) => {
              const active = item.id === network
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNetworkChange(item.id)}
                  className={`flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--color-elevated)] text-[var(--color-ink)] shadow-sm'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      item.id === 'robinhood'
                        ? active
                          ? 'bg-[var(--color-up)]'
                          : 'bg-[var(--color-up)]/40'
                        : active
                          ? 'bg-[#d2f2ff]'
                          : 'bg-[#d2f2ff]/40'
                    }`}
                  />
                  {item.shortLabel}
                </button>
              )
            })}
          </div>
        </div>

        {/* Center: Address / Account Search */}
        <form
          onSubmit={handleSubmit}
          className="order-3 w-full lg:order-2 lg:max-w-[520px] lg:flex-1"
        >
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[var(--color-meta)]" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder={`Track trader by L1 address (0x...) or Account # on ${netCfg.shortLabel}`}
              className="h-9 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] pl-9 pr-20 font-mono-num text-[12px] text-[var(--color-ink)] placeholder:font-sans placeholder:text-[var(--color-faint)] focus:border-[var(--color-line-strong)] focus:bg-[var(--color-surface-2)] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                className="absolute right-14 rounded p-1 text-[var(--color-meta)] hover:text-[var(--color-ink)] cursor-pointer"
                title="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="absolute right-1.5 rounded-md bg-[var(--color-fill)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-ink)] border border-[var(--color-line)] hover:bg-[var(--color-elevated)] disabled:opacity-40 transition-colors cursor-pointer"
            >
              {isLoading ? '...' : 'Track'}
            </button>
          </div>
        </form>

        {/* Right: WS Status + Watchlist + Official Explorer Link */}
        <div className="order-2 flex items-center gap-2 lg:order-3">
          <div
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[11px] text-[var(--color-dim)]"
            title={`WebSocket stream: ${wsStatus}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                wsStatus === 'connected'
                  ? 'bg-[var(--color-up)] animate-pulse'
                  : wsStatus === 'connecting'
                    ? 'bg-[var(--color-warn)]'
                    : 'bg-[var(--color-down)]'
              }`}
            />
            <span>
              {wsStatus === 'connected'
                ? 'Live'
                : wsStatus === 'connecting'
                  ? 'Syncing'
                  : 'Offline'}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleWatchlist}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
              isWatchlistOpen
                ? 'border-[var(--color-line-strong)] bg-[var(--color-elevated)] text-[var(--color-ink)]'
                : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-dim)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tracked</span>
            {watchlistCount > 0 && (
              <span className="rounded bg-[var(--color-fill)] px-1.5 py-0.2 font-mono-num text-[10px] text-[var(--color-ink)]">
                {watchlistCount}
              </span>
            )}
          </button>

          <a
            href={netCfg.explorerWebUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] text-[var(--color-meta)] hover:text-[var(--color-ink)] transition-colors"
            title={`Open ${netCfg.label} Explorer`}
          >
            <span>Official</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </header>
  )
}
