import { useDoTransaction } from 'components/swap/routing'
import React, { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useStakingContract } from '../../hooks/useContract'
import { StakingInfo } from '../../state/stake/hooks'

export interface ClaimAllRewardItemProps {
  index: number
  pending: boolean
  pendingIndex: number
  stakingInfo: StakingInfo
  report(): void
}

export default function ClaimAllRewardItem({
  index,
  pending,
  pendingIndex,
  stakingInfo,
  report,
}: ClaimAllRewardItemProps) {
  const { t } = useTranslation()

  const doTransaction = useDoTransaction()

  const stakingContract = useStakingContract(stakingInfo.stakingRewardAddress)

  const reward = useCallback(async () => {
    if (stakingContract && stakingInfo?.stakedAmount) {
      await doTransaction(stakingContract, 'getReward', {
        args: [],
        summary: `${t('ClaimAccumulatedUbeRewards')}`,
      })
        .catch(console.error)
        .finally(() => {
          report()
        })
    }
  }, [stakingContract, stakingInfo, doTransaction, report, t])

  useEffect(() => {
    if (pending && pendingIndex === index) reward()
  }, [pendingIndex, pending, index, reward])

  return <></>
}
