import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { formatEther } from '@ethersproject/units'
import IUniswapV2PairABI from '@ubeswap/core/build/abi/IUniswapV2Pair.json'
import { ChainId as UbeswapChainId, cUSD, JSBI, Token, TokenAmount } from '@ubeswap/sdk'
import MOOLA_STAKING_ABI from 'constants/abis/moola/MoolaStakingRewards.json'
import { Bank } from 'constants/homoraBank'
import { BigNumber, ContractInterface, ethers } from 'ethers'
import { MoolaStakingRewards, StakingRewards } from 'generated'
import { useAllTokens } from 'hooks/Tokens'
import React, { useEffect, useMemo } from 'react'
import { getProviderOrSigner } from 'utils'
import { AbiItem, fromWei, isAddress, toBN, toWei } from 'web3-utils'

import COREORACLE_ABI from '../../constants/abis/CoreOracle.json'
import farmRegistryAbi from '../../constants/abis/FarmRegistry.json'
import BANK_ABI from '../../constants/abis/HomoraBank.json'
import PROXYORACLE_ABI from '../../constants/abis/ProxyOracle.json'
import STAKING_REWARDS_ABI from '../../constants/abis/StakingRewards.json'
import { CoreOracle } from '../../generated/CoreOracle'
import { HomoraBank } from '../../generated/HomoraBank'
import { IUniswapV2Pair } from '../../generated/IUniswapV2Pair'
import { ProxyOracle } from '../../generated/ProxyOracle'

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
  totalRewardRates?: TokenAmount[]
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
  const importedFarms: string[] = useMemo(() => {
    return importedFarmsAddress ? JSON.parse(importedFarmsAddress) : []
  }, [importedFarmsAddress])
  const { address: account, network } = useContractKit()
  const { chainId } = network

  const tokens = useAllTokens()
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
      const externalInfo = await Promise.all([
        multiStakingContract.externalStakingRewards(),
        multiStakingContract.callStatic.earnedExternal(account ?? ''),
      ])
      let stakingRewardsAddress = externalInfo[0]
      const externalEarned = externalInfo[1]
      for (let i = 0; i < externalEarned.length; i += 1) {
        const moolaStaking = new ethers.Contract(
          stakingRewardsAddress,
          MOOLA_STAKING_ABI as ContractInterface,
          provider
        ) as unknown as MoolaStakingRewards
        const [externalRewardsToken, rewardRate] = await Promise.all([
          moolaStaking.rewardsToken(),
          moolaStaking.rewardRate(),
        ])
        tokens.push(externalRewardsToken)
        rates.push(rewardRate)
        if (i < externalEarned.length - 1) stakingRewardsAddress = await moolaStaking.externalStakingRewards()
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
      const tokens = await Promise.all([pair.token0(), pair.token1()])
      token0Address = tokens[0]
      token1Address = tokens[1]
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
    let farmSummaries: any = []
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
      const importFarm = async (importedFarmAddress: string) => {
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

        const [
          stakingTokenAddress,
          totalSupply,
          rewardsTokenAddress,
          rewardRate,
          { tokens: externalRewardsTokens, rates: externalRewardsRates },
        ] = await Promise.all([
          stakingContract.stakingToken(),
          stakingContract.totalSupply(),
          stakingContract?.rewardsToken(),
          stakingContract?.rewardRate(),
          fetchMultiStaking(multiStakingContract),
        ])

        const arrayOfRewardsTokenAddress = rewardsTokenAddress
          ? [rewardsTokenAddress, ...externalRewardsTokens]
          : externalRewardsTokens

        const arrayOfRewardsRates: any = rewardRate ? [rewardRate, ...externalRewardsRates] : externalRewardsRates

        const rewardTokens =
          arrayOfRewardsTokenAddress && isAddress(importedFarmAddress)
            ? arrayOfRewardsTokenAddress?.map((rewardsTokenAddress) =>
                tokens && tokens[rewardsTokenAddress]
                  ? tokens[rewardsTokenAddress]
                  : new Token(chainId as number, rewardsTokenAddress, 18)
              )
            : []

        const totalRewardRates =
          rewardTokens && isAddress(importedFarmAddress)
            ? rewardTokens.map(
                (rewardsToken, i) =>
                  new TokenAmount(
                    rewardsToken,
                    arrayOfRewardsRates && arrayOfRewardsRates[i] ? arrayOfRewardsRates[i] : JSBI.BigInt(0)
                  )
              )
            : []

        const pair = new ethers.Contract(
          stakingTokenAddress,
          IUniswapV2PairABI as ContractInterface,
          provider
        ) as unknown as IUniswapV2Pair

        const [pairToken, stakingCeloPrice] = await Promise.all([
          getPairToken(pair),
          coreOracle.getCELOPx(stakingTokenAddress),
        ])

        const scale = Number(formatEther(stakingCeloPrice)) / Number(formatEther(cusdCeloPrice))
        const tvlUSD = totalSupply && scale ? toWei((Number(formatEther(totalSupply)) * scale).toFixed()) : '0'

        const farmSummary: FarmSummary = {
          farmName: '',
          stakingAddress: importedFarmAddress,
          lpAddress: stakingTokenAddress,
          token0Address: pairToken ? pairToken.token0Address : stakingTokenAddress,
          token1Address: pairToken ? pairToken.token1Address : stakingTokenAddress,
          isFeatured: false,
          tvlUSD,
          rewardsUSDPerYear: '0',
          isImported: true,
          totalRewardRates,
        }
        return farmSummary
      }
      farmSummaries = await Promise.all(importedFarms.map((importedFarm) => importFarm(importedFarm)))
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
