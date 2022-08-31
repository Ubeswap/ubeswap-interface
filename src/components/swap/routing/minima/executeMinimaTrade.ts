import { ContractTransaction } from 'ethers'

import { MinimaRouter__factory } from '../../../../generated'
import { TradeExecutor } from '..'
import { MinimaRouterTrade } from '../trade'
import { MINIMA_ROUTER_ADDRESS } from './../../../../constants/index'

/**
 * Executes a trade on Minima.
 * @param trade
 * @returns
 */
export const executeMinimaTrade: TradeExecutor<MinimaRouterTrade> = async ({ trade, signer, doTransaction }) => {
  const contract = MinimaRouter__factory.connect(MINIMA_ROUTER_ADDRESS, signer)

  const { details, inputAmount, outputAmount } = trade
  const inputToken = inputAmount.token
  const outputToken = inputAmount.token

  const convert = async (): Promise<ContractTransaction> => {
    const inputSymbol = inputToken.symbol ?? null
    const outputSymbol = outputToken.symbol ?? null

    const tokenAmountIn = inputAmount.toSignificant(3)
    const tokenAmountOut = outputAmount.toSignificant(3)

    return await doTransaction(contract, 'swapExactInputForOutput', {
      args: [details],
      summary: `Swap ${tokenAmountIn} ${inputSymbol} for ${tokenAmountOut} ${outputSymbol}`,
    })
  }

  return { hash: (await convert()).hash }
}
