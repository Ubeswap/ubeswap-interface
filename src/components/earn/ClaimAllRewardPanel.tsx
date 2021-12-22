import { AutoColumn, TopSection } from 'components/Column'
import { RowBetween, RowCenter, RowStart } from 'components/Row'
import { FarmSummary } from 'pages/Earn/useFarmRegistry'
import React, { useContext, useMemo } from 'react'
import { AlertCircle } from 'react-feather'
import { Trans, useTranslation } from 'react-i18next'
import { useFilteredStakingInfo } from 'state/stake/hooks'
import { ThemeContext } from 'styled-components'
import { StyledLink, TYPE } from 'theme'

import { CardSection, TopBorderCard } from './styled'

export interface ClaimAllRewardsProps {
  stakedFarms: FarmSummary[]
}

export default function ClaimAllRewardPanel({ stakedFarms }: ClaimAllRewardsProps) {
  const theme = useContext(ThemeContext)
  const { t } = useTranslation()

  const stakingAddresses = useMemo(() => {
    return stakedFarms.map((farm) => farm.lpAddress)
  }, [stakedFarms])

  const stakingInfos = useFilteredStakingInfo(stakingAddresses)

  const onClaim = () => {
    console.log('onClaim')
  }

  if (stakingInfos?.length == 0) return <></>

  return (
    <TopSection gap="md">
      <TopBorderCard>
        <CardSection>
          <RowStart>
            <div style={{ paddingRight: 16 }}>
              <AlertCircle color={theme.green1} size={36} />
            </div>
            <AutoColumn gap="md">
              <RowCenter>
                <TYPE.black fontWeight={600}>
                  <Trans i18nKey="youHaveUnclaimedRewards" values={{ count: stakingInfos?.length }} />
                </TYPE.black>
              </RowCenter>
              <RowBetween>
                <TYPE.black fontSize={14}></TYPE.black>
              </RowBetween>
              <StyledLink onClick={onClaim}>{t('claimAllRewards')}</StyledLink>
            </AutoColumn>
          </RowStart>
        </CardSection>
      </TopBorderCard>
    </TopSection>
  )
}
