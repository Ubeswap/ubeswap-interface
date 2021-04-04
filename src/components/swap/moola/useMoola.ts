import { CeloContract } from '@celo/contractkit'
import { CELO, ChainId, currencyEquals, cUSD, Token, TokenAmount } from '@ubeswap/sdk'
import { useTokenAllowance } from 'data/Allowances'
import { ethers } from 'ethers'
import { Erc20__factory, LendingPool__factory } from 'generated'
import { useActiveWeb3React } from 'hooks'
import { useTransactionAdder } from 'state/transactions/hooks'

export const moolaLendingPools = {
  // Addresses from: https://github.com/moolamarket/moola
  [ChainId.ALFAJORES]: {
    lendingPool: '0x0886f74eEEc443fBb6907fB5528B57C28E813129',
    lendingPoolCore: '0x090D652d1Bb0FEFbEe2531e9BBbb3604bE71f5de',
    [CeloContract.GoldToken]: CELO[ChainId.ALFAJORES],
    [CeloContract.StableToken]: cUSD[ChainId.ALFAJORES],
    mcUSD: '0x71DB38719f9113A36e14F409bAD4F07B58b4730b',
    mCELO: '0x86f61EB83e10e914fc6F321F5dD3c2dD4860a003'
  },
  [ChainId.MAINNET]: {
    lendingPool: '0xc1548F5AA1D76CDcAB7385FA6B5cEA70f941e535',
    lendingPoolCore: '0xAF106F8D4756490E7069027315F4886cc94A8F73',
    [CeloContract.GoldToken]: CELO[ChainId.MAINNET],
    [CeloContract.StableToken]: cUSD[ChainId.MAINNET],
    mcUSD: '0x64dEFa3544c695db8c535D289d843a189aa26b98',
    mCELO: '0x7037F7296B2fc7908de7b57a89efaa8319f0C500'
  }
}
export type IMoolaChain = keyof typeof moolaLendingPools

interface UseMoolaConvert {
  /**
   * Amount allowed to convert
   */
  allowance: TokenAmount | undefined
  /**
   * Approves a token to swap.
   */
  approve: () => Promise<void>
  /**
   * Converts the tokens.
   */
  convert: () => Promise<TokenAmount>
}

export const useMoola = (input: TokenAmount): UseMoolaConvert => {
  const { library, chainId, account } = useActiveWeb3React()

  if (chainId === ChainId.BAKLAVA) {
    throw new Error('invalid chain id')
  }

  if (!library || !account) {
    throw new Error('not connected')
  }

  const chainCfg = moolaLendingPools[chainId]
  const { lendingPool, lendingPoolCore } = chainCfg

  const mcUSD = new Token(chainId, chainCfg.mcUSD, 18, 'mcUSD', 'Moola cUSD')
  const mCELO = new Token(chainId, chainCfg.mCELO, 18, 'mCELO', 'Moola CELO')

  const allowance = useTokenAllowance(input.token, account, lendingPoolCore)

  const pool = LendingPool__factory.connect(lendingPool, library.getSigner())

  const addTransaction = useTransactionAdder()

  const approve: UseMoolaConvert['approve'] = async () => {
    const contract = Erc20__factory.connect(input.token.address, library.getSigner())
    addTransaction(await contract.approve(lendingPoolCore, ethers.constants.MaxUint256), {
      summary: 'Approve ' + input.token.symbol,
      approval: { tokenAddress: input.token.address, spender: lendingPoolCore }
    })
  }

  const convert = async (): Promise<TokenAmount> => {
    const token = input.token
    if (currencyEquals(token, chainCfg[CeloContract.StableToken])) {
      addTransaction(await pool.deposit(input.token.address, input.raw.toString(), 420), {
        summary: `Deposit cUSD into Moola`
      })
      return new TokenAmount(mcUSD, input.raw)
    }
    if (currencyEquals(token, chainCfg[CeloContract.GoldToken])) {
      addTransaction(await pool.deposit(input.token.address, input.raw.toString(), 420), {
        summary: `Deposit CELO into Moola`
      })
      return new TokenAmount(mCELO, input.raw)
    }
    if (currencyEquals(token, mcUSD)) {
      addTransaction(await pool.withdraw(input.token.address, input.raw.toString(), 420), {
        summary: `Withdraw cUSD from Moola`
      })
      return new TokenAmount(chainCfg[CeloContract.StableToken], input.raw)
    }
    if (currencyEquals(token, mCELO)) {
      addTransaction(await pool.withdraw(input.token.address, input.raw.toString(), 420), {
        summary: `Withdraw CELO from Moola`
      })
      return new TokenAmount(chainCfg[CeloContract.GoldToken], input.raw)
    }
    throw new Error(`unknown currency: ${token.address}`)
  }

  return { approve, convert, allowance }
}
