import { TokenAmount } from '@ubeswap/sdk'
import { BigNumber } from 'ethers'
import { useToken } from 'hooks/Tokens'
import { BPS_DENOMINATOR, LIMIT_ORDER_FEE_BPS } from 'pages/LimitOrder'
import React from 'react'
import styled from 'styled-components'

import useTheme from '../../hooks/useTheme'
import { useCancelOrderCallback } from '../../pages/LimitOrder/useCancelOrderCallback'
import { TYPE } from '../../theme'
import { RowFlat } from '../Row'

const Container = styled.div`
  background-color: ${({ theme }) => theme.bg1};
  margin-bottom: 2rem;
  padding-left: 0.5rem;
`
const AssetSymbol = styled.div`
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.primary5};
  padding: 0.5rem;
`

const AssetRow = styled(RowFlat)`
  margin-bottom: 0.5rem;
`
const SellText = styled.div`
  font-weight: 700;
  margin-top: 0.25rem;
`

const OrderToFill = styled.div`
  font-weight: 300;
  font-size: 14px;
  margin-top: 0.25rem;
`

const StyledControlButton = styled.button`
  height: 24px;
  background-color: ${({ theme }) => theme.red1};
  border: 1px solid ${({ theme }) => theme.red3};
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  margin-left: auto;
  margin-right: 2rem;
  color: ${({ theme }) => theme.primaryText1};
  :hover {
    border: 1px solid ${({ theme }) => theme.primary1};
  }
  :focus {
    border: 1px solid ${({ theme }) => theme.primary1};
    outline: none;
  }

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    margin-left: 0.4rem;
    margin-right: 0.1rem;
  `};
`

interface LimitOrderHistoryItemProps {
  item: {
    orderHash: string
    makingAmount: BigNumber
    takingAmount: BigNumber
    makerAsset: string
    takerAsset: string
    remaining: BigNumber
    isOrderOpen: boolean
  }
}

export default function LimitOrderHistoryItem({ item }: LimitOrderHistoryItemProps) {
  const { callback: cancelOrder } = useCancelOrderCallback(item.orderHash)
  const theme = useTheme()
  const makerToken = useToken(item.makerAsset)
  const takerToken = useToken(item.takerAsset)

  if (!makerToken || !takerToken) {
    return null
  }

  const makingAmount = new TokenAmount(makerToken, item.makingAmount.toString())
  const takingAmount = new TokenAmount(takerToken, item.takingAmount.toString())
  const remaining = new TokenAmount(makerToken, item.remaining.toString())

  return (
    <Container>
      <AssetRow>
        <AssetSymbol>{makerToken.symbol}</AssetSymbol>
        <TYPE.body
          color={theme.text2}
          style={{ display: 'inline', marginLeft: '10px', marginRight: '10px', paddingBottom: '0.5rem' }}
        >
          &#10140;
        </TYPE.body>
        <AssetSymbol>{takerToken.symbol}</AssetSymbol>
        {item.isOrderOpen && (
          <StyledControlButton onClick={() => cancelOrder && cancelOrder()}>Cancel</StyledControlButton>
        )}
      </AssetRow>
      <SellText>
        {makingAmount.toSignificant(4)} {makerToken.symbol} for {takingAmount.toSignificant(4)} {takerToken.symbol}
      </SellText>
      <OrderToFill>
        Remaining Order to Fill: {remaining.toSignificant(4)} {makerToken.symbol}
      </OrderToFill>
      <OrderToFill>
        Order Placement Fee:{' '}
        {makingAmount.multiply(LIMIT_ORDER_FEE_BPS.toString()).divide(BPS_DENOMINATOR.toString()).toSignificant(4)}{' '}
        {makerToken.symbol}
      </OrderToFill>
    </Container>
  )
}
