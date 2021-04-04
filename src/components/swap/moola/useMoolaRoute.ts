import { CeloContract } from '@celo/contractkit'
import { ChainId, currencyEquals, JSBI, Pair, Route, Token, TokenAmount } from '@ubeswap/sdk'
import { useActiveWeb3React } from 'hooks'
import { moolaLendingPools } from './useMoola'

export const useMoolaRoute = (
  inputCurrency: Token | null | undefined,
  outputCurrency: Token | null | undefined
): Route | null => {
  const { library, chainId, account } = useActiveWeb3React()

  if (chainId === ChainId.BAKLAVA) {
    return null
  }

  if (!library || !account) {
    return null
  }

  if (!inputCurrency || !outputCurrency) {
    return null
  }

  const chainCfg = moolaLendingPools[chainId]

  const mcUSD = new Token(chainId, chainCfg.mcUSD, 18, 'mcUSD', 'Moola cUSD')
  const mCELO = new Token(chainId, chainCfg.mCELO, 18, 'mCELO', 'Moola CELO')

  const routes = [
    [chainCfg[CeloContract.StableToken], mcUSD],
    [chainCfg[CeloContract.GoldToken], mCELO],
    [mcUSD, chainCfg[CeloContract.StableToken]],
    [mCELO, chainCfg[CeloContract.StableToken]]
  ] as const

  const route =
    inputCurrency &&
    outputCurrency &&
    routes.find(([a, b]) => currencyEquals(inputCurrency, a) && currencyEquals(outputCurrency, b))
  if (!route) {
    return null
  }

  return new Route(
    [new Pair(new TokenAmount(inputCurrency, JSBI.BigInt(1)), new TokenAmount(outputCurrency, JSBI.BigInt(1)))],
    inputCurrency,
    outputCurrency
  )
}
