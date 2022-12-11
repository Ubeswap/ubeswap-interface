import React from 'react'
import styled from 'styled-components'

const HeaderCell = styled.th`
  padding: 0 6px;
  font-size: 12px;
  &:first-child {
    padding-left: 12px;
  }
  &:last-child {
    padding-right: 12px;
  }
`

export type HistoryColumn = {
  label: string
  size: number
}

export const LimitOrderHistoryHead = ({ columns }: { columns: HistoryColumn[] }) => {
  return (
    <thead>
      <tr>
        {columns.map((c: HistoryColumn) => {
          return (
            <HeaderCell colSpan={c.size} key={c.label}>
              {c.label}
            </HeaderCell>
          )
        })}
      </tr>
    </thead>
  )
}

export default LimitOrderHistoryHead
