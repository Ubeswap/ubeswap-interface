import { useContractKit } from '@celo-tools/use-contractkit'
import { Interface } from '@ethersproject/abi'
import BigNumber from 'bignumber.js'
import { partition } from 'lodash'
import { FarmSummary } from 'pages/Earn/useFarmRegistry'
import { useMemo } from 'react'
import { useMultipleContractSingleData } from 'state/multicall/hooks'

import DUAL_REWARDS_ABI from '../../constants/abis/moola/MoolaStakingRewards.json'

// get all staked pools
export const useOwnerStakedPools = (farmSummaries: FarmSummary[]) => {
  const { address: owner } = useContractKit()

  const data = useMultipleContractSingleData(
    farmSummaries.map((farmSummaries) => farmSummaries.stakingAddress),
    new Interface(DUAL_REWARDS_ABI),
    'balanceOf',
    [owner || undefined]
  )

  const isStaked: Record<string, boolean> = data.reduce<Record<string, boolean>>((acc, curr, idx) => {
    acc[farmSummaries[idx].stakingAddress] = curr?.result?.[0].gt('0')
    return acc
  }, {})

  const [stakedFarms, unstakedFarms] = useMemo(() => {
    return partition(farmSummaries, (farmSummary) => isStaked[farmSummary.stakingAddress])
  }, [farmSummaries, isStaked])

  const uniqueUnstakedFarms = useMemo(() => unique(unstakedFarms), [unstakedFarms])

  return { stakedFarms, unstakedFarms: uniqueUnstakedFarms }
}

function unique(farmSummaries: FarmSummary[]): FarmSummary[] {
  const cache: Record<string, FarmSummary[]> = {}

  const farmsGroupedByLp = farmSummaries.reduce((byLpAddress, farm) => {
    const previous = byLpAddress[farm.lpAddress] || []

    const likeFarms = [...previous, farm]

    return { ...byLpAddress, [farm.lpAddress]: likeFarms }
  }, cache)

  return Object.entries(farmsGroupedByLp).map(([_, familyFarms]) => {
    if (familyFarms.length === 1) {
      return familyFarms[0]
    } else {
      return familyFarms.sort((a, b) => {
        return new BigNumber(a.rewardsUSDPerYear).isGreaterThan(new BigNumber(b.rewardsUSDPerYear)) ? -1 : 1
      })[0]
    }
  })
}
