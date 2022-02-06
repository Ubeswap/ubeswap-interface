import { CardNoise, CardSection, DataCard } from './styled'
import React from 'react'
import { LPPortfolio, LPPortfolioData } from 'pages/Portfolio/usePortfolio'
import { useTranslation } from 'react-i18next'
import { RowBetween } from '../Row'
import { ExternalLink, TYPE, colors } from '../../theme'
import { PieChart } from 'react-minimal-pie-chart'
import ReactApexChart from 'react-apexcharts'
import styled from 'styled-components'
import { AutoColumn } from '../Column'
import { useIsDarkMode } from 'state/user/hooks'
import DoubleCurrencyLogo from '../DoubleLogo'

interface Props {
  lpPortfolio: LPPortfolio
}

const DataRow = styled(RowBetween)`
flex-direction: row;
padding: .5em;
width: 100%;
`
const LiquidityRowLeft = styled(RowBetween)`
flex-direction: row;
justify-content: flex-start;
`

const LiquidityRowRight = styled(RowBetween)`
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
flex-grow: 1;
`

const ChartWrapper = styled(AutoColumn)`
width: 100%
`

interface LiquiduityRowProps {
  lpPortfolioData: TokenPortfolioData
  valueCUSD: TokenAmount
}

const LiquidityRow: React.FC<LiquidityRowProps> = ({ lpPortfolioData, valueCUSD }: LiquidityRowProps) => {
  const lpFraction = parseFloat(lpPortfolioData.cusdAmount.divide(valueCUSD).toFixed(4)*100).toFixed(2)
  const valueLP = parseFloat(lpPortfolioData.cusdAmount.toFixed(2))
  return(
    <DataRow>
      <LiquidityRowLeft>
      <DoubleCurrencyLogo currency0={lpPortfolioData.pair.token0} currency1={lpPortfolioData.pair.token1} size={24}/>
      <TYPE.mediumHeader paddingLeft='.5em'>{lpPortfolioData.pair.token0.symbol}-{lpPortfolioData.pair.token1.symbol}</TYPE.mediumHeader>
    </LiquidityRowLeft>
      <LiquidityRowRight>
      <TYPE.mediumHeader paddingRight='10px'>${valueLP}</TYPE.mediumHeader>
      <TYPE.subHeader>({lpFraction}%)</TYPE.subHeader>
      </LiquidityRowRight>
    </DataRow>
  )
}

export const LiquidityCard: React.FC<Props> = ({ lpPortfolio }: Props) => {
  const { t } = useTranslation()

  const darkMode = useIsDarkMode()
  const themeColors = colors(darkMode)

  if (!(lpPortfolio && lpPortfolio.tokens.length)) {
    return (<></>)
  }

  const valueLP = parseFloat(lpPortfolio.valueCUSD.toFixed(2))

  const sortedTokens = lpPortfolio.tokens.sort((token1, token2) => { return token2.cusdAmount.greaterThan(token1.cusdAmount) ? 1 : -1 })

  const series = lpPortfolio.tokens.map(token => parseFloat(token.cusdAmount.toFixed(2)))

  const chartOptions = {
    chart: {
      width: '100%',
      type: 'pie'
    },
    labels: lpPortfolio.tokens.map(token => `${token.pair.token0.symbol}-${token.pair.token1.symbol}`),
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
      <TYPE.largeHeader padding='10px'>{t('portfolioLiquidityHoldings')}: ${valueLP}</TYPE.largeHeader>
      <ChartWrapper>
      <ReactApexChart options={chartOptions} series={series} type="pie"/>
      </ChartWrapper>
    {sortedTokens && sortedTokens.map(lpPortfolioData => {
      return <LiquidityRow key={lpPortfolioData.pair.liquidityToken.address} lpPortfolioData={lpPortfolioData} valueCUSD={lpPortfolio.valueCUSD}/>
    })}
      </Wrapper>
  )
}
