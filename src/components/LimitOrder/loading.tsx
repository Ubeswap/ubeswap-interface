import { loadingAnimation } from 'components/Loader/styled'
import styled from 'styled-components/macro'

/* Loading state bubbles (animation style from: src/components/Loader/styled.tsx) */
export const LoadingBubble = styled.div<{ height: number; width: number }>`
  border-radius: 12px;
  height: ${({ height }) => height}px;
  width: ${({ width }) => width}px;
  animation: ${loadingAnimation} 1.5s infinite;
  animation-fill-mode: both;
  background: linear-gradient(
    to left,
    ${({ theme }) => theme.bg3} 25%,
    ${({ theme }) => theme.bg1} 50%,
    ${({ theme }) => theme.bg3} 75%
  );
  will-change: background-position;
  background-size: 400%;
`
