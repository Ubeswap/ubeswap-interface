import styled from 'styled-components'

import uImage from '../../assets/images/big_unicorn.png'
import noise from '../../assets/images/noise.webp'
import { AutoColumn } from '../Column'

export const DataCard = styled(AutoColumn)<{ disabled?: boolean }>`
  background: radial-gradient(
    96.02% 99.41% at 1.84% 0%,
    ${(props) => props.theme.primary1} 30%,
    ${(props) => props.theme.bg5} 100%
  );
  border-radius: 12px;
  width: 100%;
  position: relative;
  overflow: hidden;
`

export const CardBGImage = styled.span<{ desaturate?: boolean }>`
  background: url(${uImage});
  width: 1000px;
  height: 600px;
  position: absolute;
  border-radius: 12px;
  opacity: 0.4;
  top: -100px;
  left: -100px;
  transform: rotate(-15deg);
  user-select: none;

  ${({ desaturate }) => desaturate && `filter: saturate(0)`}
`

export const CardNoise = styled.span`
  background: url(${noise});
  background-size: cover;
  mix-blend-mode: overlay;
  border-radius: 12px;
  width: 100%;
  height: 100%;
  opacity: 0.15;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
`

export const CardSection = styled(AutoColumn)<{ disabled?: boolean }>`
  padding: 1rem;
  z-index: 1;
  opacity: ${({ disabled }) => disabled && '0.4'};
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`

export const portfolioColors = ['#8878C3', '#B3C379']
