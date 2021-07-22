import { PoolCard } from 'components/earn/PoolCard'
import { useActiveWeb3React } from 'hooks'
import React from 'react'
import { StakingInfo } from 'state/stake/hooks'
import { useDualStakeRewards } from 'state/stake/useDualStakeRewards'

interface Props {
  poolAddress: string
  underlyingPool: StakingInfo
}

export const DualPoolCard: React.FC<Props> = ({ poolAddress, underlyingPool }: Props) => {
  const { account } = useActiveWeb3React()
  const mooPool = useDualStakeRewards(poolAddress, underlyingPool, account ?? null)

  if (!mooPool) {
    return <></>
  }

  return <PoolCard stakingInfo={mooPool} dualRewards={mooPool} />
}
