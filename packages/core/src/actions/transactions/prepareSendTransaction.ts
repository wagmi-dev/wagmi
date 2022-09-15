import { providers } from 'ethers'
import { isAddress } from 'ethers/lib/utils'

import { ChainMismatchError, ConnectorNotFoundError } from '../../errors'
import { Address, Signer } from '../../types'
import { fetchSigner, getNetwork } from '../accounts'
import { fetchEnsAddress } from '../ens'

export type PrepareSendTransactionArgs<TSigner extends Signer = Signer> = {
  /** Chain ID used to validate if the signer is connected to the target chain */
  chainId?: number
  /** Request data to prepare the transaction */
  request: providers.TransactionRequest & {
    to: NonNullable<providers.TransactionRequest['to']>
  }
  signer?: TSigner | null
}

export type PrepareSendTransactionResult = {
  chainId?: number
  request: providers.TransactionRequest & {
    to: Address
    gasLimit: NonNullable<providers.TransactionRequest['gasLimit']>
  }
  mode: 'prepared'
}

/**
 * @description Prepares the parameters required for sending a transaction.
 *
 * Returns config to be passed through to `sendTransaction`.
 *
 * @example
 * import { prepareSendTransaction, sendTransaction } from '@wagmi/core'
 *
 * const config = await prepareSendTransaction({
 *  request: {
 *    to: 'moxey.eth',
 *    value: parseEther('1'),
 *  }
 * })
 * const result = await sendTransaction(config)
 */
export async function prepareSendTransaction({
  chainId,
  request,
  signer: signer_,
}: PrepareSendTransactionArgs): Promise<PrepareSendTransactionResult> {
  const signer = signer_ ?? (await fetchSigner({ chainId }))
  if (!signer) throw new ConnectorNotFoundError()

  const { chain: activeChain, chains } = getNetwork()
  const activeChainId = activeChain?.id
  if (chainId && chainId !== activeChainId) {
    throw new ChainMismatchError({
      activeChain:
        chains.find((x) => x.id === activeChainId)?.name ??
        `Chain ${activeChainId}`,
      targetChain:
        chains.find((x) => x.id === chainId)?.name ?? `Chain ${chainId}`,
    })
  }

  const [to, gasLimit] = await Promise.all([
    isAddress(request.to)
      ? Promise.resolve(<Address>request.to)
      : fetchEnsAddress({ name: request.to }),
    request.gasLimit
      ? Promise.resolve(request.gasLimit)
      : signer.estimateGas(request),
  ])

  if (!to) throw new Error('Could not resolve ENS name')

  return {
    ...(chainId ? { chainId } : {}),
    request: { ...request, gasLimit, to },
    mode: 'prepared',
  }
}
