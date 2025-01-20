import type {
  MetaMaskSDK,
  MetaMaskSDKOptions,
  RPC_URLS_MAP,
  SDKProvider,
} from '@metamask/sdk'
import {
  ChainNotConfiguredError,
  type Connector,
  ProviderNotFoundError,
  createConnector,
  extractRpcUrls,
} from '@wagmi/core'
import type {
  Compute,
  ExactPartial,
  OneOf,
  RemoveUndefined,
  UnionCompute,
} from '@wagmi/core/internal'
import {
  type AddEthereumChainParameter,
  type Address,
  type Hex,
  type ProviderConnectInfo,
  type ProviderRpcError,
  ResourceUnavailableRpcError,
  type RpcError,
  SwitchChainError,
  UserRejectedRequestError,
  getAddress,
  hexToNumber,
  numberToHex,
  withRetry,
  withTimeout,
} from 'viem'

export type MetaMaskParameters = UnionCompute<
  WagmiMetaMaskSDKOptions &
    OneOf<
      | {
          /* Shortcut to connect and sign a message */
          connectAndSign?: string | undefined
        }
      | {
          // TODO: Strongly type `method` and `params`
          /* Allow `connectWith` any rpc method */
          connectWith?: { method: string; params: unknown[] } | undefined
        }
    >
>

type WagmiMetaMaskSDKOptions = Compute<
  ExactPartial<
    Omit<
      MetaMaskSDKOptions,
      | '_source'
      | 'forceDeleteProvider'
      | 'forceInjectProvider'
      | 'injectProvider'
      | 'useDeeplink'
      | 'readonlyRPCMap'
    >
  > & {
    /** @deprecated */
    forceDeleteProvider?: MetaMaskSDKOptions['forceDeleteProvider']
    /** @deprecated */
    forceInjectProvider?: MetaMaskSDKOptions['forceInjectProvider']
    /** @deprecated */
    injectProvider?: MetaMaskSDKOptions['injectProvider']
    /** @deprecated */
    useDeeplink?: MetaMaskSDKOptions['useDeeplink']
  }
>

