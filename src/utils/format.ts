export function toNum(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0
  const n = typeof val === 'number' ? val : Number.parseFloat(val)
  return Number.isFinite(n) ? n : 0
}

export function formatUsd(
  value: number,
  options: { compact?: boolean; showSign?: boolean; decimals?: number } = {},
): string {
  const { compact = false, showSign = false, decimals } = options
  if (!Number.isFinite(value)) return '$0.00'

  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : showSign && value > 0 ? '+' : ''

  if (compact) {
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
    if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`
  }

  let frac = decimals
  if (frac === undefined) {
    if (abs === 0) frac = 2
    else if (abs >= 1) frac = 2
    else if (abs >= 0.01) frac = 4
    else frac = 6
  }

  return `${sign}$${abs.toLocaleString('en-US', {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  })}`
}

export function formatPrice(value: number, priceDecimals?: number): string {
  if (!Number.isFinite(value) || value === 0) return '—'
  const abs = Math.abs(value)
  let frac = priceDecimals
  if (frac === undefined) {
    if (abs >= 1000) frac = 2
    else if (abs >= 10) frac = 3
    else if (abs >= 0.1) frac = 4
    else frac = 6
  } else {
    frac = Math.min(Math.max(frac, 2), 6)
  }
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  })}`
}

export function formatSize(value: number, sizeDecimals?: number): string {
  if (!Number.isFinite(value)) return '0'
  const abs = Math.abs(value)
  const frac =
    sizeDecimals !== undefined
      ? Math.min(sizeDecimals, 5)
      : abs >= 1000
        ? 1
        : abs >= 1
          ? 3
          : 5
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: frac,
  })
}

export function formatPct(value: number, showSign = true): string {
  if (!Number.isFinite(value)) return '0.00%'
  const sign = value > 0 && showSign ? '+' : value < 0 ? '-' : ''
  return `${sign}${Math.abs(value).toFixed(2)}%`
}

export function formatInt(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return Math.round(value).toLocaleString('en-US')
}

export function shortenAddress(addr: string, head = 6, tail = 4): string {
  if (!addr) return ''
  if (addr.length <= head + tail + 2) return addr
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`
}

export function formatRelativeTime(timestampMs: number): string {
  const diffSec = Math.floor((Date.now() - timestampMs) / 1000)
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return new Date(timestampMs).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function formatExactTime(timestampMs: number): string {
  return new Date(timestampMs).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}
