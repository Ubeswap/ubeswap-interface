import { Address } from '@celo/contractkit'
import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { RomulusDelegate__factory } from 'generated'
import React from 'react'
import { getProviderOrSigner } from 'utils'

import { useAsyncState } from '../useAsyncState'

export const useProposals = (romulusAddress: Address | undefined) => {
  const { address } = useContractKit()
  const library = useProvider()
  const provider = getProviderOrSigner(library, address || undefined)

  const proposalsCall = React.useCallback(async () => {
    if (!romulusAddress) {
      return []
    }
    const romulus = RomulusDelegate__factory.connect(romulusAddress, provider)
    const filter = romulus.filters.ProposalCreated(null, null, null, null, null, null, null, null, null)
    const proposalEvents = await romulus.queryFilter(filter)
    return proposalEvents
  }, [romulusAddress, provider])
  return useAsyncState([], proposalsCall)
}
