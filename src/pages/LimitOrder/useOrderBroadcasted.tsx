import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { ChainId } from '@ubeswap/sdk'
import { BigNumber } from 'ethers'
import { Erc20__factory, LimitOrderProtocol__factory, Multicall__factory, OrderBook__factory } from 'generated'
import React, { useEffect } from 'react'
import { multicallBatch } from 'utils/multicall'

import { LIMIT_ORDER_ADDRESS, MULTICALL_ADDRESS, ORDER_BOOK_ADDRESS } from '../../constants'

const CREATION_BLOCK = 9840049

interface DecodedOrderBookOrderWithSymbol {
  makerAsset: string
  takerAsset: string
  makerAssetSymbol: string
  takerAssetSymbol: string
  makingAmount: any
  takingAmount: any
}

export interface LimitOrdersHistory {
  orderHash: string
  isOrderOpen: boolean
  makerAssetSymbol: string
  takerAssetSymbol: string
  makingAmount: string
  takingAmount: string
  remainingOrderToFill: string | undefined
}

type OrderBookEvent = {
  maker: string
  orderHash: string
  order: {
    salt: BigNumber
    makerAsset: string
    takerAsset: string
    maker: string
    receiver: string
    allowedSender: string
    makingAmount: BigNumber
    takingAmount: BigNumber
    makerAssetData: string
    takerAssetData: string
    getMakerAmount: string
    getTakerAmount: string
    predicate: string
    permit: string
    interaction: string
  }
  signature: string
}

export const useOrderBroadcasted = () => {
  const { account, network } = useContractKit()
  const provider = useProvider()
  const chainId = network.chainId as unknown as ChainId
  const orderBookAddr = ORDER_BOOK_ADDRESS[chainId]

  // TODO: Refresh when order is placed. Maybe want react-query
  const [orderBroadcasts, setOrderBroadcasts] = React.useState<OrderBookEvent[]>([])
  // use the orderbook contract OrderBroadcasted Event to get order hash for the account
  const call = React.useCallback(async () => {
    if (!account) {
      return
    }
    const orderBook = OrderBook__factory.connect(orderBookAddr, provider)
    const orderBookEvents = await orderBook.queryFilter(
      orderBook.filters['OrderBroadcasted'](account),
      CREATION_BLOCK,
      'latest'
    )
    const orderBroadcasts = orderBookEvents.map((orderBookEvent) => {
      return orderBookEvent.args
    })
    setOrderBroadcasts(orderBroadcasts)
  }, [account, orderBookAddr, provider])

  useEffect(() => {
    call()
  }, [call])

  return orderBroadcasts
}

export const useLimitOrdersHistory = (): LimitOrdersHistory[] => {
  const orderEvents = useOrderBroadcasted()
  const provider = useProvider()
  const { network } = useContractKit()
  const chainId = network.chainId as unknown as ChainId
  const limitOrderAddr = LIMIT_ORDER_ADDRESS[chainId]
  const multicallAddr = MULTICALL_ADDRESS[chainId]

  const [limitOrderHistory, setLimitOrderHistory] = React.useState<LimitOrdersHistory[]>([])

  const call = React.useCallback(async () => {
    const multicall = Multicall__factory.connect(multicallAddr, provider)
    const limitOrderFactory = LimitOrderProtocol__factory.connect(limitOrderAddr, provider)

    // call orderbook factory to get maker and taker asset addresses and amounts
    const orderBookOrders = orderEvents.map((oe) => oe.order)

    const decodedOrderBookOrdersWithSymbol: DecodedOrderBookOrderWithSymbol[] = []
    for (let i = 0; i < orderBookOrders.length; i++) {
      const makerAssetContract = Erc20__factory.connect(orderBookOrders[i].makerAsset, provider)
      const makerAssetSymbol = await makerAssetContract.symbol()

      const takerAssetContract = Erc20__factory.connect(orderBookOrders[i].takerAsset, provider)
      const takerAssetSymbol = await takerAssetContract.symbol()

      decodedOrderBookOrdersWithSymbol.push({
        ...orderBookOrders[i],
        makerAssetSymbol,
        takerAssetSymbol,
      })
    }

    // get open or completed order status
    const orderRemaining = await multicallBatch(
      multicall,
      orderEvents.map(({ orderHash }) => {
        return {
          target: limitOrderAddr,
          callData: limitOrderFactory.interface.encodeFunctionData('remainingRaw', [orderHash]),
        }
      }, 1_000)
    )
    const decodedOrderRemaining = orderRemaining.map((orRemain) => {
      return limitOrderFactory.interface.decodeFunctionResult('remainingRaw', orRemain)[0].toNumber()
    })

    const limitOrdersForWallet = orderEvents.map(({ orderHash }, idx) => {
      const orderRemaining = decodedOrderRemaining[idx]
      const makingAmount = decodedOrderBookOrdersWithSymbol[idx].makingAmount
      const takingAmount = decodedOrderBookOrdersWithSymbol[idx].takingAmount
      const readableMakerAmount = (makingAmount / 1000000000000000000).toFixed(2).toString()
      const readableTakerAmount = (takingAmount / 1000000000000000000).toFixed(2).toString()
      const remainingOrderToFill =
        orderRemaining === 1 ? undefined : orderRemaining === 0 ? readableMakerAmount : (orderRemaining - 1).toString()

      return {
        orderHash,
        isOrderOpen: decodedOrderRemaining[idx] != 1,
        remainingOrderToFill,
        makingAmount: readableMakerAmount,
        takingAmount: readableTakerAmount,
        makerAssetSymbol: decodedOrderBookOrdersWithSymbol[idx].makerAssetSymbol,
        takerAssetSymbol: decodedOrderBookOrdersWithSymbol[idx].takerAssetSymbol,
      }
    })

    setLimitOrderHistory(limitOrdersForWallet)
  }, [multicallAddr, provider, limitOrderAddr, orderEvents])

  useEffect(() => {
    call()
  }, [call])

  return limitOrderHistory
}
