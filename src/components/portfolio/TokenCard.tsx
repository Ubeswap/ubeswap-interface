import { CardNoise, CardSection, DataCard } from './styled'
import React from 'react'
import { TokenPortfolio, LPPortfolio } from 'pages/Portfolio/usePortfolio'
import { useTranslation } from 'react-i18next'
import { RowBetween } from '../Row'
import { ExternalLink, TYPE } from '../../theme'
import { PieChart } from 'react-minimal-pie-chart'
import ReactApexChart from 'react-apexcharts'
import styled from 'styled-components'

interface Props {
  tokenPortfolio: TokenPortfolio
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

export const TokenCard: React.FC<Props> = ({ tokenPortfolio }: Props) => {
  const { t } = useTranslation()

  if (!(tokenPortfolio && tokenPortfolio.tokens.length)) {
    return (<></>)
  }

  console.log(tokenPortfolio.tokens)
  const series = tokenPortfolio.tokens.map(token => parseFloat(token.cusdAmount.toSignificant()))
  console.log(series)
  const chartOptions = {
    chart: {
      width: '100%',
      type: 'pie'
    },
    labels: tokenPortfolio.tokens.map(token => token.token.symbol),
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
    <DataCard>
      <Header>{t('portfolioTokenHoldings')}</Header>
      <CardSection>
      <ReactApexChart options={chartOptions} series={series} type="pie"/>
      </CardSection>
      </DataCard>
  )
}
