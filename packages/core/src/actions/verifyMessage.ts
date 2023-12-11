import {
  type VerifyMessageErrorType as viem_VerifyMessageErrorType,
  type VerifyMessageParameters as viem_VerifyMessageParameters,
  type VerifyMessageReturnType as viem_VerifyMessageReturnType,
  verifyMessage as viem_verifyMessage,
} from 'viem/actions'

import { type Config } from '../createConfig.js'
import { type ChainIdParameter } from '../types/properties.js'
import { type Evaluate } from '../types/utils.js'

export type VerifyMessageParameters<
  config extends Config = Config,
  chainId extends config['chains'][number]['id'] = config['chains'][number]['id'],
> = Evaluate<viem_VerifyMessageParameters & ChainIdParameter<config, chainId>>

export type VerifyMessageReturnType = viem_VerifyMessageReturnType

export type VerifyMessageErrorType = viem_VerifyMessageErrorType

/** https://beta.wagmi.sh/core/api/actions/verifyMessage */
export async function verifyMessage(
  config: Config,
  parameters: VerifyMessageParameters,
): Promise<VerifyMessageReturnType> {
  const { ...rest } = parameters
  const client = config.getClient()
  return viem_verifyMessage(client, rest)
}
