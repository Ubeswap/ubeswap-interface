import React from 'react'
import styled from 'styled-components'

import Row, { RowBetween } from '../Row'
import Settings from '../Settings'

const StyledSwapHeader = styled.div`
  padding: 12px 1rem 0px 1.5rem;
  width: 100%;
  max-width: 420px;
  color: ${({ theme }) => theme.text2};
  border-bottom: 1px solid ${({ theme }) => theme.bg3};
`

const LinkSwapHeader = styled.a<{ active?: boolean }>`
  color: ${({ theme }) => theme.text1};
  opacity: ${({ active }) => (active ? '1' : '0.7')};
  font-weight: 500;
  padding: 8px 2px;
  cursor: pointer;
  text-decoration: none;
  filter: contrast(200%);
  border-bottom: 2px solid ${({ theme, active }) => (active ? theme.primary1 : 'transparent')};
  transition: all 0.05s ease-in-out;
  :hover {
    border-bottom: 2px solid ${({ theme }) => theme.primary1};
    opacity: 1;
  }
`

export default function SwapHeader({
  title = 'Swap',
  hideSettings = false,
}: {
  title?: string
  hideSettings?: boolean
}) {
  return (
    <StyledSwapHeader>
      <RowBetween>
        <Row style={{ gap: '16px' }}>
          <LinkSwapHeader {...(title === 'Swap' ? { active: true } : { href: '#swap' })}>Swap</LinkSwapHeader>
          <LinkSwapHeader {...(title === 'Limit' ? { active: true } : { href: '#limit-order' })}>Limit</LinkSwapHeader>
        </Row>
        {hideSettings || <Settings />}
      </RowBetween>
    </StyledSwapHeader>
  )
}
