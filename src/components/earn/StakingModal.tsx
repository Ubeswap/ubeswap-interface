import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { getAddress, isAddress } from '@ethersproject/address'
import { BigNumber } from '@ethersproject/bignumber'
import { formatEther } from '@ethersproject/units'
import { ChainId, Pair, TokenAmount } from '@ubeswap/sdk'
import { LightCard } from 'components/Card'
import Loader from 'components/Loader'
import { useDoTransaction } from 'components/swap/routing'
import { Bank } from 'constants/leverageYieldFarm'
import { ContractInterface, ethers } from 'ethers'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { Text } from 'rebass'
import { AppDispatch } from 'state'
import { tryParseAmount } from 'state/swap/hooks'
import { addTransaction } from 'state/transactions/actions'
import styled, { ThemeContext } from 'styled-components'
import { AbiItem, toBN, toWei } from 'web3-utils'

import Circle from '../../assets/images/blue-loader.svg'
import Slider from '../../components/Slider'
import CERC20_ABI from '../../constants/abis/CErc20Immutable.json'
import ERC20_ABI from '../../constants/abis/ERC20-Youth.json'
import IERC20_ABI from '../../constants/abis/IERC20.json'
import UBE_SPELL from '../../constants/abis/UbeswapMSRSpellV1.json'
import { Farm } from '../../constants/leverageYieldFarm'
import { CErc20Immutable } from '../../generated/CErc20Immutable'
import { CoreOracle } from '../../generated/CoreOracle'
import { HomoraBank } from '../../generated/HomoraBank'
import { IERC20 } from '../../generated/IERC20'
import { ProxyOracle } from '../../generated/ProxyOracle'
import { ApprovalState, useApproveCallback } from '../../hooks/useApproveCallback'
import { usePairContract, useStakingContract } from '../../hooks/useContract'
import useTransactionDeadline from '../../hooks/useTransactionDeadline'
import { StakingInfo, useDerivedStakeInfo } from '../../state/stake/hooks'
import { CloseIcon, CustomLightSpinner, TYPE } from '../../theme'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { ButtonConfirmed, ButtonError } from '../Button'
import { AutoColumn } from '../Column'
import CurrencyInputPanel from '../CurrencyInputPanel'
import Modal from '../Modal'
import { LoadingView, SubmittedView } from '../ModalViews'
import ProgressCircles from '../ProgressSteps'
import { AutoRow, RowBetween, RowCenter } from '../Row'

const HypotheticalRewardRate = styled.div<{ dim: boolean }>`
  display: flex;
  justify-content: space-between;
  padding-right: 20px;
  padding-left: 20px;

  opacity: ${({ dim }) => (dim ? 0.5 : 1)};
`

const ContentWrapper = styled(AutoColumn)`
  width: 100%;
  padding: 1rem;
`

