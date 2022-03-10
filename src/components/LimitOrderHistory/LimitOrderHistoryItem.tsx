import { useContractKit } from '@celo-tools/use-contractkit'
import { ChainId, TokenAmount } from '@ubeswap/sdk'
import { BigNumber } from 'ethers'
import { useToken } from 'hooks/Tokens'
import { BPS_DENOMINATOR, LIMIT_ORDER_FEE_BPS } from 'pages/LimitOrder'
import React, { useEffect, useState } from 'react'
import { ExternalLink as LinkIcon } from 'react-feather'
import styled from 'styled-components'

import useTheme from '../../hooks/useTheme'
import { useCancelOrderCallback } from '../../pages/LimitOrder/useCancelOrderCallback'
import { ExternalLink, TYPE } from '../../theme'
import { RowFlat } from '../Row'

const Container = styled.div`
  background-color: ${({ theme }) => theme.bg1};
  margin-bottom: 2rem;
  padding-left: 0.5rem;
`

const SymbolContainer = styled.div`
  width: 75%;
`

const AssetSymbol = styled.div`
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.primary5};
  padding: 0.5rem;
`

const AssetRow = styled(RowFlat)`
  margin-bottom: 0.5rem;
`
const SellText = styled.div`
  font-weight: 700;
  margin-top: 0.25rem;
`

const OrderToFill = styled.div`
  font-weight: 300;
  font-size: 14px;
  margin-top: 0.25rem;
`

const StyledControlButton = styled.button`
  height: 24px;
  background-color: ${({ theme }) => theme.red1};
  border: 1px solid ${({ theme }) => theme.red2};
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  margin-left: 7rem;
  margin-right: 2rem;
  color: white;
  :hover {
    border: 1px solid ${({ theme }) => theme.red3};
  }
  :focus {
    border: 1px solid ${({ theme }) => theme.red3};
    outline: none;
  }

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    margin-left: 0.4rem;
    margin-right: 0.1rem;
  `};
`

const AddressLink = styled(ExternalLink)`
  font-size: 0.825rem;
  color: ${({ theme }) => theme.text3};
  border-radius: 12px;
  width: 45%;
  padding: 0.25rem;
  margin-top: 0.5rem;
  border: 1px solid ${({ theme }) => theme.primary5};
  font-size: 0.825rem;
  display: flex;
  :hover {
    color: ${({ theme }) => theme.text2};
  }
`

const BaselineRow = styled(AssetRow)`
  align-items: baseline;
`

interface LimitOrderHistoryItemProps {
  item: {
    orderHash: string
    makingAmount: BigNumber
    takingAmount: BigNumber
    makerAsset: string
    takerAsset: string
    remaining: BigNumber
    isOrderOpen: boolean
    transactionHash: string
  }
}

export default function LimitOrderHistoryItem({ item }: LimitOrderHistoryItemProps) {
  const { callback: cancelOrder } = useCancelOrderCallback(item.orderHash)
  const { network } = useContractKit()
  const chainId = network.chainId as unknown as ChainId
  const theme = useTheme()
  const makerToken = useToken(item.makerAsset)
  const takerToken = useToken(item.takerAsset)

  const [transactionLink, setTransactionLink] = useState('')

  useEffect(() => {
    if (chainId === ChainId.ALFAJORES) {
      setTransactionLink(`https://alfajores-blockscout.celo-testnet.org/tx/${item.transactionHash}`)
    }
    if (chainId === ChainId.MAINNET) {
      setTransactionLink(`https://explorer.celo.org/tx/${item.transactionHash}`)
    }
  }, [item, chainId])

  if (!makerToken || !takerToken) {
    return null
  }

  const makingAmount = new TokenAmount(makerToken, item.makingAmount.toString())
  const takingAmount = new TokenAmount(takerToken, item.takingAmount.toString())
  const remaining = new TokenAmount(makerToken, item.remaining.toString())

  return (
    <Container>
      <BaselineRow>
        <SymbolContainer>
          <AssetRow>
            <AssetSymbol>{makerToken.symbol}</AssetSymbol>
            <TYPE.body
              color={theme.text2}
              style={{ display: 'inline', marginLeft: '10px', marginRight: '10px', paddingBottom: '0.5rem' }}
            >
              &#10140;
            </TYPE.body>
            <AssetSymbol>{takerToken.symbol}</AssetSymbol>
          </AssetRow>
        </SymbolContainer>
        {item.isOrderOpen && (
          <StyledControlButton onClick={() => cancelOrder && cancelOrder()}>Cancel</StyledControlButton>
        )}
      </BaselineRow>
      <SellText>
        {makingAmount.toSignificant(4)} {makerToken.symbol} for {takingAmount.toSignificant(4)} {takerToken.symbol}
      </SellText>
      {item.isOrderOpen && (
        <OrderToFill>
          Remaining Order to Fill: {remaining.toSignificant(4)} {makerToken.symbol}
        </OrderToFill>
      )}
      <OrderToFill>
        Order Placement Fee:{' '}
        {makingAmount.multiply(LIMIT_ORDER_FEE_BPS.toString()).divide(BPS_DENOMINATOR.toString()).toSignificant(4)}{' '}
        {makerToken.symbol}
      </OrderToFill>
      {item.isOrderOpen && (
        <AddressLink href={transactionLink}>
          <LinkIcon size={16} />
          <span style={{ marginLeft: '4px' }}>View Transaction</span>
        </AddressLink>
      )}
    </Container>
  )
}
