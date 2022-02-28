import { useContractKit } from '@celo-tools/use-contractkit'
import { Interface } from '@ethersproject/abi'
import { cUSD, Fraction, Pair, Price, Token, TokenAmount } from '@ubeswap/sdk'
import DUAL_REWARDS_ABI from 'constants/abis/moola/MoolaStakingRewards.json'
import { useMemo } from 'react'
import { useMultipleContractSingleData } from 'state/multicall/hooks'
import { useOwnerStakedPools } from 'state/stake/useOwnerStakedPools'
import { useAllTokenBalances, useTokenBalances } from 'state/wallet/hooks'
import { useCUSDPrices } from 'utils/useCUSDPrice'
import { toWei } from 'web3-utils'

import { usePairs } from '../../data/Reserves'
import { useTotalSupplies } from '../../data/TotalSupply'
import { useAllTokens } from '../../hooks/Tokens'
import { toV2LiquidityToken, useTrackedTokenPairs } from '../../state/user/hooks'
import { useFarmRegistry } from '../Earn/useFarmRegistry'

export interface TokenPortfolioData {
  token: Token
  amount: TokenAmount
  cusdPrice: Price // cUSD price of a unit token
  cusdAmount: TokenAmount
}

export interface TokenPortfolio {
  tokens: TokenPortofolioData[]
  valueCUSD: TokenAmount // Total cUSD value of all token holdings
}

const MIN_CUSD_TOKEN_VALUE = new Fraction(toWei('.01'), toWei('1'))

export const useTokenPortfolio = (): TokenPortfolio => {
  const { network } = useContractKit()
  const chainId = network.chainId as unknown as ChainId

  const allTokenBalances = useAllTokenBalances()

  const nonZeroTokenAmounts = useMemo(() => {
    const nonZeroTokenAmounts: TokenAmount[] = []
    for (const [, tokenAmount] of Object.entries(allTokenBalances)) {
      if (tokenAmount.greaterThan('0')) {
        nonZeroTokenAmounts.push(tokenAmount)
      }
    }
    return nonZeroTokenAmounts
  }, [allTokenBalances])

  const cusdPrices: Price[] = useCUSDPrices(nonZeroTokenAmounts.map((tokenAmount) => tokenAmount.token))

  return useMemo(() => {
    const tokens: TokenPortfolioData[] = []
    let valueCUSD = new TokenAmount(cUSD[chainId], '0')

    const tokenAmountsAndPrices = nonZeroTokenAmounts.map((tokenAmount, i) => [tokenAmount, cusdPrices[i]])
    for (const [tokenAmount, cusdPrice] of tokenAmountsAndPrices) {
      if (!cusdPrice) {
        continue
      }
      const tokenPortfolioData: TokenPortfolioData = {
        token: tokenAmount.token,
        amount: tokenAmount,
        cusdPrice: cusdPrice,
        cusdAmount: cusdPrice.quote(tokenAmount),
      }
      // Only include tokens whose cUSD value exceeds some small threshold, to avoid noise.
      if (tokenPortfolioData.cusdAmount.greaterThan(MIN_CUSD_TOKEN_VALUE)) {
        tokens.push(tokenPortfolioData)
        valueCUSD = valueCUSD.add(tokenPortfolioData.cusdAmount)
      }
    }
    return {
      tokens,
      valueCUSD,
    }
  }, [chainId, nonZeroTokenAmounts, cusdPrices])
}

export interface LPPortfolioData {
  pair: Pair
  amount: TokenAmount
  cusdPrice: Price // cUSD price of a unit token
  cusdAmount: TokenAmount
}

export interface LPPortfolio {
  tokens: LPPortofolioData[]
  valueCUSD: TokenAmount // Total cUSD value of all token holdings
}