metaMask.type = 'metaMask' as const
export function metaMask(parameters: MetaMaskParameters = {}) {
  type Provider = SDKProvider
  type Properties = {
    onConnect(connectInfo: ProviderConnectInfo): void
    onDisplayUri(uri: string): void
  }
  type Listener = Parameters<Provider['on']>[1]

  let sdk: MetaMaskSDK
  let provider: Provider | undefined
  let providerPromise: Promise<typeof provider>

  let accountsChanged: Connector['onAccountsChanged'] | undefined
  let chainChanged: Connector['onChainChanged'] | undefined
  let connect: Connector['onConnect'] | undefined
  let displayUri: ((uri: string) => void) | undefined
  let disconnect: Connector['onDisconnect'] | undefined

  return createConnector<Provider, Properties>((config) => ({
    id: 'metaMaskSDK',
    name: 'MetaMask',
    rdns: ['io.metamask', 'io.metamask.mobile'],
    type: metaMask.type,
    async setup() {
      const provider = await this.getProvider()
      if (provider?.on) {
        if (!connect) {
          connect = this.onConnect.bind(this)
          provider.on('connect', connect as Listener)
        }

        // We shouldn't need to listen for `'accountsChanged'` here since the `'connect'` event should suffice (and wallet shouldn't be connected yet).
        // Some wallets, like MetaMask, do not implement the `'connect'` event and overload `'accountsChanged'` instead.
        if (!accountsChanged) {
          accountsChanged = this.onAccountsChanged.bind(this)
          provider.on('accountsChanged', accountsChanged as Listener)
        }
      }
    },
    async connect({ chainId, isReconnecting } = {}) {
      const provider = await this.getProvider()
      if (!displayUri) {
        displayUri = this.onDisplayUri
        provider.on('display_uri', displayUri as Listener)
      }

      let accounts: readonly Address[] = []
      if (isReconnecting) accounts = await this.getAccounts().catch(() => [])

      try {
        let signResponse: string | undefined
        let connectWithResponse: unknown | undefined
        if (!accounts?.length) {
          if (parameters.connectAndSign || parameters.connectWith) {
            if (parameters.connectAndSign)
              signResponse = await sdk.connectAndSign({
                msg: parameters.connectAndSign,
              })
            else if (parameters.connectWith)
              connectWithResponse = await sdk.connectWith({
                method: parameters.connectWith.method,
                params: parameters.connectWith.params,
              })

            accounts = await this.getAccounts()
          } else {
            const requestedAccounts = (await sdk.connect()) as string[]
            accounts = requestedAccounts.map((x) => getAddress(x))
          }
        }
        // Switch to chain if provided
        let currentChainId = (await this.getChainId()) as number
        if (chainId && currentChainId !== chainId) {
          const chain = await this.switchChain!({ chainId }).catch((error) => {
            if (error.code === UserRejectedRequestError.code) throw error
            return { id: currentChainId }
          })
          currentChainId = chain?.id ?? currentChainId
        }

        if (displayUri) {
          provider.removeListener('display_uri', displayUri)
          displayUri = undefined
        }

        if (signResponse)
          provider.emit('connectAndSign', {
            accounts,
            chainId: currentChainId,
            signResponse,
          })
        else if (connectWithResponse)
          provider.emit('connectWith', {
            accounts,
            chainId: currentChainId,
            connectWithResponse,
          })

        // Manage EIP-1193 event listeners
        // https://eips.ethereum.org/EIPS/eip-1193#events
        if (connect) {
          provider.removeListener('connect', connect)
          connect = undefined
        }
        if (!accountsChanged) {
          accountsChanged = this.onAccountsChanged.bind(this)
          provider.on('accountsChanged', accountsChanged as Listener)
        }
        if (!chainChanged) {
          chainChanged = this.onChainChanged.bind(this)
          provider.on('chainChanged', chainChanged as Listener)
        }
        if (!disconnect) {
          disconnect = this.onDisconnect.bind(this)
          provider.on('disconnect', disconnect as Listener)
        }

        return { accounts, chainId: currentChainId }
      } catch (err) {
        const error = err as RpcError
        if (error.code === UserRejectedRequestError.code)
          throw new UserRejectedRequestError(error)
        if (error.code === ResourceUnavailableRpcError.code)
          throw new ResourceUnavailableRpcError(error)
        throw error
      }
    },
    async disconnect() {
      const provider = await this.getProvider()

      // Manage EIP-1193 event listeners
      if (chainChanged) {
        provider.removeListener('chainChanged', chainChanged)
        chainChanged = undefined
      }
      if (disconnect) {
        provider.removeListener('disconnect', disconnect)
        disconnect = undefined
      }
      if (!connect) {
        connect = this.onConnect.bind(this)
        provider.on('connect', connect as Listener)
      }

      await sdk.terminate()
    },
    async getAccounts() {
      const provider = await this.getProvider()
      const accounts = (await provider.request({
        method: 'eth_accounts',
      })) as string[]
      return accounts.map((x) => getAddress(x))
    },
    async getChainId() {
      const provider = await this.getProvider()
      const chainId =
        provider.getChainId() ||
        (await provider?.request({ method: 'eth_chainId' }))
      return Number(chainId)
    },
    async getProvider() {
      async function initProvider() {
        // Unwrapping import for Vite compatibility.
        // See: https://github.com/vitejs/vite/issues/9703
        const MetaMaskSDK = await (async () => {
          const { default: SDK } = await import('@metamask/sdk')
          if (typeof SDK !== 'function' && typeof SDK.default === 'function')
            return SDK.default
          return SDK as unknown as typeof SDK.default
        })()

        const readonlyRPCMap: RPC_URLS_MAP = {}
        for (const chain of config.chains)
          readonlyRPCMap[numberToHex(chain.id)] = extractRpcUrls({
            chain,
            transports: config.transports,
          })?.[0]

        sdk = new MetaMaskSDK({
          _source: 'wagmi',
          forceDeleteProvider: false,
          forceInjectProvider: false,
          injectProvider: false,
          // Workaround cast since MetaMask SDK does not support `'exactOptionalPropertyTypes'`
          ...(parameters as RemoveUndefined<typeof parameters>),
          readonlyRPCMap,
          dappMetadata: {
            ...parameters.dappMetadata,
            // Test if name and url are set AND not empty
            name: parameters.dappMetadata?.name
              ? parameters.dappMetadata?.name
              : 'wagmi',
            url: parameters.dappMetadata?.url
              ? parameters.dappMetadata?.url
              : typeof window !== 'undefined'
                ? window.location.origin
                : 'https://wagmi.sh',
          },
          useDeeplink: parameters.useDeeplink ?? true,
        })
        const result = await sdk.init()
        // On initial load, sometimes `sdk.getProvider` does not return provider.
        // https://github.com/wevm/wagmi/issues/4367
        // Use result of `init` call if available.
        const provider = (() => {
          if (result?.activeProvider) return result.activeProvider
          return sdk.getProvider()
        })()
        if (!provider) throw new ProviderNotFoundError()
        return provider
      }

      if (!provider) {
        if (!providerPromise) providerPromise = initProvider()
        provider = await providerPromise
      }
      return provider!
    },
    async isAuthorized() {
      try {
        // MetaMask mobile provider sometimes fails to immediately resolve
        // JSON-RPC requests on page load
        const timeout = 200
        const accounts = await withRetry(
          () => withTimeout(() => this.getAccounts(), { timeout }),
          {
            delay: timeout + 1,
            retryCount: 3,
          },
        )
        return !!accounts.length
      } catch {
        return false
      }
    },
    async switchChain({ addEthereumChainParameter, chainId }) {
      const provider = await this.getProvider()

      const chain = config.chains.find((x) => x.id === chainId)
      if (!chain) throw new SwitchChainError(new ChainNotConfiguredError())

      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: numberToHex(chainId) }],
        })

        // During `'wallet_switchEthereumChain'`, MetaMask makes a `'net_version'` RPC call to the target chain.
        // If this request fails, MetaMask does not emit the `'chainChanged'` event, but will still switch the chain.
        // To counter this behavior, we request and emit the current chain ID to confirm the chain switch either via
        // this callback or an externally emitted `'chainChanged'` event.
        // https://github.com/MetaMask/metamask-extension/issues/24247
        await waitForChainIdToSync()
        await sendAndWaitForChangeEvent(chainId)

        return chain
      } catch (err) {
        const error = err as RpcError

        if (error.code === UserRejectedRequestError.code)
          throw new UserRejectedRequestError(error)

        // Indicates chain is not added to provider
        if (
          error.code === 4902 ||
          // Unwrapping for MetaMask Mobile
          // https://github.com/MetaMask/metamask-mobile/issues/2944#issuecomment-976988719
          (error as ProviderRpcError<{ originalError?: { code: number } }>)
            ?.data?.originalError?.code === 4902
        ) {
          try {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  blockExplorerUrls: (() => {
                    const { default: blockExplorer, ...blockExplorers } =
                      chain.blockExplorers ?? {}
                    if (addEthereumChainParameter?.blockExplorerUrls)
                      return addEthereumChainParameter.blockExplorerUrls
                    if (blockExplorer)
                      return [
                        blockExplorer.url,
                        ...Object.values(blockExplorers).map((x) => x.url),
                      ]
                    return
                  })(),
                  chainId: numberToHex(chainId),
                  chainName: addEthereumChainParameter?.chainName ?? chain.name,
                  iconUrls: addEthereumChainParameter?.iconUrls,
                  nativeCurrency:
                    addEthereumChainParameter?.nativeCurrency ??
                    chain.nativeCurrency,
                  rpcUrls: (() => {
                    if (addEthereumChainParameter?.rpcUrls?.length)
                      return addEthereumChainParameter.rpcUrls
                    return [chain.rpcUrls.default?.http[0] ?? '']
                  })(),
                } satisfies AddEthereumChainParameter,
              ],
            })

            await waitForChainIdToSync()
            await sendAndWaitForChangeEvent(chainId)

            return chain
          } catch (err) {
            const error = err as RpcError
            if (error.code === UserRejectedRequestError.code)
              throw new UserRejectedRequestError(error)
            throw new SwitchChainError(error)
          }
        }

        throw new SwitchChainError(error)
      }

      async function waitForChainIdToSync() {
        // On mobile, there is a race condition between the result of `'wallet_addEthereumChain'` and `'eth_chainId'`.
        // To avoid this, we wait for `'eth_chainId'` to return the expected chain ID with a retry loop.
        await withRetry(
          async () => {
            const value = hexToNumber(
              // `'eth_chainId'` is cached by the MetaMask SDK side to avoid unnecessary deeplinks
              (await provider.request({ method: 'eth_chainId' })) as Hex,
            )
            // `value` doesn't match expected `chainId`, throw to trigger retry
            if (value !== chainId)
              throw new Error('User rejected switch after adding network.')
            return value
          },
          {
            delay: 50,
            retryCount: 20, // android device encryption is slower
          },
        )
      }

      async function sendAndWaitForChangeEvent(chainId: number) {
        await new Promise<void>((resolve) => {
          const listener = ((data) => {
            if ('chainId' in data && data.chainId === chainId) {
              config.emitter.off('change', listener)
              resolve()
            }
          }) satisfies Parameters<typeof config.emitter.on>[1]
          config.emitter.on('change', listener)
          config.emitter.emit('change', { chainId })
        })
      }
    },
    async onAccountsChanged(accounts) {
      // Disconnect if there are no accounts
      if (accounts.length === 0) {
        // ... and using browser extension
        if (sdk.isExtensionActive()) this.onDisconnect()
        // FIXME(upstream): Mobile app sometimes emits invalid `accountsChanged` event with empty accounts array
        else return
      }
      // Connect if emitter is listening for connect event (e.g. is disconnected and connects through wallet interface)
      else if (config.emitter.listenerCount('connect')) {
        const chainId = (await this.getChainId()).toString()
        this.onConnect({ chainId })
      }
      // Regular change event
      else
        config.emitter.emit('change', {
          accounts: accounts.map((x) => getAddress(x)),
        })
    },
    onChainChanged(chain) {
      const chainId = Number(chain)
      config.emitter.emit('change', { chainId })
    },
    async onConnect(connectInfo) {
      const accounts = await this.getAccounts()
      if (accounts.length === 0) return

      const chainId = Number(connectInfo.chainId)
      config.emitter.emit('connect', { accounts, chainId })

      const provider = await this.getProvider()
      if (connect) {
        provider.removeListener('connect', connect)
        connect = undefined
      }
      if (!accountsChanged) {
        accountsChanged = this.onAccountsChanged.bind(this)
        provider.on('accountsChanged', accountsChanged as Listener)
      }
      if (!chainChanged) {
        chainChanged = this.onChainChanged.bind(this)
        provider.on('chainChanged', chainChanged as Listener)
      }
      if (!disconnect) {
        disconnect = this.onDisconnect.bind(this)
        provider.on('disconnect', disconnect as Listener)
      }
    },
    async onDisconnect(error) {
      const provider = await this.getProvider()

      // If MetaMask emits a `code: 1013` error, wait for reconnection before disconnecting
      // https://github.com/MetaMask/providers/pull/120
      if (error && (error as RpcError<1013>).code === 1013) {
        if (provider && !!(await this.getAccounts()).length) return
      }

      config.emitter.emit('disconnect')

      // Manage EIP-1193 event listeners
      if (chainChanged) {
        provider.removeListener('chainChanged', chainChanged)
        chainChanged = undefined
      }
      if (disconnect) {
        provider.removeListener('disconnect', disconnect)
        disconnect = undefined
      }
      if (!connect) {
        connect = this.onConnect.bind(this)
        provider.on('connect', connect as Listener)
      }
    },
    onDisplayUri(uri) {
      config.emitter.emit('message', { type: 'display_uri', data: uri })
    },
  }))
}
