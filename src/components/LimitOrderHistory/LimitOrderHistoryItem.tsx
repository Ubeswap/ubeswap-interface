import React, { useCallback } from 'react'
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
  makerAssetSymbol: string
  takerAssetSymbol: string
  makingAmount: string
  takingAmount: string
  orderHash: string
  remainingOrderToFill: string
  isOrderOpen: boolean
}

export default function LimitOrderHistoryItem({
  makerAssetSymbol,
  takerAssetSymbol,
  makingAmount,
  takingAmount,
  orderHash,
  remainingOrderToFill,
  isOrderOpen,
}: LimitOrderHistoryItemProps) {
  const { callback: cancelOrderCallback } = useCancelOrderCallback(orderHash)
  const theme = useTheme()

  const handleCancelOrder = useCallback(() => {
    if (!cancelOrderCallback) {
      return
    }
    cancelOrderCallback()
  }, [cancelOrderCallback, orderHash])

  return (
    <Container>
      <AssetRow>
        <AssetSymbol>{makerAssetSymbol}</AssetSymbol>
        <TYPE.body
          color={theme.text2}
          style={{ display: 'inline', marginLeft: '10px', marginRight: '10px', paddingBottom: '0.5rem' }}
        >
          &#10140;
        </TYPE.body>
        <AssetSymbol>{takerAssetSymbol}</AssetSymbol>
        {isOrderOpen && <StyledControlButton onClick={handleCancelOrder}>Cancel</StyledControlButton>}
      </AssetRow>
      <SellText>
        Sell {makingAmount} {makerAssetSymbol} for {takingAmount} {takerAssetSymbol}
      </SellText>
      {remainingOrderToFill ? (
        <OrderToFill>
          Remaining Order to Fill: {remainingOrderToFill} {makerAssetSymbol}
        </OrderToFill>
      ) : (
        <></>
      )}
    </Container>
  )
}
