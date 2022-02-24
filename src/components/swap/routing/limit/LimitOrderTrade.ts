import { JSBI, Percent, Price, Route, TokenAmount, TradeType } from '@ubeswap/sdk'

import { UbeswapTrade } from '../trade'

/**
 * A trade that directly happens with moola.
 */
export class LimitOrderTrade extends UbeswapTrade {
  /**
   * The input amount for the trade assuming no slippage.
   */
  inputAmount: TokenAmount
  /**
   * The output amount for the trade assuming no slippage.
   */
  outputAmount: TokenAmount
  /**
   * The price expressed in terms of output amount/input amount.
   */
  executionPrice: Price
  /**
   * The mid price after the trade executes assuming no slippage.
   */
  nextMidPrice: Price
  /**
   * The percent difference between the mid price before the trade and the trade execution price.
   */
  priceImpact: Percent

  isWithdrawal(): boolean {
    return this.inputAmount.currency.symbol?.startsWith('m') ?? false
  }

  constructor(route: Route, inputAmount: TokenAmount, outputAmount: TokenAmount, tradeType: TradeType) {
    super(route, inputAmount, tradeType, {}, [inputAmount.token, outputAmount.token])
    this.inputAmount = inputAmount
    this.outputAmount = outputAmount
    this.executionPrice = new Price(
      inputAmount.token,
      outputAmount.token,
      JSBI.multiply(inputAmount.denominator, outputAmount.denominator),
      JSBI.multiply(inputAmount.numerator, outputAmount.numerator)
    )
    this.nextMidPrice = new Price(
      inputAmount.token,
      outputAmount.token,
      JSBI.multiply(inputAmount.denominator, outputAmount.denominator),
      JSBI.multiply(inputAmount.numerator, outputAmount.numerator)
    )
    this.priceImpact = new Percent('0')
    this.hidePairAnalytics = true
  }

  static fromIn(route: Route, inputAmount: TokenAmount): LimitOrderTrade {
    return new LimitOrderTrade(
      route,
      inputAmount,
      new TokenAmount(route.output, inputAmount.raw),
      TradeType.EXACT_INPUT
    )
  }

  static fromOut(route: Route, outputAmount: TokenAmount): LimitOrderTrade {
    return new LimitOrderTrade(
      route,
      new TokenAmount(route.output, outputAmount.raw),
      outputAmount,
      TradeType.EXACT_OUTPUT
    )
  }
}
