import Column from 'components/Column'
import { LoadingBubble } from 'components/LimitOrder/loading'
import Row, { RowCenter } from 'components/Row'
import React from 'react'
import styled, { useTheme } from 'styled-components'
import { TYPE } from 'theme'

const HeaderCell = styled.div`
  padding: 0 6px;
  height: 15px;
  &:first-child {
    padding-left: 12px;
  }
  &:last-child {
    padding-right: 12px;
    button {
      flex-direction: row-reverse;
    }
  }
`

export function LoadingHead() {
  return (
    <Row>
      <HeaderCell style={{ minWidth: '131px', maxWidth: '220px', width: '100%' }}>
        <LoadingBubble height={12} width={50} />
      </HeaderCell>
      <HeaderCell style={{ minWidth: '97px', maxWidth: '175px', width: '100%' }}>
        <LoadingBubble height={12} width={50} />
      </HeaderCell>
      <HeaderCell style={{ minWidth: '92px', maxWidth: '120px', width: '100%' }}>
        <LoadingBubble height={12} width={50} />
      </HeaderCell>
      <HeaderCell style={{ flex: '1' }}>
        <Column style={{ alignItems: 'flex-end' }}>
          <LoadingBubble height={12} width={50} />
        </Column>
      </HeaderCell>
    </Row>
  )
}

const ItemContent = styled.div`
  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);
  display: flex;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.bg4};
  background: ${({ theme }) => theme.bg1};
  border-radius: 8px;
  overflow: hidden;
`

const ItemCell = styled.div`
  padding: 6px;
  &:first-child {
    padding-left: 12px;
  }
  &:last-child {
    padding-right: 12px;
  }
`

export function LoadingItem() {
  const theme = useTheme()

  return (
    <ItemContent>
      <ItemCell style={{ width: '175px' }}>
        <RowCenter style={{ gap: '5px', flexWrap: 'nowrap' }}>
          <LoadingBubble height={30} width={30} style={{ borderRadius: '50%' }} />
          <Column style={{ justifyContent: 'space-between', height: '28px' }}>
            <LoadingBubble height={12} width={35} />
            <LoadingBubble height={12} width={50} />
          </Column>
        </RowCenter>
      </ItemCell>
      <ItemCell style={{ width: '45px' }}>
        <Column style={{ justifyContent: 'center', height: '30px' }}>
          <TYPE.body color={theme.text1}>&#10140;</TYPE.body>
        </Column>
      </ItemCell>
      <ItemCell style={{ width: '175px' }}>
        <RowCenter style={{ gap: '5px', flexWrap: 'nowrap' }}>
          <LoadingBubble height={30} width={30} />
          <Column style={{ justifyContent: 'space-between', height: '30px' }}>
            <LoadingBubble height={12} width={35} />
            <LoadingBubble height={12} width={50} />
          </Column>
        </RowCenter>
      </ItemCell>
      <ItemCell style={{ width: '120px' }}>
        <Column style={{ justifyContent: 'center', height: '30px' }}>
          <LoadingBubble height={12} width={80} />
        </Column>
      </ItemCell>
      <ItemCell style={{ flex: '1' }}>
        <Column style={{ justifyContent: 'space-between', alignItems: 'flex-end', height: '30px' }}>
          <LoadingBubble height={12} width={35} />
          <LoadingBubble height={12} width={60} />
        </Column>
      </ItemCell>
    </ItemContent>
  )
}
