import { useContractKit } from '@celo-tools/use-contractkit'
import { BigNumber } from '@ethersproject/bignumber'
import { formatEther } from '@ethersproject/units'
import { ChainId, Pair } from '@ubeswap/sdk'
import { LightCard } from 'components/Card'
import { ContractInterface, ethers } from 'ethers'
import { ProxyOracle } from 'generated'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { Text } from 'rebass'
import { AppDispatch } from 'state'
import { addTransaction } from 'state/transactions/actions'
import styled, { ThemeContext } from 'styled-components'
import { AbiItem, toBN, toWei } from 'web3-utils'

import Circle from '../../assets/images/blue-loader.svg'
import Slider from '../../components/Slider'
import CERC20_ABI from '../../constants/abis/CErc20Immutable.json'
import UBE_SPELL from '../../constants/abis/UbeswapMSRSpellV1.json'
import { Farm } from '../../constants/leverageYieldFarm'
import { CErc20Immutable } from '../../generated/CErc20Immutable'
import { CoreOracle } from '../../generated/CoreOracle'
import { HomoraBank } from '../../generated/HomoraBank'
import { StakingInfo } from '../../state/stake/hooks'
import { CloseIcon, CustomLightSpinner, TYPE } from '../../theme'
import { ButtonError, ButtonSecondary } from '../Button'
import { AutoColumn } from '../Column'
import Modal from '../Modal'
import { LoadingView, SubmittedView } from '../ModalViews'
import { RowBetween, RowCenter } from '../Row'
import ShowPairAmounts from './ShowPairAmounts'

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

interface WithdrawLPModalProps {
  isOpen: boolean
  onDismiss: () => void
  stakingInfo: StakingInfo
  poolAPY: number
  bank: HomoraBank
  proxyOracle: ProxyOracle | null
  coreOracle: CoreOracle | null
  dummyPair: Pair | undefined
  lpToken: Farm | undefined
  provider: ethers.providers.Web3Provider | ethers.providers.JsonRpcSigner
  positionInfo: any
  existingPosition: BigNumber[] | undefined
  debts: BigNumber[] | undefined
}

