import { AutoColumn, TopSection } from 'components/Column'
import Loader from 'components/Loader'
import { RowCenter, RowStart } from 'components/Row'
import { useDoTransaction } from 'components/swap/routing'
import { StakingRewards } from 'generated'
import { FarmSummary } from 'pages/Earn/useFarmRegistry'
import React, { useCallback, useContext, useMemo, useState } from 'react'
import { AlertCircle } from 'react-feather'
import { Trans, useTranslation } from 'react-i18next'
import { StakingInfo, useFilteredStakingInfo } from 'state/stake/hooks'
import styled, { ThemeContext } from 'styled-components'
import { StyledLink, TYPE } from 'theme'

import ClaimAllRewardItem from './ClaimAllRewardItem'
import { CardSection, TopBorderCard } from './styled'

export const Space = styled.span`
  width: 10px;
`

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
  const doTransaction = useDoTransaction()

  const [memoizedStakingInfos, setMemoizedStakingInfos] = useState<readonly StakingInfo[] | undefined>(undefined)
  const [pending, setPending] = useState<boolean>(false)
  const [pendingIndex, setPendingIndex] = useState<number>(0)

  const reportFinish = useCallback(() => {
    if (pendingIndex === memoizedStakingInfos?.length) setPending(false)
    else setPendingIndex(pendingIndex + 1)
  }, [pendingIndex, memoizedStakingInfos])

  const claimReward = useCallback(
    async (stakingContract: StakingRewards) => {
      await doTransaction(stakingContract, 'getReward', {
        args: [],
        summary: `${t('ClaimAccumulatedUbeRewards')}`,
      })
        .catch(console.error)
        .finally(() => {
          reportFinish()
        })
    },
    [doTransaction, reportFinish, t]
  )

  const onClaimRewards = () => {
    setMemoizedStakingInfos(stakingInfos)
    setPending(true)
    setPendingIndex(1)
  }

  if (!stakingInfos || stakingInfos?.length == 0) return <></>

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
              {pending && (
                <RowCenter>
                  <TYPE.black fontWeight={600}>{`${pendingIndex} / ${memoizedStakingInfos?.length}`}</TYPE.black>
                  <Space />
                  <Loader size="15px" />
                </RowCenter>
              )}
              {!pending && <StyledLink onClick={onClaimRewards}>{t('claimAllRewards')}</StyledLink>}
            </AutoColumn>
          </RowStart>
          {memoizedStakingInfos?.map((stakingInfo, idx) => (
            <ClaimAllRewardItem
              key={idx}
              index={idx + 1}
              pending={pending}
              pendingIndex={pendingIndex}
              stakingInfo={stakingInfo}
              claimReward={claimReward}
            />
          ))}
        </CardSection>
      </TopBorderCard>
    </TopSection>
  )
}
