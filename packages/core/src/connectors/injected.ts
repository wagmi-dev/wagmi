import { providers } from 'ethers'
import { getAddress, hexValue } from 'ethers/lib/utils'

import { Chain } from '../types'
import { getInjectedName, normalizeChainId } from '../utils'
import {
  AddChainError,
  ChainNotConfiguredError,
  ConnectorNotFoundError,
  ProviderRpcError,
  ResourceUnavailableError,
  RpcError,
  SwitchChainError,
  UserRejectedRequestError,
} from '../errors'
import { Connector } from './base'
import { getClient } from '../client'

export type InjectedConnectorOptions = {
  /** Name of connector */
  name?: string | ((detectedName: string | string[]) => string)
  /**
   * MetaMask 10.9.3 emits disconnect event when chain is changed.
   * This flag prevents the `"disconnect"` event from being emitted upon switching chains.
   * @see https://github.com/MetaMask/metamask-extension/issues/13375#issuecomment-1027663334
   */
  shimChainChangedDisconnect?: boolean
  /**
   * MetaMask and other injected providers do not support programmatic disconnect.
   * This flag simulates the disconnect behavior by keeping track of connection status in storage.
   * @see https://github.com/MetaMask/metamask-extension/issues/10353
   * @default true
   */
  shimDisconnect?: boolean
}

const shimKey = 'injected.shimDisconnect'

export class InjectedConnector extends Connector<
  Window['ethereum'],
  InjectedConnectorOptions | undefined
