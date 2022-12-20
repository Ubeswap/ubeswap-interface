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
  margin: 24px 0;
  column-gap: 60px;
  row-gap: 20px;
  @media (max-width: 1260px) {
    column-gap: 40px;
  }
  @media (max-width: 1115px) {
    flex-direction: column-reverse;
    align-items: center;
    padding: 0;
  }
`

export const LeftPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
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

const ChartAnimation = styled.div`
  display: flex;
  flex-direction: column;
  animation: waves 2s cubic-bezier(0.36, 0.45, 0.63, 0.53) infinite;
  @keyframes waves {
    0% {
      margin-left: 0;
    }
    100% {
      margin-left: -416px;
    }
  }
`

export function Waves({ height }: { height: number }) {
  const theme = useTheme()
  const midPoint = height / 2 + 45

  return (
    <path
      d={`M 0    ${midPoint} Q 104  ${midPoint - 70}, 208  ${midPoint} T 416  ${midPoint}
          M 416  ${midPoint} Q 520  ${midPoint - 70}, 624  ${midPoint} T 832  ${midPoint},
          M 832  ${midPoint} Q 936  ${midPoint - 70}, 1040 ${midPoint} T 1248 ${midPoint},
          M 1248 ${midPoint} Q 1352 ${midPoint - 70}, 1456 ${midPoint} T 1664 ${midPoint}`}
      stroke={theme.bg4}
      fill="transparent"
      strokeWidth="2"
    />
  )
}

export function LoadingChart({ height }: { height: number }) {
  const graphHeight = height - 64 - 16 > 0 ? height - 64 - 16 : 0
  const graphInnerHeight =
    graphHeight - margin.top - margin.bottom - 40 > 0 ? graphHeight - margin.top - margin.bottom - 40 : 0
  return (
    <Column style={{ gap: '16px', overflow: 'hidden' }}>
      <Column style={{ gap: '4px' }}>
        <TokenPrice>
          <LoadingBubble height={36} width={130} />
        </TokenPrice>
        <LoadingBubble height={16} width={160} />
      </Column>
      <ChartAnimation>
        <svg height={graphHeight}>
          <Waves height={graphInnerHeight}></Waves>
        </svg>
      </ChartAnimation>
    </Column>
  )
}
