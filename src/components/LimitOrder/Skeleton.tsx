import Column from 'components/Column'
import React from 'react'
import styled, { useTheme } from 'styled-components/macro'

import { LoadingBubble } from './loading'
import { margin, TokenPrice } from './PriceChart'

export const LimitOrderLayout = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  width: 100%;
  padding: 0 20px;
  margin-top: 24px;
  column-gap: 60px;
  row-gap: 30px;
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

function Wave() {
  const theme = useTheme()
  return (
    <svg width="416" height="160" xmlns="http://www.w3.org/2000/svg">
      <path d="M 0 80 Q 104 10, 208 80 T 416 80" stroke={theme.bg4} fill="transparent" strokeWidth="2" />
    </svg>
  )
}

const LoadingChartContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  overflow: hidden;
`

const ChartAnimation = styled.div`
  animation: wave 8s cubic-bezier(0.36, 0.45, 0.63, 0.53) infinite;
  display: flex;
  overflow: hidden;
  margin-top: 7px;
  @keyframes wave {
    0% {
      margin-left: 0;
    }
    100% {
      margin-left: -800px;
    }
  }
`

export function LoadingChart({ width, height }: { width: number; height: number }) {
  const graphHeight = height - 64 - 16 > 0 ? height - 64 - 16 : 0
  const graphInnerHeight = graphHeight - margin.top - 40 > 0 ? graphHeight - margin.top - 40 : 0

  return (
    <Column style={{ gap: '16px' }}>
      <Column style={{ gap: '4px' }}>
        <TokenPrice>
          <LoadingBubble height={44} width={100} />
        </TokenPrice>
        <LoadingBubble height={16} width={160} />
      </Column>
      <LoadingChartContainer style={{ width: width, height: graphHeight }}>
        <div style={{ height: graphInnerHeight }}>
          <ChartAnimation>
            <Wave />
            <Wave />
            <Wave />
            <Wave />
            <Wave />
          </ChartAnimation>
        </div>
      </LoadingChartContainer>
    </Column>
  )
}
