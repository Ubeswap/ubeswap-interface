import { useContractKit } from '@celo-tools/use-contractkit'
import { ChainId as UbeswapChainId, JSBI, Token, TokenAmount } from '@ubeswap/sdk'
import Column from 'components/Column'
import CurrencyLogo from 'components/CurrencyLogo'
import { BigNumber } from 'ethers'
import { useToken } from 'hooks/Tokens'
import { useOrderBookContract, useOrderBookRewardDistributorContract } from 'hooks/useContract'
import { BPS_DENOMINATOR } from 'pages/LimitOrder'
import React from 'react'
import { useSingleCallResult } from 'state/multicall/hooks'
import styled from 'styled-components'
import { formatTransactionAmount } from 'utils/formatNumbers'

import { ORDER_BOOK_ADDRESS, ORDER_BOOK_REWARD_DISTRIBUTOR_ADDRESS } from '../../constants'
import useTheme from '../../hooks/useTheme'
import { useCancelOrderCallback } from '../../pages/LimitOrder/useCancelOrderCallback'
import { ExternalLink, LinkIcon, TrashIcon, TYPE } from '../../theme'
import Row, { RowCenter, RowFlat } from '../Row'

const ItemContent = styled.tr`
  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);
`
const ItemCell = styled.td`
  font-size: 12px;
  padding: 6px;
  border-style: solid;
  border-width: 1px 0px;
  border-color: ${({ theme }) => theme.bg5};
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
const AddressLink = styled(ExternalLink)`
  all: unset;
  cursor: pointer;
  svg {
    height: 12px;
    width: 12px;
    margin-left: unset;
    stroke: ${({ theme }) => theme.blue1};
    filter: contrast(125%);
    &:hover {
      opacity: 0.7;
    }
  }
`

const StyledControlButton = styled.button`
  all: unset;
  svg {
    height: 12px;
    width: 12px;
    margin-left: unset;
    stroke: ${({ theme }) => theme.red1};
    filter: contrast(120%);
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
  rewardCurrency: Token | undefined
  lastDisplayItem: boolean
}

export default function LimitOrderHistoryItem({ item, rewardCurrency, lastDisplayItem }: LimitOrderHistoryItemProps) {
  const { network } = useContractKit()
  const chainId = network.chainId as unknown as UbeswapChainId
  const { callback: cancelOrder } = useCancelOrderCallback(item.orderHash)
  const theme = useTheme()
  const makerToken = useToken(item.makerAsset)
  const takerToken = useToken(item.takerAsset)

  const transactionLink = `${network.explorer}/tx/${item.transactionHash}`

  const orderBookContract = useOrderBookContract(ORDER_BOOK_ADDRESS[chainId as unknown as UbeswapChainId])
  const orderBookFee = useSingleCallResult(orderBookContract, 'fee', []).result?.[0]
  const rewardDistributorContract = useOrderBookRewardDistributorContract(
    ORDER_BOOK_REWARD_DISTRIBUTOR_ADDRESS[chainId]
  )
  // TODO: This should really be based on the latest rewardRate change event from the logs
  const rewardRate = useSingleCallResult(rewardDistributorContract, 'rewardRate', [makerToken?.address]).result?.[0]

  if (!makerToken || !takerToken) {
    return null
  }

  const makingAmount = new TokenAmount(makerToken, item.makingAmount.toString())
  const reward =
    rewardCurrency && rewardRate
      ? new TokenAmount(
          rewardCurrency,
          JSBI.divide(JSBI.multiply(makingAmount.raw, JSBI.BigInt(rewardRate.toString())), BPS_DENOMINATOR)
        )
      : undefined
  const takingAmount = new TokenAmount(takerToken, item.takingAmount.toString())
  const remaining = new TokenAmount(makerToken, item.remaining.toString())

  return (
    <ItemContent>
      <ItemCell style={{ width: '175px' }}>
        <RowCenter style={{ gap: '5px' }}>
          <CurrencyLogo currency={makerToken} size={'30px'} style={{ border: `2px solid ${theme.white}` }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{makerToken.symbol}</div>
            <div>{formatTransactionAmount(Number(item.makingAmount / 10 ** makerToken.decimals))}</div>
          </div>
        </RowCenter>
      </ItemCell>
      <ItemCell style={{ width: '45px' }}>
        <TYPE.body color={theme.text1}>&#10140;</TYPE.body>
      </ItemCell>
      <ItemCell style={{ width: '175px' }}>
        <RowCenter style={{ gap: '5px' }}>
          <CurrencyLogo currency={takerToken} size={'30px'} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{takerToken.symbol}</div>
            <div>{formatTransactionAmount(Number(item.takingAmount / 10 ** takerToken.decimals))}</div>
          </div>
        </RowCenter>
      </ItemCell>
      <ItemCell>
        {formatTransactionAmount(
          Number(item.makingAmount / 10 ** makerToken.decimals) / Number(item.takingAmount / 10 ** takerToken.decimals)
        )}{' '}
        {takerToken.symbol}
      </ItemCell>
      {item.isOrderOpen && (
        <ItemCell style={{ width: '120px' }}>
          <Row style={{ justifyContent: 'flex-end', gap: '8px' }}>
            <RowFlat style={{ gap: '8px' }}>
              <ProgressBarContainer>
                <span>{Number(((item.makingAmount - item.remaining) / item.makingAmount) * 100).toFixed(2)}%</span>
                <span className="remaining">
                  <span>{Number((item.makingAmount - item.remaining) / 10 ** makerToken.decimals)}</span> /{' '}
                  <span>{Number(item.makingAmount / 10 ** makerToken.decimals)}</span>
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
                      width: `${Number(((item.makingAmount - item.remaining) / item.makingAmount) * 100)}%`,
                      filter: `contrast(200%)`,
                    }}
                  ></div>
                </div>
              </ProgressBarContainer>
            </RowFlat>
            <Column style={{ alignItems: 'flex-end' }}>
              <AddressLink href={transactionLink}>
                <LinkIcon />
              </AddressLink>
              <StyledControlButton onClick={() => cancelOrder && cancelOrder()}>
                <TrashIcon />
              </StyledControlButton>
            </Column>
          </Row>
        </ItemCell>
      )}
    </ItemContent>
  )
}
