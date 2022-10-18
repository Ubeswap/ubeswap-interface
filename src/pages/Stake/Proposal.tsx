import { useContractKit } from '@celo-tools/use-contractkit'
import Loader from 'components/Loader'
import { ProposalTabs } from 'components/NavigationTabs'
import { ProposalCard } from 'components/Stake/Proposals/ProposalCard'
import { useProposals } from 'hooks/romulus/useProposals'
import AppBody from 'pages/AppBody'
import React, { useEffect, useState } from 'react'
import { RouteComponentProps } from 'react-router-dom'
import { Box, Card, Text } from 'rebass'
import styled from 'styled-components'

import { ubeGovernanceAddresses } from '../../constants'

const DetailsHeaderContainer = styled(Box)`
  display: flex;
  justify-content: space-between;
  padding: 24px 20px 4px 20px;
  border-top: 1px solid;
  border-color: ${({ theme }) => `${theme.primary5}`};
`

export const Proposal: React.FC<RouteComponentProps<{ proposalId: string }>> = (props) => {
  const {
    match: {
      params: { proposalId },
    },
  } = props

  const { network } = useContractKit()
  const romulusAddress = ubeGovernanceAddresses[network.chainId]
  const [proposal, setProposal] = useState<any>(undefined)
  const [proposals] = useProposals((romulusAddress as string) || '')

  useEffect(() => {
    if (proposals.length > 1) {
      const foundProp = proposals.find((prop) => prop.args.id.toString() === proposalId)
      setProposal(foundProp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals])

  return (
    <>
      {proposal ? (
        <AppBody>
          <ProposalTabs />
          <Box style={{ padding: '4px' }}>
            <ProposalCard proposalEvent={proposal} clickable={false} showId={true} showAuthor={true} outline={false} />
          </Box>
          <DetailsHeaderContainer>
            <Text fontWeight={600} fontSize={16}>
              Details
            </Text>
          </DetailsHeaderContainer>

          <Box style={{ margin: '8px 20px', paddingBottom: '24px', fontSize: '14px' }}>
            {romulusAddress ? (
              <Card>
                <Box mb={1}>
                  <Text>
                    {proposal.args.description === ''
                      ? 'No description.'
                      : proposal.args.description.split('\n').map((line: any, idx: number) => (
                          <Text
                            sx={{
                              display: 'block',
                              overflowWrap: 'anywhere',
                              paddingBottom: '8px',
                            }}
                            key={idx}
                          >
                            {line}
                          </Text>
                        ))}
                  </Text>
                </Box>
              </Card>
            ) : (
              <div>Invalid romulus address</div>
            )}
          </Box>
        </AppBody>
      ) : (
        <>
          <Box style={{ margin: '45px', padding: '128px' }}>
            <Loader size="48px"></Loader>
          </Box>
        </>
      )}
    </>
  )
}
