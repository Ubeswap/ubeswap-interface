import { Address } from '@celo/contractkit'
import { JSBI, TokenAmount } from '@ubeswap/sdk'
import { UBE } from 'constants/tokens'
import { useActiveWeb3React } from 'hooks'
import { useDualStakingContract } from 'hooks/useContract'
import { useCallback, useEffect, useState } from 'react'
import useCUSDPrice from 'utils/useCUSDPrice'

import { StakingInfo } from './hooks'

export type DualRewardsInfo = StakingInfo & {
  /**
   * External earned amount. (UBE)
   */
  earnedAmountExternal: TokenAmount
}

export const useDualStakeRewards = (
  address: Address,
  underlyingPool: StakingInfo,
  owner: Address | null
): DualRewardsInfo | null => {
  const { chainId } = useActiveWeb3React()
  const stakeRewards = useDualStakingContract(address)
  const [info, setInfo] = useState<DualRewardsInfo | null>(null)
  const ube = chainId ? UBE[chainId] : undefined
  const ubePrice = useCUSDPrice(ube)

  const load = useCallback(async () => {
    if (!stakeRewards) {
      return null
    }

    const totalSupply = await stakeRewards.callStatic.totalSupply()
    const rewardRate = await stakeRewards.callStatic.rewardRate()

    if (!owner) {
      return [totalSupply, rewardRate, null, null, null] as const
    }

    const result = await Promise.all([
      stakeRewards.callStatic.balanceOf(owner),
      stakeRewards.callStatic.earned(owner),
      stakeRewards.callStatic.earnedExternal(owner).then((v) => v[0]), // Hardcode: Only 1 external reward
    ])
    return [totalSupply, rewardRate, ...result] as const
  }, [owner, stakeRewards])

  useEffect(() => {
    void (async () => {
      const data = await load()
      if (!data || !ube) {
        return
      }
      const [totalSupplyRaw, totalRewardRateRaw, myBalance, earned, earnedExternal] = data
      const { stakingToken } = underlyingPool

      const getHypotheticalRewardRate = (
        stakedAmount: TokenAmount,
        totalStakedAmount: TokenAmount,
        totalRewardRate: TokenAmount
      ): TokenAmount => {
        return new TokenAmount(
          ube,
          JSBI.greaterThan(totalStakedAmount.raw, JSBI.BigInt(0))
            ? JSBI.divide(JSBI.multiply(totalRewardRate.raw, stakedAmount.raw), totalStakedAmount.raw)
            : JSBI.BigInt(0)
        )
      }

      const stakedAmount = myBalance ? new TokenAmount(stakingToken, myBalance.toString()) : undefined
      const totalStakedAmount = new TokenAmount(stakingToken, totalSupplyRaw.toString())
      const totalRewardRate = new TokenAmount(ube, totalRewardRateRaw.toString())

      const rewardRate = stakedAmount
        ? getHypotheticalRewardRate(stakedAmount, totalStakedAmount, totalRewardRate)
        : new TokenAmount(totalRewardRate.token, '0')

      const ubePerYear = new TokenAmount(ube, JSBI.multiply(totalRewardRate.raw, JSBI.BigInt(365 * 24 * 60 * 60)))
      const dollarRewardPerYear = ubePrice?.quote(ubePerYear)

      const info: DualRewardsInfo = {
        stakingRewardAddress: address,
        stakingToken,
        stakedAmount,
        earnedAmount: new TokenAmount(ube, earned?.toString() ?? '0'),
        earnedAmountExternal: new TokenAmount(ube, earnedExternal?.toString() ?? '0'),
        rewardRate,
        totalRewardRate,
        totalStakedAmount,
        periodFinish: new Date(),
        active: true,
        getHypotheticalRewardRate,
        dollarRewardPerYear,

        tokens: underlyingPool.tokens,
        nextPeriodRewards: underlyingPool.nextPeriodRewards,
        poolInfo: underlyingPool.poolInfo,
      }
      setInfo(info)
    })()
  }, [address, chainId, load, ube, ubePrice, underlyingPool])

  return info
}
