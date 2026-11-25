import { Bookmark, Trash2, X } from 'lucide-react'
import { NETWORKS, type NetworkId } from '../config/networks.ts'
import type { WatchlistEntry } from '../types/lighter.ts'
import { shortenAddress } from '../utils/format.ts'

interface WatchlistDrawerProps {
  open: boolean
  onClose: () => void
  entries: WatchlistEntry[]
  onSelect: (address: string, network: NetworkId) => void
  onRemove: (id: string) => void
  onRename: (id: string, label: string) => void
}

export function WatchlistDrawer({
  open,
  onClose,
  entries,
  onSelect,
  onRemove,
  onRename,
}: WatchlistDrawerProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-md flex-col border-l border-[var(--color-line)] bg-[#0b0b12] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-[var(--color-up)]" />
            <h2 className="text-[14px] font-semibold text-[var(--color-ink)]">
              Tracked Traders
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-meta)] hover:bg-[var(--color-fill)] hover:text-[var(--color-ink)] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-line)]">
          {entries.length === 0 ? (
            <div className="p-8 text-center text-[12.5px] text-[var(--color-meta)]">
              No saved addresses yet. Inspect any trader and click{' '}
              <span className="text-[var(--color-ink)]">Track Address</span> to pin them
              here.
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="p-4 hover:bg-[var(--color-fill)]/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={entry.label}
                        onChange={(e) => onRename(entry.id, e.target.value)}
                        placeholder="Add trader label..."
                        className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-[13px] font-semibold text-[var(--color-ink)] hover:border-[var(--color-line)] focus:border-[var(--color-line-strong)] focus:bg-[var(--color-surface)] focus:outline-none"
                      />
                      <span className="shrink-0 rounded bg-[var(--color-fill)] px-1.5 py-0.5 text-[10px] text-[var(--color-dim)] border border-[var(--color-line)]">
                        {NETWORKS[entry.network].shortLabel}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(entry.address, entry.network)
                        onClose()
                      }}
                      className="block font-mono-num text-[11.5px] text-[var(--color-link)] hover:underline cursor-pointer"
                    >
                      {shortenAddress(entry.address, 10, 8)}
                      {entry.accountIndex ? ` · #${entry.accountIndex}` : ''}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(entry.id)}
                    className="rounded p-1.5 text-[var(--color-meta)] hover:bg-[var(--color-down)]/15 hover:text-[var(--color-down)] cursor-pointer"
                    title="Remove from watchlist"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
