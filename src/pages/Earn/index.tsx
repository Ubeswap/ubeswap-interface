import { faArrowDownWideShort } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { ErrorBoundary } from '@sentry/react'
import { Token } from '@ubeswap/sdk'
import TokenSelect from 'components/CurrencyInputPanel/TokenSelect'
import ClaimAllRewardPanel from 'components/earn/ClaimAllRewardPanel'
import Loader from 'components/Loader'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOwnerStakedPools } from 'state/stake/useOwnerStakedPools'
import styled from 'styled-components'
import { fromWei, toBN } from 'web3-utils'

import { AutoColumn, ColumnCenter, TopSection } from '../../components/Column'
import { PoolCard } from '../../components/earn/PoolCard'
import { CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import { RowBetween, RowStart } from '../../components/Row'
import { ExternalLink, TYPE } from '../../theme'
import LiquidityWarning from '../Pool/LiquidityWarning'
import { useFarmRegistry } from './useFarmRegistry'

enum FarmSort {
  UNKNOWN,
  DEPOSIT,
  YIELD,
}

const PageWrapper = styled.div`
  width: 100%;
  max-width: 640px;
`

const DataRow = styled(RowBetween)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
flex-direction: column;
`};
`

const PoolWrapper = styled.div`
  margin-bottom: 12px;
`

const FancyButton = styled.button`
  color: ${({ theme }) => theme.text1};
  align-items: center;
  height: 2.2rem;
  padding: 0 0.7rem;
  border-radius: 12px;
  font-size: 1rem;
  width: auto;
  min-width: 3.5rem;
  border: 1px solid ${({ theme }) => theme.bg3};
  outline: none;
  background: ${({ theme }) => theme.bg1};
  :hover {
    border: 1px solid ${({ theme }) => theme.bg4};
  }
  :focus {
    border: 1px solid ${({ theme }) => theme.primary1};
  }
`

const Option = styled(FancyButton)<{ active: boolean }>`
  margin-right: 8px;
  :hover {
    cursor: pointer;
  }
  background-color: ${({ active, theme }) => active && theme.primary1};
  color: ${({ active, theme }) => (active ? theme.white : theme.text1)};
  font-weight: 500;
`

const Header: React.FC = ({ children }) => {
  return (
    <DataRow style={{ alignItems: 'baseline', marginBottom: '12px' }}>
      <TYPE.mediumHeader style={{ marginTop: '0.5rem' }}>{children}</TYPE.mediumHeader>
    </DataRow>
  )
}

function useTokenFilter(): [Token | null, (t: Token | null) => void] {
  const [token, setToken] = useState<Token | null>(null)
  return [token, setToken]
}

export default function Earn() {
  const { t } = useTranslation()
  const [filteringToken, setFilteringToken] = useTokenFilter()
  const farmSummaries = useFarmRegistry()
  const [sortType, setSortType] = useState<FarmSort>(FarmSort.UNKNOWN)
  const filteredFarms = useMemo(() => {
    const sortedSummaries =
      sortType === FarmSort.YIELD
        ? farmSummaries.sort((a, b) => Number(b.apy) - Number(a.apy))
        : farmSummaries.sort((a, b) => {
            return Number(fromWei(toBN(b.tvlUSD).sub(toBN(a.tvlUSD))))
          })

    if (filteringToken === null) {
      return sortedSummaries
    } else {
      return sortedSummaries.filter(
        (farm) => farm?.token0Address === filteringToken?.address || farm?.token1Address === filteringToken?.address
      )
    }
  }, [filteringToken, farmSummaries, sortType])

  const { stakedFarms, featuredFarms, unstakedFarms } = useOwnerStakedPools(filteredFarms)
  return (
    <PageWrapper>
      <ClaimAllRewardPanel stakedFarms={stakedFarms} />
      <LiquidityWarning />
      {stakedFarms.length === 0 && (
        <TopSection gap="md">
          <DataCard>
            <CardNoise />
            <CardSection>
              <AutoColumn gap="md">
                <RowBetween>
                  <TYPE.white fontWeight={600}>Ubeswap {t('liquidityMining')}</TYPE.white>
                </RowBetween>
                <RowBetween>
                  <TYPE.white fontSize={14}>{t('liquidityMiningDesc')}</TYPE.white>
                </RowBetween>{' '}
                <ExternalLink
                  style={{ color: 'white', textDecoration: 'underline' }}
                  href="https://docs.ubeswap.org/faq"
                  target="_blank"
                >
                  <TYPE.white fontSize={14}>{t('liquidityMiningReadMore')}</TYPE.white>
                </ExternalLink>
              </AutoColumn>
            </CardSection>
            <CardNoise />
          </DataCard>
        </TopSection>
      )}
      <TopSection gap="md">
        <AutoColumn>
          <RowStart>
            <TokenSelect onTokenSelect={setFilteringToken} token={filteringToken} />
            <Option
              style={{ marginLeft: '8px', marginBottom: '10px' }}
              onClick={() => {
                setSortType(sortType === FarmSort.DEPOSIT ? FarmSort.UNKNOWN : FarmSort.DEPOSIT)
              }}
              active={sortType === FarmSort.DEPOSIT}
            >
              <FontAwesomeIcon icon={faArrowDownWideShort} />
              &nbsp;{t('deposit')}
            </Option>
            <Option
              onClick={() => {
                setSortType(sortType === FarmSort.YIELD ? FarmSort.UNKNOWN : FarmSort.YIELD)
              }}
              active={sortType === FarmSort.YIELD}
            >
              <FontAwesomeIcon icon={faArrowDownWideShort} />
              &nbsp;{t('yield')}
            </Option>
          </RowStart>
        </AutoColumn>
      </TopSection>
      <ColumnCenter>
        {farmSummaries.length > 0 && filteredFarms.length == 0 && `No Farms for ${filteringToken?.symbol}`}
        {farmSummaries.length === 0 && <Loader size="48px" />}
      </ColumnCenter>
      {stakedFarms.length > 0 && (
        <>
          <Header>{t('yourPools')}</Header>
          {stakedFarms.map((farmSummary) => (
            <PoolWrapper key={farmSummary.stakingAddress}>
              <ErrorBoundary>
                <PoolCard farmSummary={farmSummary} />
              </ErrorBoundary>
            </PoolWrapper>
          ))}
        </>
      )}
      {featuredFarms.length > 0 && (
        <>
          <Header>{t('featuredPools')}</Header>
          {featuredFarms.map((farmSummary) => (
            <PoolWrapper key={farmSummary.stakingAddress}>
              <ErrorBoundary>
                <PoolCard farmSummary={farmSummary} />
              </ErrorBoundary>
            </PoolWrapper>
          ))}
        </>
      )}
      {unstakedFarms.length > 0 && (
        <>
          <Header>{t('availablePools')}</Header>
          {unstakedFarms.map((farmSummary) => (
            <PoolWrapper key={farmSummary.stakingAddress}>
              <ErrorBoundary>
                <PoolCard farmSummary={farmSummary} />
              </ErrorBoundary>
            </PoolWrapper>
          ))}
        </>
      )}
    </PageWrapper>
  )
}
