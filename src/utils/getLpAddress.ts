import { ChainId, Pair, Token } from '@ubeswap/sdk'
import memoize from 'lodash/memoize'
import { isAddress } from 'utils'

const getLpAddress = memoize(
  (token1: string | Token, token2: string | Token, chainId: number = ChainId.MAINNET) => {
    let token1AsTokenInstance = token1
    let token2AsTokenInstance = token2
    if (!token1 || !token2) {
      return null
    }
    if (typeof token1 === 'string' || token1 instanceof String) {
      const checksummedToken1Address = isAddress(token1)
      if (!checksummedToken1Address) {
        return null
      }
      token1AsTokenInstance = new Token(chainId, checksummedToken1Address, 18, 'Ube-LP')
    }
    if (typeof token2 === 'string' || token2 instanceof String) {
      const checksummedToken2Address = isAddress(token2)
      if (!checksummedToken2Address) {
        return null
      }
      token2AsTokenInstance = new Token(chainId, checksummedToken2Address, 18, 'Ube-LP')
    }
    return Pair.getAddress(token1AsTokenInstance as Token, token2AsTokenInstance as Token)
  },
  (token1, token2, chainId) => {
    return `${token1?.address || token1}#${token2?.address || token2}#${chainId}`
  }
)

export default getLpAddress
