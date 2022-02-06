import { useAllTokens, useCurrency } from '../../hooks/Tokens'
import { useCUSDPrices } from 'utils/useCUSDPrice'
import { useLPValue } from '../Earn/useLPValue'
import { useOwnerStakedPools } from 'state/stake/useOwnerStakedPools'
import { useFarmRegistry } from '../Earn/useFarmRegistry'
import { useAllTokenBalances } from 'state/wallet/hooks'
import { useTokenPortfolio, useLPPortfolio, useStakedLPPortfolio, useCombinedLPPortfolio } from './usePortfolio'
import { useTranslation } from 'react-i18next'
import { ExternalLink, TYPE } from '../../theme'
import { AutoColumn, ColumnCenter, TopSection } from '../../components/Column'
import { PortfolioCard } from '../../components/portfolio/PortfolioCard'
import { TokenCard } from '../../components/portfolio/TokenCard'
import { LiquidityCard } from '../../components/portfolio/LiquidityCard'
import { Text } from 'rebass'
import styled from 'styled-components'


const PageWrapper = styled.div`
width: 100%;
max-width: 800px;
display: flex;
flex-direction: column;
align-items: center;
`

const CeloTaxRow = styled.div`
padding: 20px;
display: flex;
flex-direction: row;
`

export default function Portfolio() {
  const { t } = useTranslation()

  const tokenPortfolio = useTokenPortfolio()
  const combinedLPPortfolio = useCombinedLPPortfolio()

  const portfolioValueString = (combinedLPPortfolio?.valueCUSD && tokenPortfolio?.valueCUSD) ?
    combinedLPPortfolio.valueCUSD.add(tokenPortfolio.valueCUSD).toFixed(2) : '-'

  return (
    <PageWrapper>
      <TopSection gap="md">
      <AutoColumn justify="center">
      <TYPE.largeHeader fontSize={28}>{t('portfolioValue')}: ${portfolioValueString}</TYPE.largeHeader>
      </AutoColumn>
      </TopSection>
      <PortfolioCard tokenPortfolio={tokenPortfolio} lpPortfolio={combinedLPPortfolio}/>
      <TokenCard tokenPortfolio={tokenPortfolio}/>
      <LiquidityCard lpPortfolio={combinedLPPortfolio}/>
      <CeloTaxRow>
      <Text fontWeight={600} fontSize={24} display='inline'> Need help with DeFi taxes? Check out <a href="https://celo.tax">celo.tax</a>.</Text>
      </CeloTaxRow>
      </PageWrapper>
  )
}
