import { ContractTransaction } from 'ethers'
import { LimitOrderProtocol__factory } from 'generated/factories/LimitOrderProtocol__factory'
import { OrderBook__factory } from 'generated/factories/OrderBook__factory'
import { buildOrderData } from 'utils/limitOrder'

import { LIMIT_ORDER_ADDRESS, ORDER_BOOK_ADDRESS, ZERO_ADDRESS } from '../../../../constants'
import { TradeExecutor } from '..'
import { LimitOrderTrade } from './LimitOrderTrade'

function cutLastArg(data: string, padding = 0) {
  return data.substr(0, data.length - 64 - padding)
}

/**
 * Queues a limit order trade.
 * @param trade
 * @returns
 */
export const queueLimitOrderTrade: TradeExecutor<LimitOrderTrade> = async ({
  trade,
  signer,
  chainId,
  doTransaction,
}) => {
  const limitOrderAddr = LIMIT_ORDER_ADDRESS[chainId]
  const orderBookAddr = ORDER_BOOK_ADDRESS[chainId]

  const limitOrderProtocolIface = LimitOrderProtocol__factory.createInterface()
  const orderBook = OrderBook__factory.connect(orderBookAddr, signer)

  const makingAmount = trade.inputAmount.raw.toString()
  const takingAmount = trade.outputAmount.raw.toString()

  const limitOrder = {
    salt: Math.floor(Math.random() * 1_000_000_000), // Reasonably random
    makerAsset: trade.inputAmount.currency.address,
    takerAsset: trade.outputAmount.currency.address,
    maker: await signer.getAddress(),
    receiver: ZERO_ADDRESS,
    allowedSender: ZERO_ADDRESS,
    makingAmount,
    takingAmount,
    makerAssetData: '0x',
    takerAssetData: '0x',
    getMakerAmount: cutLastArg(
      limitOrderProtocolIface.encodeFunctionData('getMakerAmount', [makingAmount, takingAmount, 0])
    ),
    getTakerAmount: cutLastArg(
      limitOrderProtocolIface.encodeFunctionData('getTakerAmount', [makingAmount, takingAmount, 0])
    ),
    predicate: '0x',
    permit: '0x',
    interaction: '0x',
  }
  const limitOrderTypedData = buildOrderData(chainId.toString(), limitOrderAddr, limitOrder)
  const limitOrderSignature = await signer._signTypedData(
    limitOrderTypedData.domain,
    limitOrderTypedData.types,
    limitOrder
  )

  const { outputAmount } = trade

  const queue = async (): Promise<ContractTransaction> => {
    return await doTransaction(orderBook, 'broadcastOrder', {
      args: [limitOrder, limitOrderSignature],
      summary: `Place limit order for ${outputAmount.toSignificant(2)} ${outputAmount.currency.symbol}`,
    })
  }

  return { hash: (await queue()).hash }
}