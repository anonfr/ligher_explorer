# Lighter & Lighter RH Trader Explorer

A Hyperdash-style address and trade tracker built for **Lighter Mainnet** and **Lighter RH (Robinhood Chain)**, styled in Lighter Explorer's dark theme.

## Features

- **Dual Network Support**: Switch seamlessly between **Lighter Mainnet** (`Chain 304`) and **Lighter RH / Robinhood Chain** (`Chain 466324`), with automatic cross-network detection for any `0x...` address.
- **Address & Sub-Account Lookup**: Inspect any Ethereum L1 wallet (`0x...`) or numeric Lighter account index (`#index`), including master and sub-accounts.
- **Live WebSocket Streaming**: Real-time position updates, account equity/margin stats, market mark prices, and live executed trade fills (`?readonly=true` streams).
- **PnL & Volume Analytics**: Interactive `24H` / `7D` / `30D` / `ALL` charts (Cumulative PnL, Delta PnL, Trading Volume), win rate, maker/taker split, per-market breakdown, and CSV export.
- **Assets & ZK Explorer Logs**: Margin/spot asset balances, pool shares, and on-chain explorer logs.
- **Saved Watchlist**: Pin and label trader addresses locally in browser storage.

## Run Locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Deploy

This is a 100% static client-side Vite + React app (no backend or API keys required — all Lighter REST, Explorer, and WebSocket endpoints support CORS directly from the browser):

- **Vercel**: Import `anonfr/ligher_explorer` -> Framework Preset: **Vite**, Build Command: `npm run build`, Output Directory: `dist`.
- **Cloudflare Pages**: Connect repo -> Build command: `npm run build`, Build output directory: `dist`.
- **Netlify**: Connect repo -> Build command: `npm run build`, Publish directory: `dist`.
