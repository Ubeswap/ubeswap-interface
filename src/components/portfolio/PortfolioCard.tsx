import { CardNoise, CardSection, DataCard } from './styled'
import React from 'react'
import { TokenPortfolio, LPPortfolio } from 'pages/Portfolio/usePortfolio'
import { useTranslation } from 'react-i18next'
import { RowBetween } from '../Row'
import { ExternalLink, TYPE } from '../../theme'
import { PieChart } from 'react-minimal-pie-chart'

import ReactApexChart from 'react-apexcharts'

import styled from 'styled-components'
import { AutoColumn } from '../Column'

const Wrapper = styled(AutoColumn)<{ showBackground: boolean; bgColor: any }>`
  border-radius: 12px;
  width: 100%;
  overflow: hidden;
  position: relative;
  background: ${({ bgColor }) => `radial-gradient(91.85% 100% at 1.84% 0%, ${bgColor} 0%, #212429 100%) `};
  color: ${({ theme, showBackground }) => (showBackground ? theme.white : theme.text1)} !important;
  ${({ showBackground }) =>
    showBackground &&
    `  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);`}
`

interface Props {
  tokenPortfolio: TokenPortfolio
  lpPortfolio: LPPortfolio
}

const DataRow = styled(RowBetween)`
${({ theme }) => theme.mediaWidth.upToSmall`
flex-direction: column;
`};
`

const Header: React.FC = ({ children }) => {
  return (
    <DataRow style={{ alignItems: 'baseline', marginBottom: '12px' }}>
      <TYPE.mediumHeader style={{ marginTop: '0.5rem' }}>{children}</TYPE.mediumHeader>
    </DataRow>
  )
}

export const PortfolioCard: React.FC<Props> = ({ tokenPortfolio, lpPortfolio }: Props) => {
  const { t } = useTranslation()

  const series = [
    parseFloat(tokenPortfolio.valueCUSD.toSignificant()),
    parseFloat(lpPortfolio.valueCUSD.toSignificant())
  ]
  console.log(series)
  const chartOptions = {
    chart: {
      width: '100%',
      type: 'pie'
    },
    labels: ['Tokens', 'Ubeswap Liquidity'],
    theme: {
      monochrome: {
	enabled: true
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
      <TYPE.largeHeader>{t('portfolioDistribution')}</TYPE.largeHeader>
      <Header>{t('portfolioDistribution')}</Header>
      <CardSection>
      <ReactApexChart options={chartOptions} series={series} type="pie"/>
      </CardSection>
    </Wrapper>
  )
}
