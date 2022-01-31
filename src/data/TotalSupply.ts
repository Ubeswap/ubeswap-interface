import { BigNumber } from '@ethersproject/bignumber'
import { Token, TokenAmount, JSBI } from '@ubeswap/sdk'
import { useMemo } from 'react'
import ERC20_INTERFACE from '../constants/abis/erc20'

import { useTokenContract } from '../hooks/useContract'
import { useSingleCallResult, useMultipleContractSingleData } from '../state/multicall/hooks'
import { isAddress } from '../utils'

// returns undefined if input token is undefined, or fails to get token contract,
// or contract total supply cannot be fetched
export function useTotalSupply(token?: Token): TokenAmount | undefined {
  const contract = useTokenContract(token?.address, false)

  const totalSupply: BigNumber = useSingleCallResult(contract, 'totalSupply')?.result?.[0]

  return token && totalSupply ? new TokenAmount(token, totalSupply.toString()) : undefined
}

export function useTotalSupplies(tokens?: (Token | undefined)[]): { [tokenAddress: string]: TokenAmount | undefined } {
  const validatedTokens: Token[] = useMemo(
    () => tokens?.filter((t?: Token): t is Token => isAddress(t?.address) !== false) ?? [],
    [tokens]
  )

  const supplies = useMultipleContractSingleData(validatedTokens.map(token => token.address), ERC20_INTERFACE, 'totalSupply')

  const anyLoading: boolean = useMemo(() => supplies.some((callState) => callState.loading), [supplies])
  return useMemo(
      () =>
      validatedTokens.length > 0
          ? validatedTokens.reduce<{ [tokenAddress: string]: TokenAmount | undefined }>((memo, token, i) => {
              const value = supplies?.[i]?.result?.[0]
              const amount = value ? JSBI.BigInt(value.toString()) : undefined
              if (amount) {
                memo[token.address] = new TokenAmount(token, amount)
              }
              return memo
            }, {})
          : {},
      [validatedTokens, supplies]
    )
}
