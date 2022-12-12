import React from 'react'
import styled from 'styled-components'

const HeaderCell = styled.th`
  font-weight: 500;
  padding: 0 6px;
  font-size: 12px;
  span {
    width: 100%;
    display: flex;
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

export type HistoryColumn = {
  label: string
  size: number
}

export default function LimitOrderHistoryHead({ columns }: { columns: HistoryColumn[] }) {
  return (
    <thead>
      <tr>
        {columns.map((c: HistoryColumn, index: number) => {
          return (
            <HeaderCell colSpan={c.size} key={index}>
              <span>{c.label}</span>
            </HeaderCell>
          )
        })}
      </tr>
    </thead>
  )
}
