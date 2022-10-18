import { TokenAmount } from '@ubeswap/sdk'
import { ButtonPrimary } from 'components/Button'
import Loader from 'components/Loader'
import Row from 'components/Row'
import { BigNumber } from 'ethers'
import { useProposals } from 'hooks/romulus/useProposals'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'
import { Box } from 'rebass'

import { ProposalCard } from './ProposalCard'

interface IProps {
  romulusAddress: string
  totalVotingPower?: BigNumber
  proposalThreshold?: TokenAmount | undefined
}

export const Proposals: React.FC<IProps> = ({ romulusAddress }: IProps) => {
  const { t } = useTranslation()
  const [showMore, setShowMore] = useState<boolean>(false)
  const [proposals] = useProposals((romulusAddress as string) || '')
  const visibleProposals = useMemo(
    () =>
      proposals.length > 1 ? (showMore ? proposals.slice(1).reverse() : proposals.slice(-3).reverse()) : undefined,
    [proposals, showMore]
  )
  const history = useHistory()

  const showProposal = (url: string) => {
    history.push(url)
  }

  return (
    <>
      {visibleProposals ? (
        <>
          {visibleProposals.map((proposalEvent, idx) => (
            <Box my={2} key={idx} onClick={() => showProposal(`/stake/proposals/${proposalEvent.args.id.toString()}`)}>
              <ProposalCard proposalEvent={proposalEvent} clickable={true} showId={true} showAuthor={false} />
            </Box>
          ))}
          <ButtonPrimary padding="6px" borderRadius="12px" fontSize={14} mt={3} onClick={() => setShowMore(!showMore)}>
            {showMore ? t('showLess') : t('showMore')}
          </ButtonPrimary>
        </>
      ) : (
        <Row justify={'center'} mt={2}>
          <Loader size="48px"></Loader>
        </Row>
      )}
    </>
  )
}
