import { Trade } from '@ubeswap/sdk'

import { MoolaRouterTrade } from './hooks/useTrade'
import { LimitOrderTrade } from './limit/LimitOrderTrade'
import { MoolaDirectTrade } from './moola/MoolaDirectTrade'

export enum RoutingMethod {
  UBESWAP = 0,
  MOOLA = 1,
  MOOLA_ROUTER = 2,
  LIMIT = 3,
}

export const describeTrade = (
  trade: Trade | undefined
): {
  label: string
  makeLabel: (isInverted: boolean) => string
  routingMethod: RoutingMethod
  isEstimate: boolean
} => {
  if (trade instanceof MoolaDirectTrade) {
    return {
      label: trade.isWithdrawal() ? 'withdraw' : 'deposit',
      makeLabel: (isInverted) => {
        const result = trade.isWithdrawal()
        const resultInverted = isInverted ? !result : result
        return resultInverted ? 'withdraw' : 'deposit'
      },
      routingMethod: RoutingMethod.MOOLA,
      isEstimate: false,
    }
  } else if (trade instanceof LimitOrderTrade) {
    return {
      label: 'limit order',
      makeLabel: () => 'limit order',
      routingMethod: RoutingMethod.LIMIT,
      isEstimate: false,
    }
  } else {
    return {
      label: 'swap',
      routingMethod: trade instanceof MoolaRouterTrade ? RoutingMethod.MOOLA_ROUTER : RoutingMethod.UBESWAP,
      isEstimate: true,
      makeLabel: () => 'swap',
    }
  }
}
