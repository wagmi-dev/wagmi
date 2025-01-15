import type { ContractConfig } from '../config.js'
import type { Compute } from '../types.js'
import { blockExplorer } from './blockExplorer.js'

export type EtherscanConfig<chainId extends number> = {
  /**
   * Etherscan API key.
   *
   * Create or manage keys at https://etherscan.io/myapikey
   */
  apiKey: string
  /**
   * Duration in milliseconds to cache ABIs.
   *
   * @default 1_800_000 // 30m in ms
   */
  cacheDuration?: number | undefined
  /**
   * Chain ID to use for fetching ABI.
   *
   * If `address` is an object, `chainId` is used to select the address.
   *
   * View supported chains on the [Etherscan docs](https://docs.etherscan.io/etherscan-v2/getting-started/supported-chains).
   */
  chainId: (chainId extends ChainId ? chainId : never) | (ChainId & {})
  /**
   * Contracts to fetch ABIs for.
   */
  contracts: Compute<Omit<ContractConfig<ChainId, chainId>, 'abi'>>[]
}

/**
 * Fetches contract ABIs from Etherscan.
 */
export function etherscan<chainId extends ChainId>(
  config: EtherscanConfig<chainId>,
) {
  const { apiKey, cacheDuration, chainId } = config

  const contracts = config.contracts.map((x) => ({
    ...x,
    address:
      typeof x.address === 'string' ? { [chainId]: x.address } : x.address,
  })) as Omit<ContractConfig, 'abi'>[]

  return blockExplorer({
    apiKey,
    baseUrl: 'https://api.etherscan.io/v2/api',
    cacheDuration,
    chainId,
    contracts,
    getAddress({ address }) {
      if (!address) throw new Error('address is required')
      if (typeof address === 'string') return address
      const contractAddress = address[chainId]
      if (!contractAddress)
        throw new Error(
          `No address found for chainId "${chainId}". Make sure chainId "${chainId}" is set as an address.`,
        )
      return contractAddress
    },
    name: 'Etherscan',
  })
}

// Supported chains
// https://docs.etherscan.io/etherscan-v2/getting-started/supported-chains
type ChainId =
  | 1 // Ethereum Mainnet
  | 11155111 // Sepolia Testnet
  | 17000 // Holesky Testnet
  | 56 // BNB Smart Chain Mainnet
  | 97 // BNB Smart Chain Testnet
  | 137 // Polygon Mainnet
  | 80002 // Polygon Amoy Testnet
  | 1101 // Polygon zkEVM Mainnet
  | 2442 // Polygon zkEVM Cardona Testnet
  | 8453 // Base Mainnet
  | 84532 // Base Sepolia Testnet
  | 42161 // Arbitrum One Mainnet
  | 42170 // Arbitrum Nova Mainnet
  | 421614 // Arbitrum Sepolia Testnet
  | 59144 // Linea Mainnet
  | 59141 // Linea Sepolia Testnet
  | 250 // Fantom Opera Mainnet
  | 4002 // Fantom Testnet
  | 81457 // Blast Mainnet
  | 168587773 // Blast Sepolia Testnet
  | 10 // OP Mainnet
  | 11155420 // OP Sepolia Testnet
  | 43114 // Avalanche C-Chain
  | 43113 // Avalanche Fuji Testnet
  | 199 // BitTorrent Chain Mainnet
  | 1028 // BitTorrent Chain Testnet
  | 42220 // Celo Mainnet
  | 44787 // Celo Alfajores Testnet
  | 25 // Cronos Mainnet
  | 252 // Fraxtal Mainnet
  | 2522 // Fraxtal Testnet
  | 100 // Gnosis
  | 255 // Kroma Mainnet
  | 2358 // Kroma Sepolia Testnet
  | 5000 // Mantle Mainnet
  | 5003 // Mantle Sepolia Testnet
  | 1284 // Moonbeam Mainnet
  | 1285 // Moonriver Mainnet
  | 1287 // Moonbase Alpha Testnet
  | 204 // opBNB Mainnet
  | 5611 // opBNB Testnet
  | 534352 // Scroll Mainnet
  | 534351 // Scroll Sepolia Testnet
  | 167000 // Taiko Mainnet
  | 167009 // Taiko Hekla L2 Testnet
  | 1111 // WEMIX3.0 Mainnet
  | 1112 // WEMIX3.0 Testnet
  | 324 // zkSync Mainnet
  | 300 // zkSync Sepolia Testnet
  | 660279 // Xai Mainnet
  | 37714555429 // Xai Sepolia Testnet
  | 50 // XDC Mainnet
  | 51 // XDC Apothem Testnet
  | 33139 // ApeChain Mainnet
  | 33111 // ApeChain Curtis Testnet
  | 480 // World Mainnet
  | 4801 // World Sepolia Testnet
  | 50104 // Sophon Mainnet
  | 531050104 // Sophon Sepolia Testnet
  | 146 // Sonic Mainnet
  | 57054 // Sonic Blaze Testnet
