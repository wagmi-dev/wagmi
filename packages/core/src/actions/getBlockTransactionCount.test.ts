import { chain, config, testClient } from '@wagmi/test'
import { expect, test } from 'vitest'

import { getBlockTransactionCount } from './getBlockTransactionCount.js'

test('default', async () => {
  await expect(getBlockTransactionCount(config)).resolves.toBe(137)
})

test('parameters: chainId', async () => {
  await testClient.mainnet2.mine({ blocks: 1 })

  await expect(
    getBlockTransactionCount(config, { chainId: chain.mainnet2.id }),
  ).resolves.toBe(0)
})

test('parameters: blockNumber', async () => {
  await testClient.mainnet2.mine({ blocks: 1 })

  await expect(
    getBlockTransactionCount(config, { blockNumber: 13677382n }),
  ).resolves.toBe(326)
})

test('parameters: blockHash', async () => {
  await testClient.mainnet2.mine({ blocks: 1 })

  await expect(
    getBlockTransactionCount(config, {
      blockHash:
        '0x6201f37a245850d1f11e4be3ac45bc51bd9d43ee4a127192cad550f351cfa575',
    }),
  ).resolves.toBe(159)
})

test('parameters: blockTag', async () => {
  await expect(
    getBlockTransactionCount(config, {
      blockTag: 'earliest',
    }),
  ).resolves.toBe(0)

  await expect(
    getBlockTransactionCount(config, {
      blockTag: 'finalized',
    }),
  ).resolves.toBe(158)

  await expect(
    getBlockTransactionCount(config, {
      blockTag: 'latest',
    }),
  ).resolves.toBe(137)

  await expect(
    getBlockTransactionCount(config, {
      blockTag: 'pending',
    }),
  ).resolves.toBe(0)

  await expect(
    getBlockTransactionCount(config, {
      blockTag: 'safe',
    }),
  ).resolves.toBe(251)
})