import { useCelo, useConnectedSigner, useProvider } from '@celo/react-celo'
import { AddressZero } from '@ethersproject/constants'
import { JsonRpcSigner } from '@ethersproject/providers'
import { formatEther } from '@ethersproject/units'
import { CELO, ChainId as UbeswapChainId, Token, TokenAmount } from '@ubeswap/sdk'
import { useDoTransaction } from 'components/swap/routing'
import { BigNumber } from 'ethers'
import { useUbeConvertContract } from 'hooks/useContract'
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ArrowDown } from 'react-feather'
import { useTranslation } from 'react-i18next'
import { Text } from 'rebass'
import { useSingleCallResult } from 'state/multicall/hooks'
import { useHasPendingTransaction, useIsTransactionPending } from 'state/transactions/hooks'
import { useCurrencyBalance } from 'state/wallet/hooks'
import styled, { ThemeContext } from 'styled-components'

import { ButtonConfirmed, ButtonError, ButtonLight } from '../../components/Button'
import Card from '../../components/Card'
import Column, { AutoColumn } from '../../components/Column'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import { CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import Loader from '../../components/Loader'
import { SwapPoolTabs } from '../../components/NavigationTabs'
import ProgressSteps from '../../components/ProgressSteps'
import { AutoRow, RowBetween } from '../../components/Row'
import { ArrowWrapper, BottomGrouping, SwapCallbackError, Wrapper } from '../../components/swap/styleds'
import SwapHeader from '../../components/swap/SwapHeader'
import { useToken } from '../../hooks/Tokens'
import { ApprovalState, useApproveCallback } from '../../hooks/useApproveCallback'
import { useWalletModalToggle } from '../../state/application/hooks'
import { tryParseAmount } from '../../state/swap/hooks'
import { TYPE } from '../../theme'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import AppBody from '../AppBody'

enum Field {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
}

const VoteCard = styled(DataCard)`
  background: radial-gradient(76.02% 75.41% at 1.84% 0%, #8878c3 0%, #222 100%);
  overflow: hidden;
  max-width: 640px;
  width: 100%;
  margin-bottom: 20px;
`

const CONVERT_CONTRACT_ADDRESS = '0x1854c78e5401A501A8F32f3a9DFae3d356Fb9A9E'

export function useConvertCallback(): [
  boolean,
  (amountToConvert: TokenAmount, maxOldUbeAmount: string, signature: string) => Promise<void>
] {
  const { address: account } = useCelo()
  const signer = useConnectedSigner() as JsonRpcSigner
  const provider = useProvider()

  const hasPendingTx = useHasPendingTransaction()
  const [isPending, setIsPending] = useState(false)
  const [hash, setHash] = useState<string | undefined>()
  const isTxPending = useIsTransactionPending(hash)

  const contractDisconnected = useUbeConvertContract(CONVERT_CONTRACT_ADDRESS)
  const doTransaction = useDoTransaction()

  const approve = useCallback(
    async (amountToConvert: TokenAmount, maxOldUbeAmount: string, signature: string): Promise<void> => {
      if (!account || !provider) {
        console.error('no account or provider')
        return
      }
      if (hasPendingTx) {
        console.error('already pending transaction')
        return
      }
      if (isPending) {
        console.error('already pending')
        return
      }

      if (!contractDisconnected) {
        console.error('contract is null')
        return
      }

      if (!amountToConvert) {
        console.error('amountToConvert is null')
        return
      }

      // connect
      const convertContract = contractDisconnected.connect(signer)

      setIsPending(true)
      try {
        const response = await doTransaction(convertContract, 'convert', {
          args: [amountToConvert.raw.toString(), maxOldUbeAmount, signature],
          summary: `Convert to new PACT`,
        })
        setHash(response.hash)
        await provider.waitForTransaction(response.hash, 2)
      } catch (e) {
        console.error(e)
        setHash(undefined)
      } finally {
        setIsPending(false)
      }
    },
    [isPending, contractDisconnected, signer, doTransaction, hasPendingTx, account, provider]
  )

  return [isPending || isTxPending, approve]
}

export default function ClaimNewPactToken() {
  const { t } = useTranslation()

  const { address: account, network } = useCelo()
  const chainId = network.chainId as unknown as UbeswapChainId

  const theme = useContext(ThemeContext)

  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle()

  const [typedValue, setTypedValue] = useState('')

  const inputCurrency = useToken('0x46c9757C5497c5B1f2eb73aE79b6B67D119B0B58')
  const outputCurrency = useToken('0x2b9018CeB303D540BbF08De8e7De64fDDD63396C')
  const currencies: { [field in Field]: Token | null | undefined } = useMemo(() => {
    return {
      [Field.INPUT]: inputCurrency,
      [Field.OUTPUT]: outputCurrency,
    }
  }, [inputCurrency, outputCurrency])

  const inputBalance = useCurrencyBalance(account ?? undefined, inputCurrency ?? undefined)

  const [whitelist, setWhitelist] = useState<{
    [key: string]: { amount: string; signature: string }
  } | null>(null)
  const [whitelistLoading, setWhitelistLoading] = useState(true)
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/Ubeswap/static/main/pact-whitelist.json')
      .then((response) => response.json())
      .then((data) => {
        setWhitelistLoading(false)
        setWhitelist(data)
      })
      .catch((error) => {
        console.error(error)
        setWhitelistLoading(false)
      })
  }, [])
  const maxAllowed = useMemo(() => {
    if (!whitelistLoading && whitelist && account) {
      const data = whitelist[account?.toLocaleLowerCase() || '']
      if (data) {
        return BigNumber.from(data.amount)
      }
    }
    return BigNumber.from(0)
  }, [whitelistLoading, whitelist, account])
  const maxAllowedText = Number(formatEther(maxAllowed)).toFixed(1).replace(/\.0+$/, '')

  const parsedAmount = useMemo(() => {
    return tryParseAmount(typedValue, inputCurrency ?? undefined)
  }, [typedValue, inputCurrency])
  const outputAmount = parsedAmount
  const outputAmountText = outputAmount?.toSignificant(6) ?? ''

  const convertContract = useUbeConvertContract(CONVERT_CONTRACT_ADDRESS)
  const convertedAmount = useSingleCallResult(convertContract, 'accountToConvertedAmount', [account ?? AddressZero])
  console.log('convertedAmount', convertedAmount)
  const convertedAmountText = convertedAmount.result?.length
    ? Number(formatEther(convertedAmount.result?.[0])).toFixed(1).replace(/\.0+$/, '')
    : 'loading...'

  // the callback to execute the swap
  const [isConvertPending, convertCallback] = useConvertCallback()

  const swapInputError: string | undefined = useMemo(() => {
    if (!account) {
      return 'Connect Wallet'
    }
    if (whitelistLoading) {
      return 'Loading...'
    }
    if (whitelist && whitelist[account.toLocaleLowerCase()] == null) {
      return 'Account is not whitelisted'
    }
    if (isConvertPending) {
      return 'Pending...'
    }
    if (!parsedAmount) {
      return 'Enter an amount'
    }
    if (!currencies[Field.INPUT] || !currencies[Field.OUTPUT]) {
      return 'Select a token'
    }
    if (inputBalance && parsedAmount && inputBalance.lessThan(parsedAmount)) {
      return 'Insufficient old-PACT balance'
    }

    if (whitelist) {
      const data = whitelist[account?.toLocaleLowerCase() || '']
      if (data && convertedAmount.loading == false && convertedAmount.result?.length) {
        if (BigNumber.from(data.amount).sub(convertedAmount.result[0]).lt(parsedAmount.raw.toString())) {
          return 'Exceeds allowed amount'
        }
      }
    }

    return undefined
  }, [account, parsedAmount, currencies, inputBalance, whitelistLoading, whitelist, isConvertPending, convertedAmount])

  const isValid = !swapInputError

  const handleTypeInput = useCallback((value: string) => {
    setTypedValue(value)
  }, [])
  const handleTypeOutput = useCallback((value: string) => {
    console.error('handleTypeOutput can not change')
  }, [])

  // Approval process
  const [approval, approveCallback] = useApproveCallback(parsedAmount, CONVERT_CONTRACT_ADDRESS)
  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)
  useEffect(() => {
    if (approval === ApprovalState.PENDING) {
      setApprovalSubmitted(true)
    }
  }, [approval, approvalSubmitted])
  const handleApprove = useCallback(() => {
    if (!approveCallback) {
      return
    }
    approveCallback()
      .then(() => {
        //
      })
      .catch((error) => {
        console.error(error)
      })
  }, [approveCallback])

  const maxAmountInput: TokenAmount | undefined = maxAmountSpend(inputBalance)
  const atMaxAmountInput = Boolean(maxAmountInput && parsedAmount?.equalTo(maxAmountInput))
  const atHalfAmountInput = Boolean(
    maxAmountInput && Number(maxAmountInput.toExact()) * 0.5 === Number(parsedAmount?.toExact())
  )

  const swapCallbackError = ''
  const swapErrorMessage = ''

  const handleSwap = useCallback(() => {
    console.log('000')
    if (!convertCallback || !whitelist || !parsedAmount) {
      console.log('111')
      console.log(convertCallback)
      console.log(whitelist)
      console.log(parsedAmount)
      return
    }
    const data = whitelist[account?.toLocaleLowerCase() || '']
    if (!data) {
      console.log('222')
      console.log(account)
      return
    }
    console.log('333')
    convertCallback(parsedAmount, data.amount, data.signature)
      .then(() => {
        console.log('444')
        setTypedValue('')
        setApprovalSubmitted(false)
      })
      .catch((error) => {
        console.log('xxx')
        console.error(error)
      })
  }, [convertCallback, account, parsedAmount, whitelist])

  // show approve flow when: no error on inputs, not approved or pending, or approved in current session
  // never show if price impact is above threshold in non expert mode
  const showApproveFlow =
    !swapInputError &&
    (approval === ApprovalState.NOT_APPROVED ||
      approval === ApprovalState.PENDING ||
      (approvalSubmitted && approval === ApprovalState.APPROVED))

  const handleMaxInput = useCallback(() => {
    if (maxAmountInput) {
      if (currencies?.INPUT?.address === CELO[chainId].address) {
        handleTypeInput(Math.max(Number(maxAmountInput.toExact()) - 0.01, 0).toString())
      } else {
        handleTypeInput(maxAmountInput.toExact())
      }
    }
  }, [maxAmountInput, handleTypeInput, currencies, chainId])

  const handleHalfInput = useCallback(() => {
    if (maxAmountInput) {
      handleTypeInput(Math.max(Number(maxAmountInput.toExact()) * 0.5, 0).toString())
    }
  }, [maxAmountInput, handleTypeInput])

  return (
    <>
      <SwapPoolTabs active={'swap'} />
      <VoteCard>
        <CardNoise />
        <CardSection>
          <AutoColumn gap="md">
            <RowBetween>
              <TYPE.white fontWeight={600}>PACT New Tokenomics</TYPE.white>
            </RowBetween>
            <RowBetween>
              <TYPE.white fontSize={14}>ImpactMarket has migrated to new token economics.</TYPE.white>
            </RowBetween>
            <RowBetween>
              <TYPE.white fontSize={14}>Tokens will be swapped, 1:1 ratio.</TYPE.white>
            </RowBetween>
          </AutoColumn>
        </CardSection>
        <CardNoise />
      </VoteCard>
      <AppBody>
        <SwapHeader title={'Convert to new PACT'} hideSettings={true} />
        <Wrapper id="swap-page">
          <AutoColumn gap={'md'}>
            <CurrencyInputPanel
              label={t('from')}
              value={typedValue}
              showMaxButton={!atMaxAmountInput}
              showHalfButton={!atHalfAmountInput}
              currency={currencies[Field.INPUT]}
              onUserInput={handleTypeInput}
              onMax={handleMaxInput}
              onHalf={handleHalfInput}
              otherCurrency={currencies[Field.OUTPUT]}
              disableCurrencySelect={true}
              id="swap-ube-input"
            />

            <AutoColumn justify="space-between">
              <AutoRow justify={'center'} style={{ padding: '0 1rem' }}>
                <ArrowWrapper clickable={false}>
                  <ArrowDown size="16" color={theme.primary1} />
                </ArrowWrapper>
              </AutoRow>
            </AutoColumn>

            <CurrencyInputPanel
              value={outputAmountText}
              onUserInput={handleTypeOutput}
              label={t('to')}
              showMaxButton={false}
              currency={currencies[Field.OUTPUT]}
              otherCurrency={currencies[Field.INPUT]}
              disableCurrencySelect={true}
              id="swap-ube-output"
              disabled
            />

            <Card padding={'0px'} borderRadius={'20px'}>
              <AutoColumn gap="8px" style={{ padding: '0 16px' }}>
                <RowBetween align="center">
                  <Text fontWeight={800} fontSize={14} color={theme.text1}>
                    Converted / Max:
                  </Text>
                  <Text fontWeight={800} fontSize={14} color={theme.text1}>
                    {convertedAmountText} / {maxAllowedText}
                  </Text>
                </RowBetween>
              </AutoColumn>
            </Card>
          </AutoColumn>
          <BottomGrouping>
            {!account ? (
              <ButtonLight onClick={toggleWalletModal}>{t('connectWallet')}</ButtonLight>
            ) : showApproveFlow ? (
              <RowBetween>
                <ButtonConfirmed
                  onClick={handleApprove}
                  disabled={approval !== ApprovalState.NOT_APPROVED || approvalSubmitted}
                  width="48%"
                  altDisabledStyle={approval === ApprovalState.PENDING} // show solid button while waiting
                  confirmed={approval === ApprovalState.APPROVED}
                >
                  {approval === ApprovalState.PENDING ? (
                    <AutoRow gap="6px" justify="center">
                      Approving <Loader stroke="white" />
                    </AutoRow>
                  ) : approvalSubmitted && approval === ApprovalState.APPROVED ? (
                    'Approved'
                  ) : (
                    'Approve ' + currencies[Field.INPUT]?.symbol
                  )}
                </ButtonConfirmed>
                <ButtonError
                  onClick={handleSwap}
                  width="48%"
                  id="swap-button"
                  disabled={!isValid || approval !== ApprovalState.APPROVED}
                  error={isValid && !!swapCallbackError}
                >
                  <Text fontSize={16} fontWeight={500}>
                    {swapInputError ? swapInputError : 'Convert'}
                  </Text>
                </ButtonError>
              </RowBetween>
            ) : (
              <ButtonError
                onClick={handleSwap}
                id="swap-button"
                disabled={!isValid || !!swapCallbackError}
                error={isValid && !!swapCallbackError}
              >
                <Text fontSize={20} fontWeight={500}>
                  {swapInputError ? swapInputError : 'Convert'}
                </Text>
              </ButtonError>
            )}
            {showApproveFlow && (
              <Column style={{ marginTop: '1rem' }}>
                <ProgressSteps steps={[approval === ApprovalState.APPROVED]} />
              </Column>
            )}
            {swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null}
          </BottomGrouping>
        </Wrapper>
      </AppBody>
    </>
  )
}
