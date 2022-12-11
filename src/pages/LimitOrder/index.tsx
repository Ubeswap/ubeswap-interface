import { useContractKit, WalletTypes } from '@celo-tools/use-contractkit'
import { RampInstantSDK } from '@ramp-network/ramp-instant-sdk'
import { ChainId as UbeswapChainId, cUSD, JSBI, TokenAmount, Trade } from '@ubeswap/sdk'
import { CardNoise, CardSection, DataCard } from 'components/earn/styled'
import ChartSection from 'components/LimitOrder/ChartSection'
import ChartSelector, { ChartOption } from 'components/LimitOrder/ChartSelector'
import { LeftPanel, LimitOrderLayout, RightPanel } from 'components/LimitOrder/Skeleton'
import PriceInputPanel from 'components/PriceInputPanel'
import { AdvancedDetailsFooter } from 'components/swap/AdvancedSwapDetailsDropdown'
import { useQueueLimitOrderTrade } from 'components/swap/routing/limit/queueLimitOrderTrade'
import { useTradeCallback } from 'components/swap/routing/useTradeCallback'
import { useIsTransactionUnsupported } from 'hooks/Trades'
import { useOrderBookContract, useOrderBookRewardDistributorContract } from 'hooks/useContract'
import useENS from 'hooks/useENS'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { ArrowDown } from 'react-feather'
import ReactGA from 'react-ga'
import { useTranslation } from 'react-i18next'
import { Text } from 'rebass'
import { useDerivedLimitOrderInfo, useLimitOrderActionHandlers, useLimitOrderState } from 'state/limit/hooks'
import { useSingleCallResult } from 'state/multicall/hooks'
import styled, { ThemeContext } from 'styled-components'

import { ButtonConfirmed, ButtonLight, ButtonPrimary, TabButton } from '../../components/Button'
import Column, { AutoColumn, TopSectionLimitOrder } from '../../components/Column'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import Loader from '../../components/Loader'
import ProgressSteps from '../../components/ProgressSteps'
import Row, { AutoRow, RowBetween } from '../../components/Row'
import ConfirmSwapModal from '../../components/swap/ConfirmSwapModal'
import { BottomGrouping, Wrapper } from '../../components/swap/styleds'
import SwapHeader from '../../components/swap/SwapHeader'
import TradePrice from '../../components/swap/TradePrice'
import { LIMIT_ORDER_ADDRESS, ORDER_BOOK_ADDRESS, ORDER_BOOK_REWARD_DISTRIBUTOR_ADDRESS } from '../../constants'
import { useCurrency, useToken } from '../../hooks/Tokens'
import { ApprovalState, useApproveCallback } from '../../hooks/useApproveCallback'
import { useWalletModalToggle } from '../../state/application/hooks'
import { Field } from '../../state/limit/actions'
import { useUserSlippageTolerance } from '../../state/user/hooks'
import { TYPE } from '../../theme'
import AppBody from '../AppBody'
import { LimitOrderHistory } from './LimitOrderHistory'

const ArrowContainer = styled.button`
  height: 36px;
  width: 36px;
  border-radius: 50%;
  background: ${({ theme }) => theme.bg1};
  border: 1px solid ${({ theme }) => theme.bg3};
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: -18px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  svg {
    stroke-width: 3px;
    transition: all 0.1s ease-in-out;
  }
  :hover svg {
    transform: rotate(180deg);
  }
`

export const BPS_DENOMINATOR = JSBI.BigInt(1_000_000)

