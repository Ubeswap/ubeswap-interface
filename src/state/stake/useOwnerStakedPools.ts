import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { JSBI } from '@ubeswap/sdk'
import { partition } from 'lodash'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getContract } from 'utils'

import { BIG_INT_ZERO } from '../../constants'
import DUAL_REWARDS_ABI from '../../constants/abis/moola/MoolaStakingRewards.json'
import { MultiRewardPool, multiRewardPools } from './farms'
import { StakingInfo } from './hooks'

const isStakedPool = (pool: StakingInfo, logit = false) => {
  return Boolean(pool.stakedAmount && JSBI.greaterThan(pool.stakedAmount.raw, BIG_INT_ZERO))
}

// get all staked pools
export const useOwnerStakedPools = (allPools: StakingInfo[]) => {
  const { address: owner } = useContractKit()
  const library = useProvider()

  const [data, setData] = useState(null)

  const multiRewards = useMemo(
    () =>
      multiRewardPools.map((multiPool) => {
        return [multiPool, allPools.find((pool) => pool.poolInfo.poolAddress === multiPool.basePool)]
      }) as [MultiRewardPool, StakingInfo | undefined][],
    [allPools, multiRewardPools]
  )

  // TODO: Add balance information to multiRewardPools so we do not have to fetch again
  const getBalanceCalls = multiRewards.map((mr) => {
    const stakeRewards = getContract(mr[0].address, DUAL_REWARDS_ABI, library, owner || undefined)
    const rock = new Promise((resolve, reject) => {
      stakeRewards.callStatic.balanceOf(owner).then((data) => {
        resolve({ [mr[0].address]: data > 0 })
      })
    })
    return rock
  })

  const [stakedPools, unstakedPools] = useMemo(() => {
    return partition(allPools, isStakedPool)
  }, [allPools])

  const load = useCallback(async () => {
    try {
      const results = await Promise.all(getBalanceCalls)
      return results.reduce((pv, cv) => ({ ...pv, ...cv }), {})
    } catch (e) {
      return null
    }
  }, [getBalanceCalls])

  useEffect(() => {
    void (async () => {
      setData(await load())
    })()
  }, [load])

  const [stakedMultiPools, unstakedMultiPools] = partition(
    multiRewards || [],
    (p) => data && p[0] && p[0].address && data[p[0].address]
  )

  return { stakedMultiPools, unstakedMultiPools, stakedPools, unstakedPools }

  /*
      Return TriplePools, DualPools, SinglePools, 
      Return stakedPools, unStakedPools
  */
}

// Another Sort Pools
