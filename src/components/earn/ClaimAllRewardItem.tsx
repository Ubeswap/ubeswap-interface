import { StakingRewards } from 'generated'
import React, { useEffect } from 'react'

import { useStakingContract } from '../../hooks/useContract'
import { StakingInfo } from '../../state/stake/hooks'

export interface ClaimAllRewardItemProps {
  index: number
  pending: boolean
  pendingIndex: number
  stakingInfo: StakingInfo
  claimReward(stakingContract: StakingRewards): void
}

export default function ClaimAllRewardItem({
  index,
  pending,
  pendingIndex,
  stakingInfo,
  claimReward,
}: ClaimAllRewardItemProps) {
  const stakingContract = useStakingContract(stakingInfo.stakingRewardAddress)

  useEffect(() => {
    if (pending && pendingIndex === index && stakingContract) claimReward(stakingContract)
  }, [pendingIndex, pending, index, stakingContract, claimReward])

  return <></>
}
