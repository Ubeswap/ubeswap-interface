import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { formatEther } from '@ethersproject/units'
import { ChainId as UbeswapChainId, cUSD, JSBI, Token, TokenAmount } from '@ubeswap/sdk'
import MOOLA_STAKING_ABI from 'constants/abis/moola/MoolaStakingRewards.json'
import { Bank } from 'constants/homoraBank'
import { BigNumber, ContractInterface, ethers } from 'ethers'
import { MoolaStakingRewards } from 'generated'
import { useAllTokens } from 'hooks/Tokens'
import { useMultiStakingContract, useStakingContract } from 'hooks/useContract'
import useCurrentBlockTimestamp from 'hooks/useCurrentBlockTimestamp'
import { useEffect, useMemo, useState } from 'react'
import { useSingleCallResult } from 'state/multicall/hooks'
import { getProviderOrSigner } from 'utils'
import { isAddress } from 'web3-utils'

import COREORACLE_ABI from '../../constants/abis/CoreOracle.json'
import BANK_ABI from '../../constants/abis/HomoraBank.json'
import PROXYORACLE_ABI from '../../constants/abis/ProxyOracle.json'
import { CoreOracle } from '../../generated/CoreOracle'
import { HomoraBank } from '../../generated/HomoraBank'
import { ProxyOracle } from '../../generated/ProxyOracle'
import { useCurrency } from '../../hooks/Tokens'

export interface CustomStakingInfo {
  totalStakedAmount: TokenAmount | undefined
  stakingToken: Token | null | undefined
  rewardTokens: Token[]
  earnedAmounts: TokenAmount[]
  totalRewardRates: TokenAmount[]
  stakedAmount: TokenAmount | undefined
  userValueCUSD: string | undefined
  valueOfTotalStakedAmountInCUSD: string | undefined
  stakingRewardAddress: string
  active: boolean
  readonly getHypotheticalRewardRate: (
    stakedAmount: TokenAmount,
    totalStakedAmount: TokenAmount,
    totalRewardRates: TokenAmount[]
  ) => TokenAmount[]
  tokens: Token[] | undefined
  rewardRates: TokenAmount[]
}

