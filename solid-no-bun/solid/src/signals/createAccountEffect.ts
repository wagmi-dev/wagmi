import { type GetAccountReturnType, watchAccount } from '@wagmi/core'
import type { Evaluate } from '@wagmi/core/internal'

import type { ConfigParameter } from '../types/properties.ts'
import { createConfig } from './createConfig.ts'
import { onCleanup } from 'solid-js'

export type UseAccountEffectParameters = Evaluate<
  {
    onConnect?(
      data: Evaluate<
        Pick<
          Extract<GetAccountReturnType, { status: 'connected' }>,
          'address' | 'addresses' | 'chain' | 'chainId' | 'connector'
        > & {
          isReconnected: boolean
        }
      >,
    ): void
    onDisconnect?(): void
  } & ConfigParameter
>

/** https://wagmi.sh/react/api/hooks/useAccountEffect */
export function useAccountEffect(parameters: UseAccountEffectParameters = {}) {
  const { onConnect, onDisconnect } = parameters

  const config = createConfig(parameters)

  const unsubscribe = watchAccount(config, {
    onChange(data, prevData) {
      if (
        (prevData.status === 'reconnecting' ||
          (prevData.status === 'connecting' &&
            prevData.address === undefined)) &&
        data.status === 'connected'
      ) {
        const { address, addresses, chain, chainId, connector } = data
        const isReconnected =
          prevData.status === 'reconnecting' ||
          // if `previousAccount.status` is `undefined`, the connector connected immediately.
          prevData.status === undefined
        onConnect?.({
          address,
          addresses,
          chain,
          chainId,
          connector,
          isReconnected,
        })
      } else if (
        prevData.status === 'connected' &&
        data.status === 'disconnected'
      )
        onDisconnect?.()
    },
  })

  onCleanup(unsubscribe)
}
