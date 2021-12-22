import DoubleCurrencyLogo from 'components/DoubleLogo'
import { usePair } from 'data/Reserves'
import { useToken } from 'hooks/Tokens'
import { FarmSummary } from 'pages/Earn/useFarmRegistry'
import React, { useEffect } from 'react'
import { usePairMultiStakingInfo } from 'state/stake/hooks'
import { usePairStakingInfo } from 'state/stake/useStakingInfo'

export interface ClaimRewardItemProps {
  farmSummary: FarmSummary
}

export default function ClaimRewardItem({ farmSummary }: ClaimRewardItemProps) {
  const token0 = useToken(farmSummary.token0Address) || undefined
  const token1 = useToken(farmSummary.token1Address) || undefined
  const stakingAddress = farmSummary.stakingAddress

  const [, stakingTokenPair] = usePair(token0, token1)
  const singleStakingInfo = usePairStakingInfo(stakingTokenPair)
  const multiStakingInfo = usePairMultiStakingInfo(singleStakingInfo, stakingAddress)
  const externalSingleStakingInfo = usePairStakingInfo(stakingTokenPair, stakingAddress)
  const stakingInfo = multiStakingInfo || externalSingleStakingInfo || singleStakingInfo

  useEffect(() => {
    console.log('single stakigInfo', stakingInfo)
  }, [stakingInfo])

  return <DoubleCurrencyLogo currency0={token0} currency1={token1} size={24} />
}
