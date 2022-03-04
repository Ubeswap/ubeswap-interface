import LimitOrderHistoryBody from 'components/LimitOrderHistory/LimitOrderHistoryBody'
import { LimitOrderHistoryButton } from 'components/LimitOrderHistory/LimitOrderHistoryButton'
import LimitOrderHistoryItem from 'components/LimitOrderHistory/LimitOrderHistoryItem'
import { Wrapper } from 'components/swap/styleds'
import React, { useCallback, useState } from 'react'

import { LimitOrdersHistory, useLimitOrdersHistory } from './useOrderBroadcasted'

export const LimitOrderHistory: React.FC = () => {
  const [limitOrderHistoryDisplay, setLimitOrderHistoryDisplay] = useState<Array<LimitOrdersHistory>>([])
  const limitOrderHistory = useLimitOrdersHistory()

  const [openOrdersTabActive, setOpenOrdersTabActive] = useState<boolean>(true)
  const [completedOrdersTabActive, setCompletedOrdersTabActive] = useState<boolean>(false)

  const showOpenOrders = useCallback(() => {
    setLimitOrderHistoryDisplay(limitOrderHistory.filter((orderHistory) => orderHistory.isOrderOpen))
    setOpenOrdersTabActive(true)
    setCompletedOrdersTabActive(false)
  }, [limitOrderHistory])

  const showCompleteOrders = useCallback(() => {
    setLimitOrderHistoryDisplay(limitOrderHistory.filter((orderHistory) => !orderHistory.isOrderOpen))
    setCompletedOrdersTabActive(true)
    setOpenOrdersTabActive(false)
  }, [limitOrderHistory])

  return (
    <LimitOrderHistoryBody>
      <div style={{ display: 'inline-block', textAlign: 'center', width: '-webkit-fill-available', padding: '1rem' }}>
        <LimitOrderHistoryButton active={openOrdersTabActive} onClick={showOpenOrders}>
          Open
        </LimitOrderHistoryButton>
        <LimitOrderHistoryButton active={completedOrdersTabActive} onClick={showCompleteOrders}>
          Completed
        </LimitOrderHistoryButton>
      </div>

      <Wrapper id="limit-order-history">
        {limitOrderHistoryDisplay.map((limitOrderHist) => {
          return (
            <LimitOrderHistoryItem
              key={limitOrderHist.orderHash}
              orderHash={limitOrderHist.orderHash}
              makerAssetSymbol={limitOrderHist.makerAssetSymbol}
              takerAssetSymbol={limitOrderHist.takerAssetSymbol}
              makingAmount={limitOrderHist.makingAmount}
              takingAmount={limitOrderHist.takingAmount}
              remainingOrderToFill={limitOrderHist.remainingOrderToFill}
              isOrderOpen={limitOrderHist.isOrderOpen}
            />
          )
        })}
      </Wrapper>
    </LimitOrderHistoryBody>
  )
}
