import React from 'react'
import styled from 'styled-components'

import { useLastTruthy } from '../../hooks/useLast'
import { AdvancedSwapDetails, AdvancedSwapDetailsProps } from './AdvancedSwapDetails'

export const AdvancedDetailsFooter = styled.div<{ show: boolean }>`
  padding-top: ${({ show }) => (show ? 'calc(16px + 2rem)' : '0')};
  margin-top: ${({ show }) => (show ? '-2rem' : '-100%')};

  padding-bottom: 16px;
  width: 100%;
  max-width: 400px;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  color: ${({ theme }) => theme.text2};
  background-color: ${({ theme }) => theme.advancedBG};
  z-index: -1;

  transition: all 300ms ease-in-out;
`

export default function AdvancedSwapDetailsDropdown({ trade, ...rest }: AdvancedSwapDetailsProps) {
  const lastTrade = useLastTruthy(trade)

  return (
    <AdvancedDetailsFooter show={Boolean(trade)}>
      <AdvancedSwapDetails {...rest} trade={trade ?? lastTrade ?? undefined} />
    </AdvancedDetailsFooter>
  )
}
