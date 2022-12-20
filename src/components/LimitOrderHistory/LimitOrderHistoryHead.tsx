import React, { useState } from 'react'
import { ArrowDown, ArrowUp } from 'react-feather'
import styled from 'styled-components'

const HeaderCell = styled.th<{ clickable: boolean }>`
  font-weight: 500;
  padding: 0 6px;
  font-size: 12px;
  button {
    all: unset;
    width: 100%;
    display: flex;
    gap: 4px;
    align-items: center;
    cursor: ${({ clickable }) => (clickable ? 'pointer' : 'default')};
  }
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

function getArrow(order: Order) {
  if (order === Order.ASC) {
    return <ArrowUp size={12} key="arrow-up" />
  }
  return <ArrowDown size={12} key="arrow-down" />
}

type HistoryColumn = {
  label: string
  size: number
  accessor?: Field
}

export enum Order {
  ASC,
  DESC,
}

export enum Field {
  PAY,
  RECEIVE,
  RATE,
  STATUS,
}

export type Sort = {
  field: Field | null
  order: Order
}

export const defaultSort: Sort = {
  field: null,
  order: Order.ASC,
}
/*
  TODO to add sorting:
  - Add accessors to columns  
  - Fix sortOrders() function on useOrderBroadcasted.tsx
*/
const columns: HistoryColumn[] = [
  { label: 'Pay', size: 2 }, // , accessor: Field.PAY
  { label: 'Receive', size: 1 }, // , accessor: Field.RECEIVE
  { label: 'Rate', size: 1 }, // , accessor: Field.RATE
  { label: 'Status', size: 1 }, // , accessor: Field.STATUS
]

export default function LimitOrderHistoryHead({ onSortChange }: { onSortChange: (s: Sort) => void }) {
  const [sort, setSort] = useState<Sort>(defaultSort)
  const arrow = getArrow(sort.order)

  const handleSortingChange = (accessor: Field) => {
    const order = accessor === sort.field && sort.order === Order.ASC ? Order.DESC : Order.ASC
    const s: Sort = { field: accessor, order: order }
    onSortChange(s)
    setSort(s)
  }

  return (
    <thead>
      <tr>
        {columns.map(({ label, size, accessor }, index) => (
          <HeaderCell
            colSpan={size}
            key={index}
            onClick={() => accessor != null && handleSortingChange(accessor)}
            clickable={accessor != null}
          >
            <button>
              {label} {sort.field === accessor && arrow}
            </button>
          </HeaderCell>
        ))}
      </tr>
    </thead>
  )
}
