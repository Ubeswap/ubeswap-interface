import { Token } from '@ubeswap/sdk'
import Column from 'components/Column'
import CurrencyLogo from 'components/CurrencyLogo'
import Row from 'components/Row'
import { useOnClickOutside } from 'hooks/useOnClickOutside'
import React, { useEffect, useRef, useState } from 'react'
import { Field } from 'state/limit/actions'
import styled, { useTheme } from 'styled-components'
import { TYPE } from 'theme'
import { formatDelta, formatDollar, formatTransactionAmount } from 'utils/formatNumbers'

import { ReactComponent as DropDown } from '../../assets/images/dropdown.svg'
import { LoadingBubble } from './loading'

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

const MenuFlyout = styled.div`
  display: flex;
  flex-direction: column;
  min-width: calc(100% + 12px);
  border: 1px solid ${({ theme }) => theme.bg5};
  background-color: ${({ theme }) => theme.bg1};
  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);
  border-radius: 20px;
  overflow: hidden;
  position: absolute;
  z-index: 100;
  left: -12px;
  top: 3.15rem;
  animation: dropMenu 100ms ease;
  @keyframes dropMenu {
    0% {
      top: 1.5rem;
    }
  }
`

const MenuItem = styled.button<{ active: boolean }>`
  all: unset;
  flex: 1;
  padding: 12px;
  cursor: pointer;
  background-color: ${({ active, theme }) => (active ? theme.bg2 : 'inherit')};
  :hover {
    background-color: ${({ theme }) => theme.bg2};
  }
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

async function getCoingeckoPrice(id: string) {
  return await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`
  )
    .then((response) => (response.ok ? response.json() : Promise.reject(response)))
    .then((data) => data[id])
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
          getCoingeckoPrice(id).then((price) => {
            setChoices((choices) =>
              choices.map((choice) =>
                choice.currencies == token ? { ...choice, price: price.usd, change24H: price.usd_24h_change } : choice
              )
            )
          })
        })
    })
  }, [currencies[Field.PRICE], currencies[Field.TOKEN]])

  useEffect(() => {
    setChart(choices[0])
  }, [choices])

  return (
    <div style={{ position: 'relative', width: 'fit-content' }} ref={node as any}>
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
      {open && choices.length > 1 && (
        <MenuFlyout>
          {choices.map((choice: ChartOption) => (
            <MenuItem active={choice === chart} key={choice.pairID || choice.coingeckoID}>
              <Row style={{ gap: '0.25rem' }}>
                <Row>
                  <Row width={'44px'} style={{ position: 'relative' }}>
                    {choice.currencies instanceof Token ? (
                      <CurrencyLogo
                        currency={choice.currencies}
                        size={'24px'}
                        style={{ marginLeft: '7px', border: `2px solid ${theme.white}` }}
                      />
                    ) : (
                      <>
                        <CurrencyLogo
                          currency={choice.currencies[0]}
                          size={'24px'}
                          style={{ border: `2px solid ${theme.white}` }}
                        />
                        <CurrencyLogo
                          currency={choice.currencies[1]}
                          size={'24px'}
                          style={{ position: 'absolute', left: '26px', border: `2px solid ${theme.white}` }}
                        />
                      </>
                    )}
                  </Row>
                  <TYPE.black fontSize={[14, 14]} style={{ whiteSpace: 'nowrap' }}>
                    {choice.currencies instanceof Token
                      ? choice.currencies.symbol
                      : choice.currencies[0].symbol + ' / ' + choice.currencies[1].symbol}
                  </TYPE.black>
                </Row>
                <Column style={{ fontSize: '12px', gap: '4px', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '10px' }}>
                    {choice.price ? (
                      choice.currencies instanceof Token ? (
                        formatDollar({ num: choice.price, isPrice: true })
                      ) : (
                        `${formatTransactionAmount(Number(choice.price))}`
                      )
                    ) : (
                      <LoadingBubble height={12} width={60} />
                    )}
                  </div>
                  <div
                    style={{
                      color: choice.change24H != undefined && choice.change24H >= 0 ? theme.green1 : theme.red1,
                      fontSize: '10px',
                    }}
                  >
                    {choice.change24H != undefined ? (
                      formatDelta(choice.change24H)
                    ) : (
                      <LoadingBubble height={12} width={40} />
                    )}
                  </div>
                </Column>
              </Row>
            </MenuItem>
          ))}
        </MenuFlyout>
      )}
    </div>
  )
}
