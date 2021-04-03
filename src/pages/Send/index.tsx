import { TokenAmount } from '@ubeswap/sdk'
import SendHeader from 'components/send/SendHeader'
import { ERC20_ABI } from 'constants/abis/erc20'
import useENS from 'hooks/useENS'
import React, { useCallback } from 'react'
import { Text } from 'rebass'
import { getContract } from 'utils'
import AddressInputPanel from '../../components/AddressInputPanel'
import { ButtonLight, ButtonPrimary } from '../../components/Button'
import { AutoColumn } from '../../components/Column'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import { SwapPoolTabs } from '../../components/NavigationTabs'
import { BottomGrouping, Wrapper } from '../../components/swap/styleds'
import { useActiveWeb3React } from '../../hooks'
import { useWalletModalToggle } from '../../state/application/hooks'
import { Field } from '../../state/swap/actions'
import { useDerivedSwapInfo, useSwapActionHandlers, useSwapState } from '../../state/swap/hooks'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import AppBody from '../AppBody'

export default function Send() {
  // dismiss warning if all imported tokens are in active lists
  const { account, library } = useActiveWeb3React()

  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle()

  // swap state
  const { typedValue, recipient } = useSwapState()
  const { address: recipientAddress } = useENS(recipient)
  const { currencyBalances, parsedAmount, currencies } = useDerivedSwapInfo()

  const isValid = recipientAddress && parsedAmount && account
  const handleSend = useCallback(async () => {
    if (!isValid || !parsedAmount || !library || !account) {
      return
    }
    const token = getContract(parsedAmount.token.address, ERC20_ABI, library, account)
    await token.transfer(recipientAddress, parsedAmount.raw.toString())
  }, [isValid, library, parsedAmount, recipientAddress, account])

  const { onCurrencySelection, onUserInput, onChangeRecipient } = useSwapActionHandlers()

  const handleTypeInput = useCallback(
    (value: string) => {
      onUserInput(Field.INPUT, value)
    },
    [onUserInput]
  )

  const maxAmountInput: TokenAmount | undefined = maxAmountSpend(currencyBalances[Field.INPUT])
  const atMaxAmountInput = Boolean(maxAmountInput && parsedAmount?.equalTo(maxAmountInput))

  const handleInputSelect = useCallback(
    inputCurrency => {
      onCurrencySelection(Field.INPUT, inputCurrency)
    },
    [onCurrencySelection]
  )

  const handleMaxInput = useCallback(() => {
    maxAmountInput && onUserInput(Field.INPUT, maxAmountInput.toExact())
  }, [maxAmountInput, onUserInput])

  return (
    <>
      <SwapPoolTabs active={'swap'} />
      <AppBody>
        <SendHeader />
        <Wrapper id="send-page">
          <AutoColumn gap={'md'}>
            <CurrencyInputPanel
              label="Amount"
              value={typedValue}
              showMaxButton={!atMaxAmountInput}
              currency={currencies[Field.INPUT]}
              onUserInput={handleTypeInput}
              onMax={handleMaxInput}
              onCurrencySelect={handleInputSelect}
              id="send-currency-input"
            />
            <AddressInputPanel id="recipient" value={recipient ?? ''} onChange={onChangeRecipient} />
          </AutoColumn>
          <BottomGrouping>
            {!account ? (
              <ButtonLight onClick={toggleWalletModal}>Connect Wallet</ButtonLight>
            ) : (
              <ButtonPrimary
                onClick={() => {
                  handleSend()
                }}
                id="send-button"
                disabled={!isValid}
              >
                <Text fontSize={20} fontWeight={500}>
                  Send
                </Text>
              </ButtonPrimary>
            )}
          </BottomGrouping>
        </Wrapper>
      </AppBody>
    </>
  )
}
