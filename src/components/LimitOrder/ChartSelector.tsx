import { Token } from '@ubeswap/sdk'
import CurrencyLogo from 'components/CurrencyLogo'
import Row from 'components/Row'
import { useOnClickOutside } from 'hooks/useOnClickOutside'
import React, { useEffect, useRef, useState } from 'react'
import { Field } from 'state/limit/actions'
import styled, { useTheme } from 'styled-components'
import { TYPE } from 'theme'

import { ReactComponent as DropDown } from '../../assets/images/dropdown.svg'

const ChartTitle = styled.button<{ clickable: boolean; active: boolean }>`
  all: unset;
  cursor: ${({ clickable }) => (clickable ? 'pointer' : 'default')};
  border-radius: 20px;
  padding: 6px 12px;
  margin-left: -12px;
  border: 1px solid transparent;
  height: 28px;
  transition: all 100ms ease-in-out;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  ${({ active, theme }) =>
    active
      ? `box-shadow: inset 0px 2px 2px rgba(0, 0, 0, 0.2); background-color: ${theme.bg1}; border-color: ${theme.bg5};`
      : ''}
  :focus,
  :hover {
    border-color: ${({ theme, clickable }) => (clickable ? theme.bg5 : 'transparent')};
    box-shadow: ${({ clickable, active }) =>
      !clickable ? 'none' : active ? 'inset 0px 2px 2px rgba(0, 0, 0, 0.2)' : '0px 6px 10px rgba(0, 0, 0, 0.075)'};
    background-color: ${({ clickable, theme }) => (clickable ? theme.bg1 : 'inherit')};
  }
  :active {
    box-shadow: ${({ clickable }) => (!clickable ? 'none' : 'inset 0px 2px 2px rgba(0, 0, 0, 0.2)')};
  }
`

const StyledDropDown = styled(DropDown)<{ selected: boolean }>`
  path {
    stroke: ${({ theme }) => theme.text1};
    stroke-width: 1.5px;
  }
  transition: transform 100ms ease-in-out;
  ${({ selected }) => (selected ? 'transform: rotate(180deg);' : '')}
`

export type ChartOption = {
  currencies: [Token, Token] | Token
  price?: number
  change24H?: number
  coingeckoID?: string
  pairID?: string
}

async function getCoingeckoID(contract: string) {
  return await fetch(`https://api.coingecko.com/api/v3/coins/celo/contract/${contract}`)
    .then((response) => (response.ok ? response.json() : Promise.reject(response)))
    .then((data) => data.id)
}

interface ChartSelectorProps {
  currencies: { [field in Field]?: Token }
}

export default function ChartSelector({ currencies }: ChartSelectorProps) {
  const theme = useTheme()

  const node = useRef<HTMLDivElement>()
  const [open, setOpen] = useState<boolean>(false)
  const toggle = () => setOpen((o) => !o)
  useOnClickOutside(node, open ? toggle : undefined)

  const [chart, setChart] = useState<ChartOption | undefined>(undefined)

  const [choices, setChoices] = useState<ChartOption[]>([])

  // Generation of all possible chart choices
  useEffect(() => {
    const tokens = [currencies[Field.TOKEN], currencies[Field.PRICE]]
    const reverseTokens = [...tokens].reverse()

    // Generating token chart from Coingecko
    tokens.forEach((token) => {
      if (token)
        getCoingeckoID(token.address).then((id) => {
          setChoices((choices) => [
            ...choices,
            {
              currencies: token,
              coingeckoID: id,
            },
          ])
        })
    })
  }, [currencies[Field.PRICE], currencies[Field.TOKEN]])

  useEffect(() => {
    setChart(choices[0])
  }, [choices])

  return (
    <div style={{ position: 'relative' }} ref={node as any}>
      <ChartTitle clickable={choices.length > 1} active={open} onClick={toggle}>
        {chart ? (
          <>
            {chart.currencies instanceof Token ? (
              <CurrencyLogo currency={chart.currencies} size={'28px'} style={{ border: `2px solid ${theme.white}` }} />
            ) : (
              <div style={{ position: 'relative', width: '46px' }}>
                <CurrencyLogo currency={chart.currencies[0]} size={'28px'} />
                <CurrencyLogo
                  currency={chart.currencies[1]}
                  size={'28px'}
                  style={{ position: 'absolute', left: '18px' }}
                />
              </div>
            )}
            {chart.currencies instanceof Token ? (
              <Row style={{ gap: '0.25rem' }}>
                <TYPE.largeHeader fontSize={[18, 20]} fontWeight={600}>
                  {chart.currencies.name}
                </TYPE.largeHeader>
                <TYPE.largeHeader fontSize={[15, 15]}>({chart.currencies.symbol})</TYPE.largeHeader>
              </Row>
            ) : (
              <TYPE.largeHeader fontSize={[18, 20]} fontWeight={600}>
                {chart.currencies[0].symbol} / {chart.currencies[1].symbol}
              </TYPE.largeHeader>
            )}
            {choices.length > 1 && <StyledDropDown selected={open}></StyledDropDown>}
          </>
        ) : (
          <TYPE.largeHeader>- / -</TYPE.largeHeader>
        )}
      </ChartTitle>
    </div>
  )
}