export const humanFriendlyNumber = (v: number | string) => {
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

interface StakingModalProps {
  isOpen: boolean
  onDismiss: () => void
  stakingInfo: StakingInfo
  userLiquidityUnstaked: TokenAmount | undefined
  leverage: boolean
  poolAPY: number
  bank: HomoraBank
  proxyOracle: ProxyOracle | null
  coreOracle: CoreOracle | null
  dummyPair: Pair | undefined
  lpToken: Farm | undefined
  provider: ethers.providers.Web3Provider | ethers.providers.JsonRpcSigner
  positionInfo: any
  existingPosition: BigNumber[] | undefined
}

export default function StakingModal({
  isOpen,
  onDismiss,
  stakingInfo,
  userLiquidityUnstaked,
  leverage,
  poolAPY,
  bank,
  proxyOracle,
  coreOracle,
  dummyPair,
  lpToken,
  provider,
  positionInfo,
  existingPosition,
}: StakingModalProps) {
  const { getConnectedKit, network, address: account } = useContractKit()
  const chainId = network.chainId as unknown as ChainId
  const library = useProvider()
  const dispatch = useDispatch<AppDispatch>()
  // track and parse user input
  const [typedValue, setTypedValue] = useState('')
  const { parsedAmount, error } = useDerivedStakeInfo(typedValue, stakingInfo.stakingToken, userLiquidityUnstaked)
  const parsedAmountWrapped = parsedAmount
  const { t } = useTranslation()
  const theme = useContext(ThemeContext)
  let hypotheticalRewardRates: TokenAmount[] | undefined = stakingInfo?.totalRewardRates?.map(
    (rewardRate) => new TokenAmount(rewardRate.token, '0')
  )
  if (parsedAmountWrapped?.greaterThan('0')) {
    hypotheticalRewardRates = stakingInfo.getHypotheticalRewardRate(
      stakingInfo.stakedAmount ? parsedAmountWrapped.add(stakingInfo.stakedAmount) : parsedAmountWrapped,
      stakingInfo.totalStakedAmount.add(parsedAmountWrapped),
      stakingInfo.totalRewardRates
    )
  }

  // state for pending and submitted txn views
  const [attempting, setAttempting] = useState<boolean>(false)
  const [hash, setHash] = useState<string | undefined>()
  const [info, setInfo] = useState<any>(null)
  const [init, setInit] = useState<boolean>(false)
  const [amounts, setAmounts] = useState<string[]>(['0', '0'])
  const [maxAmounts, setMaxAmounts] = useState<any[]>(['0', '0'])
  const [lever, setLever] = useState<number>(0)
  const [debtRatio, setDebtRatio] = useState<number>(0)
  const [apy, setAPY] = useState<number>(0)
  const [scale] = useState<BigNumber>(BigNumber.from(2).pow(112))
  const [levApproval, setLevApproval] = useState<ApprovalState>(ApprovalState.UNKNOWN)
  const wrappedOnDismiss = useCallback(() => {
    setHash(undefined)
    setAttempting(false)
    initialize()
    onDismiss()
  }, [onDismiss])

  // pair contract for this token to be staked
  const pairContract = usePairContract(dummyPair?.liquidityToken.address ?? undefined)

  // approval data for stake
  const deadline = useTransactionDeadline()
  const [approval, approveCallback] = useApproveCallback(parsedAmount, stakingInfo.stakingRewardAddress)

  const stakingContract = useStakingContract(stakingInfo.stakingRewardAddress)
  const doTransaction = useDoTransaction()

  const initialize = () => {
    setInit(false)
    setAmounts(['0', '0'])
    setMaxAmounts(['0', '0'])
    setLever(0)
    setDebtRatio(0)
    setAPY(0)
  }

  useEffect(() => {
    const checkLeverageApproval = async () => {
      const tokenStates: any = []
      const tokenAddress = lpToken?.lp ?? ''
      for (const token of lpToken?.tokens ?? []) {
        const address = token.address
        if (!address || !isAddress(address) || !account) {
          tokenStates.push(null)
          continue
        }
        const ERCToken = new ethers.Contract(
          address,
          IERC20_ABI.abi as ContractInterface,
          provider
        ) as unknown as IERC20
        const allowance = await ERCToken.allowance(account ?? '', Bank[chainId])
        const balance = await ERCToken.balanceOf(account ?? '')
        tokenStates.push({ allowance: allowance, balance: balance })
      }
      let erc = null
      const ERCToken = new ethers.Contract(
        getAddress(tokenAddress),
        IERC20_ABI.abi as ContractInterface,
        provider
      ) as unknown as IERC20
      if (tokenAddress && isAddress(tokenAddress) && account) {
        erc = {
          allowance: await ERCToken.allowance(account, Bank[chainId]),
          balance: await ERCToken.balanceOf(account),
        }
      }
      if (tokenStates && erc) {
        let approvalState = false
        for (let i = 0; i < tokenStates.length; i += 1) {
          if (tokenStates[i]) {
            const amountBN = BigNumber.from(0)
            if (amountBN.gt(tokenStates[i].allowance ?? 0)) {
              approvalState = true
            }
          }
        }
        if (parsedAmount?.greaterThan(erc.allowance.toString())) {
          approvalState = true
        }
        if (approvalState) {
          if (levApproval !== ApprovalState.PENDING) {
            setLevApproval(ApprovalState.NOT_APPROVED)
          }
        } else {
          setLevApproval(ApprovalState.APPROVED)
        }
      }
    }
    if (leverage) {
      if (parsedAmount && !parsedAmount.equalTo('0')) checkLeverageApproval()
      else if (levApproval !== ApprovalState.PENDING) setLevApproval(ApprovalState.UNKNOWN)
    }
  }, [account, chainId, lpToken?.lp, lpToken?.tokens, provider, parsedAmount, levApproval, leverage])

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        if (!bank || !provider || !leverage || !proxyOracle || !coreOracle || !dummyPair) return
        const factors: any[] = []
        const prices: BigNumber[] = []
        const availableBorrows: any[] = []
        const borrows: any[] = []
        for (const token of stakingInfo.tokens) {
          const bankInfo = await bank.getBankInfo(token ? token.address : '')
          const cToken = new ethers.Contract(
            bankInfo.cToken,
            CERC20_ABI as ContractInterface,
            provider
          ) as unknown as CErc20Immutable
          const totalSupply = await cToken.totalSupply()
          const totalBorrows = await cToken.totalBorrows()
          const totalReserves = await cToken.totalReserves()
          availableBorrows.push(totalSupply.sub(totalBorrows).sub(totalReserves))
          const blocksPerYear = BigNumber.from(6311520)
          const borrowRate = (await cToken.borrowRatePerBlock()).mul(blocksPerYear)
          borrows.push(borrowRate)
          const factor = await proxyOracle.tokenFactors(token ? token.address : '')
          factors.push({
            borrowFactor: factor.borrowFactor,
            collateralFactor: factor.collateralFactor,
            liqIncentive: factor.liqIncentive,
          })
          const price = await coreOracle.getCELOPx(token ? token.address : '')
          prices.push(price)
        }
        const lpPrice = await coreOracle.getCELOPx(dummyPair?.liquidityToken.address ?? '')
        const lpFactor = await proxyOracle.tokenFactors(dummyPair?.liquidityToken.address ?? '')

        let existingCollateral = BigNumber.from(0)
        let existingBorrow = BigNumber.from(0)
        if (positionInfo) {
          existingCollateral = await bank.getCollateralCELOValue(positionInfo.positionId)
          existingBorrow = await bank.getBorrowCELOValue(positionInfo.positionId)
        }

        const prevBorrow: BigNumber[] = []
        let prevCollateral: BigNumber[] = []
        if (positionInfo && existingPosition) {
          const positionDebts = await bank.getPositionDebts(positionInfo.positionId)
          for (let i = 0; i < stakingInfo.tokens.length; i += 1) {
            const token = stakingInfo.tokens[i]
            for (let j = 0; j < positionDebts.tokens.length; j += 1) {
              if (token.address.toLowerCase() === positionDebts.tokens[j]?.toLowerCase()) {
                prevBorrow.push(positionDebts.debts[j])
                break
              }
            }
            if (prevBorrow.length === i) prevBorrow.push(BigNumber.from(0))
          }
          prevCollateral = existingPosition.map((x, i) => x.sub(prevBorrow[i]))
        }

        const _info = {
          tokenFactor: factors,
          celoPrices: prices,
          lpFactor,
          lpPrice,
          borrows,
          availableBorrows,
          existingCollateral,
          existingBorrow,
          prevCollateral,
          prevBorrow,
        }
        setInfo(_info)
      } catch (error) {
        console.log(error)
      }
    }
    fetchInfo()
  }, [
    bank,
    proxyOracle,
    coreOracle,
    provider,
    stakingInfo?.tokens,
    leverage,
    dummyPair,
    positionInfo,
    existingPosition,
  ])

  useEffect(() => {
    if (typedValue && Number(typedValue) !== 0 && info?.lpPrice && info?.lpFactor && leverage) {
      const weightedSuppliedCollateralValue =
        Number(typedValue) *
          (Number(formatEther(info?.lpPrice)) / Number(formatEther(scale))) *
          (info?.lpFactor.collateralFactor / 10000) +
        Number(formatEther(info?.existingCollateral)) -
        Number(formatEther(info?.existingBorrow))
      const prices: BigNumber[] = info?.celoPrices
      const borrowMax = prices.map(
        (x, i) =>
          weightedSuppliedCollateralValue /
          ((Number(formatEther(x)) / Number(formatEther(scale))) *
            ((Number(info?.tokenFactor[i]?.borrowFactor) - Number(info?.lpFactor.collateralFactor)) / 10000))
      )
      const maxAmounts = borrowMax.map((x, index) =>
        String(Math.min(x, Number(formatEther(info?.availableBorrows[index]))))
      )
      setMaxAmounts(maxAmounts)
      if (!init) {
        setInit(true)
        setAmounts(maxAmounts.map((x) => (Number(x) === 0 ? '0' : String((Number(x) / 3).toFixed(3)))))
      }
    }
  }, [
    typedValue,
    info?.tokenFactor,
    info?.celoPrices,
    info?.availableBorrows,
    info?.lpPrice,
    info?.lpFactor,
    info?.prices,
    info?.existingCollateral,
    info?.existingBorrow,
    init,
    scale,
    leverage,
  ])

  useEffect(() => {
    if (info && typedValue && Number(typedValue) !== 0) {
      const individualBorrow = amounts.map(
        (x, i) =>
          (Number(x) +
            Number(positionInfo && info?.prevBorrow.length > 0 ? Number(formatEther(info?.prevBorrow[i])) : 0)) *
          (Number(formatEther(info?.celoPrices[i])) / Number(formatEther(scale)))
      )
      const borrowValue = individualBorrow ? individualBorrow.reduce((sum, current) => sum + current, 0) : 0
      const supplyValue = stakingInfo.tokens
        .map(
          (x, i) =>
            Number(positionInfo && info?.prevCollateral.length > 0 ? Number(formatEther(info.prevCollateral[i])) : 0) *
            (Number(formatEther(info?.celoPrices[i])) / Number(formatEther(scale)))
        )
        .reduce(
          (sum, current) => sum + current,
          Number(typedValue) * (Number(formatEther(info?.lpPrice)) / Number(formatEther(scale)))
        )
      const lever = 1 + borrowValue / supplyValue
      const apy =
        ((borrowValue + supplyValue) * (poolAPY / 100) -
          individualBorrow
            .map((x, i) => x * Number(formatEther(info?.borrows[i])))
            .reduce((sum, current) => sum + current, 0)) /
        supplyValue
      const numer =
        amounts
          .map(
            (x, i) =>
              Number(x) *
              (Number(formatEther(info?.celoPrices[i])) / Number(formatEther(scale))) *
              (Number(info.tokenFactor[i]?.borrowFactor) / 10000)
          )
          .reduce((sum, current) => sum + current, 0) + Number(formatEther(info.existingBorrow))
      const denom =
        amounts
          .map(
            (x, i) =>
              Number(x) *
              (Number(formatEther(info?.celoPrices[i])) / Number(formatEther(scale))) *
              (Number(info.lpFactor?.collateralFactor) / 10000)
          )
          .reduce(
            (sum, current) => sum + current,
            Number(typedValue) *
              (Number(formatEther(info?.lpPrice)) / Number(formatEther(scale))) *
              (Number(info.lpFactor?.collateralFactor) / 10000)
          ) + Number(formatEther(info.existingCollateral))
      const debtRatio = (numer / denom) * 100
      setDebtRatio(debtRatio)
      setLever(lever)
      setAPY(apy)
    }
  }, [info, scale, typedValue, amounts, poolAPY, positionInfo, stakingInfo.tokens])

  const handleSlider = (value: number, index: number) => {
    setAmounts(
      amounts.map((x, i) => {
        if (i === index) {
          if (i === 0) {
            return String((Number(maxAmounts[0]) / 100) * value)
          } else {
            return String((Number(maxAmounts[1]) / 100) * value)
          }
        }
        return x
      })
    )
  }

  async function onStake() {
    if (leverage) {
      try {
        setAttempting(true)
        const kit = await getConnectedKit()
        const spell = new kit.web3.eth.Contract(UBE_SPELL.abi as AbiItem[], lpToken?.spell ?? '') as unknown as any
        const bytes = spell.methods
          .addLiquidityWStakingRewards(
            stakingInfo.tokens[0].address,
            stakingInfo.tokens[1].address,
            [
              0,
              0,
              toBN(toWei(typedValue)).toString(),
              toBN(toWei(amounts[0])).toString(),
              toBN(toWei(amounts[1])).toString(),
              0,
              0,
              0,
            ],
            lpToken?.wrapper ?? ''
          )
          .encodeABI()
        // const bank = new kit.web3.eth.Contract(BANK_ABI.abi as AbiItem[], getAddress(Bank[chainId])) as unknown as any
        const tx = await bank.execute(positionInfo ? positionInfo.positionId : 0, lpToken?.spell ?? '', bytes, {
          from: kit.defaultAccount,
          gasPrice: toWei('0.5', 'gwei'),
        })
        setHash(tx.hash)
        dispatch(
          addTransaction({
            hash: tx.hash,
            from: account ? account : '',
            chainId,
            summary: `${t('StakeDepositedLiquidity')}`,
          })
        )
      } catch (e) {
        console.log(e)
        setAttempting(false)
      }
    } else {
      setAttempting(true)
      if (stakingContract && parsedAmount && deadline) {
        if (approval === ApprovalState.APPROVED) {
          const response = await doTransaction(stakingContract, 'stake', {
            args: [`0x${parsedAmount.raw.toString(16)}`],
            summary: `${t('StakeDepositedLiquidity')}`,
          })
          setHash(response.hash)
        } else {
          setAttempting(false)
          throw new Error('Attempting to stake without approval or a signature. Please contact support.')
        }
      }
    }
  }

  // wrapped onUserInput to clear signatures
  const onUserInput = useCallback((typedValue: string) => {
    setTypedValue(typedValue)
    setInit(false)
    if (!typedValue || Number(typedValue) === 0) {
      initialize()
    }
  }, [])

  // used for max input button
  const maxAmountInput = maxAmountSpend(userLiquidityUnstaked)
  const atMaxAmount = Boolean(maxAmountInput && parsedAmount?.equalTo(maxAmountInput))
  const handleMax = useCallback(() => {
    maxAmountInput && onUserInput(maxAmountInput.toExact())
  }, [maxAmountInput, onUserInput])

  async function onAttemptToApprove() {
    if (!pairContract || !library || !deadline) throw new Error('missing dependencies')
    const liquidityAmount = parsedAmount
    if (!liquidityAmount) throw new Error('missing liquidity amount')

    approveCallback()
  }

  async function onAttemptToLevApprove() {
    try {
      setLevApproval(ApprovalState.PENDING)
      const kit = await getConnectedKit()
      const ERCToken = new kit.web3.eth.Contract(ERC20_ABI as AbiItem[], lpToken?.lp ?? '') as unknown as any
      const tx = await ERCToken.methods
        .approve(
          Bank[chainId],
          BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').toString()
        )
        .send({
          from: kit.defaultAccount,
          gasPrice: toWei('0.5', 'gwei'),
        })
      dispatch(
        addTransaction({
          hash: tx.transactionHash,
          from: account ? account : '',
          chainId,
          summary: `Approve ${parsedAmount?.currency.symbol}`,
        })
      )
    } catch (e) {
      console.log(e)
      setLevApproval(ApprovalState.NOT_APPROVED)
    }
  }

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOnDismiss} maxHeight={90}>
      {!attempting && !hash && (
        <ContentWrapper gap="lg">
          <RowBetween>
            <TYPE.mediumHeader>Deposit</TYPE.mediumHeader>
            <CloseIcon onClick={wrappedOnDismiss} />
          </RowBetween>
          <CurrencyInputPanel
            value={typedValue}
            onUserInput={onUserInput}
            onMax={handleMax}
            showMaxButton={!atMaxAmount}
            currency={stakingInfo.totalStakedAmount.token}
            pair={dummyPair}
            label={''}
            disableCurrencySelect={true}
            customBalanceText={`${t('AvailableToDeposit')}: `}
            id="stake-liquidity-token"
          />
          {leverage && stakingInfo && (
            <LightCard padding="0px" borderRadius={'20px'}>
              <RowBetween padding="1rem">
                <TYPE.subHeader fontWeight={500} fontSize={14}>
                  Borrows
                </TYPE.subHeader>
              </RowBetween>
              {!info ? (
                <LightCard padding="2rem" borderRadius={'20px'}>
                  <AutoColumn justify="center">
                    <CustomLightSpinner src={Circle} alt="loader" size={'70px'} />
                  </AutoColumn>
                </LightCard>
              ) : (
                <LightCard padding="1rem" borderRadius={'20px'}>
                  <AutoColumn gap={'10px'}>
                    <AutoColumn justify="space-between">
                      <RowBetween>
                        <TYPE.black>Est. Debt Ratio</TYPE.black>
                        <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
                          {''.concat(humanFriendlyNumber(debtRatio)).concat('/100')}
                        </Text>
                      </RowBetween>
                    </AutoColumn>
                    <AutoColumn justify="center">
                      <RowBetween>
                        <TYPE.black>Leverage</TYPE.black>
                        <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
                          {''.concat(humanFriendlyNumber(lever)).concat('x')}
                        </Text>
                      </RowBetween>
                    </AutoColumn>
                    <AutoColumn justify="center">
                      <RowBetween>
                        <TYPE.black>Farming APR</TYPE.black>
                        <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
                          {''.concat(humanFriendlyNumber(apy * 100)).concat('%')}
                        </Text>
                      </RowBetween>
                    </AutoColumn>
                  </AutoColumn>
                  <RowCenter padding={'1rem'}></RowCenter>
                  {stakingInfo?.tokens.map((token, i) => (
                    <div key={i}>
                      <Slider
                        value={Number(amounts[i])}
                        onChange={(e) => {
                          handleSlider(e, i)
                        }}
                        isCurrencyAmount={true}
                        currency={token}
                        balance={maxAmounts[i]}
                      />
                    </div>
                  ))}{' '}
                </LightCard>
              )}
            </LightCard>
          )}

          {!leverage && (
            <HypotheticalRewardRate dim={false}>
              <div>
                <TYPE.black fontWeight={600}>Weekly Rewards</TYPE.black>
              </div>

              <div>
                {hypotheticalRewardRates &&
                  hypotheticalRewardRates.map((hypotheticalRewardRate, idx) => {
                    return (
                      <TYPE.black key={idx}>
                        {hypotheticalRewardRate
                          .multiply((60 * 60 * 24 * 7).toString())
                          .toSignificant(4, { groupSeparator: ',' }) + ` ${hypotheticalRewardRate.token.symbol} / week`}
                      </TYPE.black>
                    )
                  })}
              </div>
            </HypotheticalRewardRate>
          )}

          <RowBetween>
            {leverage ? (
              <ButtonConfirmed
                mr="0.5rem"
                onClick={onAttemptToLevApprove}
                confirmed={levApproval === ApprovalState.APPROVED}
                disabled={levApproval !== ApprovalState.NOT_APPROVED}
              >
                {levApproval === ApprovalState.PENDING ? (
                  <AutoRow gap="6px" justify="center">
                    Approving <Loader stroke="white" />
                  </AutoRow>
                ) : (
                  `${t('approve')}`
                )}
              </ButtonConfirmed>
            ) : (
              <ButtonConfirmed
                mr="0.5rem"
                onClick={onAttemptToApprove}
                confirmed={approval === ApprovalState.APPROVED}
                disabled={approval !== ApprovalState.NOT_APPROVED}
              >
                {approval === ApprovalState.PENDING ? (
                  <AutoRow gap="6px" justify="center">
                    Approving <Loader stroke="white" />
                  </AutoRow>
                ) : (
                  `${t('approve')}`
                )}
              </ButtonConfirmed>
            )}

            <ButtonError
              disabled={
                !!error || leverage
                  ? levApproval !== ApprovalState.APPROVED
                  : approval !== ApprovalState.APPROVED || (leverage && debtRatio >= 100) || Number(typedValue) === 0
              }
              error={(!!error && !!parsedAmount) || (leverage && debtRatio >= 90)}
              onClick={onStake}
            >
              {Number(typedValue) === 0
                ? 'Enter an amount'
                : leverage && debtRatio >= 100
                ? 'Debt ratio too high'
                : error ?? `${t('deposit')}`}
            </ButtonError>
          </RowBetween>
          <ProgressCircles
            steps={[leverage ? levApproval === ApprovalState.APPROVED : approval === ApprovalState.APPROVED]}
            disabled={true}
          />
        </ContentWrapper>
      )}
      {attempting &&
        !hash &&
        (leverage ? (
          <LoadingView onDismiss={wrappedOnDismiss}>
            <AutoColumn gap="12px" justify={'start'}>
              <TYPE.largeHeader>{t('DepositingLiquidity')}</TYPE.largeHeader>
              <TYPE.body fontSize={20}>I&lsquo;m supplying:</TYPE.body>
              <RowBetween>
                <TYPE.body fontSize={18}>{parsedAmount?.toSignificant(4)} UBE LP</TYPE.body>
              </RowBetween>
              <TYPE.body fontSize={20} mt="0.5rem">
                I&lsquo;m borrowing:
              </TYPE.body>
              <TYPE.body fontSize={18}>
                {tryParseAmount(amounts[0] ?? '', stakingInfo.tokens[0])?.toSignificant(4) +
                  '  ' +
                  stakingInfo.tokens[0].symbol +
                  '  +  ' +
                  tryParseAmount(amounts[1] ?? '', stakingInfo.tokens[1])?.toSignificant(4) +
                  '  ' +
                  stakingInfo.tokens[1].symbol}
              </TYPE.body>
            </AutoColumn>
          </LoadingView>
        ) : (
          <LoadingView onDismiss={wrappedOnDismiss}>
            <AutoColumn gap="12px" justify={'center'}>
              <TYPE.largeHeader>{t('DepositingLiquidity')}</TYPE.largeHeader>
              <TYPE.body fontSize={20}>{parsedAmount?.toSignificant(4)} UBE LP</TYPE.body>
            </AutoColumn>
          </LoadingView>
        ))}
      {attempting && hash && (
        <SubmittedView onDismiss={wrappedOnDismiss} hash={hash}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.largeHeader>{t('TransactionSubmitted')}</TYPE.largeHeader>
            <TYPE.body fontSize={20}>Deposited {parsedAmount?.toSignificant(4)} UBE LP</TYPE.body>
          </AutoColumn>
        </SubmittedView>
      )}
    </Modal>
  )
}
