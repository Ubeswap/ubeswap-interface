import { Trade } from '@ubeswap/sdk'
import { MoolaTrade } from './moola/MoolaTrade'

export enum RoutingMethod {
  UBESWAP = 0,
  MOOLA = 1
}

export const describeTrade = (
  trade: Trade | undefined
): {
  label: string
  routingMethod: RoutingMethod
  isEstimate: boolean
} => {
  if (trade instanceof MoolaTrade) {
    return { label: trade.isWithdrawal ? 'Withdraw' : 'Deposit', routingMethod: RoutingMethod.MOOLA, isEstimate: false }
  } else {
    return { label: 'Swap', routingMethod: RoutingMethod.UBESWAP, isEstimate: true }
  }
}
