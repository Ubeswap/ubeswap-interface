import { Token } from '@ubeswap/sdk'
import CurrencyLogo from 'components/CurrencyLogo'
import { useOnClickOutside } from 'hooks/useOnClickOutside'
import React, { useEffect, useRef, useState } from 'react'
import { Field } from 'state/limit/actions'
import styled from 'styled-components'
import { TYPE } from 'theme'

const ChartTitle = styled.button<{ clickable: boolean; active: boolean }>`
  all: unset;
  cursor: ${({ clickable }) => (clickable ? 'pointer' : 'default')};
  border-radius: 20px;
  padding: 6px 12px;
  margin-left: -12px;
  border: 1px solid transparent;
  height: 28px;
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
  const node = useRef<HTMLDivElement>()
  const [open, setOpen] = useState(false)
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                width: chart.currencies instanceof Token ? '32px' : '48px',
              }}
            >
              {chart.currencies instanceof Token ? (
                <CurrencyLogo currency={chart.currencies} size={'28px'} />
              ) : (
                <>
                  {' '}
                  <CurrencyLogo currency={chart.currencies[0]} size={'28px'} />{' '}
                  <CurrencyLogo
                    currency={chart.currencies[1]}
                    size={'28px'}
                    style={{ position: 'absolute', left: '18px' }}
                  />{' '}
                </>
              )}
            </div>
          </>
        ) : (
          <TYPE.largeHeader>- / -</TYPE.largeHeader>
        )}
      </ChartTitle>
    </div>
  )
}
