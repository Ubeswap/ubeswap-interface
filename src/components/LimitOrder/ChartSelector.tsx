import { useApolloClient } from '@apollo/client'
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
import getLpAddress from 'utils/getLpAddress'

import { ReactComponent as DropDown } from '../../assets/images/dropdown.svg'
import { LoadingBubble } from './loading'
import { getBlockFromTimestamp, PRICE_TODAY_YESTERDAY } from './queries'

const ChartTitle = styled.button<{ clickable: boolean; active: boolean }>`
  all: unset;
  cursor: ${({ clickable }) => (clickable ? 'pointer' : 'default')};
  border-radius: 20px;
  padding: 6px 12px;
  margin-left: -12px;
  border: 1px solid transparent;
  height: 28px;
  transition: all 200ms ease-in-out;
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

const Container = styled.div`
  position: relative;
  width: fit-content;

  @media only screen and (max-width: 1115px) {
    display: none;
  }
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

async function getCoingeckoID(contract: string, signal: any) {
  return await fetch(`https://api.coingecko.com/api/v3/coins/celo/contract/${contract}`, { signal: signal })
    .then((response) => (response.ok ? response.json() : Promise.reject(response)))
    .then((data) => data.id)
    .catch((e) => console.log('Error:', e))
}

async function getCoingeckoPrice(id: string, signal: any) {
  return await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`,
    { signal: signal }
  )
    .then((response) => (response.ok ? response.json() : Promise.reject(response)))
    .then((data) => data[id])
    .catch((e) => console.log('Error:', e))
}

function getPairID(token0Address: string, token1Address: string) {
  try {
    return getLpAddress(token0Address, token1Address)?.toLowerCase()
  } catch (err) {
    return undefined
  }
}

async function getPairPrice(id: string, signal: any, gqlClient: any) {
  const now = Math.round(new Date().getTime() / 1000)
  const yesterday = now - 86400
  return await getBlockFromTimestamp(yesterday, { context: { fetchOptions: { signal } } }).then((number) => {
    return gqlClient
      .query({ query: PRICE_TODAY_YESTERDAY(id, number), context: { fetchOptions: { signal } } })
      .then((response) => {
        return { now: response.data.now[0], yesterday: response.data.yesterday[0] }
      })
  })
}

export type ChartOption = {
  currencies: [Token, Token] | Token
  price?: number
  errorNoPrice?: boolean
  change24H?: number
  coingeckoID?: string
  pairID?: string
}

interface ChartSelectorProps {
  currencies: { [field in Field]?: Token }
  onChartChange: (t: ChartOption | undefined) => void
}

export default function ChartSelector({ currencies, onChartChange }: ChartSelectorProps) {
  const theme = useTheme()

  const [chart, setChart] = useState<ChartOption | undefined>(undefined)
  const [choices, setChoices] = useState<ChartOption[]>([])

  const node = useRef<HTMLDivElement>()
  const [open, setOpen] = useState<boolean>(false)
  const toggle = () => setOpen((o) => (choices.length > 1 ? !o : o))
  useOnClickOutside(node, open ? toggle : undefined)

  const controllerRef = useRef<AbortController | null>()

  const client = useApolloClient()

  // Generation of all possible chart choices
  useEffect(() => {
    setChoices([])

    if (controllerRef.current) {
      controllerRef.current.abort()
    }
    const controller = new AbortController()
    controllerRef.current = controller
    const signal = controllerRef.current?.signal

    const tokens = [currencies[Field.PRICE], currencies[Field.TOKEN]]
    const reverseTokens = [...tokens].reverse()

    // Generating pair from GraphQl
    if (tokens[0] && tokens[1]) {
      const pairID = getPairID.apply(
        this,
        tokens.map((t) => t.address)
      )
      if (pairID) {
        setChoices([
          {
            currencies: tokens as [Token, Token],
            pairID: pairID,
          },
          {
            currencies: reverseTokens as [Token, Token],
            pairID: pairID,
          },
        ])
        getPairPrice(pairID, signal, client).then((price) => {
          setChoices((choices) =>
            choices.map((choice) => {
              if (choice.currencies instanceof Token) {
                return choice
              }
              if (!price.now || !price.yesterday) {
                return { ...choice, errorNoPrice: true }
              }
              const price0N = price.now.token0Price
              const price1N = price.now.token1Price
              const price0Y = price.yesterday.token0Price
              const price1Y = price.yesterday.token1Price
              const change0 = price0N / price0Y - 1
              const change1 = price1N / price1Y - 1

              const is1 = choice.currencies[0].address > choice.currencies[1].address
              return { ...choice, price: is1 ? price1N : price0N, change24H: is1 ? change1 : change0 }
            })
          )
        })
      }
    }

    // Generating token chart from Coingecko
    tokens.forEach((token) => {
      if (token)
        getCoingeckoID(token.address, signal).then((id) => {
          if (id) {
            setChoices((choices) => [
              ...choices,
              {
                currencies: token,
                coingeckoID: id,
              },
            ])
            getCoingeckoPrice(id, signal).then((price) => {
              if (price) {
                setChoices((choices) =>
                  choices.map((choice) =>
                    choice.currencies == token
                      ? { ...choice, price: price.usd, change24H: price.usd_24h_change }
                      : choice
                  )
                )
              }
            })
          }
        })
    })
  }, [currencies[Field.PRICE], currencies[Field.TOKEN]])

  useEffect(() => {
    setChart(choices[0])
    onChartChange(choices[0])
  }, [choices])

  return (
    <Container ref={node as any}>
      <ChartTitle clickable={choices.length > 1} active={open && choices.length > 1} onClick={toggle}>
        {chart ? (
          <>
            {chart.currencies instanceof Token ? (
              <div style={{ height: '28px', width: '28px' }}>
                <CurrencyLogo
                  currency={chart.currencies}
                  size={'28px'}
                  style={{ border: `2px solid ${theme.white}` }}
                />
              </div>
            ) : (
              <div style={{ position: 'relative', height: '28px', width: '46px' }}>
                <CurrencyLogo
                  currency={chart.currencies[0]}
                  size={'28px'}
                  style={{ border: `2px solid ${theme.white}` }}
                />
                <CurrencyLogo
                  currency={chart.currencies[1]}
                  size={'28px'}
                  style={{ position: 'absolute', left: '18px', border: `2px solid ${theme.white}` }}
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
          <TYPE.largeHeader fontSize={[18, 20]} fontWeight={600}>
            - / -
          </TYPE.largeHeader>
        )}
      </ChartTitle>
      {open && choices.length > 1 && (
        <MenuFlyout>
          {choices.map((choice: ChartOption, index: number) => (
            <MenuItem
              onClick={() => {
                onChartChange(choice)
                setChart(choice)
                toggle()
              }}
              active={choice === chart}
              key={index}
            >
              <Row style={{ gap: '4rem' }}>
                <Row style={{ gap: '0.75rem' }}>
                  <Row width={'38px'} style={{ position: 'relative' }}>
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
                          style={{ position: 'absolute', left: '14px', border: `2px solid ${theme.white}` }}
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
                  <div style={{ fontSize: '10px', minWidth: '60px', textAlign: 'right' }}>
                    {choice.price ? (
                      choice.currencies instanceof Token ? (
                        formatDollar({ num: choice.price, isPrice: true })
                      ) : (
                        formatTransactionAmount(Number(choice.price))
                      )
                    ) : choice.errorNoPrice ? (
                      <span style={{ color: theme.red1 }}>NO DATA</span>
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
                    {choice.change24H != undefined || choice.errorNoPrice ? (
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
    </Container>
  )
}
