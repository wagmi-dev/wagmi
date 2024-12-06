import fixtures from 'fixturez'
import { dirname, resolve } from 'pathe'
import { afterEach, expect, test, vi } from 'vitest'

import { foundry } from './foundry.js'

const f = fixtures(__dirname)

afterEach(() => {
  vi.restoreAllMocks()
})

test('forge not installed', async () => {
  const dir = f.temp()
  expect(
    foundry({
      project: dir,
      forge: {
        path: '/path/to/forge',
      },
    }).validate?.(),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
    [Error: forge must be installed to use Foundry plugin.
    To install, follow the instructions at https://book.getfoundry.sh/getting-started/installation]
  `)
})

test('project does not exist', async () => {
  const dir = f.temp()
  const spy = vi.spyOn(process, 'cwd')
  spy.mockImplementation(() => dir)

  try {
    await foundry({ project: '../path/to/project' }).validate?.()
  } catch (error) {
    expect(
      (error as Error).message.replace(dirname(dir), '..'),
    ).toMatchInlineSnapshot('"Foundry project ../path/to/project not found."')
  }
})

test('validates without project', async () => {
  const dir = resolve(__dirname, '__fixtures__/foundry/')
  const spy = vi.spyOn(process, 'cwd')
  spy.mockImplementation(() => dir)

  await expect(foundry().validate?.()).resolves.toBeUndefined()
})

test('contracts', () => {
  expect(
    foundry({
      project: resolve(__dirname, '__fixtures__/foundry/'),
      exclude: ['Foo.sol/**'],
    }).contracts?.(),
  ).resolves.toMatchInlineSnapshot(`
      [
        {
          "abi": [
            {
              "inputs": [],
              "name": "increment",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function",
            },
            {
              "inputs": [],
              "name": "number",
              "outputs": [
                {
                  "internalType": "uint256",
                  "name": "",
                  "type": "uint256",
                },
              ],
              "stateMutability": "view",
              "type": "function",
            },
            {
              "inputs": [
                {
                  "internalType": "uint256",
                  "name": "newNumber",
                  "type": "uint256",
                },
              ],
              "name": "setNumber",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function",
            },
          ],
          "address": undefined,
          "name": "Counter",
        },
      ]
    `)
})

test('contracts with multiple addresses for same ABI', () => {
  expect(
    foundry({
      project: resolve(__dirname, '__fixtures__/foundry/'),
      exclude: ['Counter.sol/**'],
      deployments: {
        Foo: {
          Token1: '0x1234567890123456789012345678901234567890',
          Token2: '0x2345678901234567890123456789012345678901',
        },
      },
    }).contracts?.(),
  ).resolves.toMatchInlineSnapshot(`
      [
        {
          "abi": [
            {
              "inputs": [],
              "name": "bar",
              "outputs": [
                {
                  "internalType": "string",
                  "name": "",
                  "type": "string",
                },
              ],
              "stateMutability": "view",
              "type": "function",
            },
            {
              "inputs": [
                {
                  "internalType": "string",
                  "name": "baz",
                  "type": "string",
                },
              ],
              "name": "setFoo",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function",
            },
          ],
          "address": "0x1234567890123456789012345678901234567890",
          "name": "Foo_Token1",
        },
        {
          "abi": [
            {
              "inputs": [],
              "name": "bar",
              "outputs": [
                {
                  "internalType": "string",
                  "name": "",
                  "type": "string",
                },
              ],
              "stateMutability": "view",
              "type": "function",
            },
            {
              "inputs": [
                {
                  "internalType": "string",
                  "name": "baz",
                  "type": "string",
                },
              ],
              "name": "setFoo",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function",
            },
          ],
          "address": "0x2345678901234567890123456789012345678901",
          "name": "Foo_Token2",
        },
      ]
    `)
})

test('contracts without project', async () => {
  const dir = resolve(__dirname, '__fixtures__/foundry/')
  const spy = vi.spyOn(process, 'cwd')
  spy.mockImplementation(() => dir)

  expect(
    foundry({
      exclude: ['Foo.sol/**'],
    }).contracts?.(),
  ).resolves.toMatchInlineSnapshot(`
      [
        {
          "abi": [
            {
              "inputs": [],
              "name": "increment",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function",
            },
            {
              "inputs": [],
              "name": "number",
              "outputs": [
                {
                  "internalType": "uint256",
                  "name": "",
                  "type": "uint256",
                },
              ],
              "stateMutability": "view",
              "type": "function",
            },
            {
              "inputs": [
                {
                  "internalType": "uint256",
                  "name": "newNumber",
                  "type": "uint256",
                },
              ],
              "name": "setNumber",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function",
            },
          ],
          "address": undefined,
          "name": "Counter",
        },
      ]
    `)
})

test('watch handlers with multiple address deployments', async () => {
  const dir = resolve(__dirname, '__fixtures__/foundry/')
  const plugin = foundry({
    project: dir,
    deployments: {
      Foo: {
        Token1: '0x1234567890123456789012345678901234567890',
        Token2: '0x2345678901234567890123456789012345678901',
      },
    },
  })

  const path = resolve(dir, 'out/Foo.sol/Foo.json')

  if (
    !plugin.watch?.onAdd ||
    !plugin.watch?.onChange ||
    !plugin.watch?.onRemove
  ) {
    throw new Error('Watch handlers not properly configured')
  }

  // Test onAdd handler
  const addResult = await plugin.watch.onAdd(path)
  expect(addResult).toMatchInlineSnapshot(`
    {
      "abi": [
        {
          "inputs": [],
          "name": "bar",
          "outputs": [
            {
              "internalType": "string",
              "name": "",
              "type": "string",
            },
          ],
          "stateMutability": "view",
          "type": "function",
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "baz",
              "type": "string",
            },
          ],
          "name": "setFoo",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
        },
      ],
      "address": "0x1234567890123456789012345678901234567890",
      "name": "Foo_Token1",
    }
  `)

  // Test onChange handler
  const changeResult = await plugin.watch.onChange(path)
  expect(changeResult).toEqual(addResult)

  // Test onRemove handler
  const removeResult = await plugin.watch.onRemove(path)
  expect(removeResult).toBe('Foo')
})
