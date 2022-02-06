import { CardNoise, CardSection, DataCard } from './styled'
import React from 'react'
import { TokenPortfolio, TokenPortfolioData } from 'pages/Portfolio/usePortfolio'
import { useTranslation } from 'react-i18next'
import { RowBetween } from '../Row'
import { ExternalLink, TYPE, colors } from '../../theme'
import { PieChart } from 'react-minimal-pie-chart'
import ReactApexChart from 'react-apexcharts'
import styled from 'styled-components'
import { AutoColumn } from '../Column'
import { useIsDarkMode } from 'state/user/hooks'
import CurrencyLogo from '../CurrencyLogo'

interface Props {
  tokenPortfolio: TokenPortfolio
}

const DataRow = styled(RowBetween)`
flex-direction: row;
padding: .5em;
width: 100%;
`
const TokenRowLeft = styled(RowBetween)`
flex-direction: row;
justify-content: flex-start;
`

const TokenRowRight = styled(RowBetween)`
flex-direction: row;
justify-content: flex-end;
`

const Wrapper = styled(AutoColumn)<{ showBackground: boolean; bgColor: any }>`
border-radius: 12px;
border-style: solid;
border-width: 2px;
border-color: grey;
margin: 20px;
padding: 20px;
width: 100%;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
flex-grow: 1;
`

const ChartWrapper = styled(AutoColumn)`
width: 100%
`

interface TokenRowProps {
  tokenPortfolioData: TokenPortfolioData
  valueCUSD: TokenAmount
}

const TokenRow: React.FC<TokenRowProps> = ({ tokenPortfolioData, valueCUSD }: TokenRowProps) => {
  const tokenFraction = parseFloat(tokenPortfolioData.cusdAmount.divide(valueCUSD).toFixed(4)*100).toFixed(2)
  const valueToken = parseFloat(tokenPortfolioData.cusdAmount.toFixed(2))
  return(
    <DataRow>
      <TokenRowLeft>
      {CurrencyLogo({currency: tokenPortfolioData.token, size: '24px'})}
      <TYPE.mediumHeader paddingLeft='20px'>{tokenPortfolioData.token.symbol}</TYPE.mediumHeader>
    </TokenRowLeft>
      <TokenRowRight>
      <TYPE.mediumHeader paddingRight='10px'>${valueToken}</TYPE.mediumHeader>
      <TYPE.subHeader>({tokenFraction}%)</TYPE.subHeader>
      </TokenRowRight>
    </DataRow>
  )
}

const Header: React.FC = ({ children }) => {
  return (
    <DataRow style={{ alignItems: 'baseline', marginBottom: '12px' }}>
      <TYPE.mediumHeader style={{ marginTop: '0.5rem' }}>{children}</TYPE.mediumHeader>
    </DataRow>
  )
}

export const TokenCard: React.FC<Props> = ({ tokenPortfolio }: Props) => {
  const { t } = useTranslation()

  const darkMode = useIsDarkMode()
  const themeColors = colors(darkMode)

  if (!(tokenPortfolio && tokenPortfolio.tokens.length)) {
    return (<></>)
  }

  const valueTokens = parseFloat(tokenPortfolio.valueCUSD.toFixed(2))

  const sortedTokens = tokenPortfolio.tokens.sort((token1, token2) => { return token2.cusdAmount.greaterThan(token1.cusdAmount) ? 1 : -1 })

  const series = tokenPortfolio.tokens.map(token => parseFloat(token.cusdAmount.toFixed(2)))

  const chartOptions = {
    chart: {
      width: '100%',
      type: 'pie'
    },
    labels: tokenPortfolio.tokens.map(token => token.token.symbol),
    theme: {
      monochrome: {
	enabled: true,
	color: themeColors.primary1,
	shadeTo: 'light',
	shadeIntensity: 0.6
      }
    },
    plotOptions: {
      pie: {
        dataLabels: {
          offset: -5
        }
      }
    },
    legend: {
      show: false
    }
  }
  return (
    <Wrapper>
      <TYPE.largeHeader padding='10px'>{t('portfolioTokenHoldings')}: ${valueTokens}</TYPE.largeHeader>
      <ChartWrapper>
      <ReactApexChart options={chartOptions} series={series} type="pie"/>
      </ChartWrapper>
    {sortedTokens && sortedTokens.map(tokenPortfolioData => {
      return <TokenRow key={tokenPortfolioData.token.address} tokenPortfolioData={tokenPortfolioData} valueCUSD={tokenPortfolio.valueCUSD}/>
    })}
      </Wrapper>
  )
}
