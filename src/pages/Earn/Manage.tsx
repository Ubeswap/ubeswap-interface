import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { getAddress } from '@ethersproject/address'
import { formatEther } from '@ethersproject/units'
import { ChainId as UbeswapChainId, cUSD, JSBI, Pair, TokenAmount } from '@ubeswap/sdk'
import StakedAmountsHelper from 'components/earn/StakedAmountsHelper'
import WithdrawLPModal from 'components/earn/WithdrawLPModal'
import Loader from 'components/Loader'
import { Bank, FARMS } from 'constants/leverageYieldFarm'
import { BigNumber, ContractInterface, ethers } from 'ethers'
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, RouteComponentProps } from 'react-router-dom'
import { usePairStakingInfo } from 'state/stake/useStakingInfo'
import styled, { ThemeContext } from 'styled-components'
import { CountUp } from 'use-count-up'
import { getProviderOrSigner } from 'utils'

import { WMStakingRewards } from '../..//generated/WMStakingRewards'
import { ButtonEmpty, ButtonPrimary } from '../../components/Button'
import { AutoColumn } from '../../components/Column'
import DoubleCurrencyLogo from '../../components/DoubleLogo'
import ClaimRewardModal from '../../components/earn/ClaimRewardModal'
import LeverageModal from '../../components/earn/LeverageModal'
import StakingModal from '../../components/earn/StakingModal'
import { CardBGImage, CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import UnstakingModal from '../../components/earn/UnstakingModal'
import QuestionHelper from '../../components/QuestionHelper'
import { RowBetween, RowEnd, RowFixed } from '../../components/Row'
import Toggle from '../../components/Toggle'
import { BIG_INT_SECONDS_IN_WEEK, BIG_INT_ZERO } from '../../constants'
import CERC20_ABI from '../../constants/abis/CErc20Immutable.json'
import COREORACLE_ABI from '../../constants/abis/CoreOracle.json'
import BANK_ABI from '../../constants/abis/HomoraBank.json'
import IERC20W_ABI from '../../constants/abis/IERC20Wrapper.json'
import UNI_PAIR from '../../constants/abis/IUniswapV2Pair.json'
import MULTISTAKING from '../../constants/abis/MockMoolaStakingRewards.json'
import PROXYORACLE_ABI from '../../constants/abis/ProxyOracle.json'
import WMSTAKING from '../../constants/abis/WMStakingRewards.json'
import { usePair } from '../../data/Reserves'
import { CErc20Immutable } from '../../generated/CErc20Immutable'
import { CoreOracle } from '../../generated/CoreOracle'
import { HomoraBank } from '../../generated/HomoraBank'
import { IERC20Wrapper } from '../../generated/IERC20Wrapper'
import { IUniswapV2Pair } from '../../generated/IUniswapV2Pair'
import { MockMoolaStakingRewards } from '../../generated/MockMoolaStakingRewards'
import { ProxyOracle } from '../../generated/ProxyOracle'
import { useCurrency } from '../../hooks/Tokens'
import { useColor } from '../../hooks/useColor'
import usePrevious from '../../hooks/usePrevious'
import { useWalletModalToggle } from '../../state/application/hooks'
import { usePairMultiStakingInfo } from '../../state/stake/hooks'
import { useTokenBalance } from '../../state/wallet/hooks'
import { ExternalLinkIcon, TYPE } from '../../theme'
import { currencyId } from '../../utils/currencyId'
import { useStakingPoolValue } from './useStakingPoolValue'

const PageWrapper = styled(AutoColumn)`
  max-width: 640px;
  width: 100%;
`

const PositionInfo = styled(AutoColumn)<{ dim: any }>`
  position: relative;
  max-width: 640px;
  width: 100%;
  opacity: ${({ dim }) => (dim ? 0.6 : 1)};
`

const BottomSection = styled(AutoColumn)`
  border-radius: 12px;
  width: 100%;
  position: relative;
`

const StyledDataCard = styled(DataCard)<{ bgColor?: any; showBackground?: any }>`
  background: radial-gradient(76.02% 75.41% at 1.84% 0%, #1e1a31 0%, #3d51a5 100%);
  z-index: 2;
  background: ${({ theme, bgColor, showBackground }) =>
    `radial-gradient(91.85% 100% at 1.84% 0%, ${bgColor} 0%,  ${showBackground ? theme.black : theme.bg5} 100%) `};
  ${({ showBackground }) =>
    showBackground &&
    `  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);`}
`

