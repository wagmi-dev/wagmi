import type {
  Abi,
  Account,
  Chain,
  Client,
  ContractFunctionArgs,
  ContractFunctionName,
} from 'viem'
import {
  type WriteContractErrorType as viem_WriteContractErrorType,
  type WriteContractParameters as viem_WriteContractParameters,
  type WriteContractReturnType as viem_WriteContractReturnType,
  writeContract as viem_writeContract,
} from 'viem/actions'

import type { Config } from '../createConfig.js'
import type { BaseErrorType, ErrorType } from '../errors/base.js'
import type { SelectChains } from '../types/chain.js'
import type {
  ChainIdParameter,
  ConnectorParameter,
} from '../types/properties.js'
import type { Evaluate, UnionEvaluate } from '../types/utils.js'
import { getAction } from '../utils/getAction.js'
import { getAccount } from './getAccount.js'
import {
  type GetConnectorClientErrorType,
  getConnectorClient,
} from './getConnectorClient.js'
import {
  type SimulateContractErrorType,
  simulateContract,
  type SimulateContractReturnType,
} from './simulateContract.js'

export type WriteContractParameters<
  abi extends Abi | readonly unknown[] = Abi,
  functionName extends ContractFunctionName<
    abi,
    'nonpayable' | 'payable'
  > = ContractFunctionName<abi, 'nonpayable' | 'payable'>,
  args extends ContractFunctionArgs<
    abi,
    'nonpayable' | 'payable',
    functionName
  > = ContractFunctionArgs<abi, 'nonpayable' | 'payable', functionName>,
  config extends Config = Config,
  chainId extends
    config['chains'][number]['id'] = config['chains'][number]['id'],
  ///
  allFunctionNames = ContractFunctionName<abi, 'nonpayable' | 'payable'>,
  chains extends readonly Chain[] = SelectChains<config, chainId>,
> = UnionEvaluate<
  {
    // TODO: Should use `UnionOmit<..., 'chain'>` on `viem_WriteContractParameters` result instead
    // temp workaround that doesn't affect runtime behavior for for https://github.com/wevm/wagmi/issues/3981
    [key in keyof chains]: viem_WriteContractParameters<
      abi,
      functionName,
      args,
      chains[key],
      Account,
      chains[key],
      allFunctionNames
    >
  }[number] &
    Evaluate<ChainIdParameter<config, chainId>> &
    ConnectorParameter & { __mode?: 'prepared' }
>

export type WriteContractReturnType = viem_WriteContractReturnType

export type WriteContractErrorType =
  // getConnectorClient()
  | GetConnectorClientErrorType
  // simulateContract()
  | SimulateContractErrorType
  // base
  | BaseErrorType
  | ErrorType
  // viem
  | viem_WriteContractErrorType

/** https://wagmi.sh/core/api/actions/writeContract */
export async function writeContract<
  config extends Config,
  const abi extends Abi | readonly unknown[],
  functionName extends ContractFunctionName<abi, 'nonpayable' | 'payable'>,
  args extends ContractFunctionArgs<
    abi,
    'nonpayable' | 'payable',
    functionName
  >,
  chainId extends config['chains'][number]['id'],
>(
  config: config,
  parameters: WriteContractParameters<abi, functionName, args, config, chainId>,
): Promise<WriteContractReturnType> {
  const { account, chainId, connector, __mode, ...rest } = parameters

  let client: Client
  if (typeof account === 'object' && account.type === 'local')
    client = config.getClient({ chainId })
  else
    client = await getConnectorClient(config, { account, chainId, connector })

  const { connector: activeConnector } = getAccount(config)

  let request: any
  if (__mode === 'prepared' || activeConnector?.supportsSimulation)
    request = rest
  else {
    const { request: simulateRequest } = await simulateContract(config, {
      ...rest,
      account,
      chainId,
    } as any)
    request = simulateRequest
  }

  const action = getAction(client, viem_writeContract, 'writeContract')
  const hash = await action({
    ...request,
    ...(account ? { account } : {}),
    chain: chainId ? { id: chainId } : null,
  })

  return hash
}
