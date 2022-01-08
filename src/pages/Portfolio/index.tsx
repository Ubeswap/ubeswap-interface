import { useAllTokens, useCurrency } from '../../hooks/Tokens'
import { useCUSDPrices } from 'utils/useCUSDPrice'
import { useLPValue } from '../Earn/useLPValue'
import { useOwnerStakedPools } from 'state/stake/useOwnerStakedPools'
import { useFarmRegistry } from '../Earn/useFarmRegistry'
import { useAllTokenBalances } from 'state/wallet/hooks'
import { useTokenPortfolio, useLPPortfolio } from './usePortfolio'

export default function Portfolio() {
  // const defaultTokens = useAllTokens()
  // const allTokenBalances = useAllTokenBalances()
  // const farmSummaries = useFarmRegistry()
  // const { stakedFarms } = useOwnerStakedPools(farmSummaries)
  // console.log(stakedFarms)
  // console.log(allTokenBalances)
  const tokenPortfolio = useTokenPortfolio()
  console.log(tokenPortfolio)
  console.log(tokenPortfolio.valueCUSD.toSignificant())
  const lpPortfolio = useLPPortfolio()

  return (
    <>
      hello
    </>
  )
}
