import Row from 'components/Row'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

const TimeOptionsContainer = styled.div`
  display: flex;
  gap: 4px;
  width: fit-content;
  justify-content: space-between;
  @media screen and (max-width: 1115px) {
    width: 100%;
  }
`

const TimeButton = styled.button<{ active: boolean }>`
  flex: 1;
  font-weight: 600;
  font-size: 12px;
  background-color: ${({ theme, active }) => (active ? theme.bg1 : 'transparent')};
  border: 1px solid ${({ theme, active }) => (active ? theme.bg4 : 'transparent')};
  color: ${({ theme, active }) => (active ? theme.text1 : theme.text2)};
  padding: 2px 12px;
  border-radius: 4px;
  cursor: pointer;
  min-width: 47px;
  transition: all 200ms ease-in-out;
  ${({ active }) =>
    active &&
    `box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 2px 2px rgba(0, 0, 0, 0.04), 0px 2px 2px rgba(0, 0, 0, 0.04),
    0px 2px 2px rgba(0, 0, 0, 0.01);`}
  :hover, :active {
    background-color: ${({ theme }) => theme.bg1};
    color: ${({ theme }) => theme.text1};
  }
  :hover {
    ${({ active }) => !active && `opacity: 0.7;`}
  }
  :active {
    opacity: 1;
    box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 2px 2px rgba(0, 0, 0, 0.04), 0px 2px 2px rgba(0, 0, 0, 0.04),
      0px 2px 2px rgba(0, 0, 0, 0.01);
  }
  @media screen and (max-width: 1115px) {
    padding: 2px;
  }
`

export enum TimePeriod {
  HOUR,
  DAY,
  WEEK,
  MONTH,
  YEAR,
  ALL,
}

export const defaultTimePeriod = TimePeriod.MONTH

const DISPLAYS: Record<TimePeriod, string> = {
  [TimePeriod.HOUR]: '1H',
  [TimePeriod.DAY]: '1D',
  [TimePeriod.WEEK]: '1W',
  [TimePeriod.MONTH]: '1M',
  [TimePeriod.YEAR]: '1Y',
  [TimePeriod.ALL]: 'ALL',
}

const ORDERED_TIMES: TimePeriod[] = [
  TimePeriod.HOUR,
  TimePeriod.DAY,
  TimePeriod.WEEK,
  TimePeriod.MONTH,
  TimePeriod.YEAR,
  TimePeriod.ALL,
]

// Restricted on Pair Chart
export function isRestricted(timePeriod: TimePeriod): boolean {
  return [TimePeriod.HOUR, TimePeriod.ALL].includes(timePeriod)
}

export default function TimePeriodSelector({
  onTimeChange,
  restrict,
}: {
  onTimeChange: (t: TimePeriod) => void
  restrict: boolean
}) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(defaultTimePeriod)

  useEffect(() => {
    setTimePeriod(isRestricted(timePeriod) && restrict ? defaultTimePeriod : timePeriod)
  }, [restrict])

  return (
    <Row justify="flex-end" style={{ overflowX: 'auto' }}>
      <TimeOptionsContainer>
        {ORDERED_TIMES.map(
          (time: TimePeriod) =>
            !(isRestricted(time) && restrict) && (
              <TimeButton
                key={DISPLAYS[time]}
                active={timePeriod === time}
                onClick={() => {
                  onTimeChange(time)
                  setTimePeriod(time)
                }}
              >
                {DISPLAYS[time]}
              </TimeButton>
            )
        )}
      </TimeOptionsContainer>
    </Row>
  )
}