export default function LimitOrder() {
  const { address: account, network, walletType } = useContractKit()
  const chainId = network.chainId as unknown as UbeswapChainId
  const { queueLimitOrderCallback, loading: queueOrderLoading } = useQueueLimitOrderTrade()

  const { t } = useTranslation()

  const theme = useContext(ThemeContext)

  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle()

  // get custom setting values for user
  const [allowedSlippage] = useUserSlippageTolerance()

  const orderBookContract = useOrderBookContract(ORDER_BOOK_ADDRESS[chainId])
  const orderBookFee = useSingleCallResult(orderBookContract, 'fee', []).result?.[0]

  // swap state
  const { tokenTypedValue, priceTypedValue, recipient } = useLimitOrderState()
  const {
    v2Trade: trade,
    parsedInputTotal,
    parsedOutputTotal,
    currencies,
    inputError: limitOrderInputError,
    showRamp,
    buying,
    marketPriceDiffIndicator,
    aboveMarketPrice,
  } = useDerivedLimitOrderInfo()
  const { address: recipientAddress } = useENS(recipient)

  const rewardDistributorContract = useOrderBookRewardDistributorContract(
    ORDER_BOOK_REWARD_DISTRIBUTOR_ADDRESS[chainId]
  )
  const rewardCurrencyAddress = useSingleCallResult(rewardDistributorContract, 'rewardCurrency', []).result?.[0]
  const rewardCurrency = useToken(rewardCurrencyAddress)
  const rewardRate = useSingleCallResult(rewardDistributorContract, 'rewardRate', [
    buying ? currencies?.PRICE?.address : currencies?.TOKEN?.address,
  ]).result?.[0]

  const { onCurrencySelection, onSwitchTokens, onUserInput, setBuying } = useLimitOrderActionHandlers()
  const defaultPriceCurrency = useCurrency(cUSD[chainId].address)
  useEffect(() => {
    defaultPriceCurrency && onCurrencySelection(Field.PRICE, defaultPriceCurrency)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isValid = !limitOrderInputError

  const handleTypeTokenAmount = useCallback(
    (value: string) => {
      onUserInput(Field.TOKEN, value)
    },
    [onUserInput]
  )
  const handleTypePrice = useCallback(
    (value: string) => {
      onUserInput(Field.PRICE, value)
    },
    [onUserInput]
  )

  // modal and loading
  const [{ showConfirm, tradeToConfirm, swapErrorMessage, attemptingTxn, txHash }, setSwapState] = useState<{
    showConfirm: boolean
    tradeToConfirm: Trade | undefined
    attemptingTxn: boolean
    swapErrorMessage: string | undefined
    txHash: string | undefined
  }>({
    showConfirm: false,
    tradeToConfirm: undefined,
    attemptingTxn: false,
    swapErrorMessage: undefined,
    txHash: undefined,
  })

  const formattedAmounts = {
    [Field.PRICE]: priceTypedValue,
    [Field.TOKEN]: tokenTypedValue,
  }

  // check whether the user has approved the router on the input token
  // TODO: inputAmount may not work if it is the dependent field
  const [limitOrderApproval, limitOrderApprovalCallback] = useApproveCallback(
    parsedInputTotal,
    LIMIT_ORDER_ADDRESS[chainId]
  )
  const orderFee =
    parsedInputTotal && orderBookFee
      ? new TokenAmount(
          parsedInputTotal.currency,
          JSBI.divide(JSBI.multiply(parsedInputTotal.raw, JSBI.BigInt(orderBookFee.toString())), BPS_DENOMINATOR)
        )
      : undefined

  const reward =
    parsedInputTotal && rewardCurrency && rewardRate
      ? new TokenAmount(
          rewardCurrency,
          JSBI.divide(JSBI.multiply(parsedInputTotal.raw, JSBI.BigInt(rewardRate.toString())), BPS_DENOMINATOR)
        )
      : undefined
  const [orderBookApproval, orderBookApprovalCallback] = useApproveCallback(orderFee, ORDER_BOOK_ADDRESS[chainId])
  const approvalCallback = useCallback(async () => {
    if (limitOrderApproval === ApprovalState.NOT_APPROVED) {
      await limitOrderApprovalCallback()
    }
    if (orderBookApproval === ApprovalState.NOT_APPROVED) {
      await orderBookApprovalCallback()
    }
  }, [limitOrderApproval, orderBookApproval, limitOrderApprovalCallback, orderBookApprovalCallback])

  // check if user has gone through orderBookApproval process, used to show two step buttons, reset on token change
  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)

  // mark when a user has submitted an orderBookApproval, reset onTokenSelection for input field
  useEffect(() => {
    if (limitOrderApproval === ApprovalState.PENDING || orderBookApproval === ApprovalState.PENDING) {
      setApprovalSubmitted(true)
    }
  }, [limitOrderApproval, orderBookApproval, approvalSubmitted])

  const getColor = () => {
    return buying ? (aboveMarketPrice ? theme.green1 : theme.red1) : aboveMarketPrice ? theme.red1 : theme.green1
  }

  // the callback to execute the swap
  const { callback: swapCallback } = useTradeCallback(tradeToConfirm, allowedSlippage, recipient)

  const handlePlaceOrder = useCallback(() => {
    if (!swapCallback) {
      return
    }
    setSwapState({ attemptingTxn: true, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: undefined })
    swapCallback()
      .then((hash) => {
        setSwapState({ attemptingTxn: false, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: hash })

        ReactGA.event({
          category: 'Limit Order',
          action:
            recipient === null
              ? 'Limit Order w/o Send'
              : (recipientAddress ?? recipient) === account
              ? 'Limit Order w/o Send + recipient'
              : 'Limit Order w/ Send',
          label: [trade?.inputAmount?.currency?.symbol, trade?.outputAmount?.currency?.symbol].join('/'),
        })
      })
      .catch((error) => {
        setSwapState({
          attemptingTxn: false,
          tradeToConfirm,
          showConfirm,
          swapErrorMessage: error.message,
          txHash: undefined,
        })
      })
  }, [swapCallback, tradeToConfirm, showConfirm, recipient, recipientAddress, account, trade])

  // errors
  const [showInverted, setShowInverted] = useState<boolean>(false)

  // show approve flow when: no error on inputs, not approved or pending, or approved in current session
  // never show if price impact is above threshold in non expert mode
  const showApproveFlow =
    (!limitOrderInputError &&
      (orderBookApproval === ApprovalState.NOT_APPROVED ||
        orderBookApproval === ApprovalState.PENDING ||
        (approvalSubmitted && orderBookApproval === ApprovalState.APPROVED))) ||
    limitOrderApproval === ApprovalState.NOT_APPROVED ||
    limitOrderApproval === ApprovalState.PENDING ||
    (approvalSubmitted && limitOrderApproval === ApprovalState.APPROVED)

  const handleConfirmDismiss = useCallback(() => {
    setSwapState({ showConfirm: false, tradeToConfirm, attemptingTxn, swapErrorMessage, txHash })
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onUserInput(Field.TOKEN, '')
      onUserInput(Field.PRICE, '')
    }
  }, [attemptingTxn, onUserInput, swapErrorMessage, tradeToConfirm, txHash])

  const handleAcceptChanges = useCallback(() => {
    setSwapState({ tradeToConfirm: trade, swapErrorMessage, txHash, attemptingTxn, showConfirm })
  }, [attemptingTxn, showConfirm, swapErrorMessage, trade, txHash])

  const handlePriceSelect = useCallback(
    (inputCurrency) => {
      buying && setApprovalSubmitted(false) // reset 2 step UI for approvals
      onCurrencySelection(Field.PRICE, inputCurrency)
    },
    [buying, onCurrencySelection]
  )

  const handleTokenSelect = useCallback(
    (outputCurrency) => {
      !buying && setApprovalSubmitted(false) // reset 2 step UI for approvals
      onCurrencySelection(Field.TOKEN, outputCurrency)
    },
    [buying, onCurrencySelection]
  )

  const swapIsUnsupported = useIsTransactionUnsupported(currencies?.PRICE, currencies?.TOKEN)

  const walletIsSupported =
    walletType === WalletTypes.MetaMask ||
    walletType === WalletTypes.CeloExtensionWallet ||
    walletType === WalletTypes.PrivateKey ||
    walletType === WalletTypes.Injected

  const [chart, setChart] = useState<ChartOption | undefined>(undefined)

  return (
    <LimitOrderLayout>
      <LeftPanel>
        <ChartSelector
          currencies={currencies}
          onChartChange={(c: ChartOption | undefined) => {
            setChart(c)
          }}
        ></ChartSelector>
        <ChartSection></ChartSection>
        <LimitOrderHistory />
      </LeftPanel>
      <RightPanel>
        {!walletIsSupported && (
          <TopSectionLimitOrder gap="md">
            <DataCard>
              <CardNoise />
              <CardSection>
                <AutoColumn gap="md">
                  <RowBetween>
                    <TYPE.white fontWeight={600}>Notice</TYPE.white>
                  </RowBetween>
                  <RowBetween>
                    <TYPE.white fontSize={14}>
                      You must be connected to a Metamask wallet to place limit orders
                    </TYPE.white>
                  </RowBetween>{' '}
                </AutoColumn>
              </CardSection>
              <CardNoise />
            </DataCard>
          </TopSectionLimitOrder>
        )}
        <AppBody>
          <SwapHeader title={'Limit'} hideSettings={true} />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <TabButton active={buying} onClick={() => setBuying(true)}>
              Buy
            </TabButton>
            <TabButton active={!buying} onClick={() => setBuying(false)}>
              Sell
            </TabButton>
          </div>
          <Wrapper id="swap-page" style={{ padding: '0' }}>
            <ConfirmSwapModal
              isOpen={showConfirm}
              trade={tradeToConfirm}
              originalTrade={tradeToConfirm}
              onAcceptChanges={handleAcceptChanges}
              attemptingTxn={attemptingTxn}
              txHash={txHash}
              recipient={recipient}
              allowedSlippage={allowedSlippage}
              onConfirm={handlePlaceOrder}
              swapErrorMessage={swapErrorMessage}
              onDismiss={handleConfirmDismiss}
            />

            <AutoColumn gap={'md'}>
              <Column
                style={{
                  gap: '8px',
                  borderBottom: `1px solid ${theme.bg3}`,
                  position: 'relative',
                  padding: '22px 1rem 42px',
                }}
              >
                <TYPE.body fontWeight={600} style={{ margin: '0 0.75rem' }}>
                  You Pay
                </TYPE.body>
                <CurrencyInputPanel
                  value={formattedAmounts[Field.TOKEN]}
                  currency={currencies[Field.TOKEN]}
                  onUserInput={handleTypeTokenAmount}
                  onCurrencySelect={handleTokenSelect}
                  otherCurrency={currencies[Field.PRICE]}
                  hideBalance={buying}
                  id="limit-order-token"
                />
                <PriceInputPanel
                  id="limit-order-price"
                  value={formattedAmounts[Field.PRICE]}
                  onUserInput={handleTypePrice}
                />
                <Row justify="flex-end" style={{ height: '20px', paddingRight: '12px' }}>
                  {marketPriceDiffIndicator && (
                    <>
                      <Text fontWeight={500} fontSize={14} color={getColor()}>
                        {marketPriceDiffIndicator.toSignificant(4)}% {aboveMarketPrice ? 'below' : 'above'}&nbsp;
                      </Text>
                      <Text fontWeight={500} fontSize={14} color={theme.text2}>
                        market price
                      </Text>
                    </>
                  )}
                </Row>
                <ArrowContainer
                  onClick={() => {
                    setApprovalSubmitted(false) // reset 2 step UI for approvals
                    handleTypeTokenAmount(formattedAmounts[Field.TOKEN])
                    onSwitchTokens()
                  }}
                >
                  <ArrowDown size="16" color={theme.primary1} />
                </ArrowContainer>
              </Column>
              <Column
                style={{
                  gap: '8px',
                  padding: '22px 1rem 42px',
                }}
              >
                <TYPE.body fontWeight={600} style={{ margin: '0 0.75rem' }}>
                  You Receive
                </TYPE.body>
                <CurrencyInputPanel
                  value={parsedOutputTotal ? parsedOutputTotal.toExact() : ''}
                  currency={currencies[Field.PRICE]}
                  onCurrencySelect={handlePriceSelect}
                  otherCurrency={currencies[Field.TOKEN]}
                  disabled
                  id="limit-order-token"
                />
              </Column>
            </AutoColumn>
            <BottomGrouping style={{ padding: '1rem' }}>
              {swapIsUnsupported ? (
                <ButtonPrimary disabled={true}>
                  <TYPE.main mb="4px">Unsupported Asset</TYPE.main>
                </ButtonPrimary>
              ) : !account ? (
                <ButtonLight onClick={toggleWalletModal}>{t('connectWallet')}</ButtonLight>
              ) : showRamp ? (
                <ButtonLight
                  onClick={() => {
                    new RampInstantSDK({
                      hostAppName: 'Ubeswap',
                      hostLogoUrl: 'https://info.ubeswap.org/favicon.png',
                      userAddress: account,
                      swapAsset: `CELO_${parsedInputTotal?.currency.symbol}`,
                      hostApiKey: process.env.REACT_APP_RAMP_KEY,
                    }).show()
                  }}
                >
                  Get more {parsedInputTotal?.currency.symbol} via Ramp
                </ButtonLight>
              ) : (
                <RowBetween>
                  <ButtonConfirmed
                    onClick={approvalCallback}
                    disabled={
                      (limitOrderApproval !== ApprovalState.NOT_APPROVED &&
                        orderBookApproval !== ApprovalState.NOT_APPROVED) ||
                      approvalSubmitted
                    }
                    width="48%"
                    altDisabledStyle={
                      limitOrderApproval === ApprovalState.PENDING || orderBookApproval === ApprovalState.PENDING
                    } // show solid button while waiting
                    confirmed={
                      limitOrderApproval === ApprovalState.APPROVED && orderBookApproval === ApprovalState.APPROVED
                    }
                  >
                    {limitOrderApproval === ApprovalState.PENDING || orderBookApproval === ApprovalState.PENDING ? (
                      <AutoRow gap="6px" justify="center">
                        Approving <Loader stroke="white" />
                      </AutoRow>
                    ) : approvalSubmitted && orderBookApproval === ApprovalState.APPROVED ? (
                      'Approved'
                    ) : (
                      'Approve ' + (currencies[buying ? Field.PRICE : Field.TOKEN]?.symbol ?? '')
                    )}
                  </ButtonConfirmed>
                  <ButtonPrimary
                    onClick={async () => {
                      if (parsedInputTotal && parsedOutputTotal) {
                        queueLimitOrderCallback({
                          inputAmount: parsedInputTotal,
                          outputAmount: parsedOutputTotal,
                          chainId: chainId,
                        })
                      }
                    }}
                    width="48%"
                    id="swap-button"
                    disabled={
                      !isValid ||
                      limitOrderApproval !== ApprovalState.APPROVED ||
                      orderBookApproval !== ApprovalState.APPROVED
                    }
                    altDisabledStyle={queueOrderLoading} // show solid button while waiting
                    paddingY="14px"
                  >
                    <AutoRow gap="4px" justify="center" wrap="nowrap">
                      <Text fontSize={16} fontWeight={500}>
                        {t('placeOrder')}
                      </Text>
                      {queueOrderLoading && <Loader stroke="white" />}
                    </AutoRow>
                  </ButtonPrimary>
                </RowBetween>
              )}
              {showApproveFlow && (
                <Column style={{ marginTop: '1rem' }}>
                  <ProgressSteps steps={[orderBookApproval === ApprovalState.APPROVED]} />
                </Column>
              )}
            </BottomGrouping>
          </Wrapper>
        </AppBody>
        <Row justify="center" style={{ height: 'fit-content', overflow: 'hidden' }}>
          <AdvancedDetailsFooter show={parsedOutputTotal || parsedInputTotal ? true : false}>
            <AutoColumn gap="8px" style={{ padding: '0 16px' }}>
              <RowBetween align="center">
                <Text fontWeight={500} fontSize={14} color={theme.text2}>
                  Market Price
                </Text>
                {trade ? (
                  <TradePrice
                    price={trade.executionPrice}
                    showInverted={buying ? showInverted : !showInverted}
                    setShowInverted={setShowInverted}
                  />
                ) : (
                  <Text>-</Text>
                )}
              </RowBetween>
              <RowBetween align="center">
                <Text fontWeight={500} fontSize={14} color={theme.text2}>
                  Order Reward
                </Text>
                <Text fontWeight={500} fontSize={14} color={theme.text2}>
                  {reward?.toSignificant(2) ?? '-'} {reward?.currency.symbol}
                </Text>
              </RowBetween>
              <RowBetween align="center">
                <Text fontWeight={500} fontSize={14} color={theme.text2}>
                  Order Fee
                </Text>
                <Text fontWeight={500} fontSize={14} color={theme.text2}>
                  {orderFee?.toSignificant(2) ?? '-'} {orderFee?.currency.symbol}
                </Text>
              </RowBetween>
              <RowBetween align="center">
                <Text fontWeight={500} fontSize={14} color={theme.text2}>
                  {buying ? 'Total Buy' : 'Total Sell'}
                </Text>
                {buying ? (
                  <Text fontWeight={500} fontSize={14} color={theme.text2}>
                    {parsedOutputTotal ? parsedOutputTotal.toSignificant(6) : '-'} {parsedOutputTotal?.currency.symbol}
                  </Text>
                ) : (
                  <Text fontWeight={500} fontSize={14} color={theme.text2}>
                    {parsedInputTotal && orderFee ? parsedInputTotal.add(orderFee).toSignificant(6) : '-'}{' '}
                    {parsedInputTotal?.currency.symbol}
                  </Text>
                )}
              </RowBetween>
              <RowBetween align="center">
                <Text fontWeight={800} fontSize={14} color={theme.text1}>
                  {buying ? 'Total Cost' : 'Total Received'}
                </Text>
                {buying ? (
                  <Text fontWeight={800} fontSize={14} color={theme.text1}>
                    {parsedInputTotal && orderFee ? parsedInputTotal.add(orderFee).toSignificant(6) : '-'}{' '}
                    {parsedInputTotal?.currency.symbol}
                  </Text>
                ) : (
                  <Text fontWeight={800} fontSize={14} color={theme.text1}>
                    {parsedOutputTotal ? parsedOutputTotal.toSignificant(6) : '-'} {parsedOutputTotal?.currency.symbol}
                  </Text>
                )}
              </RowBetween>
            </AutoColumn>
          </AdvancedDetailsFooter>
        </Row>
      </RightPanel>
    </LimitOrderLayout>
  )
}
