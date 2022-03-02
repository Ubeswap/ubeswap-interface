import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { ChainId } from '@ubeswap/sdk'
import { Erc20__factory, LimitOrderProtocol__factory, Multicall__factory, OrderBook__factory } from 'generated'
import React, { useEffect } from 'react'
import { multicallBatch } from 'utils/multicall'
import { AbiItem } from 'web3-utils'

import { LIMIT_ORDER_ADDRESS, ORDER_BOOK_ADDRESS } from '../../constants'
import orderBookAbi from '../../constants/abis/limit/OrderBook.json'

const CREATION_BLOCK = 9840049

export interface DecodedOrderBookOrderWithSymbol {
  makerAsset: any
  takerAsset: any
  makerAssetSymbol: any
  takerAssetSymbol: any
  makingAmount: string
  takingAmount: string
}

export const useOrderBroadcasted = () => {
  const { kit, account } = useContractKit()
  const [orderBroadcasts, setOrderBroadcasts] = React.useState<string[]>([])

  const call = React.useCallback(async () => {
    if (!account) {
      return
    }
    console.log('in useOrderBroadcasted')
    console.log(account)
    const orderBook = new kit.web3.eth.Contract(orderBookAbi as AbiItem[], '0x0560FE2659c8c63933e97283D8c648abDb72de51')
    const lastBlock = await kit.web3.eth.getBlockNumber()
    const orderBookEvents = await orderBook.getPastEvents('OrderBroadcasted', {
      fromBlock: CREATION_BLOCK,
      toBlock: lastBlock,
      filter: {
        maker: account,
      },
    })
    const orderHashes: string[] = orderBookEvents.map((orderBookEvent) => {
      return orderBookEvent.returnValues.orderHash as string
    })
    console.log(orderHashes)
    setOrderBroadcasts(orderHashes)
  }, [kit.web3.eth, account])

  useEffect(() => {
    call()
  }, [call])

  return orderBroadcasts
}

export const useLimitOrdersHistory = () => {
  const orderHashForWallet = useOrderBroadcasted()
  const provider = useProvider()
  const { network } = useContractKit()
  const chainId = network.chainId as unknown as ChainId
  const limitOrderAddr = LIMIT_ORDER_ADDRESS[chainId]
  const orderBookAddr = ORDER_BOOK_ADDRESS[chainId]

  const [limitOrderHistory, setLimitOrderHistory] = React.useState<any[]>([])

  const call = React.useCallback(async () => {
    console.log(`orderHashForWallet ${orderHashForWallet}`)
    const multicall = Multicall__factory.connect('0x387ce7960b5DA5381De08Ea4967b13a7c8cAB3f6', provider)
    const limitOrderFactory = LimitOrderProtocol__factory.connect(limitOrderAddr, provider)

    const orderBookFactory = OrderBook__factory.connect(orderBookAddr, provider)

    // call orderbook factory to get maker and taker asset addresses and amounts
    const orderBookOrders = await multicallBatch(
      multicall,
      orderHashForWallet.map((orHash) => {
        return {
          target: orderBookAddr,
          callData: orderBookFactory.interface.encodeFunctionData('orders', [orHash]),
        }
      }, 1_000)
    )
    const decodedOrderBookOrders = orderBookOrders.map((obo) => {
      const decodedObo = orderBookFactory.interface.decodeFunctionResult('orders', obo)[0]
      return {
        makerAsset: decodedObo[1],
        takerAsset: decodedObo[2],
        makingAmount: (decodedObo[6] / 1000000000000000000).toFixed(2).toString(),
        takingAmount: (decodedObo[7] / 1000000000000000000).toFixed(2).toString(),
      }
    })

    const decodedOrderBookOrdersWithSymbol: DecodedOrderBookOrderWithSymbol[] = []
    for (let i = 0; i < decodedOrderBookOrders.length; i++) {
      const makerAssetContract = Erc20__factory.connect(decodedOrderBookOrders[i].makerAsset, provider)
      const makerAssetSymbol = await makerAssetContract.symbol()
      console.log(makerAssetSymbol)

      const takerAssetContract = Erc20__factory.connect(decodedOrderBookOrders[i].takerAsset, provider)
      const takerAssetSymbol = await takerAssetContract.symbol()
      console.log(takerAssetSymbol)

      decodedOrderBookOrdersWithSymbol.push({
        ...decodedOrderBookOrders[i],
        makerAssetSymbol,
        takerAssetSymbol,
      })
    }

    // get open or completed order status
    const orderRemaining = await multicallBatch(
      multicall,
      orderHashForWallet.map((orHash) => {
        return {
          target: limitOrderAddr,
          callData: limitOrderFactory.interface.encodeFunctionData('remainingRaw', [orHash]),
        }
      }, 1_000)
    )
    const decodedOrderRemaining = orderRemaining.map((orRemain) => {
      return limitOrderFactory.interface.decodeFunctionResult('remainingRaw', orRemain)[0].toNumber()
    })

    const limitOrdersForWallet = orderHashForWallet.map((orderHash, idx) => ({
      orderHash,
      isOrderOpen: decodedOrderRemaining[idx] === 0,
      ...decodedOrderBookOrdersWithSymbol[idx],
    }))
    console.log('orderRemainingDECODED')
    console.log(limitOrdersForWallet)
    setLimitOrderHistory(limitOrdersForWallet)
  }, [orderHashForWallet, provider, limitOrderAddr])

  useEffect(() => {
    call()
  }, [call])

  return limitOrderHistory
}
