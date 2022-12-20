import { useContractKit } from '@celo-tools/use-contractkit'
import Column from 'components/Column'
import CurrencyLogo from 'components/CurrencyLogo'
import { BigNumber } from 'ethers'
import { useToken } from 'hooks/Tokens'
import { LimitOrdersHistory } from 'pages/LimitOrder/useOrderBroadcasted'
import React from 'react'
import styled from 'styled-components'
import { formatTransactionAmount } from 'utils/formatNumbers'

import useTheme from '../../hooks/useTheme'
import { useCancelOrderCallback } from '../../pages/LimitOrder/useCancelOrderCallback'
import { ExternalLink, LinkIcon, TrashIcon, TYPE } from '../../theme'
import Row, { RowCenter, RowFlat } from '../Row'

const ItemCell = styled.td`
  font-size: 12px;
  padding: 6px;
  border-style: solid;
  border-width: 1px 0px;
  border-color: ${({ theme }) => theme.bg4};
  background: ${({ theme }) => theme.bg1};
  &:first-child {
    padding-left: 12px;
    border-left-width: 1px;
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
  }
  &:last-child {
    padding-right: 12px;
    border-right-width: 1px;
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
    text-align: right;
  }
`

const ProgressBarContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
  justify-content: flex-end;
  cursor: default;
  position: relative;
  :hover .remaining {
    opacity: 1;
  }
  .remaining {
    transition: opacity 0.1s ease-in-out;
    opacity: 0;
    background: ${({ theme }) => theme.bg1};
    border: 1px solid ${({ theme }) => theme.bg5};
    box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
      0px 24px 32px rgba(0, 0, 0, 0.01);
    border-radius: 4px;
    white-space: nowrap;
    font-weight: bold;
    font-size: 10px;
    text-align: center;
    min-width: 60px;
    padding: 0px 6px;
    position: absolute;
    right: 0;
    bottom: -4px;
    z-index: 10;
  }
`

const AddressLinkIcon = styled(ExternalLink)`
  all: unset;
  cursor: pointer;
  svg {
    height: 12px;
    width: 12px;
    margin-left: unset;
    stroke: ${({ theme }) => theme.blue1};
    &:hover {
      opacity: 0.7;
    }
  }
`

const AddressLink = styled(ExternalLink)`
  border: 1px solid ${({ theme }) => theme.green1};
  color: ${({ theme }) => theme.green1};
  white-space: nowrap;
  padding: 2px 4px;
  border-radius: 6px;
  transition: all 100ms ease-in-out;
  :hover,
  :focus,
  :active {
    text-decoration: none;
    background: ${({ theme }) => theme.green1};
    color: ${({ theme }) => theme.white};
  }
`

const StyledControlButton = styled.button`
  all: unset;
  svg {
    height: 12px;
    width: 12px;
    margin-left: unset;
    stroke: ${({ theme }) => theme.red1};
  }
`

export type HistoryItem = {
  orderHash: string
  makingAmount: BigNumber
  takingAmount: BigNumber
  makerAsset: string
  takerAsset: string
  remaining: BigNumber
  isOrderOpen: boolean
  transactionHash: string
}

interface LimitOrderHistoryItemProps {
  item: HistoryItem
}

export const calculatePrice = (order: LimitOrdersHistory, takerDecimals: number, makerDecimals: number) => {
  return (
    Number(order.takingAmount.div(BigNumber.from(10).pow(BigNumber.from(takerDecimals)))) /
    Number(order.makingAmount.div(BigNumber.from(10).pow(BigNumber.from(makerDecimals))))
  )
}

export default function LimitOrderHistoryItem({ item }: LimitOrderHistoryItemProps) {
  const { network } = useContractKit()
  const { callback: cancelOrder } = useCancelOrderCallback(item.orderHash)
  const theme = useTheme()
  const makerToken = useToken(item.makerAsset)
  const takerToken = useToken(item.takerAsset)

  const transactionLink = `${network.explorer}/tx/${item.transactionHash}`

  if (!makerToken || !takerToken) {
    return null
  }

  return (
    <tr>
      <ItemCell style={{ width: '175px' }}>
        <RowCenter style={{ gap: '5px', flexWrap: 'nowrap' }}>
          <CurrencyLogo currency={makerToken} size={'30px'} style={{ border: `2px solid ${theme.white}` }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{makerToken.symbol}</div>
            <div>{formatTransactionAmount(Number(item.makingAmount) / 10 ** makerToken.decimals)}</div>
          </div>
        </RowCenter>
      </ItemCell>
      <ItemCell style={{ width: '45px' }}>
        <TYPE.body color={theme.text1}>&#10140;</TYPE.body>
      </ItemCell>
      <ItemCell style={{ width: '175px' }}>
        <RowCenter style={{ gap: '5px', flexWrap: 'nowrap' }}>
          <CurrencyLogo currency={takerToken} size={'30px'} style={{ border: `2px solid ${theme.white}` }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{takerToken.symbol}</div>
            <div>{formatTransactionAmount(Number(item.takingAmount) / 10 ** takerToken.decimals)}</div>
          </div>
        </RowCenter>
      </ItemCell>
      <ItemCell>
        {formatTransactionAmount(calculatePrice(item, takerToken.decimals, makerToken.decimals))} {takerToken.symbol}
      </ItemCell>
      <ItemCell style={{ width: '120px' }}>
        {item.isOrderOpen ? (
          <Row style={{ justifyContent: 'flex-end', gap: '8px' }}>
            <RowFlat style={{ gap: '8px' }}>
              <ProgressBarContainer>
                <span>
                  {(((Number(item.makingAmount) - Number(item.remaining)) / Number(item.makingAmount)) * 100).toFixed(
                    2
                  )}
                  %
                </span>
                <span className="remaining">
                  <span>{(Number(item.makingAmount) - Number(item.remaining)) / 10 ** makerToken.decimals}</span> /{' '}
                  <span>{Number(item.makingAmount) / 10 ** makerToken.decimals}</span>
                </span>
                <div
                  style={{
                    width: '50px',
                    background: theme.bg3,
                    height: '8px',
                    padding: '2px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      background: theme.primary1,
                      borderRadius: '2px',
                      height: '100%',
                      width: `${
                        ((Number(item.makingAmount) - Number(item.remaining)) / Number(item.makingAmount)) * 100
                      }%`,
                      filter: `contrast(200%)`,
                    }}
                  ></div>
                </div>
              </ProgressBarContainer>
            </RowFlat>
            <Column style={{ alignItems: 'flex-end' }}>
              <AddressLinkIcon href={transactionLink}>
                <LinkIcon />
              </AddressLinkIcon>
              <StyledControlButton onClick={() => cancelOrder && cancelOrder()}>
                <TrashIcon />
              </StyledControlButton>
            </Column>
          </Row>
        ) : (
          <AddressLink href={transactionLink}>View Tx</AddressLink>
        )}
      </ItemCell>
    </tr>
  )
}
