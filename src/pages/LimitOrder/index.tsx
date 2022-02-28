import { useContractKit } from '@celo-tools/use-contractkit'
import { parseUnits } from '@ethersproject/units'
import { RampInstantSDK } from '@ramp-network/ramp-instant-sdk'
import { CELO, ChainId as UbeswapChainId, Fraction, JSBI, Token, TokenAmount, Trade } from '@ubeswap/sdk'
import OpticsV1Warning from 'components/Header/OpticsV1Warning'
import { describeTrade } from 'components/swap/routing/describeTrade'
import { LimitOrderTrade } from 'components/swap/routing/limit/LimitOrderTrade'
import { useTradeCallback } from 'components/swap/routing/useTradeCallback'
import { useIsTransactionUnsupported } from 'hooks/Trades'
import useENS from 'hooks/useENS'
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ArrowDown } from 'react-feather'
import ReactGA from 'react-ga'
import { useTranslation } from 'react-i18next'
import { Text } from 'rebass'
import { ThemeContext } from 'styled-components'

import AddressInputPanel from '../../components/AddressInputPanel'
import { ButtonConfirmed, ButtonLight, ButtonPrimary } from '../../components/Button'
import Card from '../../components/Card'
import Column, { AutoColumn } from '../../components/Column'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import Loader from '../../components/Loader'
import PriceInputPanel from '../../components/PriceInputPanel'
import ProgressSteps from '../../components/ProgressSteps'
import { AutoRow, RowBetween } from '../../components/Row'
import ConfirmSwapModal from '../../components/swap/ConfirmSwapModal'
import { ArrowWrapper, BottomGrouping, SwapCallbackError, Wrapper } from '../../components/swap/styleds'
import SwapHeader from '../../components/swap/SwapHeader'
import TradePrice from '../../components/swap/TradePrice'
import TokenWarningModal from '../../components/TokenWarningModal'
import { INITIAL_ALLOWED_SLIPPAGE, LIMIT_ORDER_ADDRESS, ORDER_BOOK_ADDRESS } from '../../constants'
import { useAllTokens, useCurrency } from '../../hooks/Tokens'
import { ApprovalState, useApproveCallback } from '../../hooks/useApproveCallback'
import { useToggleSettingsMenu, useWalletModalToggle } from '../../state/application/hooks'
import { Field } from '../../state/swap/actions'
import {
  tryParseAmount,
  useDefaultsFromURLSearch,
  useDerivedSwapInfo,
  useSwapActionHandlers,
  useSwapState,
} from '../../state/swap/hooks'
import { useExpertModeManager, useUserSingleHopOnly, useUserSlippageTolerance } from '../../state/user/hooks'
import { LinkStyledButton, TYPE } from '../../theme'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import AppBody from '../AppBody'
import { ClickableText } from '../Pool/styleds'

const PRICE_PRECISION = 6
// TODO: HARDCODE
const FEE_BPS = JSBI.BigInt(5)
const BPS = JSBI.BigInt(1000)

