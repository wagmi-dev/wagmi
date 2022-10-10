import {
  Abi,
  AbiEvent,
  AbiFunction,
  AbiParameter,
  AbiParameterToPrimitiveType,
  AbiParametersToPrimitiveTypes,
  Address,
  ExtractAbiEvent,
  ExtractAbiEventNames,
  ResolvedConfig,
} from 'abitype'
import {
  ContractInterface,
  Contract as EthersContract,
  Signer,
  ethers,
  providers,
} from 'ethers'

import {
  AbiEventParametersToPrimitiveTypes,
  AbiItemName,
  AbiStateMutabilityToOverrides,
  Event,
} from '../../types/contracts'
import {
  CountOccurrences,
  IsUnknown,
  UnionToIntersection,
} from '../../types/utils'

export type GetContractArgs<TAbi = unknown> = {
  /** Contract address */
  address: string
  /** Contract interface or ABI */
  abi: TAbi
  /** Signer or provider to attach to contract */
  signerOrProvider?: Signer | providers.Provider
}

export type GetContractResult<TAbi = unknown> = TAbi extends Abi
  ? Contract<TAbi>
  : EthersContract

export function getContract<
  TAbi extends Abi | readonly unknown[] | ContractInterface,
>({
  address,
  abi,
  signerOrProvider,
}: GetContractArgs<TAbi>): GetContractResult<TAbi> {
  return new EthersContract(
    address,
    <ContractInterface>(<unknown>abi),
    signerOrProvider,
  ) as GetContractResult<TAbi>
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Contract

// TODO: Add remaining properties
type PropertyKeys =
  | 'address'
  | 'attach'
  | 'connect'
  | 'deployed'
  | 'interface'
  | 'resolvedAddress'
type FunctionKeys =
  | 'callStatic'
  | 'estimateGas'
  | 'functions'
  | 'populateTransaction'
type EventKeys =
  | 'emit'
  | 'filters'
  | 'listenerCount'
  | 'listeners'
  | 'off'
  | 'on'
  | 'once'
  | 'queryFilter'
  | 'removeAllListeners'
  | 'removeListener'
type BaseContract<
  TContract extends Record<
    keyof Pick<EthersContract, PropertyKeys | FunctionKeys | EventKeys>,
    unknown
  >,
> = Exclude<EthersContract, PropertyKeys | FunctionKeys | EventKeys> & TContract

// TODO: Add remaining `Interface` properties
type InterfaceKeys = 'events' | 'functions'
type BaseInterface<
  Interface extends Record<
    keyof Pick<ethers.utils.Interface, InterfaceKeys>,
    unknown
  >,
> = Exclude<ethers.utils.Interface, InterfaceKeys> & Interface

export type Contract<
  TAbi extends Abi,
  _Functions = Functions<TAbi>,
> = _Functions &
  BaseContract<{
    address: Address
    resolvedAddress: Promise<Address>
    attach(addressOrName: Address | string): Contract<TAbi>
    connect(
      signerOrProvider: ethers.Signer | ethers.providers.Provider | string,
    ): Contract<TAbi>
    deployed(): Promise<Contract<TAbi>>
    interface: BaseInterface<{
      events: InterfaceEvents<TAbi>
      functions: InterfaceFunctions<TAbi>
    }>

    callStatic: _Functions
    estimateGas: Functions<TAbi, { ReturnType: ResolvedConfig['BigIntType'] }>
    functions: Functions<TAbi, { ReturnTypeAsArray: true }>
    populateTransaction: Functions<
      TAbi,
      { ReturnType: ethers.PopulatedTransaction }
    >

    emit<TEventName extends ExtractAbiEventNames<TAbi> | ethers.EventFilter>(
      eventName: TEventName,
      ...args: AbiEventParametersToPrimitiveTypes<
        ExtractAbiEvent<
          TAbi,
          TEventName extends string ? TEventName : ExtractAbiEventNames<TAbi>
        >['inputs']
      > extends infer TArgs extends readonly unknown[]
        ? TArgs
        : never
    ): boolean
    filters: Filters<TAbi>
    listenerCount(): number
    listenerCount<TEventName extends ExtractAbiEventNames<TAbi>>(
      eventName: TEventName,
    ): number
    // TODO: Improve `eventFilter` type
    listenerCount(eventFilter: ethers.EventFilter): number
    listeners(): Array<(...args: any[]) => void>
    listeners<TEventName extends ExtractAbiEventNames<TAbi>>(
      eventName: TEventName,
    ): Array<Listener<TAbi, TEventName>>
    listeners(
      // TODO: Improve `eventFilter` and return types
      eventFilter: ethers.EventFilter,
    ): Array<Listener<TAbi, ExtractAbiEventNames<TAbi>>>
    off: EventListener<TAbi>
    on: EventListener<TAbi>
    once: EventListener<TAbi>
    queryFilter<TEventName extends ExtractAbiEventNames<TAbi>>(
      event: TEventName,
      fromBlockOrBlockhash?: string | number,
      toBlock?: string | number,
    ): Promise<Array<ethers.Event>>
    // TODO: Improve `eventFilter` and return types
    queryFilter(
      eventFilter: ethers.EventFilter,
      fromBlockOrBlockhash?: string | number,
      toBlock?: string | number,
    ): Promise<Array<ethers.Event>>
    removeAllListeners(eventName?: ExtractAbiEventNames<TAbi>): Contract<TAbi>
    // TODO: Improve `eventFilter` type
    removeAllListeners(eventFilter: ethers.EventFilter): Contract<TAbi>
    removeListener: EventListener<TAbi>
  }>

////////////////////////////////////////////////////////////////////////////////////////////////////
// Functions

type Functions<
  TAbi extends Abi,
  Options extends {
    ReturnType?: any
    ReturnTypeAsArray?: boolean
  } = {
    ReturnTypeAsArray: false
  },
> = UnionToIntersection<
  {
    [K in keyof TAbi]: TAbi[K] extends infer TAbiFunction extends AbiFunction & {
      type: 'function'
    }
      ? {
          [K in CountOccurrences<TAbi, { name: TAbiFunction['name'] }> extends 1
            ? AbiItemName<TAbiFunction>
            : AbiItemName<TAbiFunction, true>]: (
            ...args: [
              ...args: TAbiFunction['inputs'] extends infer TInputs extends readonly AbiParameter[]
                ? AbiParametersToPrimitiveTypes<TInputs>
                : never,
              overrides?: AbiStateMutabilityToOverrides<
                TAbiFunction['stateMutability']
              >,
            ]
          ) => Promise<
            IsUnknown<Options['ReturnType']> extends true
              ? AbiFunctionReturnType<TAbiFunction> extends infer TAbiFunctionReturnType
                ? Options['ReturnTypeAsArray'] extends true
                  ? [TAbiFunctionReturnType]
                  : TAbiFunctionReturnType
                : never
              : Options['ReturnType']
          >
        }
      : never
  }[number]
>

type AbiFunctionReturnType<
  TAbiFunction extends AbiFunction & {
    type: 'function'
  },
> = ({
  payable: ethers.ContractTransaction
  nonpayable: ethers.ContractTransaction
} & {
  [_ in
    | 'pure'
    | 'view']: TAbiFunction['outputs']['length'] extends infer TLength
    ? TLength extends 0
      ? void // If there are no outputs, return `void`
      : TLength extends 1
      ? AbiParameterToPrimitiveType<TAbiFunction['outputs'][0]>
      : {
          [Output in TAbiFunction['outputs'][number] as Output['name'] extends ''
            ? never
            : Output['name']]: AbiParameterToPrimitiveType<Output>
        } & AbiParametersToPrimitiveTypes<TAbiFunction['outputs']>
    : never
})[TAbiFunction['stateMutability']]

type InterfaceFunctions<TAbi extends Abi> = UnionToIntersection<
  {
    [K in keyof TAbi]: TAbi[K] extends infer TAbiFunction extends AbiFunction & {
      type: 'function'
    }
      ? {
          [K in AbiItemName<TAbiFunction, true>]: ethers.utils.FunctionFragment // TODO: Infer `FunctionFragment` type
        }
      : never
  }[number]
>

type InterfaceEvents<TAbi extends Abi> = UnionToIntersection<
  {
    [K in keyof TAbi]: TAbi[K] extends infer TAbiEvent extends AbiEvent
      ? {
          [K in AbiItemName<TAbiEvent, true>]: ethers.utils.EventFragment // TODO: Infer `EventFragment` type
        }
      : never
  }[number]
>

////////////////////////////////////////////////////////////////////////////////////////////////////
// Events

interface EventListener<TAbi extends Abi> {
  <TEventName extends ExtractAbiEventNames<TAbi>>(
    eventName: TEventName,
    listener: Listener<TAbi, TEventName>,
  ): Contract<TAbi>
  (
    // TODO: Improve `eventFilter` and `listener` types
    eventFilter: ethers.EventFilter,
    listener: Listener<TAbi, ExtractAbiEventNames<TAbi>>,
  ): Contract<TAbi>
}

type Listener<
  TAbi extends Abi,
  TEventName extends string,
  TAbiEvent extends AbiEvent = ExtractAbiEvent<TAbi, TEventName>,
> = AbiEventParametersToPrimitiveTypes<
  TAbiEvent['inputs']
> extends infer TArgs extends readonly unknown[]
  ? (...args: [...args: TArgs, event: Event<TAbiEvent>]) => void
  : never

type Filters<TAbi extends Abi> = UnionToIntersection<
  {
    [K in keyof TAbi]: TAbi[K] extends infer TAbiEvent extends AbiEvent
      ? {
          [K in CountOccurrences<TAbi, { name: TAbiEvent['name'] }> extends 1
            ? AbiItemName<TAbiEvent>
            : AbiItemName<TAbiEvent, true>]: (
            ...args: TAbiEvent['inputs'] extends infer TAbiParameters extends readonly (AbiParameter & {
              indexed?: boolean
            })[]
              ? AbiEventParametersToPrimitiveTypes<
                  TAbiParameters,
                  { AllowNull: true }
                >
              : never
          ) => ethers.EventFilter
        }
      : never
  }[number]
>
