import { useContractKit } from '@celo-tools/use-contractkit'
import React, { useEffect } from 'react'
import { AbiItem } from 'web3-utils'

import orderBookAbi from '../../constants/abis/limit/OrderBook.json'

export const useOrderBroadcasted = () => {
  const { kit } = useContractKit()
  const [orderBroadcasts, setOrderBroadcasts] = React.useState<any[]>([])

  const call = React.useCallback(async () => {
    console.log('in useOrderBroadcasted')
    const orderBook = new kit.web3.eth.Contract(orderBookAbi as AbiItem[], '0xDA84179917d8C482b407295793D28FA38086338c')

    const orderBookEvents = await orderBook.getPastEvents('OrderBroadcasted', {})
    console.log(orderBookEvents)
    setOrderBroadcasts(orderBookEvents)
  }, [kit.web3.eth])

  useEffect(() => {
    call()
  }, [call])

  return orderBroadcasts
}