export default function LimitOrder() {
  const { t } = useTranslation()
  const loadedUrlParams = useDefaultsFromURLSearch()

  // token warning stuff
  const [loadedInputCurrency, loadedOutputCurrency] = [
    useCurrency(loadedUrlParams?.inputCurrencyId),
    useCurrency(loadedUrlParams?.outputCurrencyId),
  ]
  const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(false)
  const urlLoadedTokens: Token[] = useMemo(
    () => [loadedInputCurrency, loadedOutputCurrency]?.filter((c): c is Token => c instanceof Token) ?? [],
    [loadedInputCurrency, loadedOutputCurrency]
  )
  const handleConfirmTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
  }, [])

  // dismiss warning if all imported tokens are in active lists
  const defaultTokens = useAllTokens()
  const importTokensNotInDefault =
    urlLoadedTokens &&
    urlLoadedTokens.filter((token: Token) => {
      return !(token.address in defaultTokens)
    })

  const { address: account, network } = useContractKit()
  const chainId = network.chainId as unknown as UbeswapChainId

  const theme = useContext(ThemeContext)

  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle()

  // for expert mode
  const toggleSettings = useToggleSettingsMenu()
  const [isExpertMode] = useExpertModeManager()

  // get custom setting values for user
  const [allowedSlippage] = useUserSlippageTolerance()

  // swap state
  const { independentField, typedValue, recipient } = useSwapState()
  const {
    v2Trade: trade,
    currencyBalances,
    parsedAmount,
    currencies,
    inputError: swapInputError,
    showRamp,
  } = useDerivedSwapInfo()
  const { address: recipientAddress } = useENS(recipient)

  const [price, setPrice] = useState<string>('')
  const [marketPrice, setMarketPrice] = useState(trade?.executionPrice.raw)
  useEffect(() => {
    if (trade?.executionPrice.toSignificant(2) !== marketPrice?.toSignificant(2)) setMarketPrice(trade?.executionPrice)
  }, [marketPrice, trade])

  const priceParsed = price === '' ? '0' : parseUnits(price, PRICE_PRECISION).toString()
  const priceFraction = new Fraction(
    JSBI.BigInt(Number(priceParsed)),
    JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(PRICE_PRECISION))
  )
  const parsedAmounts = {
    [Field.INPUT]:
      independentField === Field.INPUT ? parsedAmount : priceFraction ? parsedAmount?.divide(priceFraction) : undefined,
    [Field.OUTPUT]:
      independentField === Field.OUTPUT
        ? parsedAmount
        : priceFraction
        ? parsedAmount?.multiply(priceFraction)
        : undefined,
  }

  const { onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient } = useSwapActionHandlers()
  const isValid = !swapInputError
  const dependentField: Field = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

  const handleTypeInput = useCallback(
    (value: string) => {
      onUserInput(Field.INPUT, value)
    },
    [onUserInput]
  )
  const handleTypePrice = useCallback((value: string) => {
    if (value === '') {
      setPrice('')
      return
    }
    try {
      const typedValueParsed = parseUnits(value, PRICE_PRECISION).toString()
      if (typedValueParsed !== '0') {
        setPrice(value)
      }
    } catch (e) {
      console.error(e)
    }
  }, [])
  const handleTypeOutput = useCallback(
    (value: string) => {
      onUserInput(Field.OUTPUT, value)
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
    [independentField]: typedValue,
    [dependentField]: parsedAmounts[dependentField]?.toSignificant(6) ?? '',
  }

  // check whether the user has approved the router on the input token
  // TODO: inputAmount may not work if it is the dependent field
  const [limitOrderApproval, limitOrderApprovalCallback] = useApproveCallback(
    trade?.inputAmount,
    LIMIT_ORDER_ADDRESS[chainId]
  )
  const orderFee = trade
    ? new TokenAmount(trade.inputAmount.currency, JSBI.divide(JSBI.multiply(trade.inputAmount.raw, FEE_BPS), BPS))
    : undefined
  const [orderBookApproval, orderBookApprovalCallback] = useApproveCallback(orderFee, ORDER_BOOK_ADDRESS[chainId])
  const approvalCallback = useCallback(() => {
    if (limitOrderApproval === ApprovalState.NOT_APPROVED) {
      limitOrderApprovalCallback()
    }
    if (orderBookApproval === ApprovalState.NOT_APPROVED) {
      orderBookApprovalCallback()
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

  const maxAmountInput: TokenAmount | undefined = maxAmountSpend(currencyBalances[Field.INPUT])
  const atMaxAmountInput = Boolean(maxAmountInput && parsedAmounts[Field.INPUT]?.equalTo(maxAmountInput))
  const atHalfAmountInput = Boolean(
    maxAmountInput &&
      Math.abs(Number(maxAmountInput.toExact()) * 0.5 - Number(parsedAmounts[Field.INPUT]?.toFixed(18))) < 0.01
  )

  // the callback to execute the swap
  const { callback: swapCallback } = useTradeCallback(tradeToConfirm, allowedSlippage, recipient)

  const [singleHopOnly] = useUserSingleHopOnly()

  const handleSwap = useCallback(() => {
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

        ReactGA.event({
          category: 'Routing',
          action: singleHopOnly ? 'Swap with multihop disabled' : 'Swap with multihop enabled',
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
  }, [swapCallback, tradeToConfirm, showConfirm, recipient, recipientAddress, account, trade, singleHopOnly])

  // errors
  const [showInverted, setShowInverted] = useState<boolean>(false)

  // show approve flow when: no error on inputs, not approved or pending, or approved in current session
  // never show if price impact is above threshold in non expert mode
  const showApproveFlow =
    (!swapInputError &&
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
      onUserInput(Field.INPUT, '')
    }
  }, [attemptingTxn, onUserInput, swapErrorMessage, tradeToConfirm, txHash])

  const handleAcceptChanges = useCallback(() => {
    setSwapState({ tradeToConfirm: trade, swapErrorMessage, txHash, attemptingTxn, showConfirm })
  }, [attemptingTxn, showConfirm, swapErrorMessage, trade, txHash])

  const handleInputSelect = useCallback(
    (inputCurrency) => {
      setApprovalSubmitted(false) // reset 2 step UI for approvals
      onCurrencySelection(Field.INPUT, inputCurrency)
    },
    [onCurrencySelection]
  )

  const handleMaxInput = useCallback(() => {
    if (maxAmountInput) {
      if (currencies?.INPUT?.address === CELO[chainId].address) {
        onUserInput(Field.INPUT, Math.max(Number(maxAmountInput.toExact()) - 0.01, 0).toString())
      } else {
        onUserInput(Field.INPUT, maxAmountInput.toExact())
      }
    }
  }, [maxAmountInput, onUserInput, currencies, chainId])

  const handleHalfInput = useCallback(() => {
    if (maxAmountInput) {
      onUserInput(Field.INPUT, Math.max(Number(maxAmountInput.toExact()) * 0.5, 0).toString())
    }
  }, [maxAmountInput, onUserInput])

  const handleOutputSelect = useCallback(
    (outputCurrency) => onCurrencySelection(Field.OUTPUT, outputCurrency),
    [onCurrencySelection]
  )

  const swapIsUnsupported = useIsTransactionUnsupported(currencies?.INPUT, currencies?.OUTPUT)

  const { isEstimate } = describeTrade(trade)

  return (
    <>
      <TokenWarningModal
        isOpen={importTokensNotInDefault.length > 0 && !dismissTokenWarning}
        tokens={importTokensNotInDefault}
        onConfirm={handleConfirmTokenWarning}
      />
      <OpticsV1Warning />
      <AppBody>
        <SwapHeader title={t('limitOrder')} hideSettings={true} />
        <Wrapper id="swap-page">
          <ConfirmSwapModal
            isOpen={showConfirm}
            trade={tradeToConfirm}
            originalTrade={tradeToConfirm}
            onAcceptChanges={handleAcceptChanges}
            attemptingTxn={attemptingTxn}
            txHash={txHash}
            recipient={recipient}
            allowedSlippage={allowedSlippage}
            onConfirm={handleSwap}
            swapErrorMessage={swapErrorMessage}
            onDismiss={handleConfirmDismiss}
          />

          <AutoColumn gap={'md'}>
            <CurrencyInputPanel
              label={
                independentField === Field.OUTPUT && trade
                  ? `${t('from')}${isEstimate ? ' (estimated)' : ''}`
                  : t('from')
              }
              value={formattedAmounts[Field.INPUT]}
              showMaxButton={!atMaxAmountInput}
              showHalfButton={!atHalfAmountInput}
              currency={currencies[Field.INPUT]}
              onUserInput={handleTypeInput}
              onMax={handleMaxInput}
              onHalf={handleHalfInput}
              onCurrencySelect={handleInputSelect}
              otherCurrency={currencies[Field.OUTPUT]}
              id="swap-currency-input"
            />
            <PriceInputPanel
              value={price}
              onUserInput={handleTypePrice}
              id="swap-currency-input"
              placeholder={marketPrice?.toSignificant(PRICE_PRECISION)}
            />
            <AutoColumn justify="space-between">
              <AutoRow justify={isExpertMode ? 'space-between' : 'center'} style={{ padding: '0 1rem' }}>
                <ArrowWrapper clickable>
                  <ArrowDown
                    size="16"
                    onClick={() => {
                      setApprovalSubmitted(false) // reset 2 step UI for approvals
                      onSwitchTokens()
                    }}
                    color={currencies[Field.INPUT] && currencies[Field.OUTPUT] ? theme.primary1 : theme.text2}
                  />
                </ArrowWrapper>
                {recipient === null && isExpertMode ? (
                  <LinkStyledButton id="add-recipient-button" onClick={() => onChangeRecipient('')}>
                    + Add a send (optional)
                  </LinkStyledButton>
                ) : null}
              </AutoRow>
            </AutoColumn>
            <CurrencyInputPanel
              value={formattedAmounts[Field.OUTPUT]}
              onUserInput={handleTypeOutput}
              label={
                independentField === Field.INPUT && trade ? `${t('to')}${isEstimate ? ' (estimated)' : ''}` : t('to')
              }
              showMaxButton={false}
              currency={currencies[Field.OUTPUT]}
              onCurrencySelect={handleOutputSelect}
              otherCurrency={currencies[Field.INPUT]}
              id="swap-currency-output"
            />

            {recipient !== null ? (
              <>
                <AutoRow justify="space-between" style={{ padding: '0 1rem' }}>
                  <ArrowWrapper clickable={false}>
                    <ArrowDown size="16" color={theme.text2} />
                  </ArrowWrapper>
                  <LinkStyledButton id="remove-recipient-button" onClick={() => onChangeRecipient(null)}>
                    - Remove send
                  </LinkStyledButton>
                </AutoRow>
                <AddressInputPanel id="recipient" value={recipient} onChange={onChangeRecipient} />
              </>
            ) : null}
            <Card padding={'0px'} borderRadius={'20px'}>
              <AutoColumn gap="8px" style={{ padding: '0 16px' }}>
                {Boolean(trade) && (
                  <>
                    <RowBetween align="center">
                      <Text fontWeight={500} fontSize={14} color={theme.text2}>
                        Price
                      </Text>
                      <TradePrice
                        price={trade?.executionPrice}
                        showInverted={showInverted}
                        setShowInverted={setShowInverted}
                      />
                    </RowBetween>
                    <RowBetween align="center">
                      <Text fontWeight={500} fontSize={14} color={theme.text2}>
                        Order Fee
                      </Text>
                      <Text fontWeight={500} fontSize={14} color={theme.text2}>
                        {orderFee?.toSignificant(2)} {orderFee?.currency.symbol}
                      </Text>
                    </RowBetween>
                  </>
                )}
                {allowedSlippage !== INITIAL_ALLOWED_SLIPPAGE && (
                  <RowBetween align="center">
                    <ClickableText fontWeight={500} fontSize={14} color={theme.text2} onClick={toggleSettings}>
                      Slippage Tolerance
                    </ClickableText>
                    <ClickableText fontWeight={500} fontSize={14} color={theme.text2} onClick={toggleSettings}>
                      {allowedSlippage / 100}%
                    </ClickableText>
                  </RowBetween>
                )}
              </AutoColumn>
            </Card>
          </AutoColumn>
          <BottomGrouping>
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
                    swapAsset: currencies.INPUT?.symbol,
                    hostApiKey: process.env.REACT_APP_RAMP_KEY,
                  }).show()
                }}
              >
                Get more {currencies.INPUT?.symbol} via Ramp
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
                    'Approve ' + currencies[Field.INPUT]?.symbol
                  )}
                </ButtonConfirmed>
                <ButtonPrimary
                  onClick={() => {
                    if (trade) {
                      const inputAmount = tryParseAmount(
                        parsedAmounts[Field.INPUT]?.toFixed(PRICE_PRECISION),
                        trade.inputAmount.currency
                      )
                      const outputAmount = tryParseAmount(
                        parsedAmounts[Field.OUTPUT]?.toFixed(PRICE_PRECISION),
                        trade.outputAmount.currency
                      )
                      if (inputAmount && outputAmount) {
                        setSwapState({
                          tradeToConfirm: new LimitOrderTrade(trade.route, inputAmount, outputAmount, trade.tradeType),
                          attemptingTxn: false,
                          swapErrorMessage: undefined,
                          showConfirm: true,
                          txHash: undefined,
                        })
                      }
                    }
                  }}
                  width="48%"
                  id="swap-button"
                  disabled={
                    !isValid ||
                    limitOrderApproval !== ApprovalState.APPROVED ||
                    orderBookApproval !== ApprovalState.APPROVED
                  }
                >
                  <Text fontSize={16} fontWeight={500}>
                    {t('placeOrder')}
                  </Text>
                </ButtonPrimary>
              </RowBetween>
            )}
            {showApproveFlow && (
              <Column style={{ marginTop: '1rem' }}>
                <ProgressSteps steps={[orderBookApproval === ApprovalState.APPROVED]} />
              </Column>
            )}
            {isExpertMode && swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null}
          </BottomGrouping>
        </Wrapper>
      </AppBody>
    </>
  )
}
