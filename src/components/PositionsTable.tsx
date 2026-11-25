import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatPct, formatPrice, formatSize, formatUsd } from '../utils/format.ts'
import type { ComputedPosition } from '../utils/tradeMath.ts'

interface PositionsTableProps {
  positions: ComputedPosition[]
}

type SortKey = 'notionalUsd' | 'unrealizedPnl' | 'roePct' | 'leverage' | 'symbol'

export function PositionsTable({ positions }: PositionsTableProps) {
  const [filter, setFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('notionalUsd')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const list = q
      ? positions.filter((p) => p.symbol.toLowerCase().includes(q))
      : positions

    return [...list].sort((a, b) => {
      const mul = sortDir === 'desc' ? -1 : 1
      if (sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * mul
      return (a[sortKey] - b[sortKey]) * mul
    })
  }, [positions, filter, sortKey, sortDir])

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 opacity-40" />
    return sortDir === 'desc' ? (
      <ArrowDown className="h-3 w-3 text-[var(--color-ink)]" />
    ) : (
      <ArrowUp className="h-3 w-3 text-[var(--color-ink)]" />
    )
  }

  return (
    <div className="lighter-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">
            Open Positions
          </h3>
          <span className="rounded bg-[var(--color-fill)] px-1.5 py-0.5 font-mono-num text-[11px] text-[var(--color-dim)]">
            {positions.length}
          </span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-meta)]" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter market..."
            className="h-7.5 w-44 rounded-md border border-[var(--color-line)] bg-[#06060c] pl-8 pr-2.5 text-[12px] text-[var(--color-ink)] placeholder:text-[var(--color-faint)] focus:border-[var(--color-line-strong)] focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-line)] text-[11px] font-medium text-[var(--color-meta)]">
              <th className="px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleSort('symbol')}
                  className="inline-flex items-center gap-1 hover:text-[var(--color-ink)] cursor-pointer"
                >
                  Market {renderSortIcon('symbol')}
                </button>
              </th>
              <th className="px-3 py-2.5">Side / Lev</th>
              <th className="px-3 py-2.5 text-right">Size</th>
              <th className="px-3 py-2.5 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('notionalUsd')}
                  className="inline-flex items-center gap-1 hover:text-[var(--color-ink)] cursor-pointer"
                >
                  Position Value {renderSortIcon('notionalUsd')}
                </button>
              </th>
              <th className="px-3 py-2.5 text-right">Entry Price</th>
              <th className="px-3 py-2.5 text-right">Mark Price</th>
              <th className="px-3 py-2.5 text-right">Liq. Price</th>
              <th className="px-3 py-2.5 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('unrealizedPnl')}
                  className="inline-flex items-center gap-1 hover:text-[var(--color-ink)] cursor-pointer"
                >
                  Unrealized PnL {renderSortIcon('unrealizedPnl')}
                </button>
              </th>
              <th className="px-3 py-2.5 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('roePct')}
                  className="inline-flex items-center gap-1 hover:text-[var(--color-ink)] cursor-pointer"
                >
                  ROE {renderSortIcon('roePct')}
                </button>
              </th>
              <th className="px-4 py-2.5 text-right">Funding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line)] text-[12px]">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-10 text-center text-[var(--color-meta)]"
                >
                  {positions.length === 0
                    ? 'No open positions on this account.'
                    : 'No positions match your filter.'}
                </td>
              </tr>
            ) : (
              filtered.map((pos) => {
                const isUp = pos.unrealizedPnl >= 0
                return (
                  <tr
                    key={pos.marketId}
                    className="hover:bg-[var(--color-fill)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--color-ink)]">
                          {pos.symbol}
                        </span>
                        <span className="rounded bg-[var(--color-fill)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--color-meta)] border border-[var(--color-line)]">
                          {pos.marginMode}
                        </span>
                        {pos.openOrderCount > 0 && (
                          <span
                            className="rounded bg-[#d2f2ff]/10 px-1.5 py-0.5 font-mono-num text-[10px] text-[#d2f2ff]"
                            title={`${pos.openOrderCount} open resting orders`}
                          >
                            {pos.openOrderCount} ord
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono-num text-[10px] font-semibold ${
                            pos.side === 'LONG'
                              ? 'bg-[var(--color-up)]/15 text-[var(--color-up)]'
                              : 'bg-[var(--color-down)]/15 text-[var(--color-down)]'
                          }`}
                        >
                          {pos.side}
                        </span>
                        <span className="font-mono-num text-[11px] text-[var(--color-dim)]">
                          {pos.leverage > 0
                            ? `${pos.leverage >= 10 ? Math.round(pos.leverage) : pos.leverage.toFixed(1)}x`
                            : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono-num text-[var(--color-ink)]">
                      {formatSize(pos.size)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono-num font-medium text-[var(--color-ink)]">
                      {formatUsd(pos.notionalUsd)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono-num text-[var(--color-dim)]">
                      {formatPrice(pos.entryPrice)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono-num text-[var(--color-ink)]">
                      {formatPrice(pos.markPrice)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono-num text-[var(--color-warn)]">
                      {pos.liquidationPrice > 0
                        ? formatPrice(pos.liquidationPrice)
                        : '—'}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-mono-num font-medium ${
                        isUp ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'
                      }`}
                    >
                      {formatUsd(pos.unrealizedPnl, { showSign: true })}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-mono-num ${
                        isUp ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'
                      }`}
                    >
                      {formatPct(pos.roePct)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono-num ${
                        pos.fundingPaid > 0
                          ? 'text-[var(--color-up)]'
                          : pos.fundingPaid < 0
                            ? 'text-[var(--color-down)]'
                            : 'text-[var(--color-meta)]'
                      }`}
                    >
                      {pos.fundingPaid !== 0
                        ? formatUsd(pos.fundingPaid, { showSign: true })
                        : '$0.00'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
