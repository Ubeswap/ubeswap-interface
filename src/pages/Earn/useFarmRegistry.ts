import { useContractKit } from '@celo-tools/use-contractkit'
import { ethers } from 'ethers'
import React, { useEffect } from 'react'
import { AbiItem } from 'web3-utils'

import farmRegistryAbi from '../../constants/abis/FarmRegistry.json'

type FarmData = {
  tvlUSD: string
  rewardsUSDPerYear: string
}

export type FarmSummary = {
  farmName: string
  stakingAddress: string
  lpAddress: string
  rewardsUSDPerYear: string
  tvlUSD: string
  token0Address: string
  token1Address: string
}

export const useFarmRegistry = () => {
  const { kit } = useContractKit()
  const [farmSummaries, setFarmSummaries] = React.useState<FarmSummary[]>([])
  const call = React.useCallback(async () => {
    const farmRegistry = new kit.web3.eth.Contract(
      farmRegistryAbi as AbiItem[],
      '0xa2bf67e12EeEDA23C7cA1e5a34ae2441a17789Ec'
    )
    const farmInfoEvents = await farmRegistry.getPastEvents('FarmInfo', { fromBlock: 0, toBlock: 'latest' })
    const lpInfoEvents = await farmRegistry.getPastEvents('LPInfo', { fromBlock: 0, toBlock: 'latest' })
    const farmDataEvents = await farmRegistry.getPastEvents('FarmData', { fromBlock: 0, toBlock: 'latest' })

    const lps: Record<string, [string, string]> = {}
    lpInfoEvents.forEach((e) => {
      lps[e.returnValues.lpAddress] = [e.returnValues.token0Address, e.returnValues.token1Address]
    })
    const farmData: Record<string, FarmData> = {}
    farmDataEvents.forEach((e) => {
      farmData[e.returnValues.stakingAddress] = {
        tvlUSD: e.returnValues.tvlUSD,
        rewardsUSDPerYear: e.returnValues.rewardsUSDPerYear,
      }
    })
    const farmSummaries: FarmSummary[] = []
    farmInfoEvents.forEach((e) => {
      farmSummaries.push({
        farmName: ethers.utils.parseBytes32String(e.returnValues.farmName),
        stakingAddress: e.returnValues.stakingAddress,
        lpAddress: e.returnValues.lpAddress,
        token0Address: lps[e.returnValues.lpAddress][0],
        token1Address: lps[e.returnValues.lpAddress][1],
        tvlUSD: farmData[e.returnValues.stakingAddress].tvlUSD,
        rewardsUSDPerYear: farmData[e.returnValues.stakingAddress].rewardsUSDPerYear,
      })
    })
    setFarmSummaries(farmSummaries)
  }, [kit.web3.eth.Contract])

  useEffect(() => {
    call()
  }, [call])

  return farmSummaries
}