const StyledBottomCard = styled(DataCard)<{ dim: any }>`
  background: ${({ theme }) => theme.bg3};
  opacity: ${({ dim }) => (dim ? 0.4 : 1)};
  margin-top: -40px;
  padding: 0 1.25rem 1rem 1.25rem;
  padding-top: 32px;
  z-index: 1;
`

const PoolData = styled(DataCard)`
  background: none;
  border: 1px solid ${({ theme }) => theme.bg4};
  padding: 1rem;
  z-index: 1;
`

const VoteCard = styled(DataCard)`
  background: radial-gradient(76.02% 75.41% at 1.84% 0%, #27ae60 0%, #000000 100%);
  overflow: hidden;
`

const DataRow = styled(RowBetween)`
  justify-content: center;
  gap: 12px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: column;
    gap: 12px;
  `};
`

export default function Manage({
  match: {
    params: { currencyIdA, currencyIdB, stakingAddress },
  },
}: RouteComponentProps<{ currencyIdA: string; currencyIdB: string; stakingAddress: string }>) {
  const { t } = useTranslation()
  const { address: account, network } = useContractKit()
  const { chainId } = network
  const [leverageFarm, setLeverageFarm] = useState<boolean>(false)
  const theme = useContext(ThemeContext)
  // get currencies and pair
  const [tokenA, tokenB] = [useCurrency(currencyIdA) ?? undefined, useCurrency(currencyIdB) ?? undefined]

  const [, stakingTokenPair] = usePair(tokenA, tokenB)
  const singleStakingInfo = usePairStakingInfo(stakingTokenPair)
  const multiStakingInfo = usePairMultiStakingInfo(singleStakingInfo, stakingAddress)
  const externalSingleStakingInfo = usePairStakingInfo(stakingTokenPair, stakingAddress)

  // Check external before we check single staking
  const stakingInfo = multiStakingInfo || externalSingleStakingInfo || singleStakingInfo

  // detect existing unstaked LP position to show add button if none found
  const userLiquidityUnstaked = useTokenBalance(account ?? undefined, stakingInfo?.stakedAmount?.token)
  const showAddLiquidityButton = Boolean(stakingInfo?.stakedAmount?.equalTo('0') && userLiquidityUnstaked?.equalTo('0'))

  // toggle for staking modal and unstaking modal
  const [showLeverageModal, setShowLeverageModal] = useState(false)
  const [showStakingModal, setShowStakingModal] = useState(false)
  const [showWithdrawLPModal, setShowWithdrawLPModal] = useState(false)
  const [showUnstakingModal, setShowUnstakingModal] = useState(false)
  const [showClaimRewardModal, setShowClaimRewardModal] = useState(false)

  // fade cards if nothing staked or nothing earned yet
  const disableTop = !stakingInfo?.stakedAmount || stakingInfo.stakedAmount.equalTo(JSBI.BigInt(0))

  const token = tokenA === cUSD[chainId as unknown as UbeswapChainId] ? tokenB : tokenA
  const backgroundColor = useColor(token ?? undefined)

  // get CUSD value of staked LP tokens
  const {
    valueCUSD: valueOfTotalStakedAmountInCUSD,
    userValueCUSD,
    userAmountTokenA,
    userAmountTokenB,
  } = useStakingPoolValue(stakingInfo, stakingTokenPair)

  stakingInfo?.rewardRates?.sort((a, b) =>
    a.multiply(BIG_INT_SECONDS_IN_WEEK).lessThan(b.multiply(BIG_INT_SECONDS_IN_WEEK)) ? 1 : -1
  )
  const countUpAmounts =
    stakingInfo?.earnedAmounts
      ?.sort((a, b) => (a.lessThan(b) ? 1 : -1))
      .map((earnedAmount) => earnedAmount.toFixed(6) ?? '0') || []

  const countUpAmountsPrevious = usePrevious(countUpAmounts) ?? countUpAmounts

  const toggleWalletModal = useWalletModalToggle()

  const handleDepositClick = useCallback(() => {
    if (account) {
      setShowStakingModal(true)
    } else {
      toggleWalletModal()
    }
  }, [account, toggleWalletModal])

  const toggleLeverage = () => {
    const leverage = !leverageFarm

    if (stakingInfo?.stakedAmount?.greaterThan(JSBI.BigInt(0)) || leverageError) {
      setShowLeverageModal(leverage)
    } else {
      setLeverageFarm(leverage)
    }
    if (!leverage) {
      setLeverageFarm(false)
    }
  }

  const [proxyOracle, setProxyOracle] = useState<ProxyOracle | null>(null)
  const [coreOracle, setCoreOracle] = useState<CoreOracle | null>(null)
  const [pairLP, setPairLP] = useState<IUniswapV2Pair | null>(null)
  const [positionInfo, setPositionInfo] = useState<any>(undefined)
  const [myPosition, setMyPosition] = useState<any>(undefined)
  const [poolAPR, setPoolAPR] = useState<number>(0)
  const [leverageError, setLeverageError] = useState<string | null>(null)
  const [init, setInit] = useState<boolean>(true)
  const [initialLoading, setInitialLoading] = useState<boolean>(true)
  const [leverageLoading, setLeverageLoading] = useState<boolean>(false)
  const [scale] = useState<BigNumber>(BigNumber.from(2).pow(112))

  const library = useProvider()
  const provider = getProviderOrSigner(library, account ? account : undefined)
  // const provider = useMemo(() => new Web3Provider(window.ethereum as ethers.providers.ExternalProvider).getSigner(), [])

  const bank = useMemo(
    () => new ethers.Contract(Bank[chainId], BANK_ABI.abi as ContractInterface, provider) as unknown as HomoraBank,
    [chainId, provider]
  )

  const dummyPair = useMemo(
    () =>
      stakingInfo
        ? new Pair(new TokenAmount(stakingInfo.tokens[0], '0'), new TokenAmount(stakingInfo.tokens[1], '0'))
        : undefined,
    [stakingInfo]
  )

  const lpToken = FARMS.find((farm) => farm.lp === dummyPair?.liquidityToken.address)

  const loadPosition = useCallback(
    async (coreOracle: CoreOracle | null, pairLP: IUniswapV2Pair | null, apr: number): Promise<boolean> => {
      let leverage = false
      if (proxyOracle && coreOracle && lpToken && stakingInfo && pairLP) {
        const nextPositionId = await bank.nextPositionId()
        let posInfo: any = undefined
        if (nextPositionId.toNumber() > 1 && !showAddLiquidityButton) {
          const batch = []
          for (let i = 1; i < Number(nextPositionId); i += 1) {
            batch.push(bank.getPositionInfo(i))
          }
          const results = await Promise.all(batch)
          for (let i = 0; i < Number(nextPositionId) - 1; i += 1) {
            const positionId = i + 1
            const positionInfo = results[i]
            if (positionInfo && positionInfo.owner.toLowerCase() === account?.toLowerCase()) {
              const wrapper = new ethers.Contract(
                positionInfo.collToken,
                IERC20W_ABI.abi as ContractInterface,
                provider
              ) as unknown as IERC20Wrapper
              const underlying = await wrapper.getUnderlyingToken(positionInfo.collId)
              if (
                getAddress(underlying) === lpToken.lp &&
                getAddress(positionInfo.collToken) === lpToken.wrapper &&
                positionInfo.collateralSize !== BigNumber.from(0)
              ) {
                const totalSupply = await pairLP.totalSupply()
                posInfo = { ...positionInfo, positionId: positionId, totalSupply: totalSupply }
                leverage = true
                break
              }
            }
          }
          setPositionInfo(posInfo)
        }
        if (posInfo && !showAddLiquidityButton) {
          const price = await coreOracle.getCELOPx(lpToken.lp)
          const totalValue =
            Number(formatEther(posInfo.collateralSize)) * (Number(formatEther(price)) / Number(formatEther(scale)))
          const ret = await bank.getPositionDebts(posInfo.positionId)
          let debtValue = 0
          let debtInterest = 0
          // const maxBorrows = 0
          const prices = []
          const yourDeposits = []
          console.log(ret.tokens.length)
          for (let i = 0; i < ret.tokens.length; i += 1) {
            const token = ret.tokens[i]
            const price = await coreOracle.getCELOPx(token)
            prices.push(price)
            debtValue += Number(formatEther(ret.debts[i])) * (Number(formatEther(price)) / Number(formatEther(scale)))
            const bankInfo = await bank.getBankInfo(token)
            const cToken = new ethers.Contract(
              bankInfo.cToken,
              CERC20_ABI as ContractInterface,
              provider
            ) as unknown as CErc20Immutable
            const blocksPerYear = BigNumber.from(6311520)
            const borrowRate = (await cToken.borrowRatePerBlock()).mul(blocksPerYear)
            debtInterest += debtValue * Number(formatEther(borrowRate))

            // const factor = await proxyOracle.tokenFactors(token)
            // const totalSupply = await cToken.totalSupply()
            // const totalBorrows = await cToken.totalBorrows()
            // const totalReserves = await cToken.totalReserves()
            // console.log(factor.borrowFactor)
            // maxBorrows +=
            //   Number(formatEther(totalSupply.sub(totalBorrows).sub(totalReserves))) *
            //   (Number(formatEther(price)) / Number(formatEther(scale))) *
            //   (factor.borrowFactor / 10000)
          }
          const numer = await bank.getBorrowCELOValue(posInfo.positionId)
          const denom = await bank.getCollateralCELOValue(posInfo.positionId)
          const debtRatio = Number(formatEther(numer)) / Number(formatEther(denom))
          // const maxDebtRatio = maxBorrows / Number(formatEther(denom))
          // console.log(maxDebtRatio)
          const apy = (totalValue * (apr / 100) - debtInterest) / (totalValue - debtValue)
          let reserve0: BigNumber
          let reserve1: BigNumber
          const reserves = await pairLP.getReserves()
          if (stakingInfo.tokens[0] !== undefined && dummyPair?.token0 === stakingInfo.tokens[0]) {
            reserve0 = reserves.reserve0
            reserve1 = reserves.reserve1
          } else {
            reserve0 = reserves.reserve1
            reserve1 = reserves.reserve0
          }
          if (stakingInfo.tokens[0] !== undefined && ret.tokens[0] === stakingInfo.tokens[0].address) {
            for (let i = 0; i < ret.tokens.length; i += 1) {
              const tmpScale = Number(formatEther(prices[i])) / Number(formatEther(scale))
              yourDeposits.push((totalValue - debtValue) / tmpScale)
            }
          } else {
            for (let i = ret.tokens.length - 1; i >= 0; i -= 1) {
              const tmpScale = Number(formatEther(prices[i])) / Number(formatEther(scale))
              yourDeposits.push((totalValue - debtValue) / tmpScale)
            }
          }
          const debts: BigNumber[] = []
          for (let i = 0; i < stakingInfo.tokens.length; i += 1) {
            for (let j = 0; j < ret.tokens.length; j += 1) {
              if (getAddress(stakingInfo.tokens[i].address) === getAddress(ret.tokens[j])) {
                debts.push(ret.debts[j])
                break
              }
            }
            if (debts.length === i) debts.push(BigNumber.from(0))
          }
          setMyPosition({
            debtValue,
            totalValue,
            debtRatio,
            yourDeposits,
            apy,
            reserves: [reserve0, reserve1].map((reserve) =>
              reserve.mul(posInfo.collateralSize).div(posInfo.totalSupply)
            ),
            debts,
          })
        }
      }
      return leverage
    },
    [account, bank, dummyPair?.token0, lpToken, provider, scale, showAddLiquidityButton, stakingInfo, proxyOracle]
  )

  useEffect(() => {
    const connectContract = async () => {
      try {
        if (bank && provider && lpToken && initialLoading) {
          const pairLP = new ethers.Contract(
            lpToken.lp,
            UNI_PAIR.abi as ContractInterface,
            provider
          ) as unknown as IUniswapV2Pair
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
          setProxyOracle(proxyOracle)
          setCoreOracle(coreOracle)
          setPairLP(pairLP)
          setInitialLoading(false)
        }
      } catch (err: any) {
        console.log(err)
      }
    }
    connectContract()
  }, [
    bank,
    provider,
    stakingInfo,
    initialLoading,
    lpToken,
    stakingAddress,
    account,
    scale,
    dummyPair,
    showAddLiquidityButton,
    loadPosition,
  ])

  useEffect(() => {
    const connectContract = async () => {
      try {
        if (provider && stakingInfo && lpToken && dummyPair && coreOracle && pairLP && !leverageLoading) {
          const initVal = init
          setLeverageLoading(true)
          const secondsPerYear = BigNumber.from(31540000)
          let externalRewards = BigNumber.from(0)
          const wmstaking = new ethers.Contract(
            lpToken.wrapper,
            WMSTAKING.abi as ContractInterface,
            provider
          ) as unknown as WMStakingRewards
          let _stakingAddress = await wmstaking.staking()
          const depth = Number(await wmstaking.depth())
          let amountDeposited = BigNumber.from(0)
          let staking = new ethers.Contract(
            _stakingAddress,
            MULTISTAKING.abi as ContractInterface,
            provider
          ) as unknown as MockMoolaStakingRewards
          for (let i = 0; i < depth; i += 1) {
            if (i < depth - 1) {
              _stakingAddress = await staking.externalStakingRewards()
              staking = new ethers.Contract(
                _stakingAddress,
                MULTISTAKING.abi as ContractInterface,
                provider
              ) as unknown as MockMoolaStakingRewards

              const rewardToken = await staking.rewardsToken()
              const rate = await staking.rewardRate()
              const rewardPrice = await coreOracle.getCELOPx(rewardToken)
              externalRewards = externalRewards.add(rewardPrice.mul(rate).mul(secondsPerYear))
            } else {
              amountDeposited = await pairLP.balanceOf(_stakingAddress)
            }
          }

          const valueDeposited = (await coreOracle.getCELOPx(lpToken.lp)).mul(amountDeposited)
          const _apr = externalRewards.mul(BigNumber.from(10).pow(BigNumber.from(18))).div(valueDeposited)
          const apr = Number(formatEther(_apr)) * 100
          const leverage = await loadPosition(coreOracle, pairLP, apr)
          setInit(false)
          if (initVal) {
            setLeverageFarm(leverage)
          }
          setLeverageError(null)
          setPoolAPR(apr)
          setLeverageLoading(false)
        }
      } catch (err: any) {
        // setInit(true)
        // if (
        //   err?.data?.message.includes('delayed celo update time') ||
        //   err?.data?.message.includes('delayed update time')
        // ) {
        //   setLeverageError("Can't enable leverage since oracle price is too old")
        // }
        setInit(false)
        setLeverageError("Can't enable leverage since oracle price is too old")
        setLeverageLoading(false)
        console.log(err)
      }
    }
    connectContract()
  }, [
    provider,
    stakingInfo,
    init,
    lpToken,
    stakingAddress,
    account,
    scale,
    dummyPair,
    showAddLiquidityButton,
    loadPosition,
    coreOracle,
    pairLP,
    leverageLoading,
  ])

  useEffect(() => {
    if (coreOracle) {
      if (stakingInfo?.stakedAmount?.greaterThan(JSBI.BigInt(0))) {
        setLeverageFarm(false)
      }
    }
  }, [coreOracle, stakingInfo?.stakedAmount])

  const handleWithdraw = () => {
    if (leverageFarm) {
      setShowWithdrawLPModal(true)
    } else {
      setShowUnstakingModal(true)
    }
  }
  return (
    <PageWrapper gap="lg" justify="center">
      <RowBetween style={{ gap: '24px' }}>
        <TYPE.mediumHeader style={{ margin: 0 }}>
          {tokenA?.symbol}-{tokenB?.symbol} {t('liquidityMining')}
        </TYPE.mediumHeader>
        <DoubleCurrencyLogo currency0={tokenA ?? undefined} currency1={tokenB ?? undefined} size={24} />
      </RowBetween>
      {stakingInfo && (
        <DataRow style={{ gap: '24px' }}>
          <PoolData>
            <AutoColumn gap="sm">
              <TYPE.body style={{ margin: 0 }}>{t('totalDeposits')}</TYPE.body>
              <TYPE.body fontSize={24} fontWeight={500}>
                {valueOfTotalStakedAmountInCUSD
                  ? `$${
                      valueOfTotalStakedAmountInCUSD.lessThan('1')
                        ? valueOfTotalStakedAmountInCUSD.toFixed(2, {
                            groupSeparator: ',',
                          })
                        : valueOfTotalStakedAmountInCUSD.toFixed(0, {
                            groupSeparator: ',',
                          })
                    }`
                  : '-'}
              </TYPE.body>
            </AutoColumn>
          </PoolData>
          <PoolData>
            <AutoColumn gap="sm">
              {stakingInfo?.active && (
                <>
                  <TYPE.body style={{ margin: 0 }}>{t('poolRate')}</TYPE.body>
                  {stakingInfo?.totalRewardRates
                    ?.filter((rewardRate) => !rewardRate.equalTo('0'))
                    ?.map((rewardRate) => {
                      return (
                        <TYPE.body fontSize={24} fontWeight={500} key={rewardRate.token.symbol}>
                          {rewardRate?.multiply(BIG_INT_SECONDS_IN_WEEK)?.toFixed(0, { groupSeparator: ',' }) ?? '-'}
                          {` ${rewardRate.token.symbol} / week`}
                        </TYPE.body>
                      )
                    })}
                </>
              )}
            </AutoColumn>
          </PoolData>
        </DataRow>
      )}
      {stakingInfo && (!lpToken || (lpToken && coreOracle)) && !init ? (
        <>
          {!showAddLiquidityButton && lpToken && (
            <RowEnd>
              <RowBetween width={'240px'}>
                <RowFixed>
                  <TYPE.black fontWeight={500} fontSize={16} color={theme.text1}>
                    Enable leverage
                  </TYPE.black>
                  <QuestionHelper text="Leveraged yield farming is a mechanism that allows farmers to lever up their yield farming position, meaning to borrow external liquidity and add to their liquidity to yield farm." />
                </RowFixed>
                <Toggle
                  id="toggle-leverage-yield-farm"
                  isActive={leverageFarm}
                  toggle={() => {
                    toggleLeverage()
                  }}
                />
              </RowBetween>
            </RowEnd>
          )}

          {showAddLiquidityButton && (
            <VoteCard>
              <CardBGImage />
              <CardNoise />
              <CardSection>
                <AutoColumn gap="md">
                  <RowBetween>
                    <TYPE.white fontWeight={600}>Step 1. Get UBE-LP Liquidity tokens</TYPE.white>
                  </RowBetween>
                  <RowBetween style={{ marginBottom: '1rem' }}>
                    <TYPE.white fontSize={14}>
                      {`UBE-LP tokens are required. Once you've added liquidity to the ${tokenA?.symbol}-${tokenB?.symbol} pool you can stake your liquidity tokens on this page.`}
                    </TYPE.white>
                  </RowBetween>
                  <ButtonPrimary
                    padding="8px"
                    borderRadius="8px"
                    width={'fit-content'}
                    as={Link}
                    to={`/add/${tokenA && currencyId(tokenA)}/${tokenB && currencyId(tokenB)}`}
                  >
                    {`Add ${tokenA?.symbol}-${tokenB?.symbol} liquidity`}
                  </ButtonPrimary>
                </AutoColumn>
              </CardSection>
              <CardBGImage />
              <CardNoise />
            </VoteCard>
          )}

          <LeverageModal
            isOpen={showLeverageModal}
            leverageError={leverageError}
            turnOnLeverage={() => setLeverageFarm(true)}
            onClose={() => setShowLeverageModal(false)}
            stakingInfo={stakingInfo}
          />
          <StakingModal
            isOpen={showStakingModal}
            onDismiss={() => setShowStakingModal(false)}
            stakingInfo={stakingInfo}
            userLiquidityUnstaked={userLiquidityUnstaked}
            leverage={leverageFarm}
            poolAPY={poolAPR}
            bank={bank}
            proxyOracle={proxyOracle}
            coreOracle={coreOracle}
            dummyPair={dummyPair}
            lpToken={lpToken}
            provider={provider}
            existingPosition={myPosition ? myPosition.reserves : undefined}
            positionInfo={positionInfo}
          />
          <WithdrawLPModal
            isOpen={showWithdrawLPModal}
            onDismiss={() => setShowWithdrawLPModal(false)}
            stakingInfo={stakingInfo}
            poolAPY={poolAPR}
            bank={bank}
            proxyOracle={proxyOracle}
            coreOracle={coreOracle}
            dummyPair={dummyPair}
            lpToken={lpToken}
            provider={provider}
            existingPosition={myPosition ? myPosition.reserves : undefined}
            debts={myPosition ? myPosition.debts : undefined}
            positionInfo={positionInfo}
          />
          <UnstakingModal
            isOpen={showUnstakingModal}
            onDismiss={() => setShowUnstakingModal(false)}
            stakingInfo={stakingInfo}
          />
          <ClaimRewardModal
            isOpen={showClaimRewardModal}
            onDismiss={() => setShowClaimRewardModal(false)}
            stakingInfo={stakingInfo}
          />

          <PositionInfo gap="lg" justify="center" dim={showAddLiquidityButton}>
            <BottomSection gap="lg" justify="center">
              {leverageFarm ? (
                <StyledDataCard
                  disabled={disableTop}
                  bgColor={backgroundColor}
                  showBackground={!showAddLiquidityButton}
                >
                  <CardSection>
                    <CardNoise />
                    <AutoColumn gap="lg">
                      <RowBetween>
                        <TYPE.white fontSize={20} fontWeight={600}>
                          Your Position
                        </TYPE.white>
                      </RowBetween>
                      {stakingInfo.tokens.map((token, i) => (
                        <RowBetween key={i} style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                          <TYPE.white fontSize={16}>{i === 0 && "I'm Borrowing"}</TYPE.white>
                          <TYPE.white>
                            {(myPosition
                              ? humanFriendlyNumber(formatEther(myPosition.reserves[i])).concat(' ')
                              : '-- ') + token?.symbol ?? ''}
                          </TYPE.white>
                        </RowBetween>
                      ))}
                      {stakingInfo.tokens.map((token, i) => (
                        <RowBetween key={i} style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                          <TYPE.white fontSize={16}>{i === 0 && 'Your Deposits'}</TYPE.white>
                          <TYPE.white>
                            {(myPosition ? humanFriendlyNumber(myPosition.yourDeposits[i]).concat(' ') : '-- ') +
                              token?.symbol ?? ''}
                          </TYPE.white>
                        </RowBetween>
                      ))}
                      {/* <RowBetween style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                            <TYPE.white fontSize={16}>Borrow Value</TYPE.white>
                            <TYPE.white>
                              {myPosition ? (
                                humanFriendlyNumber(myPosition.debtValue).concat(' CELO')
                              ) : (
                                <Loader size="16px" />
                              )}
                            </TYPE.white>
                          </RowBetween>
                          <RowBetween style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                            <TYPE.white fontSize={16}>Total Value</TYPE.white>
                            <TYPE.white>
                              {myPosition ? (
                                humanFriendlyNumber(myPosition.totalValue).concat(' Celo')
                              ) : (
                                <Loader size="16px" />
                              )}
                            </TYPE.white>
                          </RowBetween> */}
                      <RowBetween style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <TYPE.white fontSize={16}>Debt Ratio</TYPE.white>
                        <TYPE.white>
                          {(myPosition ? humanFriendlyNumber(myPosition.debtRatio * 100) : '--') + ' %'}
                        </TYPE.white>
                      </RowBetween>
                      <RowBetween style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <TYPE.white fontSize={16}>Position APR</TYPE.white>
                        <TYPE.white>{(myPosition ? humanFriendlyNumber(poolAPR) : '--') + ' %'}</TYPE.white>
                      </RowBetween>
                    </AutoColumn>
                  </CardSection>
                </StyledDataCard>
              ) : (
                <>
                  <StyledDataCard
                    disabled={disableTop}
                    bgColor={backgroundColor}
                    showBackground={!showAddLiquidityButton}
                  >
                    <CardSection>
                      <CardNoise />
                      <AutoColumn gap="md">
                        <RowBetween>
                          <TYPE.white fontWeight={600}>{t('yourLiquidityDeposits')}</TYPE.white>
                        </RowBetween>
                        <RowBetween style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                          <TYPE.white fontSize={36} fontWeight={600}>
                            {stakingInfo?.stakedAmount?.toSignificant(6) ?? '-'}
                          </TYPE.white>
                          <RowFixed>
                            <TYPE.white>
                              UBE-LP {tokenA?.symbol}-{tokenB?.symbol}
                            </TYPE.white>
                            {stakingInfo && (
                              <PairLinkIcon
                                href={`https://info.ubeswap.org/pair/${stakingInfo.stakingToken.address.toLowerCase()}`}
                              />
                            )}
                          </RowFixed>
                        </RowBetween>
                        {stakingInfo?.stakedAmount && stakingInfo.stakedAmount.greaterThan('0') && (
                          <RowBetween>
                            <RowFixed>
                              <TYPE.white>
                                {t('currentValue')}:{' '}
                                {userValueCUSD
                                  ? `$${userValueCUSD.toFixed(2, {
                                      separator: ',',
                                    })}`
                                  : '--'}
                              </TYPE.white>
                              <StakedAmountsHelper
                                userAmountTokenA={userAmountTokenA}
                                userAmountTokenB={userAmountTokenB}
                              />
                            </RowFixed>
                          </RowBetween>
                        )}
                      </AutoColumn>
                    </CardSection>
                  </StyledDataCard>
                  <StyledBottomCard dim={stakingInfo?.stakedAmount?.equalTo(JSBI.BigInt(0))}>
                    <CardNoise />
                    <AutoColumn gap="sm">
                      <RowBetween>
                        <div>
                          <TYPE.black>{t('yourUnclaimedRewards')}</TYPE.black>
                        </div>
                        {stakingInfo?.earnedAmounts?.some((earnedAmount) =>
                          JSBI.notEqual(BIG_INT_ZERO, earnedAmount?.raw)
                        ) && (
                          <ButtonEmpty
                            padding="8px"
                            borderRadius="8px"
                            width="fit-content"
                            onClick={() => setShowClaimRewardModal(true)}
                          >
                            {t('claim')}
                          </ButtonEmpty>
                        )}
                      </RowBetween>
                      {stakingInfo?.rewardRates
                        // show if rewards are more than zero or unclaimed are greater than zero
                        ?.filter((rewardRate, idx) => rewardRate.greaterThan('0') || countUpAmounts[idx])
                        ?.map((rewardRate, idx) => (
                          <RowBetween style={{ alignItems: 'baseline' }} key={rewardRate.token.symbol}>
                            <TYPE.largeHeader fontSize={36} fontWeight={600}>
                              {countUpAmounts[idx] ? (
                                <CountUp
                                  key={countUpAmounts[idx]}
                                  isCounting
                                  decimalPlaces={parseFloat(countUpAmounts[idx]) < 0.0001 ? 6 : 4}
                                  start={parseFloat(countUpAmountsPrevious[idx] || countUpAmounts[idx])}
                                  end={parseFloat(countUpAmounts[idx])}
                                  thousandsSeparator={','}
                                  duration={1}
                                />
                              ) : (
                                '0'
                              )}
                            </TYPE.largeHeader>
                            <TYPE.black fontSize={16} fontWeight={500}>
                              <span role="img" aria-label="wizard-icon" style={{ marginRight: '8px ' }}>
                                ⚡
                              </span>
                              {stakingInfo?.active
                                ? rewardRate
                                    .multiply(BIG_INT_SECONDS_IN_WEEK)
                                    ?.toSignificant(4, { groupSeparator: ',' }) ?? '-'
                                : '0'}
                              {` ${rewardRate.token.symbol} / ${t('week')}`}
                            </TYPE.black>
                          </RowBetween>
                        ))}
                    </AutoColumn>
                  </StyledBottomCard>
                </>
              )}
            </BottomSection>
            {!leverageFarm && (
              <TYPE.main style={{ textAlign: 'center' }} fontSize={14}>
                <span role="img" aria-label="wizard-icon" style={{ marginRight: '8px' }}>
                  ⭐️
                </span>
                {t('withdrawTip')}
              </TYPE.main>
            )}

            {!showAddLiquidityButton && (
              <DataRow style={{ marginBottom: '1rem' }}>
                {stakingInfo && stakingInfo.active && (
                  <ButtonPrimary padding="8px" borderRadius="8px" width="160px" onClick={handleDepositClick}>
                    {stakingInfo?.stakedAmount?.greaterThan(JSBI.BigInt(0)) || leverageFarm
                      ? t('deposit')
                      : `${t('deposit')} UBE-LP Tokens`}
                  </ButtonPrimary>
                )}

                {(stakingInfo?.stakedAmount?.greaterThan(JSBI.BigInt(0)) || (leverageFarm && positionInfo)) && (
                  <>
                    <ButtonPrimary
                      padding="8px"
                      borderRadius="8px"
                      width="160px"
                      onClick={() => {
                        handleWithdraw()
                      }}
                    >
                      {t('withdraw')}
                    </ButtonPrimary>
                  </>
                )}
                {stakingInfo && !stakingInfo.active && (
                  <TYPE.main style={{ textAlign: 'center' }} fontSize={14}>
                    Staking Rewards inactive for this pair.
                  </TYPE.main>
                )}
              </DataRow>
            )}
            {!userLiquidityUnstaked ? null : userLiquidityUnstaked.equalTo('0') ? null : !stakingInfo?.active ? null : (
              <TYPE.main>{userLiquidityUnstaked.toSignificant(6)} UBE LP tokens available</TYPE.main>
            )}
          </PositionInfo>
        </>
      ) : (
        <Loader size="48px" />
      )}
    </PageWrapper>
  )
}

const PairLinkIcon = styled(ExternalLinkIcon)`
  svg {
    stroke: ${(props) => props.theme.primary1};
  }
`

const humanFriendlyNumber = (v: number | string) => {
  const formatNumber = (num: string) => {
    return num.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
  }

  const num = Number(v)
  if (num === 0) {
    return '0'
  }
  const smallest = Math.pow(10, -2)
  if (num < smallest) {
    return `<${smallest.toFixed(2)}`
  }

  return formatNumber(num.toFixed(2))
}
