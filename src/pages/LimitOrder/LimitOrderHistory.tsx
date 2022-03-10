import { TabButton } from 'components/Button'
import LimitOrderHistoryBody from 'components/LimitOrderHistory/LimitOrderHistoryBody'
import LimitOrderHistoryItem from 'components/LimitOrderHistory/LimitOrderHistoryItem'
import { Wrapper } from 'components/swap/styleds'
import React, { useState } from 'react'

import { useLimitOrdersHistory, useLimitOrderSubsidy } from './useOrderBroadcasted'

export const LimitOrderHistory: React.FC = () => {
  const limitOrderHistory = useLimitOrdersHistory()

  const [openOrdersTabActive, setOpenOrdersTabActive] = useState<boolean>(true)

  useLimitOrderSubsidy(limitOrderHistory.map((orderHistory) => orderHistory.makerAsset))

  return (
    <LimitOrderHistoryBody>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <TabButton active={openOrdersTabActive} onClick={() => setOpenOrdersTabActive(true)}>
          Open ({limitOrderHistory.filter((limitOrderHist) => limitOrderHist.isOrderOpen).length})
        </TabButton>
        <TabButton active={!openOrdersTabActive} onClick={() => setOpenOrdersTabActive(false)}>
          Completed ({limitOrderHistory.filter((limitOrderHist) => !limitOrderHist.isOrderOpen).length})
        </TabButton>
      </div>

      <Wrapper id="limit-order-history">
        {limitOrderHistory
          .filter((limitOrderHist) => {
            if (openOrdersTabActive) {
              return limitOrderHist.isOrderOpen
            }
            return !limitOrderHist.isOrderOpen
          })
          .reverse()
          .map((limitOrderHist) => {
            return <LimitOrderHistoryItem key={limitOrderHist.orderHash} item={limitOrderHist} />
          })}
      </Wrapper>
    </LimitOrderHistoryBody>
  )
}
