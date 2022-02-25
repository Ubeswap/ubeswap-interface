import { Token, TokenAmount } from '@ubeswap/sdk'
import React, { useCallback, useContext } from 'react'
import { Text } from 'rebass'
import styled, { ThemeContext } from 'styled-components'

import CurrencyLogo from '../CurrencyLogo'
import { AutoRow } from '../Row'

const StyledRangeInput = styled.input<{ size: number }>`
  -webkit-appearance: none; /* Hides the slider so that custom slider can be made */
  width: 100%; /* Specific width is required for Firefox. */
  background: transparent; /* Otherwise white in Chrome */
  cursor: pointer;

  &:focus {
    outline: none;
  }

  &::-moz-focus-outer {
    border: 0;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: ${({ size }) => size}px;
    width: ${({ size }) => size}px;
    background-color: #565a69;
    border-radius: 100%;
    border: none;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.bg1};

    &:hover,
    &:focus {
      box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.1), 0px 4px 8px rgba(0, 0, 0, 0.08), 0px 16px 24px rgba(0, 0, 0, 0.06),
        0px 24px 32px rgba(0, 0, 0, 0.04);
    }
  }

  &::-moz-range-thumb {
    height: ${({ size }) => size}px;
    width: ${({ size }) => size}px;
    background-color: #565a69;
    border-radius: 100%;
    border: none;
    color: ${({ theme }) => theme.bg1};

    &:hover,
    &:focus {
      box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.1), 0px 4px 8px rgba(0, 0, 0, 0.08), 0px 16px 24px rgba(0, 0, 0, 0.06),
        0px 24px 32px rgba(0, 0, 0, 0.04);
    }
  }

  &::-ms-thumb {
    height: ${({ size }) => size}px;
    width: ${({ size }) => size}px;
    background-color: #565a69;
    border-radius: 100%;
    color: ${({ theme }) => theme.bg1};

    &:hover,
    &:focus {
      box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.1), 0px 4px 8px rgba(0, 0, 0, 0.08), 0px 16px 24px rgba(0, 0, 0, 0.06),
        0px 24px 32px rgba(0, 0, 0, 0.04);
    }
  }

  &::-webkit-slider-runnable-track {
    background: linear-gradient(90deg, ${({ theme }) => theme.bg5}, ${({ theme }) => theme.bg3});
    height: 2px;
  }

  &::-moz-range-track {
    background: linear-gradient(90deg, ${({ theme }) => theme.bg5}, ${({ theme }) => theme.bg3});
    height: 2px;
  }

  &::-ms-track {
    width: 100%;
    border-color: transparent;
    color: transparent;

    background: ${({ theme }) => theme.bg5};
    height: 2px;
  }
  &::-ms-fill-lower {
    background: ${({ theme }) => theme.bg5};
  }
  &::-ms-fill-upper {
    background: ${({ theme }) => theme.bg3};
  }
`

const Aligner = styled.span`
  display: flex;
`

interface InputSliderProps {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  size?: number
  isWithdrawSlider?: boolean
  isCurrencyAmount?: boolean
  currency?: Token | null
  balance?: TokenAmount | null
}

export default function Slider({
  value,
  onChange,
  min = 0,
  step = 1,
  max = 100,
  size = 28,
  isWithdrawSlider = false,
  isCurrencyAmount = false,
  currency = null,
  balance = null,
}: InputSliderProps) {
  const theme = useContext(ThemeContext)

  const changeCallback = useCallback(
    (e) => {
      onChange(parseInt(e.target.value))
    },
    [onChange]
  )
  return (
    <>
      {isCurrencyAmount && currency ? (
        <AutoRow justify="space-between">
          <Aligner>
            <CurrencyLogo currency={currency} size={'24px'} />
            <Text fontWeight={500} fontSize={16} color={theme.text1} pt={0} pl={2}>
              {currency && currency.symbol && currency.symbol.length > 20
                ? currency.symbol.slice(0, 4) +
                  '...' +
                  currency.symbol.slice(currency.symbol.length - 5, currency.symbol.length)
                : currency?.symbol}
            </Text>
          </Aligner>
          <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
            {parseFloat(value.toFixed(6))}
          </Text>
        </AutoRow>
      ) : null}

      {isWithdrawSlider ? (
        <AutoRow justify="space-between">
          <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
            0
          </Text>
          <Text fontWeight={500} fontSize={14} color={theme.text2} pt={1}>
            {value}%
          </Text>
        </AutoRow>
      ) : null}

      <StyledRangeInput
        size={isCurrencyAmount ? 18 : size}
        type="range"
        value={isCurrencyAmount ? parseInt(((value / Number(balance)) * 100).toFixed(0)) : value}
        style={{
          width: isCurrencyAmount || isWithdrawSlider ? ' 100%' : '90%',
          marginLeft: isCurrencyAmount || isWithdrawSlider ? 0 : 15,
          marginRight: isCurrencyAmount || isWithdrawSlider ? 0 : 15,
          padding: '15px 0',
        }}
        onChange={changeCallback}
        aria-labelledby="input slider"
        step={step}
        min={min}
        max={max}
      />
    </>
  )
}
