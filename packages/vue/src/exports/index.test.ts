import { expect, test } from 'vitest'

import * as vue from './index.js'

test('exports', () => {
  expect(Object.keys(vue)).toMatchInlineSnapshot(`
    [
      "configKey",
      "WagmiPlugin",
      "BaseError",
      "WagmiPluginNotFoundError",
      "WagmiInjectionContextError",
      "useAccount",
      "useAccountEffect",
      "useBalance",
      "useBlockNumber",
      "useBytecode",
      "useChainId",
      "useClient",
      "useConnectorClient",
      "useChains",
      "useConfig",
      "useConnect",
      "useConnections",
      "useConnectors",
      "useDisconnect",
      "useEnsAddress",
      "useEnsAvatar",
      "useEnsName",
      "useEstimateGas",
      "useReadContract",
      "useReconnect",
      "useSendTransaction",
      "useSignMessage",
      "useSignTypedData",
      "useSimulateContract",
      "useSwitchAccount",
      "useSwitchChain",
      "useTransaction",
      "useTransactionReceipt",
      "useWatchBlockNumber",
      "useWatchContractEvent",
      "useWaitForTransactionReceipt",
      "useWriteContract",
      "createConfig",
      "createConnector",
      "ChainNotConfiguredError",
      "ConnectorAlreadyConnectedError",
      "ConnectorNotFoundError",
      "ConnectorAccountNotFoundError",
      "ConnectorChainMismatchError",
      "ConnectorUnavailableReconnectingError",
      "ProviderNotFoundError",
      "SwitchChainNotSupportedError",
      "createStorage",
      "noopStorage",
      "custom",
      "fallback",
      "http",
      "webSocket",
      "unstable_connector",
      "cookieStorage",
      "cookieToInitialState",
      "deepEqual",
      "deserialize",
      "normalizeChainId",
      "parseCookie",
      "serialize",
      "version",
    ]
  `)
})
