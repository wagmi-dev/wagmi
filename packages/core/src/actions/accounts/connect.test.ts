import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSigners, setupClient } from '../../../test'
import { getClient } from '../../client'
import { MockConnector } from '../../connectors/mock'
import { chain } from './../../constants/chains'
import { connect } from './connect'

const connector = new MockConnector({
  options: { signer: getSigners()[0]! },
})

describe('connect', () => {
  beforeEach(() => {
    setupClient()
  })

  describe('args', () => {
    it('connector', async () => {
      expect(await connect({ connector })).toMatchInlineSnapshot(`
        {
          "account": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          "chain": {
            "id": 1,
            "unsupported": false,
          },
          "connector": "<MockConnector>",
          "provider": "<MockProvider>",
        }
      `)
    })
  })

  describe('behavior', () => {
    it('connects to unsupported chain', async () => {
      const result = await connect({ chainId: 69, connector })
      expect(result.chain).toMatchInlineSnapshot(`
        {
          "id": 69,
          "unsupported": true,
        }
      `)
    })

    it('connects to supported chain', async () => {
      const result = await connect({ chainId: 3, connector })
      expect(result.chain).toMatchInlineSnapshot(`
        {
          "id": 3,
          "unsupported": false,
        }
      `)
    })

    it('accepts a dynamically resolved chain ID', async () => {
      const chainId = vi.fn().mockImplementation(() => 123)

      const result = await connect({
        connector: new MockConnector({
          chains: [chain.mainnet],
          options: {
            flags: { walletChainId: 1 },
            signer: getSigners()[0]!,
          },
        }),
        chainId,
      })
      expect(result.chain.id).toBe(123)
      expect(chainId.mock.lastCall?.[0]?.walletChainId).toEqual(1)
      expect(chainId.mock.lastCall?.[0]?.chains).toEqual([chain.mainnet])
    })

    it('status changes on connection', async () => {
      expect(getClient().status).toEqual('disconnected')
      setTimeout(() => expect(getClient().status).toEqual('connecting'), 0)
      await connect({ connector })
      expect(getClient().status).toEqual('connected')
    })

    it('is already connected', async () => {
      await connect({ connector })
      await expect(
        connect({ connector }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Connector already connected"`,
      )
    })

    it('throws when user rejects request', async () => {
      await expect(
        connect({
          connector: new MockConnector({
            options: {
              flags: { failConnect: true },
              signer: getSigners()[0]!,
            },
          }),
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"User rejected request"`)
      expect(getClient().status).toEqual('disconnected')
    })

    it('status changes on user rejection', async () => {
      expect(getClient().status).toEqual('disconnected')
      await expect(
        connect({
          connector: new MockConnector({
            options: {
              flags: { failConnect: true },
              signer: getSigners()[0]!,
            },
          }),
        }),
      ).rejects.toThrowError()
      expect(getClient().status).toEqual('disconnected')
    })
  })
})
