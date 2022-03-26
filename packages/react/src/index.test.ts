import * as Exports from './'

it('should expose correct exports', () => {
  expect(Object.keys(Exports)).toMatchInlineSnapshot(`
    [
      "createClient",
      "createWagmiClient",
      "Provider",
      "WagmiProvider",
      "useClient",
      "useWagmiClient",
      "useAccount",
      "useBalance",
      "useBlockNumber",
      "useConnect",
      "useContract",
      "useContractEvent",
      "useContractRead",
      "useContractWrite",
      "useEnsAddress",
      "useEnsAvatar",
      "useEnsName",
      "useEnsResolver",
      "useFeeData",
      "useNetwork",
      "useProvider",
      "useSendTransaction",
      "useSignMessage",
      "useSignTypedData",
      "useSigner",
      "useToken",
      "useWaitForTransaction",
      "useWebSocketProvider",
      "Client",
      "Connector",
      "WagmiClient",
      "allChains",
      "chain",
      "createStorage",
      "createWagmiStorage",
      "defaultChains",
      "erc1155ABI",
      "erc20ABI",
      "erc721ABI",
    ]
  `)
})

it('should alias Provider as WagmiProvider', () => {
  expect(Exports.Provider).toBe(Exports.WagmiProvider)
})
