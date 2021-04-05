import { TradeType } from '@ubeswap/sdk'
import { ErrorText } from 'components/swap/styleds'
import React, { useContext } from 'react'
import { ThemeContext } from 'styled-components'
import { TYPE } from '../../../../theme'
import QuestionHelper from '../../../QuestionHelper'
import { RowBetween, RowFixed } from '../../../Row'
import { MoolaTrade } from '../moola/MoolaTrade'

interface Props {
  trade: MoolaTrade
}

export const MoolaTradeDetails: React.FC<Props> = ({ trade }: Props) => {
  const theme = useContext(ThemeContext)
  return (
    <>
      <RowBetween>
        <RowFixed>
          <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
            {trade.outputAmount.currency.symbol} received
          </TYPE.black>
          <QuestionHelper
            text={`Since this trade is routed through Moola, you are guaranteed to receive 1 ${trade.outputAmount.currency.symbol} per ${trade.inputAmount.currency.symbol}.`}
          />
        </RowFixed>
        <RowFixed>
          <TYPE.black fontSize={14}>{trade.outputAmount.toSignificant(4)}</TYPE.black>
          <TYPE.black fontSize={14} marginLeft={'4px'}>
            {trade.tradeType === TradeType.EXACT_INPUT
              ? trade.outputAmount.currency.symbol
              : trade.inputAmount.currency.symbol}
          </TYPE.black>
        </RowFixed>
      </RowBetween>
      <RowBetween>
        <RowFixed>
          <TYPE.black color={theme.text2} fontSize={14} fontWeight={400}>
            Price Impact
          </TYPE.black>
          <QuestionHelper text="Since this trade is routed through Moola, there is zero price slippage." />
        </RowFixed>
        <ErrorText fontWeight={500} fontSize={14} severity={0}>
          0.00%
        </ErrorText>
      </RowBetween>
    </>
  )
}
