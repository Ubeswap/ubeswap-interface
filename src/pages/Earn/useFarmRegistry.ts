import { ApolloQueryResult, gql, useApolloClient } from '@apollo/client'
import { useContractKit } from '@celo-tools/use-contractkit'
import { Percent } from '@ubeswap/sdk'
import { ethers } from 'ethers'
import React, { useEffect } from 'react'
import { AbiItem, fromWei, toBN, toWei } from 'web3-utils'

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
  isFeatured: boolean
  rewardApr: Percent | undefined
  swapApr: Percent | undefined
  apr: Percent | undefined
  apy: string | undefined
}

const blacklist: Record<string, boolean> = {
  '0x4488682fd16562a68ea0d0f898413e075f42e6da': true,
}

const featuredPoolWhitelist: Record<string, boolean> = {
  '0x6F11B6eA70DEe4f167b1A4ED1F01C903f6781960': false, // PACT
  '0xEfe2f9d62E45815837b4f20c1F44F0A83605B540': false, // ARI
  '0x155DA6F164D925E3a91F510B50DEC08aA03B4071': false, // IMMO
}

const pairDataGql = gql`
  query getPairHourData($id: String!) {
    pair(id: $id) {
      pairHourData(first: 24, orderBy: hourStartUnix, orderDirection: desc) {
        hourStartUnix
        hourlyVolumeUSD
      }
    }
  }
`
const COMPOUNDS_PER_YEAR = 2
const CREATION_BLOCK = 9840049
const LAST_N_BLOCKS = 1440 // Last 2 hours

export interface WarningInfo {
  poolName: string
  link: string
}

export const useFarmRegistry = () => {
  const { kit } = useContractKit()
  const client = useApolloClient()
  const [farmSummaries, setFarmSummaries] = React.useState<FarmSummary[]>([])
  const call = React.useCallback(async () => {
    const farmRegistry = new kit.web3.eth.Contract(
      farmRegistryAbi as AbiItem[],
      '0xa2bf67e12EeEDA23C7cA1e5a34ae2441a17789Ec'
    )
    const lastBlock = await kit.web3.eth.getBlockNumber()
    const [farmInfoEvents, lpInfoEvents, farmDataEvents] = await Promise.all([
      farmRegistry.getPastEvents('FarmInfo', {
        fromBlock: CREATION_BLOCK,
        toBlock: lastBlock,
      }),
      farmRegistry.getPastEvents('LPInfo', { fromBlock: CREATION_BLOCK, toBlock: lastBlock }),
      farmRegistry.getPastEvents('FarmData', {
        fromBlock: lastBlock - LAST_N_BLOCKS,
        toBlock: lastBlock,
      }),
    ])

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
    farmInfoEvents
      .filter((e) => !blacklist[e.returnValues.stakingAddress.toLowerCase()])
      .forEach((e) => {
        // sometimes there is no farm data for the staking address return early to avoid crash
        if (!farmData[e.returnValues.stakingAddress]) {
          return
        }
        farmSummaries.push({
          farmName: ethers.utils.parseBytes32String(e.returnValues.farmName),
          stakingAddress: e.returnValues.stakingAddress,
          lpAddress: e.returnValues.lpAddress,
          token0Address: lps[e.returnValues.lpAddress][0],
          token1Address: lps[e.returnValues.lpAddress][1],
          tvlUSD: farmData[e.returnValues.stakingAddress].tvlUSD,
          rewardsUSDPerYear: farmData[e.returnValues.stakingAddress].rewardsUSDPerYear,
          isFeatured: !!featuredPoolWhitelist[e.returnValues.stakingAddress],
          rewardApr: undefined,
          swapApr: undefined,
          apr: undefined,
          apy: undefined,
        })
      })

    farmSummaries
      .sort((a, b) => Number(fromWei(toBN(b.rewardsUSDPerYear).sub(toBN(a.rewardsUSDPerYear)))))
      .sort((a, b) => Number(fromWei(toBN(b.tvlUSD).sub(toBN(a.tvlUSD)))))

    const results = await Promise.all(
      farmSummaries.map((summary) => {
        return client.query({ query: pairDataGql, variables: { id: summary.lpAddress.toLowerCase() } })
      })
    )
    const farmInfos = results.map((result: ApolloQueryResult<any>, index) => {
      let swapRewardsUSDPerYear = 0
      const summary = farmSummaries[index]
      const { loading, error, data } = result
      if (!loading && !error && data) {
        const lastDayVolumeUsd = data.pair.pairHourData.reduce(
          (acc: number, curr: { hourlyVolumeUSD: string }) => acc + Number(curr.hourlyVolumeUSD),
          0
        )
        swapRewardsUSDPerYear = Math.floor(lastDayVolumeUsd * 365 * 0.0025)
      }
      const rewardApr = new Percent(summary.rewardsUSDPerYear, summary.tvlUSD)
      const swapApr = new Percent(toWei(swapRewardsUSDPerYear.toString()), summary.tvlUSD)
      const apr = new Percent(
        toBN(toWei(swapRewardsUSDPerYear.toString())).add(toBN(summary.rewardsUSDPerYear)).toString(),
        summary.tvlUSD
      )
      let apy: string | undefined = undefined
      try {
        apy = annualizedPercentageYield(apr, COMPOUNDS_PER_YEAR)
      } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        console.error('apy calc overflow', summary.farmName, e)
      }
      return {
        rewardApr,
        swapApr,
        apr,
        apy,
      }
    })
    setFarmSummaries(
      farmSummaries.map((summary, index) => ({
        ...summary,
        ...farmInfos[index],
      }))
    )
  }, [kit.web3.eth, client])

  useEffect(() => {
    call()
  }, [call])

  return farmSummaries
}

export const useUniqueBestFarms = () => {
  const farmSummaries = useFarmRegistry()

  const farmsUniqueByBestFarm = farmSummaries.reduce((prev: Record<string, FarmSummary>, current) => {
    if (!prev[current.lpAddress]) {
      prev[current.lpAddress] = current
    } else if (
      Number(fromWei(current.rewardsUSDPerYear)) > Number(fromWei(prev[current.lpAddress].rewardsUSDPerYear))
    ) {
      prev[current.lpAddress] = current
    }
    return prev
  }, {})

  return farmsUniqueByBestFarm
}

// formula is 1 + ((nom/compoundsPerYear)^compoundsPerYear) - 1
function annualizedPercentageYield(nominal: Percent, compounds: number) {
  const ONE = 1

  const divideNominalByNAddOne = Number(nominal.divide(BigInt(compounds)).add(BigInt(ONE)).toFixed(10))

  // multiply 100 to turn decimal into percent, to fixed since we only display integer
  return ((divideNominalByNAddOne ** compounds - ONE) * 100).toFixed(0)
}
