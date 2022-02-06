import { CardNoise, CardSection, DataCard, portfolioColors } from './styled'
import React from 'react'
import { TokenPortfolio, LPPortfolio } from 'pages/Portfolio/usePortfolio'
import { useTranslation } from 'react-i18next'
import { RowBetween } from '../Row'
import { ExternalLink, TYPE, colors } from '../../theme'
import { PieChart } from 'react-minimal-pie-chart'
import { useIsDarkMode } from 'state/user/hooks'
import ReactApexChart from 'react-apexcharts'

import styled from 'styled-components'
import { AutoColumn } from '../Column'

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

interface Props {
  tokenPortfolio: TokenPortfolio
  lpPortfolio: LPPortfolio
}

const DataRow = styled(RowBetween)`
flex-direction: row;
padding: .5em;
width: 100%;
`

const DataRowRight = styled(RowBetween)`
flex-direction: row;
justify-content: flex-end;
`

export const PortfolioCard: React.FC<Props> = ({ tokenPortfolio, lpPortfolio }: Props) => {
  const { t } = useTranslation()

  const darkMode = useIsDarkMode()
  const themeColors = colors(darkMode)

  if (!(tokenPortfolio && tokenPortfolio.tokens.length) || !(lpPortfolio && lpPortfolio.tokens.length)) {
    return (<></>)
  }

  const valueTokens = parseFloat(tokenPortfolio.valueCUSD.toFixed(2))
  const valueLiquidity = parseFloat(lpPortfolio.valueCUSD.toFixed(2))
  const totalValue = tokenPortfolio.valueCUSD.add(lpPortfolio.valueCUSD)

  const fractionTokens = (parseFloat(tokenPortfolio.valueCUSD.divide(totalValue).toFixed(2))*100).toFixed(2)
  const fractionLiquidity = (parseFloat(lpPortfolio.valueCUSD.divide(totalValue).toFixed(2))*100).toFixed(2)

  const series = [
    valueTokens,
    valueLiquidity
  ]

  const chartOptions = {
    chart: {
      type: 'pie'
    },
    labels: [t('Tokens'), t('StakedUnstakedLiquidity')],
    plotOptions: {
      pie: {
        dataLabels: {
          offset: -5
        }
      }
    },
    legend: {
      show: false
    },
    theme: {
      monochrome: {
	enabled: true,
	color: themeColors.primary1,
	shadeTo: 'light',
	shadeIntensity: .6
      }
    },
  }
  return (
    <Wrapper>
      <TYPE.largeHeader padding='10px'>{t('portfolioDistribution')}</TYPE.largeHeader>
      <ChartWrapper>
      <ReactApexChart options={chartOptions} series={series} type="pie"/>
      </ChartWrapper>
      <DataRow>
      <TYPE.mediumHeader>{t('Tokens')}:</TYPE.mediumHeader>
      <DataRowRight>
      <TYPE.mediumHeader paddingRight='10px'>${valueTokens}</TYPE.mediumHeader>
      <TYPE.subHeader>({fractionTokens}%)</TYPE.subHeader>
      </DataRowRight>
      </DataRow>
      <DataRow>
      <TYPE.mediumHeader>{t('Liquidity')}:</TYPE.mediumHeader>
    <DataRowRight>
      <TYPE.mediumHeader paddingRight='10px'>${valueLiquidity}</TYPE.mediumHeader>
      <TYPE.subHeader>({fractionLiquidity}%)</TYPE.subHeader>
      </DataRowRight>
    </DataRow>
    </Wrapper>
  )
}