export const useCustomStakingInfo = (farmAddress: string): CustomStakingInfo => {
  const { address: account, network } = useContractKit()
  const { chainId } = network
  const library = useProvider()
  const provider = getProviderOrSigner(library, account ? account : undefined)
  const tokens = useAllTokens()
  const cusd = cUSD[chainId as unknown as UbeswapChainId]
  const [scale, setScale] = useState<number | undefined>(undefined)

  const stakingContract = useStakingContract(isAddress(farmAddress) ? farmAddress : '')
  const multiStakingContract = useMultiStakingContract(isAddress(farmAddress) ? farmAddress : '')
  const [externalRewardsTokens, setExternalRewardsTokens] = useState<Array<string>>([])
  const [externalRewardsRates, setExternalRewardsRates] = useState<Array<BigNumber>>([])
  const [externalEarnedAmounts, setExternalEarnedAmounts] = useState<Array<BigNumber>>([])
  const [fetchingMultiStaking, setFetchingMultiStaking] = useState<boolean>(false)
  const currentBlockTimestamp = useCurrentBlockTimestamp()
  const bank = useMemo(
    () => new ethers.Contract(Bank[chainId], BANK_ABI.abi as ContractInterface, provider) as unknown as HomoraBank,
    [chainId, provider]
  )

  useEffect(() => {
    const fetchMultiStaking = async () => {
      if (fetchingMultiStaking || !multiStakingContract) {
        return
      }
      const tokens = []
      const rates = []
      const amounts: BigNumber[] = []
      try {
        setFetchingMultiStaking(true)
        const externalInfo = await Promise.all([
          multiStakingContract.externalStakingRewards(),
          multiStakingContract.callStatic.earnedExternal(account ?? ''),
        ])
        let stakingRewardsAddress = externalInfo[0]
        const externalEarned = externalInfo[1]
        if (externalEarned.length) {
          externalEarned.map((earned) => amounts.push(earned))
        }
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
        console.log(err)
      }
      setFetchingMultiStaking(false)
      setExternalRewardsTokens(tokens)
      setExternalRewardsRates(rates)
      setExternalEarnedAmounts(amounts)
    }
    fetchMultiStaking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, multiStakingContract, provider])

  const balanceOf = useSingleCallResult(stakingContract, 'balanceOf', [account ?? ''])?.result?.[0]

  const periodFinish = useSingleCallResult(stakingContract, 'periodFinish', [])?.result?.[0]
  const periodFinishSeconds = periodFinish?.toNumber()
  const active =
    periodFinishSeconds && currentBlockTimestamp ? periodFinishSeconds > currentBlockTimestamp.toNumber() : false

  const totalSupply = useSingleCallResult(stakingContract, 'totalSupply', [])?.result?.[0]

  let arrayOfRewardsTokenAddress = useSingleCallResult(stakingContract, 'rewardsToken', [])?.result
  arrayOfRewardsTokenAddress = arrayOfRewardsTokenAddress
    ? [...arrayOfRewardsTokenAddress, ...externalRewardsTokens]
    : externalRewardsTokens

  let rewardRates: any = useSingleCallResult(stakingContract, 'rewardRate', [])?.result
  rewardRates = rewardRates ? [...rewardRates, ...externalRewardsRates] : externalRewardsRates

  const earnedAmount = useSingleCallResult(stakingContract, 'earned', [account ?? ''])?.result?.[0]
  const earnedAmountsAll: BigNumber[] = earnedAmount ? [earnedAmount, ...externalEarnedAmounts] : externalEarnedAmounts

  const stakingTokenAddress = useSingleCallResult(stakingContract, 'stakingToken', [])?.result?.[0]
  const stakingToken = useCurrency(stakingTokenAddress)
  const stakedAmount = stakingToken ? new TokenAmount(stakingToken, JSBI.BigInt(balanceOf ?? 0)) : undefined

  const rewardTokens: Token[] =
    arrayOfRewardsTokenAddress && isAddress(farmAddress)
      ? arrayOfRewardsTokenAddress?.map((rewardsTokenAddress) =>
          tokens && tokens[rewardsTokenAddress]
            ? tokens[rewardsTokenAddress]
            : new Token(chainId as number, rewardsTokenAddress, 18)
        )
      : []

  const earnedAmounts: TokenAmount[] =
    rewardTokens && isAddress(farmAddress)
      ? rewardTokens?.map(
          (rewardsToken, index) => new TokenAmount(rewardsToken, JSBI.BigInt(earnedAmountsAll[index] ?? 0))
        )
      : []

  useEffect(() => {
    const getStakingCusdPrice = async () => {
      if (!stakingToken || !cusd || !bank) {
        setScale(undefined)
        return
      }
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
        const [stakingCeloPrice, cusdCeloPrice] = await Promise.all([
          coreOracle.getCELOPx(stakingToken?.address),
          coreOracle.getCELOPx(cusd.address),
        ])
        setScale(Number(formatEther(stakingCeloPrice)) / Number(formatEther(cusdCeloPrice)))
      } catch (err) {
        console.error(err)
        setScale(undefined)
      }
    }
    getStakingCusdPrice()
  }, [bank, provider, cusd, stakingToken])

  const totalRewardRates =
    rewardTokens && isAddress(farmAddress)
      ? rewardTokens.map(
          (rewardsToken, i) =>
            new TokenAmount(rewardsToken, rewardRates && rewardRates[i] ? rewardRates[i] : JSBI.BigInt(0))
        )
      : []

  const totalStakedAmount = stakingToken ? new TokenAmount(stakingToken, JSBI.BigInt(totalSupply)) : undefined
  const valueOfTotalStakedAmountInCUSD =
    totalSupply && scale ? (Number(formatEther(totalSupply)) * scale).toFixed() : undefined

  const userValueCUSD = stakedAmount && scale ? (Number(stakedAmount.toExact()) * scale).toFixed() : undefined

  const getHypotheticalRewardRate = (
    _stakedAmount: TokenAmount,
    _totalStakedAmount: TokenAmount,
    _totalRewardRates: TokenAmount[]
  ): TokenAmount[] => {
    return rewardTokens && rewardTokens.length > 0
      ? rewardTokens.map(
          (rewardToken, index) =>
            new TokenAmount(
              rewardToken,
              JSBI.greaterThan(_totalStakedAmount.raw, JSBI.BigInt(0))
                ? JSBI.divide(JSBI.multiply(_totalRewardRates[index].raw, _stakedAmount.raw), _totalStakedAmount.raw)
                : JSBI.BigInt(0)
            )
        )
      : []
  }

  const userRewardRates =
    rewardTokens && rewardTokens.length > 0 && totalStakedAmount && stakedAmount
      ? rewardTokens.map(
          (rewardToken, index) =>
            new TokenAmount(
              rewardToken,
              JSBI.greaterThan(totalStakedAmount.raw, JSBI.BigInt(0))
                ? JSBI.divide(JSBI.multiply(totalRewardRates[index].raw, stakedAmount.raw), totalStakedAmount.raw)
                : JSBI.BigInt(0)
            )
        )
      : []

  return {
    totalStakedAmount,
    stakingToken,
    rewardTokens,
    totalRewardRates,
    stakedAmount,
    userValueCUSD,
    valueOfTotalStakedAmountInCUSD,
    active,
    stakingRewardAddress: farmAddress,
    getHypotheticalRewardRate,
    tokens: undefined,
    earnedAmounts,
    rewardRates: userRewardRates,
  }
}
