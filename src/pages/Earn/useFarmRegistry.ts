import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { formatEther } from '@ethersproject/units'
import IUniswapV2PairABI from '@ubeswap/core/build/abi/IUniswapV2Pair.json'
import { ChainId as UbeswapChainId, cUSD } from '@ubeswap/sdk'
import MOOLA_STAKING_ABI from 'constants/abis/moola/MoolaStakingRewards.json'
import { Bank } from 'constants/homoraBank'
import { BigNumber, ContractInterface, ethers } from 'ethers'
import { MoolaStakingRewards, StakingRewards } from 'generated'
import React, { useEffect, useMemo } from 'react'
import { getProviderOrSigner } from 'utils'
import { AbiItem, fromWei, toBN, toWei } from 'web3-utils'

import COREORACLE_ABI from '../../constants/abis/CoreOracle.json'
import farmRegistryAbi from '../../constants/abis/FarmRegistry.json'
import BANK_ABI from '../../constants/abis/HomoraBank.json'
import PROXYORACLE_ABI from '../../constants/abis/ProxyOracle.json'
import STAKING_REWARDS_ABI from '../../constants/abis/StakingRewards.json'
import { CoreOracle } from '../../generated/CoreOracle'
import { HomoraBank } from '../../generated/HomoraBank'
import { IUniswapV2Pair } from '../../generated/IUniswapV2Pair'
import { ProxyOracle } from '../../generated/ProxyOracle'

const EXTERNAL_FARMS_LIMIT = 5

type FarmData = {
  tvlUSD: string
  rewardsUSDPerYear: string
}

type FxternalInfo = {
  rates: BigNumber[]
  tokens: string[]
}

type PairToken = {
  token0Address: string
  token1Address: string
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
  isImported: boolean
}

const blacklist: Record<string, boolean> = {
  '0x4488682fd16562a68ea0d0f898413e075f42e6da': true,
}

const featuredPoolWhitelist: Record<string, boolean> = {
  '0x6F11B6eA70DEe4f167b1A4ED1F01C903f6781960': false, // PACT
  '0xEfe2f9d62E45815837b4f20c1F44F0A83605B540': false, // ARI
  '0x155DA6F164D925E3a91F510B50DEC08aA03B4071': false, // IMMO
}

const CREATION_BLOCK = 9840049
const LAST_N_BLOCKS = 1440 // Last 2 hours

export interface WarningInfo {
  poolName: string
  link: string
}

export const useFarmRegistry = () => {
  const { kit } = useContractKit()
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
          isImported: false,
        })
      })

    farmSummaries
      .sort((a, b) => Number(fromWei(toBN(b.rewardsUSDPerYear).sub(toBN(a.rewardsUSDPerYear)))))
      .sort((a, b) => Number(fromWei(toBN(b.tvlUSD).sub(toBN(a.tvlUSD)))))

    setFarmSummaries(farmSummaries)
  }, [kit.web3.eth])

  useEffect(() => {
    call()
  }, [call])

  return farmSummaries
}

