import { CancelLimitOrderExecutor } from 'components/swap/routing'
import { ContractTransaction } from 'ethers'
import { LimitOrderProtocol__factory, OrderBook__factory } from 'generated'

import { LIMIT_ORDER_ADDRESS, ORDER_BOOK_ADDRESS } from '../../constants'

export const executeCancelOrder: CancelLimitOrderExecutor = async ({ signer, chainId, orderHash, doTransaction }) => {
  const orderBookAddr = ORDER_BOOK_ADDRESS[chainId]
  const limitOrderAddr = LIMIT_ORDER_ADDRESS[chainId]

  const orderBookFactory = OrderBook__factory.connect(orderBookAddr, signer)
  const limitOrderProtocolFactory = LimitOrderProtocol__factory.connect(limitOrderAddr, signer)

  const cancel = async (): Promise<ContractTransaction> => {
    const order = await orderBookFactory.orders(orderHash)

    return await doTransaction(limitOrderProtocolFactory, 'cancelOrder', {
      args: [order],
      summary: `Cancel Order`,
    })
  }

  return { hash: (await cancel()).hash }
}
