import { CeloContract } from '@celo/contractkit'
import { currencyEquals, Token } from '@ubeswap/sdk'
import { LendingPool__factory } from 'generated'
import { AToken__factory } from 'generated/factories/AToken__factory'
import { TradeExecutor } from '..'
import { MoolaTrade } from './MoolaTrade'
import { moolaLendingPools } from './useMoola'

/**
 * Executes a trade on Moola.
 * @param trade
 * @returns
 */
export const executeMoolaTrade: TradeExecutor<MoolaTrade> = async ({ trade, signer, chainId, doTransaction }) => {
  const chainCfg = moolaLendingPools[chainId]

  const mcUSD = new Token(chainId, chainCfg.mcUSD, 18, 'mcUSD', 'Moola cUSD')
  const mCELO = new Token(chainId, chainCfg.mCELO, 18, 'mCELO', 'Moola CELO')

  const pool = LendingPool__factory.connect(chainCfg.lendingPool, signer)

  const { inputAmount, outputAmount } = trade
  const token = inputAmount.token

  const convert = async (): Promise<string> => {
    const symbol = currencyEquals(token, chainCfg[CeloContract.StableToken])
      ? 'cUSD'
      : currencyEquals(token, chainCfg[CeloContract.GoldToken])
      ? 'CELO'
      : currencyEquals(token, mcUSD)
      ? 'mcUSD'
      : currencyEquals(token, mCELO)
      ? 'mCELO'
      : null

    if (symbol?.startsWith('m')) {
      const aToken = AToken__factory.connect(outputAmount.token.address, signer)
      return await doTransaction(aToken, 'redeem', {
        args: [inputAmount.raw.toString()],
        summary: `Withdraw ${inputAmount.toSignificant(2)} ${symbol} from Moola`
      })
    }
    if (symbol) {
      return await doTransaction(pool, 'deposit', {
        args: [inputAmount.token.address, inputAmount.raw.toString(), 420],
        summary: `Deposit ${inputAmount.toSignificant(2)} ${symbol} into Moola`
      })
    }
    throw new Error(`unknown currency: ${token.address}`)
  }

  return { hash: await convert() }
}
