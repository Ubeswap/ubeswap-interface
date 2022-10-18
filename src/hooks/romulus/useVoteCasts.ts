import { Address } from '@celo/contractkit'
import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { BigNumber } from 'ethers'
import { RomulusDelegate__factory } from 'generated'
import { TypedEvent } from 'generated/commons'
import React from 'react'
import { getProviderOrSigner } from 'utils'

import { useAsyncState } from '../useAsyncState'

type VoteMap = {
  [proposalId: string]: TypedEvent<
    [string, BigNumber, number, BigNumber, string] & {
      voter: string
      proposalId: BigNumber
      support: number
      votes: BigNumber
      reason: string
    }
  >
}

export const useVoteCasts = (romulusAddress: Address) => {
  const { address } = useContractKit()
  const library = useProvider()
  const provider = getProviderOrSigner(library, address || undefined)
  const voteCastsCallback = React.useCallback(async () => {
    if (!romulusAddress || !address) {
      return {}
    }
    const romulus = RomulusDelegate__factory.connect(romulusAddress, provider)
    const filter = romulus.filters.VoteCast(address, null, null, null, null)
    const voteEvents = await romulus.queryFilter(filter)
    return voteEvents.reduce((acc, event) => {
      acc[event.args.proposalId.toString()] = event
      return acc
    }, {} as VoteMap)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [romulusAddress, address])
  return useAsyncState<VoteMap>({}, voteCastsCallback)
}
