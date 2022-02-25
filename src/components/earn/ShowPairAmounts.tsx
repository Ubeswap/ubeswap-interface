import { formatEther } from '@ethersproject/units'
import { Token } from '@ubeswap/sdk'
import { BigNumber } from 'ethers'
import React from 'react'
import styled from 'styled-components'

import CurrencyLogo from '../CurrencyLogo'

const ShowPairAmountsWrapper = styled.div`
  box-sizing: border-box;
  margin: 0px;
  min-width: 0px;
  justify-content: left;
  gap: 12px;
  -webkit-box-align: center;
  align-items: center;
  display: flex;
  flex-wrap: wrap;
`

const TokenWrapper = styled.div`
  display: flex;
  justify-content: left;
  gap: 6px;
  -webkit-box-align: center;
  align-items: center;
  display: flex;
`

interface Props {
  valueA?: BigNumber | undefined
  valueB?: BigNumber | undefined
  currencyA?: Token | null
  currencyB?: Token | null
}

export default function ShowPairAmounts({ valueA, valueB, currencyA, currencyB }: Props) {
  return (
    <ShowPairAmountsWrapper>
      <TokenWrapper>
        <CurrencyLogo currency={currencyA ? currencyA : undefined} size={'24px'} />
        {(valueA ? humanFriendlyNumber(formatEther(valueA)) : '--') + ' ' + (currencyA ? currencyA?.symbol : '')}
      </TokenWrapper>
      <TokenWrapper>
        <CurrencyLogo currency={currencyB ? currencyB : undefined} size={'24px'} />
        {(valueB ? humanFriendlyNumber(formatEther(valueB)) : '--') + ' ' + (currencyB ? currencyB?.symbol : '')}
      </TokenWrapper>
    </ShowPairAmountsWrapper>
  )
}

const humanFriendlyNumber = (v: number | string) => {
  const formatNumber = (num: string) => {
    return num.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
  }

  const num = Number(v)
  if (num === 0) {
    return '0'
  }
  const smallest = Math.pow(10, -2)
  if (num < smallest) {
    return `<${smallest.toFixed(2)}`
  }

  return formatNumber(num.toFixed(2))
}
