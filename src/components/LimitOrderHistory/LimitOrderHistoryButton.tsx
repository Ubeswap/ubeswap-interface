import { ButtonLight } from 'components/Button'
import { darken } from 'polished'
import styled from 'styled-components'

export const LimitOrderHistoryButton = styled(ButtonLight)`
  background-color: ${({ theme }) => theme.primary1};
  width: 25%;
  font-size: 12px;
  display: inline-block;
  padding: 0.75rem;
  margin: 0.75rem 0.05rem 0.5rem 1rem;
  &:active {
    box-shadow: 0 0 0 1pt ${({ theme, disabled }) => !disabled && darken(0.15, theme.primary5)};
    background-color: ${({ theme, disabled }) => !disabled && darken(0.15, theme.primary5)};
  }
`

export const LimitOrderHistoryCompletedButton = styled(ButtonLight)`
  background-color: initial;
  width: 25%;
  font-size: 12px;
  display: inline-block;
  padding: 0.75rem;
  margin: 0.75rem 0.05rem 0.5rem 1rem;
  &:active {
    box-shadow: 0 0 0 1pt ${({ theme, disabled }) => !disabled && darken(0.15, theme.primary5)};
    background-color: ${({ theme, disabled }) => !disabled && darken(0.15, theme.primary5)};
  }
`
