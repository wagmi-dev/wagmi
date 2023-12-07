import { expect, test } from 'vitest'

import * as actions from './actions.js'

test('exports', () => {
  expect(Object.keys(actions)).toMatchInlineSnapshot(`
    [
      "connect",
      "disconnect",
      "estimateGas",
      "estimateFeesPerGas",
      "getAccount",
      "getBalance",
      "fetchBalance",
      "getBlock",
      "getBlockNumber",
      "getBlockTransactionCount",
      "fetchBlockNumber",
      "getChainId",
      "getClient",
      "getConnections",
      "getConnectors",
      "getConnectorClient",
      "getEnsAddress",
      "fetchEnsAddress",
      "getEnsAvatar",
      "fetchEnsAvatar",
      "getEnsName",
      "fetchEnsName",
      "getEnsResolver",
      "fetchEnsResolver",
      "getGasPrice",
      "getPublicClient",
      "getToken",
      "fetchToken",
      "getTransaction",
      "fetchTransaction",
      "getWalletClient",
      "multicall",
      "readContract",
      "readContracts",
      "reconnect",
      "sendTransaction",
      "signMessage",
      "signTypedData",
      "simulateContract",
      "switchAccount",
      "switchChain",
      "switchNetwork",
      "watchAccount",
      "watchBlocks",
      "watchBlockNumber",
      "watchChainId",
      "watchClient",
      "watchConnections",
      "watchConnectors",
      "watchContractEvent",
      "watchPendingTransactions",
      "watchPublicClient",
      "waitForTransactionReceipt",
      "waitForTransaction",
      "writeContract",
    ]
  `)
})