> {
  readonly id: string
  readonly name: string
  readonly ready = typeof window != 'undefined' && !!window.ethereum

  #provider?: Window['ethereum']
  #switchingChains?: boolean

  constructor({
    chains,
    options = { shimDisconnect: true },
  }: {
    chains?: Chain[]
    options?: InjectedConnectorOptions
  } = {}) {
    super({ chains, options })

    let name = 'Injected'
    if (typeof window !== 'undefined') {
      const overrideName = options.name
      const detectedName = getInjectedName(window.ethereum)
      if (overrideName)
        name =
          typeof overrideName === 'function'
            ? overrideName(detectedName)
            : overrideName
      else
        name =
          typeof detectedName === 'string'
            ? detectedName
            : <string>detectedName[0]
    }
    this.id = 'injected'
    this.name = name
  }

  async connect({ chainId }: { chainId?: number } = {}) {
    try {
      const provider = await this.getProvider()
      if (!provider) throw new ConnectorNotFoundError()

      if (provider.on) {
        provider.on('accountsChanged', this.onAccountsChanged)
        provider.on('chainChanged', this.onChainChanged)
        provider.on('disconnect', this.onDisconnect)
      }

      this.emit('message', { type: 'connecting' })

      // Attempt to show wallet select prompt with `wallet_requestPermissions` when
      // `shimDisconnect` is active and account is in disconnected state (flag in storage)
      if (
        this.options?.shimDisconnect &&
        !getClient().storage?.getItem(shimKey)
      ) {
        const accounts = await provider.request({
          method: 'eth_accounts',
        })
        const isConnected = !!accounts[0]
        if (isConnected)
          try {
            await provider.request({
              method: 'wallet_requestPermissions',
              params: [{ eth_accounts: {} }],
            })
            // eslint-disable-next-line no-empty
          } catch (error) {}
      }

      const account = await this.getAccount()
      // Switch to chain if provided
      let id = await this.getChainId()
      let unsupported = this.isChainUnsupported(id)
      if (chainId && id !== chainId) {
        const chain = await this.switchChain(chainId)
        id = chain.id
        unsupported = this.isChainUnsupported(id)
      }

      if (this.options?.shimDisconnect)
        getClient().storage?.setItem(shimKey, true)

      return { account, chain: { id, unsupported }, provider }
    } catch (error) {
      if (this.#isUserRejectedRequestError(error))
        throw new UserRejectedRequestError(error)
      if ((<RpcError>error).code === -32002)
        throw new ResourceUnavailableError(error)
      throw error
    }
  }

  async disconnect() {
    const provider = await this.getProvider()
    if (!provider?.removeListener) return

    provider.removeListener('accountsChanged', this.onAccountsChanged)
    provider.removeListener('chainChanged', this.onChainChanged)
    provider.removeListener('disconnect', this.onDisconnect)

    if (this.options?.shimDisconnect) getClient().storage?.removeItem(shimKey)
  }

  async getAccount() {
    const provider = await this.getProvider()
    if (!provider) throw new ConnectorNotFoundError()
    const accounts = await provider.request({
      method: 'eth_requestAccounts',
    })
    // return checksum address
    return getAddress(<string>accounts[0])
  }

  async getChainId() {
    const provider = await this.getProvider()
    if (!provider) throw new ConnectorNotFoundError()
    return await provider
      .request({ method: 'eth_chainId' })
      .then(normalizeChainId)
  }

  async getProvider() {
    if (typeof window !== 'undefined' && !!window.ethereum)
      this.#provider = window.ethereum
    return this.#provider
  }

  async getSigner() {
    const [provider, account] = await Promise.all([
      this.getProvider(),
      this.getAccount(),
    ])
    return new providers.Web3Provider(
      <providers.ExternalProvider>provider,
    ).getSigner(account)
  }

  async isAuthorized() {
    try {
      if (
        this.options?.shimDisconnect &&
        !getClient().storage?.getItem(shimKey)
      )
        return false

      const provider = await this.getProvider()
      if (!provider) throw new ConnectorNotFoundError()
      const accounts = await provider.request({
        method: 'eth_accounts',
      })
      const account = accounts[0]
      return !!account
    } catch {
      return false
    }
  }

  async switchChain(chainId: number) {
    if (this.options?.shimChainChangedDisconnect) this.#switchingChains = true

    const provider = await this.getProvider()
    if (!provider) throw new ConnectorNotFoundError()
    const id = hexValue(chainId)

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: id }],
      })
      return (
        this.chains.find((x) => x.id === chainId) ?? {
          id: chainId,
          name: `Chain ${id}`,
          network: `${id}`,
          rpcUrls: { default: '' },
        }
      )
    } catch (error) {
      const chain = this.chains.find((x) => x.id === chainId)
      if (!chain) throw new ChainNotConfiguredError()

      // Indicates chain is not added to provider
      if ((<ProviderRpcError>error).code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: id,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: [chain.rpcUrls.default],
                blockExplorerUrls: this.getBlockExplorerUrls(chain),
              },
            ],
          })
          return chain
        } catch (addError) {
          if (this.#isUserRejectedRequestError(addError))
            throw new UserRejectedRequestError(error)
          throw new AddChainError()
        }
      }

      if (this.#isUserRejectedRequestError(error))
        throw new UserRejectedRequestError(error)
      throw new SwitchChainError(error)
    }
  }

  async watchAsset({
    address,
    decimals = 18,
    image,
    symbol,
  }: {
    address: string
    decimals?: number
    image?: string
    symbol: string
  }) {
    const provider = await this.getProvider()
    if (!provider) throw new ConnectorNotFoundError()
    return await provider.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address,
          decimals,
          image,
          symbol,
        },
      },
    })
  }

  protected onAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) this.emit('disconnect')
    else this.emit('change', { account: getAddress(<string>accounts[0]) })
  }

  protected onChainChanged = (chainId: number | string) => {
    const id = normalizeChainId(chainId)
    const unsupported = this.isChainUnsupported(id)
    this.emit('change', { chain: { id, unsupported } })
  }

  protected onDisconnect = () => {
    // We need this as MetaMask can emit the "disconnect" event
    // upon switching chains. This workaround ensures that the
    // user currently isn't in the process of switching chains.
    if (this.options?.shimChainChangedDisconnect && this.#switchingChains) {
      this.#switchingChains = false
      return
    }

    this.emit('disconnect')
    if (this.options?.shimDisconnect) getClient().storage?.removeItem(shimKey)
  }

  #isUserRejectedRequestError(error: unknown) {
    return (<ProviderRpcError>error).code === 4001
  }
}