export const useLPPortfolio = (): LPPortfolio => {
  const { address: account } = useContractKit()

  // fetch the user's balances of all tracked V2 LP tokens
  const trackedTokenPairs = useTrackedTokenPairs()
  const tokenPairsWithLiquidityTokens = useMemo(
    () => trackedTokenPairs.map((tokens) => ({ liquidityToken: toV2LiquidityToken(tokens), tokens })),
    [trackedTokenPairs]
  )
  const liquidityTokens = useMemo(
    () => tokenPairsWithLiquidityTokens.map((tpwlt) => tpwlt.liquidityToken),
    [tokenPairsWithLiquidityTokens]
  )
  const v2PairsBalances = useTokenBalances(account ?? undefined, liquidityTokens)

  // fetch the reserves for all V2 pools in which the user has a balance
  const liquidityTokensWithBalances = useMemo(
    () =>
      tokenPairsWithLiquidityTokens
        .filter(({ liquidityToken }) => v2PairsBalances[liquidityToken.address]?.greaterThan('0'))
        .map(({ tokens }) => tokens),
    [tokenPairsWithLiquidityTokens, v2PairsBalances]
  )

  const v2Pairs = usePairs(liquidityTokensWithBalances)

  return useCalculateLPPortfolio(v2Pairs, v2PairsBalances)
}

export const useStakedLPPortfolio = (): LPPortfolio => {
  const { address: owner } = useContractKit()

  const farmSummaries = useFarmRegistry()
  const { stakedFarms } = useOwnerStakedPools(farmSummaries)

  // Get balance of each stakedFarm
  const data = useMultipleContractSingleData(
    stakedFarms.map((farmSummaries) => farmSummaries.stakingAddress),
    new Interface(DUAL_REWARDS_ABI),
    'balanceOf',
    [owner || undefined]
  )

  const stakedAmounts: Record<string, BigNumber> = data.reduce((acc, curr, idx) => {
    acc[stakedFarms[idx].lpAddress] = curr?.result?.[0]
    return acc
  }, {})

  // Get all liquidity tokens
  const trackedTokenPairs = useTrackedTokenPairs()
  const tokenPairsWithLiquidityTokens = useMemo(
    () => trackedTokenPairs.map((tokens) => ({ liquidityToken: toV2LiquidityToken(tokens), tokens })),
    [trackedTokenPairs]
  )

  // Map from LP token address to TPWLT data
  const liquidityTokenAddressMap = useMemo(
    () =>
      tokenPairsWithLiquidityTokens.reduce((acc, curr) => {
        acc[curr.liquidityToken.address] = curr
        return acc
      }, {}),
    [tokenPairsWithLiquidityTokens]
  )

  const liquidityTokens = useMemo(
    () => tokenPairsWithLiquidityTokens.map((tpwlt) => tpwlt.liquidityToken),
    [tokenPairsWithLiquidityTokens]
  )

  const v2PairsBalances = useMemo(
    () =>
      liquidityTokens.reduce((acc, curr) => {
        if (stakedAmounts[curr.address]) {
          acc[curr.address] = new TokenAmount(curr, stakedAmounts[curr.address])
        }
        return acc
      }, {}),
    [liquidityTokens, stakedAmounts]
  )

  // fetch the reserves for all V2 pools in which the user has a balance
  const liquidityTokensWithBalances = useMemo(() => {
    return liquidityTokens
      .filter((liquidityToken) =>
        stakedFarms.map((farmSummary) => farmSummary.lpAddress).includes(liquidityToken?.address)
      )
      .map((liquidityToken) => liquidityTokenAddressMap[liquidityToken.address].tokens)
  }, [liquidityTokens, stakedFarms, liquidityTokenAddressMap])
  const v2Pairs = usePairs(liquidityTokensWithBalances)

  return useCalculateLPPortfolio(v2Pairs, v2PairsBalances)
}

export const useCombinedLPPortfolio = (): LPPortfolio => {
  const stakedLPPortfolio = useStakedLPPortfolio()
  const lpPortfolio = useLPPortfolio()

  // Take the staked and unstaked positions and merge them into one
  return useMemo(() => {
    const tokens = []
    for (const stakedToken of stakedLPPortfolio.tokens) {
      const unstakedToken = lpPortfolio.tokens.find(
        (unstakedToken) => unstakedToken.pair.liquidityToken.address === stakedToken.pair.liquidityToken.address
      )
      if (unstakedToken) {
        tokens.push({
          pair: unstakedToken.pair,
          amount: unstakedToken.amount.add(stakedToken.amount),
          cusdPrice: unstakedToken.cusdPrice,
          cusdAmount: unstakedToken.cusdAmount.add(stakedToken.cusdAmount),
        })
      } else {
        tokens.push(stakedToken)
      }
    }

    for (const unstakedToken of lpPortfolio.tokens) {
      const combinedToken = tokens.find(
        (combinedToken) => combinedToken.pair.liquidityToken.address === unstakedToken.pair.liquidityToken.address
      )
      if (!combinedToken) {
        tokens.push(unstakedToken)
      }
    }

    return {
      valueCUSD: stakedLPPortfolio.valueCUSD.add(lpPortfolio.valueCUSD),
      tokens,
    }
  }, [stakedLPPortfolio, lpPortfolio])
}