export default function WithdrawLPModal({
  isOpen,
  onDismiss,
  stakingInfo,
  poolAPY,
  bank,
  proxyOracle,
  coreOracle,
  dummyPair,
  lpToken,
  provider,
  positionInfo,
  existingPosition,
  debts,
}: WithdrawLPModalProps) {
  const { getConnectedKit, network, address: account } = useContractKit()
  const chainId = network.chainId as unknown as ChainId
  const dispatch = useDispatch<AppDispatch>()
  // track and parse user input
  const { t } = useTranslation()
  const theme = useContext(ThemeContext)
  // state for pending and submitted txn views
  const [attempting, setAttempting] = useState<boolean>(false)
  const [hash, setHash] = useState<string | undefined>()
  const [info, setInfo] = useState<any>(null)
  const [amounts, setAmounts] = useState<string[]>(['0', '0'])
  const [maxAmounts, setMaxAmounts] = useState<any[]>(['0', '0'])
  const [lever, setLever] = useState<number>(0)
  const [debtRatio, setDebtRatio] = useState<number>(0)
  const [apy, setAPY] = useState<number>(0)
  const [scale] = useState<BigNumber>(BigNumber.from(2).pow(112))
  const [removePcnt, setRemovePcnt] = useState<number>(50)
  const [receiveA, setReceiveA] = useState<BigNumber | undefined>(undefined)
  const [receiveB, setReceiveB] = useState<BigNumber | undefined>(undefined)
  const [step, setStep] = useState<string>('remove')
  const wrappedOnDismiss = useCallback(() => {
    setHash(undefined)
    setAttempting(false)
    initialize()
    onDismiss()
  }, [onDismiss])

  const initialize = () => {
    setAmounts(['0', '0'])
    setMaxAmounts(['0', '0'])
    setLever(0)
    setDebtRatio(0)
    setAPY(0)
    setRemovePcnt(50)
    setStep('remove')
  }

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        if (!bank || !provider || !proxyOracle || !coreOracle || !dummyPair || !lpToken || !debts || !positionInfo)
          return
        const factors: any[] = []
        const prices: BigNumber[] = []
        const borrowRates: any[] = []
        for (const token of stakingInfo.tokens) {
          const bankInfo = await bank.getBankInfo(token ? token.address : '')
          const cToken = new ethers.Contract(
            bankInfo.cToken,
            CERC20_ABI as ContractInterface,
            provider
          ) as unknown as CErc20Immutable
          const blocksPerYear = BigNumber.from(6311520)
          const borrowRate = (await cToken.borrowRatePerBlock()).mul(blocksPerYear)
          borrowRates.push(borrowRate)
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
        let existingWeightBorrowValue = BigNumber.from(0)
        if (positionInfo) {
          existingWeightBorrowValue = await bank.getBorrowCELOValue(positionInfo.positionId)
        }
        let prevCollateral: BigNumber[] = []
        if (positionInfo && existingPosition) {
          prevCollateral = existingPosition?.map((x, i) => x.sub(debts[i]))
        }
        const _info = {
          factors,
          prices,
          lpPrice,
          lpFactor,
          prevBorrow: debts,
          borrowRates,
          existingWeightBorrowValue,
          prevCollateral,
        }
        setInfo((prevInfo: any) => ({ ...prevInfo, ..._info }))
        setReceiveAmounts()
      } catch (error) {
        console.log(error)
      }
    }
    fetchInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bank,
    proxyOracle,
    coreOracle,
    provider,
    stakingInfo?.tokens,
    dummyPair,
    positionInfo,
    existingPosition,
    lpToken,
    debts,
  ])

  const calculate = async () => {
    if (info && debts && existingPosition && proxyOracle && positionInfo) {
      let removeLp = BigNumber.from(0)

      if (positionInfo) {
        removeLp = positionInfo.collateralSize
          .mul(ethers.utils.parseEther((removePcnt / 100).toString()))
          .div(BigNumber.from(10).pow(BigNumber.from(18)))
        setInfo({ ...info, removeLp })
      }
      const maxAmounts = debts.map((x, index) =>
        x.lt(
          existingPosition[index]
            .mul(ethers.utils.parseEther((removePcnt / 100).toString()))
            .div(BigNumber.from(10).pow(BigNumber.from(18)))
        )
          ? formatEther(x)
          : formatEther(
              existingPosition[index]
                .mul(ethers.utils.parseEther((removePcnt / 100).toString()))
                .div(BigNumber.from(10).pow(BigNumber.from(18)))
            )
      )
      setMaxAmounts(maxAmounts)
      setAmounts(maxAmounts.map((x) => (Number(x) === 0 ? '0' : String((Number(x) / 3).toFixed(3)))))
    }
  }

  useEffect(() => {
    if (info && info?.removeLp && info?.existingWeightBorrowValue && amounts && positionInfo) {
      const individualBorrow = amounts.map(
        (x, i) =>
          ((Number(formatEther(info.prevBorrow[i])) - Number(x)) * Number(formatEther(info?.prices[i]))) /
          Number(formatEther(scale))
      )

      const borrowValue = individualBorrow ? individualBorrow.reduce((sum, current) => sum + current, 0) : 0

      const supplyValue =
        ((Number(formatEther(positionInfo.collateralSize)) - Number(formatEther(info?.removeLp))) *
          Number(formatEther(info?.lpPrice))) /
        Number(formatEther(scale))
      const lever = 1 + borrowValue / supplyValue
      const apy =
        ((borrowValue + supplyValue) * (poolAPY / 100) -
          individualBorrow
            .map((x, i) => x * Number(formatEther(info?.borrowRates[i])))
            .reduce((sum, current) => sum + current, 0)) /
        supplyValue
      const numer =
        Number(formatEther(info?.existingWeightBorrowValue)) -
        amounts
          .map(
            (x, i) =>
              Number(x) *
              (Number(formatEther(info?.prices[i])) / Number(formatEther(scale))) *
              (Number(info.factors[i]?.borrowFactor) / 10000)
          )
          .reduce((sum, current) => sum + current, 0)
      const denom =
        (Number(formatEther(positionInfo.collateralSize)) - Number(formatEther(info?.removeLp))) *
        (Number(formatEther(info?.lpPrice)) / Number(formatEther(scale))) *
        (Number(info.lpFactor.collateralFactor) / 10000)
      const debtRatio = (numer / denom) * 100
      setDebtRatio(debtRatio)
      setLever(lever)
      setAPY(apy)
    }
  }, [info, scale, amounts, poolAPY, positionInfo, stakingInfo.tokens])

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

  async function onConfirm() {
    try {
      setAttempting(true)
      const kit = await getConnectedKit()
      const spell = new kit.web3.eth.Contract(UBE_SPELL.abi as AbiItem[], lpToken?.spell ?? '') as unknown as any
      const bytes = spell.methods
        .removeLiquidityWStakingRewards(
          stakingInfo.tokens[0].address,
          stakingInfo.tokens[1].address,
          [
            toBN(toWei(formatEther(info.removeLp))).toString(),
            0,
            toBN(toWei(amounts[0])).toString(),
            toBN(toWei(amounts[1])).toString(),
            0,
            0,
            0,
          ],
          lpToken?.wrapper ?? ''
        )
        .encodeABI()
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
          summary: `${t('WithdrawDepositedLiquidity')}`,
        })
      )
    } catch (e) {
      console.log(e)
      setAttempting(false)
    }
  }

  const setReceiveAmounts = () => {
    setReceiveA(
      existingPosition ? existingPosition[0].div(BigNumber.from(100)).mul(BigNumber.from(removePcnt)) : undefined
    )
    setReceiveB(
      existingPosition ? existingPosition[1].div(BigNumber.from(100)).mul(BigNumber.from(removePcnt)) : undefined
    )
  }

  useEffect(() => {
    setReceiveAmounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removePcnt])

  const onChangeRemovePcnt = (e: number) => {
    setRemovePcnt(e)
  }

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOnDismiss} maxHeight={90}>
      {!attempting &&
        !hash &&
        (step === 'remove' ? (
          <ContentWrapper gap="lg">
            <RowBetween>
              <TYPE.mediumHeader>Withdraw</TYPE.mediumHeader>
              <CloseIcon onClick={wrappedOnDismiss} />
            </RowBetween>
            {stakingInfo &&
              (!info ? (
                <LightCard padding="2rem" borderRadius={'20px'}>
                  <AutoColumn justify="center">
                    <CustomLightSpinner src={Circle} alt="loader" size={'70px'} />
                  </AutoColumn>
                </LightCard>
              ) : (
                <LightCard>
                  <AutoColumn gap={'17px'}>
                    <AutoColumn gap={'12px'} justify="space-between">
                      <TYPE.black>Your Position Balance</TYPE.black>
                      <ShowPairAmounts
                        valueA={existingPosition ? existingPosition[0] : undefined}
                        valueB={existingPosition ? existingPosition[1] : undefined}
                        currencyA={stakingInfo.tokens[0]}
                        currencyB={stakingInfo.tokens[1]}
                      />
                    </AutoColumn>
                    <AutoColumn gap={'12px'} justify="space-between">
                      <TYPE.black>Your Position Debts</TYPE.black>
                      <ShowPairAmounts
                        valueA={debts ? debts[0] : undefined}
                        valueB={debts ? debts[1] : undefined}
                        currencyA={stakingInfo.tokens[0]}
                        currencyB={stakingInfo.tokens[1]}
                      />
                    </AutoColumn>
                    <AutoColumn>
                      <TYPE.black margin={'0 0 12px 0'}>I&apos;d like to remove</TYPE.black>
                      <Slider
                        value={removePcnt}
                        onChange={(e) => {
                          onChangeRemovePcnt(e)
                        }}
                        max={99}
                        size={18}
                        isWithdrawSlider={true}
                      />
                    </AutoColumn>
                    <AutoColumn gap={'12px'} justify="space-between">
                      <TYPE.black>Remove From Position</TYPE.black>
                      <ShowPairAmounts
                        valueA={receiveA}
                        valueB={receiveB}
                        currencyA={stakingInfo.tokens[0]}
                        currencyB={stakingInfo.tokens[1]}
                      />
                    </AutoColumn>
                  </AutoColumn>
                </LightCard>
              ))}

            <RowBetween>
              <ButtonError
                disabled={!removePcnt}
                error={!removePcnt}
                onClick={() => {
                  calculate()
                  setStep('confirm')
                }}
              >
                {t('continue')}
              </ButtonError>
            </RowBetween>
          </ContentWrapper>
        ) : (
          <ContentWrapper gap="lg">
            <RowBetween>
              <TYPE.mediumHeader>Withdraw</TYPE.mediumHeader>
              <CloseIcon onClick={wrappedOnDismiss} />
            </RowBetween>
            {stakingInfo &&
              (!info ? (
                <LightCard padding="2rem" borderRadius={'20px'}>
                  <AutoColumn justify="center">
                    <CustomLightSpinner src={Circle} alt="loader" size={'70px'} />
                  </AutoColumn>
                </LightCard>
              ) : (
                <LightCard padding="1rem" borderRadius={'20px'}>
                  <AutoColumn gap={'14px'}>
                    <AutoColumn justify="space-between">
                      <RowBetween>
                        <TYPE.black>New Est. Debt Ratio</TYPE.black>
                        <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
                          {''.concat(humanFriendlyNumber(debtRatio)).concat('/100')}
                        </Text>
                      </RowBetween>
                    </AutoColumn>
                    <AutoColumn justify="center">
                      <RowBetween>
                        <TYPE.black>New Leverage</TYPE.black>
                        <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
                          {''.concat(humanFriendlyNumber(lever)).concat('x')}
                        </Text>
                      </RowBetween>
                    </AutoColumn>
                    <AutoColumn justify="center">
                      <RowBetween>
                        <TYPE.black>New Farming APR</TYPE.black>
                        <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
                          {''.concat(humanFriendlyNumber(apy * 100)).concat('%')}
                        </Text>
                      </RowBetween>
                    </AutoColumn>
                  </AutoColumn>
                  <RowCenter padding={'0.4rem'}></RowCenter>
                  <AutoColumn>
                    <TYPE.black>Payback Borrows</TYPE.black>
                    <RowCenter padding={'0.35rem'}></RowCenter>
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
                  </AutoColumn>
                  {receiveA && receiveB && amounts && (
                    <AutoColumn gap={'12px'} justify="space-between">
                      <TYPE.black>You Receive</TYPE.black>
                      <ShowPairAmounts
                        valueA={receiveA.sub(ethers.utils.parseEther(amounts[0]))}
                        valueB={receiveB.sub(ethers.utils.parseEther(amounts[1]))}
                        currencyA={stakingInfo.tokens[0]}
                        currencyB={stakingInfo.tokens[1]}
                      />
                    </AutoColumn>
                  )}
                </LightCard>
              ))}
            <RowBetween>
              <ButtonSecondary mr="0.5rem" padding="18px" onClick={() => setStep('remove')}>{`${t(
                'Back'
              )}`}</ButtonSecondary>
              <ButtonError borderRadius="12px" disabled={debtRatio >= 100} error={debtRatio >= 90} onClick={onConfirm}>
                {debtRatio >= 100 ? 'Debt ratio too high' : `${t('confirm')}`}
              </ButtonError>
            </RowBetween>
          </ContentWrapper>
        ))}
      {attempting && !hash && (
        <LoadingView onDismiss={wrappedOnDismiss}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.body fontSize={20}>Withdrawing {Number(formatEther(info?.removeLp)).toFixed(4)} UBE-LP</TYPE.body>
            <TYPE.body fontSize={20}>
              {[receiveA, receiveB]
                ?.map(
                  (token, index) =>
                    `${
                      token ? Number(formatEther(token.sub(ethers.utils.parseEther(amounts[index])))).toFixed(4) : '-'
                    } ${stakingInfo.tokens[index].symbol}`
                )
                .join(' + ')}
            </TYPE.body>
          </AutoColumn>
        </LoadingView>
      )}
      {attempting && hash && (
        <SubmittedView onDismiss={wrappedOnDismiss} hash={hash}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.largeHeader>Transaction Submitted</TYPE.largeHeader>
            <TYPE.body fontSize={20}>Withdrew UBE-LP!</TYPE.body>
            <TYPE.body fontSize={20}>
              Claimed{' '}
              {[receiveA, receiveB]
                ?.map(
                  (token, index) =>
                    `${
                      token ? Number(formatEther(token.sub(ethers.utils.parseEther(amounts[index])))).toFixed(4) : '-'
                    } ${stakingInfo.tokens[index].symbol}`
                )
                .join(' + ')}
            </TYPE.body>
          </AutoColumn>
        </SubmittedView>
      )}
    </Modal>
  )
}
