import { InjectedConnector } from './injected'

export class MetaMaskConnector extends InjectedConnector {
  readonly name = 'MetaMask'
  readonly ready = typeof window != 'undefined' && !!window.ethereum?.isMetaMask

  #provider?: Window['ethereum']

  getProvider() {
    const { ethereum } = window

    if (ethereum?.isMetaMask)
      if (ethereum.providers)
        this.#provider = ethereum.providers.find(
          ({ isMetaMask, _events, _state }) =>
            isMetaMask && !!_events?.connect && !!_state,
        )
      else this.#provider = ethereum

    return this.#provider
  }
}
