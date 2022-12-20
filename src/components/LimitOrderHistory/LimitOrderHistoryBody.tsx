import React from 'react'

import LimitOrderHistoryItem, { HistoryItem } from './LimitOrderHistoryItem'

export default function LimitOrderHistoryBody({ historyData }: { historyData: HistoryItem[] }) {
  return (
    <tbody>
      {historyData.map((data) => {
        return <LimitOrderHistoryItem key={data.orderHash} item={data} />
      })}
    </tbody>
  )
}
