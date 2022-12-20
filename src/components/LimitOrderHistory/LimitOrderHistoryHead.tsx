import React from 'react'
import styled from 'styled-components'

const HeaderCell = styled.th`
  font-weight: 500;
  padding: 0 6px;
  font-size: 12px;
  span {
    width: 100%;
    display: flex;
    align-items: center;
    cursor: default;
  }
  &:first-child {
    padding-left: 12px;
  }
  &:last-child {
    padding-right: 12px;
    span {
      flex-direction: row-reverse;
    }
  }
`

type HistoryColumn = {
  label: string
  size: number
}

const columns: HistoryColumn[] = [
  { label: 'Pay', size: 2 },
  { label: 'Receive', size: 1 },
  { label: 'Rate', size: 1 },
  { label: 'Status', size: 1 },
]

export default function LimitOrderHistoryHead() {
  return (
    <thead>
      <tr>
        {columns.map(({ label, size }) => (
          <HeaderCell colSpan={size} key={label}>
            <span>{label}</span>
          </HeaderCell>
        ))}
      </tr>
    </thead>
  )
}
