import { useContractKit } from '@celo-tools/use-contractkit'
import { Fraction, Token, TokenAmount, Price, cUSD, Pair } from '@ubeswap/sdk'
import { useAllTokenBalances, useTokenBalances } from 'state/wallet/hooks'
import { useAllTokens } from '../../hooks/Tokens'
import { useCUSDPrices } from 'utils/useCUSDPrice'
import { useMemo } from 'react'
import { toBN, toWei } from 'web3-utils'
import { toV2LiquidityToken, useTrackedTokenPairs } from '../../state/user/hooks'
import { usePairs } from '../../data/Reserves'

interface TokenPortfolioData {
  token: Token
  amount: TokenAmount
  cusdPrice: Price // cUSD price of a unit token
  cusdAmount: TokenAmount
}

interface TokenPortfolio {
  tokens: TokenPortofolioData[]
  valueCUSD: TokenAmount // Total cUSD value of all token holdings
}

const MIN_CUSD_TOKEN_VALUE = new Fraction(toWei('.01'), toWei('1'))

export const useTokenPortfolio = (): TokenPortfolio => {
  const { network } = useContractKit()
  const chainId = network.chainId as unknown as ChainId

  const allTokenBalances = useAllTokenBalances()

  const nonZeroTokenAmounts = useMemo(
    () => {
      const nonZeroTokenAmounts: TokenAmount[] = []
      for (const [address, tokenAmount] of Object.entries(allTokenBalances)) {
	if (tokenAmount.greaterThan('0')) {
	  nonZeroTokenAmounts.push(tokenAmount)
	}
      }
      return nonZeroTokenAmounts
    },
    [allTokenBalances]
  )

  const cusdPrices: Price[] = useCUSDPrices(nonZeroTokenAmounts.map(tokenAmount => tokenAmount.token))

  return useMemo(
    () => {
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
	  cusdAmount: cusdPrice.quote(tokenAmount)
	}
	// Only include tokens whose cUSD value exceeds some small threshold, to avoid noise.
	if (tokenPortfolioData.cusdAmount.greaterThan(MIN_CUSD_TOKEN_VALUE)) {
	  tokens.push(tokenPortfolioData)
	  valueCUSD = valueCUSD.add(tokenPortfolioData.cusdAmount)
	}
      }
      return {
	tokens,
	valueCUSD
      }
    },
    [nonZeroTokenAmounts, cusdPrices]
  )
}

interface LPPortfolioData {
  pair: Pair
  amount: TokenAmount
  cusdPrice: Price // cUSD price of a unit token
  cusdAmount: TokenAmount
}

interface LPPortfolio {
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
  const v2PairsBalances = useTokenBalances(
    account ?? undefined,
    liquidityTokens
  )

  // fetch the reserves for all V2 pools in which the user has a balance
  const liquidityTokensWithBalances = useMemo(
    () =>
      tokenPairsWithLiquidityTokens
        .filter(({ liquidityToken }) => v2PairsBalances[liquidityToken.address]?.greaterThan('0'))
        .map(({ tokens }) => tokens),
    [tokenPairsWithLiquidityTokens, v2PairsBalances]
  )

  const v2Pairs = usePairs(liquidityTokensWithBalances)

  const baseTokens: Record<string, Token> = {}

  for (const [,pair] of v2Pairs) {
    
  }

  console.log(v2Pairs)
  if (v2Pairs[0]) {
    console.log(v2Pairs[0][1].tokenAmounts[0].toSignificant())
    console.log(v2Pairs[0][1].tokenAmounts[1].toSignificant())
  }

}

export const useStakedLPPortfolio = (): LPPortfolio => {

}
