import { AutoColumn, TopSection } from 'components/Column'
import { AutoRow, RowBetween, RowCenter } from 'components/Row'
import { FarmSummary } from 'pages/Earn/useFarmRegistry'
import React, { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useFilteredStakingInfo } from 'state/stake/hooks'
import styled from 'styled-components'
import { StyledLink, TYPE } from 'theme'

import ClaimRewardItem from './ClaimRewardItem'
import { CardSection, TopBorderCard } from './styled'

const ClaimRewardItemWrapper = styled.div`
  padding: 8px 10px;
  margin-right: 10px;
  margin-bottom: 10px;
  background-color: ${(props) => props.theme.bg1};
  border: 1px solid ${(props) => props.theme.primary1};
  border-radius: 10px;
`

export interface ClaimAllRewardsProps {
  stakedFarms: FarmSummary[]
}

export default function ClaimAllRewardPanel({ stakedFarms }: ClaimAllRewardsProps) {
  const { t } = useTranslation()

  const stakingAddresses = useMemo(() => {
    return stakedFarms.map((farm) => farm.lpAddress)
  }, [stakedFarms])

  const stakingInfos = useFilteredStakingInfo(stakingAddresses)

  useEffect(() => {
    console.log('stakingInfo', stakingInfos)
  }, [stakingInfos])

  const onClaim = () => {
    console.log('onClaim')
  }

  return (
    <TopSection gap="md">
      <TopBorderCard>
        <CardSection>
          <AutoColumn gap="md">
            <RowCenter>
              <TYPE.black fontWeight={600}>{t('youHaveUnclaimedRewards')}</TYPE.black>
            </RowCenter>
            <RowBetween>
              <TYPE.black fontSize={14}></TYPE.black>
            </RowBetween>
            <AutoRow>
              {stakedFarms.map((farmSummary) => (
                <ClaimRewardItemWrapper key={farmSummary.stakingAddress}>
                  <ClaimRewardItem farmSummary={farmSummary} />
                </ClaimRewardItemWrapper>
              ))}
            </AutoRow>
            <StyledLink onClick={onClaim}>{t('claimAllRewards')}</StyledLink>
          </AutoColumn>
        </CardSection>
      </TopBorderCard>
    </TopSection>
  )
}
