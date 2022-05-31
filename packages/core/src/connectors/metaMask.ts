import { Chain } from '../types'
import { InjectedConnector, InjectedConnectorOptions } from './injected'

export type MetaMaskConnectorOptions = Pick<
  InjectedConnectorOptions,
  'shimDisconnect'
>

export class MetaMaskConnector extends InjectedConnector {
  readonly id = 'metaMask'
  readonly ready =
    typeof window != 'undefined' && !!this.#findProvider(window.ethereum)

  #switchingChains?: boolean
  #provider?: Window['ethereum']

  constructor({
    chains,
    options,
  }: {
    chains?: Chain[]
    options?: MetaMaskConnectorOptions
  } = {}) {
    super({
      chains,
      options: {
        name: 'MetaMask',
        shimDisconnect: true,
        ...options,
      },
    })

    // We need this as MetaMask can emit the "disconnect" event
    // upon switching chains. This workaround ensures that the
    // user currently isn't in the process of switching chains.
    const onDisconnect = this.onDisconnect
    super.onDisconnect = () => {
      if (this.#switchingChains) {
        this.#switchingChains = false
        return
      }
      onDisconnect()
    }
  }

  async getProvider() {
    if (typeof window !== 'undefined') {
      // TODO: Fallback to `ethereum#initialized` event for async injection
      // https://github.com/MetaMask/detect-provider#synchronous-and-asynchronous-injection=
      this.#provider = this.#findProvider(window.ethereum)
    }
    return this.#provider
  }

  async switchChain(chainId: number): Promise<Chain> {
    this.#switchingChains = true
    return super.switchChain(chainId)
  }

  #getReady(ethereum?: Ethereum) {
    const isMetaMask = !!ethereum?.isMetaMask
    if (!isMetaMask) return
    // Brave tries to make itself look like MetaMask
    // Could also try RPC `web3_clientVersion` if following is unreliable
    if (ethereum.isBraveWallet && !ethereum._events && !ethereum._state) return
    if (ethereum.isTokenary) return
    return ethereum
  }

  #findProvider(ethereum?: Ethereum) {
    if (ethereum?.providers) return ethereum.providers.find(this.#getReady)
    return this.#getReady(ethereum)
  }
}
