import {
  type DefaultError,
  type MutationObserverOptions,
  type QueryKey,
  type QueryObserverOptions,
  type UseMutationReturnType as tanstack_UseMutationReturnType,
  type UseQueryReturnType as tanstack_UseQueryReturnType,
  useQuery as tanstack_useQuery,
} from '@tanstack/vue-query'
import {
  type Evaluate,
  type ExactPartial,
  type Omit,
  type UnionOmit,
} from '@wagmi/core/internal'
import { hashFn } from '@wagmi/core/query'
import type { MaybeRef } from 'vue'

export type UseMutationParameters<
  data = unknown,
  error = Error,
  variables = void,
  context = unknown,
> = Evaluate<
  Omit<
    MutationObserverOptions<data, error, Evaluate<variables>, context>,
    'mutationFn' | 'mutationKey' | 'throwOnError'
  >
>

export type UseMutationReturnType<
  data = unknown,
  error = Error,
  variables = void,
  context = unknown,
> = Evaluate<
  UnionOmit<
    tanstack_UseMutationReturnType<data, error, variables, context>,
    'mutate' | 'mutateAsync'
  >
>

////////////////////////////////////////////////////////////////////////////////

export type UseQueryParameters<
  queryFnData = unknown,
  error = DefaultError,
  data = queryFnData,
  queryKey extends QueryKey = QueryKey,
> = Evaluate<
  ExactPartial<
    Omit<
      QueryObserverOptions<queryFnData, error, data, queryKey>,
      'enabled' | 'initialData'
    >
  > & {
    enabled?: MaybeRef<boolean> | undefined
    // Fix `initialData` type
    initialData?:
      | QueryObserverOptions<queryFnData, error, data, queryKey>['initialData']
      | undefined
  }
>

export type UseQueryReturnType<data = unknown, error = DefaultError> = Evaluate<
  tanstack_UseQueryReturnType<data, error> & {
    queryKey: QueryKey
  }
>

// Adding some basic customization.
// Ideally we don't have this function, but `import('@tanstack/vue-query').useQuery` currently has some quirks where it is super hard to
// pass down the inferred `initialData` type because of it's discriminated overload in the on `useQuery`.
export function useQuery<queryFnData, error, data, queryKey extends QueryKey>(
  parameters: UseQueryParameters<queryFnData, error, data, queryKey> & {
    queryKey: QueryKey
  },
): UseQueryReturnType<data, error> {
  const result = tanstack_useQuery({
    ...(parameters as any),
    queryKeyHashFn: hashFn, // for bigint support
  }) as UseQueryReturnType<data, error>
  result.queryKey = parameters.queryKey
  return result
}

////////////////////////////////////////////////////////////////////////////////

// export type UseInfiniteQueryParameters<
//   queryFnData = unknown,
//   error = DefaultError,
//   data = queryFnData,
//   queryData = queryFnData,
//   queryKey extends QueryKey = QueryKey,
//   pageParam = unknown,
// > = Evaluate<
//   Omit<
//     UseInfiniteQueryOptions<
//       queryFnData,
//       error,
//       data,
//       queryData,
//       queryKey,
//       pageParam
//     >,
//     'initialData'
//   > & {
//     // Fix `initialData` type
//     initialData?:
//       | UseInfiniteQueryOptions<
//           queryFnData,
//           error,
//           data,
//           queryKey
//         >['initialData']
//       | undefined
//   }
// >

// export type UseInfiniteQueryReturnType<
//   data = unknown,
//   error = DefaultError,
// > = import('@tanstack/vue-query').UseInfiniteQueryReturnType<data, error> & {
//   queryKey: QueryKey
// }

// // Adding some basic customization.
// export function useInfiniteQuery<
//   queryFnData,
//   error,
//   data,
//   queryKey extends QueryKey,
// >(
//   parameters: UseInfiniteQueryParameters<queryFnData, error, data, queryKey> & {
//     queryKey: QueryKey
//   },
// ): UseInfiniteQueryReturnType<data, error> {
//   const result = tanstack_useInfiniteQuery({
//     ...(parameters as any),
//     queryKeyHashFn: hashFn, // for bigint support
//   }) as UseInfiniteQueryReturnType<data, error>
//   result.queryKey = parameters.queryKey
//   return result
// }