export const useImportedFarms = () => {
  const importedFarmsAddress = localStorage.getItem('imported_farms')
  const [prevImportedFarms, setPrevImportedFarms] = React.useState<string[]>([])
  const [farmSummaries, setFarmSummaries] = React.useState<FarmSummary[]>([])
  const importedFarms = useMemo(() => {
    return importedFarmsAddress ? JSON.parse(importedFarmsAddress) : []
  }, [importedFarmsAddress])
  const { address: account, network } = useContractKit()
  const { chainId } = network

  const library = useProvider()
  const provider = getProviderOrSigner(library, account ? account : undefined)
  const cusd = cUSD[chainId as unknown as UbeswapChainId]
  const bank = useMemo(
    () => new ethers.Contract(Bank[chainId], BANK_ABI.abi as ContractInterface, provider) as unknown as HomoraBank,
    [chainId, provider]
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchMultiStaking = async (multiStakingContract: ethers.Contract): Promise<FxternalInfo> => {
    if (!multiStakingContract) return { tokens: [], rates: [] }
    const tokens: string[] = []
    const rates: BigNumber[] = []
    try {
      let stakingRewardsAddress = await multiStakingContract.externalStakingRewards()
      for (let i = 0; i < EXTERNAL_FARMS_LIMIT; i += 1) {
        const moolaStaking = new ethers.Contract(
          stakingRewardsAddress,
          MOOLA_STAKING_ABI as ContractInterface,
          provider
        ) as unknown as MoolaStakingRewards
        const externalRewardsToken = await multiStakingContract.externalRewardsTokens(BigNumber.from(i))
        const rewardRate = await moolaStaking.rewardRate()
        tokens.push(externalRewardsToken)
        rates.push(rewardRate)
        stakingRewardsAddress = await moolaStaking.externalStakingRewards()
      }
    } catch (err) {
      // console.log(err)
    }
    return { tokens, rates }
  }

  const getPairToken = async (pair: ethers.Contract): Promise<PairToken | undefined> => {
    let token0Address: string | undefined = undefined
    let token1Address: string | undefined = undefined
    try {
      token0Address = await pair.token0()
      token1Address = await pair.token1()
    } catch (err) {
      // console.log(err)
    }
    return token0Address && token1Address ? { token0Address, token1Address } : undefined
  }
  const call = React.useCallback(async () => {
    if (JSON.stringify(prevImportedFarms) == JSON.stringify(importedFarms)) {
      return
    }
    setPrevImportedFarms(importedFarms)
    const farmSummaries: FarmSummary[] = []
    try {
      const oracle = await bank.oracle()
      const proxyOracle = new ethers.Contract(
        oracle,
        PROXYORACLE_ABI.abi as ContractInterface,
        provider
      ) as unknown as ProxyOracle
      const source = await proxyOracle.source()
      const coreOracle = new ethers.Contract(
        source,
        COREORACLE_ABI.abi as ContractInterface,
        provider
      ) as unknown as CoreOracle
      const cusdCeloPrice = await coreOracle.getCELOPx(cusd.address)
      for (let i = 0; i < importedFarms.length; i += 1) {
        const importedFarmAddress = importedFarms[i]
        const stakingContract = new ethers.Contract(
          importedFarmAddress,
          STAKING_REWARDS_ABI as ContractInterface,
          provider
        ) as unknown as StakingRewards
        const multiStakingContract = new ethers.Contract(
          importedFarmAddress,
          MOOLA_STAKING_ABI as ContractInterface,
          provider
        ) as unknown as MoolaStakingRewards
        const stakingTokenAddress = await stakingContract.stakingToken()
        const totalSupply = await stakingContract.totalSupply()

        const pair = new ethers.Contract(
          stakingTokenAddress,
          IUniswapV2PairABI as ContractInterface,
          provider
        ) as unknown as IUniswapV2Pair

        const pairToken = await getPairToken(pair)

        const { tokens: externalRewardsTokens, rates: externalRewardsRates } = await fetchMultiStaking(
          multiStakingContract
        )
        const rewardsTokenAddress = await stakingContract?.rewardsToken()
        const arrayOfRewardsTokenAddress = rewardsTokenAddress
          ? [rewardsTokenAddress, ...externalRewardsTokens]
          : externalRewardsTokens
        const rewardRate = await stakingContract?.rewardRate()
        const arrayOfRewardsRates = rewardRate ? [rewardRate, ...externalRewardsRates] : externalRewardsRates

        const stakingCeloPrice = await coreOracle.getCELOPx(stakingTokenAddress)
        const scale = Number(formatEther(stakingCeloPrice)) / Number(formatEther(cusdCeloPrice))

        let rewardsUSDPerYear = 0
        for (let i = 0; i < arrayOfRewardsTokenAddress.length; i += 1) {
          const rewardsTokenAddress = arrayOfRewardsTokenAddress[i]
          const rewardsTokenPrice = await coreOracle.getCELOPx(rewardsTokenAddress)
          rewardsUSDPerYear +=
            (Number(formatEther(rewardsTokenPrice)) / Number(formatEther(cusdCeloPrice))) *
            Number(formatEther(arrayOfRewardsRates[i]))
        }

        const tvlUSD = totalSupply && scale ? toWei((Number(formatEther(totalSupply)) * scale).toFixed()) : '0'

        const farmSummary: FarmSummary = {
          farmName: '',
          stakingAddress: importedFarmAddress,
          lpAddress: stakingTokenAddress,
          token0Address: pairToken ? pairToken.token0Address : stakingTokenAddress,
          token1Address: pairToken ? pairToken.token1Address : stakingTokenAddress,
          isFeatured: false,
          tvlUSD,
          rewardsUSDPerYear: rewardsUSDPerYear
            ? toWei((rewardsUSDPerYear * 60 * 60 * 24 * 365).toFixed().toString())
            : '0',
          isImported: true,
        }
        farmSummaries.push(farmSummary)
      }
      setFarmSummaries(farmSummaries)
    } catch (err) {
      console.error(err)
      setFarmSummaries(farmSummaries)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importedFarms])

  useEffect(() => {
    call()
  }, [call])

  return farmSummaries
}

export const useUniqueBestFarms = () => {
  const farmSummaries = useFarmRegistry()
  const importedFarmSummaries = useImportedFarms()
  const farmsUniqueByBestFarm = [...farmSummaries, ...importedFarmSummaries].reduce(
    (prev: Record<string, FarmSummary>, current) => {
      if (!prev[current.lpAddress]) {
        prev[current.lpAddress] = current
      } else if (
        Number(fromWei(current.rewardsUSDPerYear)) > Number(fromWei(prev[current.lpAddress].rewardsUSDPerYear))
      ) {
        prev[current.lpAddress] = current
      }
      return prev
    },
    {}
  )

  return farmsUniqueByBestFarm
}
