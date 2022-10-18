import { Address } from '@celo/contractkit'
import { useContractKit, useProvider } from '@celo-tools/use-contractkit'
import { BigNumber, BigNumberish } from 'ethers'
import React from 'react'
import { getProviderOrSigner } from 'utils'

import { RomulusDelegate__factory } from '../../generated'
import { useAsyncState } from '../useAsyncState'

export enum Support {
  AGAINST = 0,
  FOR = 1,
  ABSTAIN = 2,
}

export enum ProposalState {
  PENDING = 0,
  ACTIVE,
  CANCELED,
  DEFEATED,
  SUCCEEDED,
  QUEUED,
  EXPIRED,
  EXECUTED,
}

type Proposal = [
  BigNumber,
  string,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  boolean,
  boolean
] & {
  id: BigNumber
  proposer: string
  eta: BigNumber
  startBlock: BigNumber
  endBlock: BigNumber
  forVotes: BigNumber
  againstVotes: BigNumber
  abstainVotes: BigNumber
  canceled: boolean
  executed: boolean
}

export const useProposal = (romulusAddress: Address, proposalId: BigNumberish) => {
  const { address } = useContractKit()
  const library = useProvider()
  const provider = getProviderOrSigner(library, address || undefined)
  const proposalCall = React.useCallback(async () => {
    const romulus = RomulusDelegate__factory.connect(romulusAddress, provider)
    const proposal = await romulus.proposals(proposalId)
    const proposalState = await romulus.state(proposalId)
    return { proposal, proposalState }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [romulusAddress, proposalId])
  return useAsyncState<{
    proposal: Proposal | null
    proposalState: ProposalState
  }>({ proposal: null, proposalState: ProposalState.CANCELED }, proposalCall)
}
