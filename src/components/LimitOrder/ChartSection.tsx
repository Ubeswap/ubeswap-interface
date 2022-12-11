import { ParentSize } from '@visx/responsive'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

import { ChartOption } from './ChartSelector'
import { PriceChart, PricePoint } from './PriceChart'
import TimePeriodSelector, { TimePeriod } from './TimeSelector'

const ChartContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 10px 0;
  border: 0 solid ${({ theme }) => theme.bg4};
  border-bottom-width: 1px;
  height: 436px;
  margin-bottom: 16px;
  width: 100%;
`

const TimeOptionsContainer = styled.div`
  position: absolute;
  margin-top: 16px;
  width: 100%;
  @media only screen and (max-width: 1115px) {
    position: static;
  }
`

function toCoingeckoHistoryDuration(timePeriod: TimePeriod) {
  switch (timePeriod) {
    case TimePeriod.HOUR:
      return '1'
    case TimePeriod.DAY:
      return '1'
    case TimePeriod.WEEK:
      return '7'
    case TimePeriod.MONTH:
      return '31'
    case TimePeriod.YEAR:
      return '365'
    case TimePeriod.ALL:
      return 'max'
  }
}

async function getCoingeckoPrice(id: string, t: TimePeriod) {
  return await fetch(
    `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=USD&days=${toCoingeckoHistoryDuration(t)}`
  )
    .then((response) => (response.ok ? response.json() : Promise.reject(response)))
    .then((data) => data.prices)
    .then((prices) => (t == TimePeriod.HOUR ? prices.slice(-12) : prices))
    .then((prices) => prices.map((p: [number, number]) => ({ timestamp: p[0] / 1000, value: p[1] })))
}

export default function ChartSection({ chart }: { chart: ChartOption | undefined }) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(TimePeriod.MONTH)
  const [prices, setPrices] = useState<PricePoint[] | null>(null)

  useEffect(() => {
    if (chart?.coingeckoID) {
      getCoingeckoPrice(chart?.coingeckoID, timePeriod).then((coingeckoPrices) => setPrices(coingeckoPrices))
    }
  }, [chart, timePeriod])

  return (
    <ChartContainer>
      <ParentSize>
        {(parent) => (
          <PriceChart prices={prices ?? null} width={parent.width} height={parent.height} timePeriod={timePeriod} />
        )}
      </ParentSize>
      <TimeOptionsContainer>
        <TimePeriodSelector
          currentTimePeriod={timePeriod}
          onTimeChange={(t: TimePeriod) => {
            setTimePeriod(t)
          }}
        />
      </TimeOptionsContainer>
    </ChartContainer>
  )
}
