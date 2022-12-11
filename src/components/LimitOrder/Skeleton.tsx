import styled from 'styled-components/macro'

export const LimitOrderLayout = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  width: 100%;
  padding: 0 20px;
  margin-top: 24px;
  gap: 60px;
  @media (max-width: 1115px) {
    flex-direction: column-reverse;
    align-items: center;
    padding: 0;
  }
`

export const LeftPanel = styled.div`
  max-width: 780px;
  width: 100%;
  @media screen and (max-width: 1115px) {
    max-width: 420px;
  }
`

export const RightPanel = styled.div`
  max-width: 420px;
  width: 100%;
`
