export type NetworkId = 'mainnet' | 'robinhood'

export interface NetworkConfig {
  id: NetworkId
  label: string
  shortLabel: string
  subtitle: string
  chainId: number
  collateralSymbol: string
  restBaseUrl: string
  wsUrl: string
  explorerApiBaseUrl: string
  explorerWebUrl: string
  appWebUrl: string
  accentBadge: string
}

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  mainnet: {
    id: 'mainnet',
    label: 'Lighter Mainnet',
    shortLabel: 'Lighter',
    subtitle: 'zkLighter L2 Rollup (Chain 304)',
    chainId: 304,
    collateralSymbol: 'USDC',
    restBaseUrl: 'https://mainnet.zklighter.elliot.ai',
    wsUrl: 'wss://mainnet.zklighter.elliot.ai/stream?readonly=true',
    explorerApiBaseUrl: 'https://explorer.elliot.ai/api',
    explorerWebUrl: 'https://app.lighter.xyz/explorer',
    appWebUrl: 'https://app.lighter.xyz',
    accentBadge: 'Mainnet',
  },
  robinhood: {
    id: 'robinhood',
    label: 'Lighter RH',
    shortLabel: 'Lighter RH',
    subtitle: 'Robinhood Chain Instance (Chain 466324)',
    chainId: 466324,
    collateralSymbol: 'USDG',
    restBaseUrl: 'https://api.rh.lighter.xyz',
    wsUrl: 'wss://api.rh.lighter.xyz/stream?readonly=true',
    explorerApiBaseUrl: 'https://explorerapi.rh.lighter.xyz/api',
    explorerWebUrl: 'https://robinhoodchain.lighter.xyz/explorer',
    appWebUrl: 'https://robinhoodchain.lighter.xyz',
    accentBadge: 'Robinhood',
  },
}

export const NETWORK_LIST: NetworkConfig[] = [NETWORKS.mainnet, NETWORKS.robinhood]
