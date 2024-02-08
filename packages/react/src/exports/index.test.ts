import { expect, test } from 'vitest'

import * as react from './index.js'

test('exports', () => {
  expect(Object.keys(react)).toMatchInlineSnapshot(`
    [
      "WagmiContext",
      "WagmiProvider",
      "Context",
      "WagmiConfig",
      "BaseError",
      "WagmiProviderNotFoundError",
      "useAccount",
      "useAccountEffect",
      "useBalance",
      "useBlock",
      "useBlockNumber",
      "useBlockTransactionCount",
      "useBytecode",
      "useCall",
      "useChainId",
      "useChains",
      "useClient",
      "useConfig",
      "useConnect",
      "useConnections",
      "useConnectors",
      "useConnectorClient",
      "useDisconnect",
      "useEnsAddress",
      "useEnsAvatar",
      "useEnsName",
      "useEnsResolver",
      "useEnsText",
      "useEstimateFeesPerGas",
      "useFeeData",
      "useEstimateGas",
      "useEstimateMaxPriorityFeePerGas",
      "useFeeHistory",
      "useGasPrice",
      "useInfiniteReadContracts",
      "useContractInfiniteReads",
      "usePrepareTransactionRequest",
      "useProof",
      "usePublicClient",
      "useReadContract",
      "useContractRead",
      "useReadContracts",
      "useContractReads",
      "useReconnect",
      "useSendTransaction",
      "useSignMessage",
      "useSignTypedData",
      "useSimulateContract",
      "useStorageAt",
      "useSwitchAccount",
      "useSwitchChain",
      "useToken",
      "useTransaction",
      "useTransactionConfirmations",
      "useTransactionCount",
      "useTransactionReceipt",
      "useVerifyMessage",
      "useVerifyTypedData",
      "useWalletClient",
      "useWaitForTransactionReceipt",
      "useWatchBlocks",
      "useWatchBlockNumber",
      "useWatchContractEvent",
      "useWatchPendingTransactions",
      "useWriteContract",
      "useContractWrite",
      "Hydrate",
      "createConfig",
      "createConnector",
      "ChainNotConfiguredError",
      "ConnectorAlreadyConnectedError",
      "ConnectorNotFoundError",
      "ConnectorAccountNotFoundError",
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
