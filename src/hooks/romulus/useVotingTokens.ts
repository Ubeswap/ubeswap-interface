import { Address } from '@celo/contractkit'
import { useProvider } from '@celo-tools/use-contractkit'
import { BigNumberish } from 'ethers'
import { PoofToken__factory } from 'generated'
import React from 'react'
import { getProviderOrSigner } from 'utils'

import { BIG_ZERO, ZERO_ADDRESS } from '../../constants'
import { getRomulusInfo } from '../../utils/getRomulusInfo'
import { useAsyncState } from '../useAsyncState'

const initialVotingTokens = {
  votingPower: BIG_ZERO,
  releaseVotingPower: BIG_ZERO,
}

export const useVotingTokens = (romulusAddress: Address, address: Address | null, blockNumber: BigNumberish) => {
  const library = useProvider()
  const provider = getProviderOrSigner(library, address || undefined)
  const votingPowerCallback = React.useCallback(async () => {
    if (!address) {
      return initialVotingTokens
    }
    const { tokenAddress, releaseTokenAddress } = await getRomulusInfo(romulusAddress, provider)

    const token = PoofToken__factory.connect(tokenAddress, provider)
    const balance = await token.balanceOf(address)
    const votingPower = await token.getPriorVotes(address, blockNumber)

    let releaseBalance = BIG_ZERO
    let releaseVotingPower = BIG_ZERO
    if (releaseTokenAddress !== ZERO_ADDRESS) {
      try {
        const releaseToken = PoofToken__factory.connect(releaseTokenAddress, provider)
        releaseBalance = await releaseToken.balanceOf(address)
        releaseVotingPower = await releaseToken.getPriorVotes(address, blockNumber)
      } catch (e) {
        console.error(e)
      }
    }
    return {
      address,
      romulusAddress,
      provider,
      balance,
      releaseBalance,
      votingPower,
      releaseVotingPower,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [romulusAddress, address, blockNumber])
  return useAsyncState(initialVotingTokens, votingPowerCallback)
}
