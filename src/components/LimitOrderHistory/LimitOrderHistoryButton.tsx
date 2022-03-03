import { ButtonLight } from 'components/Button'
import styled from 'styled-components'

export const LimitOrderHistoryButton = styled(ButtonLight)<{
  active?: boolean
}>`
  background-color: initial;
  width: 25%;
  ${({ active }) =>
    active &&
    `
  box-shadow: 0 0 0 1pt #6D619A70;
  background-color: #6D619A70;
`}
  font-size: 12px;
  display: inline-block;
  padding: 0.75rem;
  margin: 0.75rem 0.05rem 0.5rem 1rem;
`
