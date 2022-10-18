import { Address } from '@celo/contractkit'
import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { ChainId as UbeswapChainId, JSBI, TokenAmount } from '@ubeswap/sdk'
import { PoofToken__factory } from 'generated'
import React from 'react'
import { getProviderOrSigner } from 'utils'

import { ZERO_ADDRESS } from '../../constants'
import { getRomulusInfo } from '../../utils/getRomulusInfo'
import { useAsyncState } from '../useAsyncState'
import { UBE } from './../../constants/tokens'

type Romulus = [string, TokenAmount | undefined, TokenAmount | undefined]

const initialRomulus: Romulus = [ZERO_ADDRESS, undefined, undefined]

export const useRomulus = (romulusAddress: Address) => {
  const { address, network } = useContractKit()
  const library = useProvider()
  const provider = getProviderOrSigner(library, address || undefined)

  const chainId = network.chainId
  const ube = chainId ? UBE[chainId as unknown as UbeswapChainId] : undefined

  const romulusCalls = React.useCallback(async (): Promise<Romulus> => {
    const { romulus, tokenAddress } = await getRomulusInfo(romulusAddress as string, provider)

    const token = PoofToken__factory.connect(tokenAddress, provider)
    const tokenDelegate = address ? await token.delegates(address) : ZERO_ADDRESS

    const quorumVotes = await romulus.quorumVotes()
    const proposalThreshold = await romulus.proposalThreshold()

    return [
      tokenDelegate,
      ube ? new TokenAmount(ube, JSBI.BigInt(quorumVotes.toString())) : undefined,
      ube ? new TokenAmount(ube, JSBI.BigInt(proposalThreshold.toString())) : undefined,
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, romulusAddress])

  return useAsyncState(initialRomulus, romulusCalls)
}