const useCalculateLPPortfolio = (v2Pairs, v2PairsBalances): LPPortfolio => {
  const allTokens = useAllTokens()

  const { network } = useContractKit()
  const chainId = network.chainId as unknown as ChainId
  // Get all the underlying tokens for the LP pairs with balance so we can lookup their prices
  const baseTokens: Record<string, Token> = useMemo(() => {
    const tokenMap: Record<string, Token> = {}
    for (const [, pair] of v2Pairs) {
      if (pair) {
        tokenMap[pair.tokenAmounts[0].token.address] = pair.tokenAmounts[0].token
        tokenMap[pair.tokenAmounts[1].token.address] = pair.tokenAmounts[1].token
      }
    }
    return tokenMap
  }, [v2Pairs])

  const baseTokenPrices: Price[] = useCUSDPrices(Object.values(baseTokens))
  // We now have a map of base token address to price, which we can reuse to calculate LP price
  const baseTokenPricesMap: Record<string, Price> = useMemo(() => {
    const baseTokenPricesMap: Record<string, Price> = {}
    baseTokenPrices.forEach((price) => {
      baseTokenPricesMap[price.baseCurrency.address] = price
    })
    return baseTokenPricesMap
  }, [baseTokenPrices])

  // We need the total supply of LP tokens in order to calculate cUSD price later
  const totalPoolTokensMap: Record<string, TokenAmount> = useTotalSupplies(
    v2Pairs.map((pair) => pair[1]?.liquidityToken)
  )

  return useMemo(() => {
    const tokens: LPPortfolioData[] = []
    let valueCUSD = new TokenAmount(cUSD[chainId], '0')

    for (const [, pair] of v2Pairs) {
      if (!pair) {
        continue
      }
      const pairAddress = pair.liquidityToken.address

      if (!totalPoolTokensMap[pairAddress]) {
        continue
      }
      const token0Amount = pair.getLiquidityValue(
        pair.token0,
        totalPoolTokensMap[pairAddress],
        v2PairsBalances[pairAddress],
        false
      )
      const token1Amount = pair.getLiquidityValue(
        pair.token1,
        totalPoolTokensMap[pairAddress],
        v2PairsBalances[pairAddress],
        false
      )

      const token0CusdAmount = baseTokenPricesMap[pair.tokenAmounts[0].token.address].quote(token0Amount)
      const token1CusdAmount = baseTokenPricesMap[pair.tokenAmounts[1].token.address].quote(token1Amount)
      const cusdAmount = token0CusdAmount.add(token1CusdAmount)

      // Price of a unit LP token will be the total cUSD value of the balance divided by the balance itself
      const conversionFraction = cusdAmount.divide(v2PairsBalances[pairAddress])
      const cusdPrice = new Price(
        pair.liquidityToken,
        cUSD[chainId],
        conversionFraction.denominator,
        conversionFraction.numerator
      )

      // Need to construct a new Pair using the tokens from the useAllTokens hook since some tokens may not be WrappedTokenInfo
      // objects, which causes issues when fetching token images.
      const newPair = new Pair(
        new TokenAmount(allTokens[pair.token0.address], pair.tokenAmounts[0].raw),
        new TokenAmount(allTokens[pair.token1.address], pair.tokenAmounts[1].raw)
      )

      const lpPortfolioData: LPPortfolioData = {
        pair: newPair,
        amount: v2PairsBalances[pairAddress],
        cusdPrice: cusdPrice,
        cusdAmount: cusdAmount,
      }
      // Only include tokens whose cUSD value exceeds some small threshold, to avoid noise.
      if (lpPortfolioData.cusdAmount.greaterThan(MIN_CUSD_TOKEN_VALUE)) {
        tokens.push(lpPortfolioData)
        valueCUSD = valueCUSD.add(lpPortfolioData.cusdAmount)
      }
    }
    return {
      tokens,
      valueCUSD,
    }
  }, [baseTokenPricesMap, totalPoolTokensMap, allTokens, chainId, v2Pairs, v2PairsBalances])
}
