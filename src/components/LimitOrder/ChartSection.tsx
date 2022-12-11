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
  @media screen and (max-width: 1115px) {
    border: 0;
  }
`

const TimeOptionsContainer = styled.div`
  position: absolute;
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
  const [chartSetting, setChartSetting] = useState<[PricePoint[] | null, TimePeriod]>([null, TimePeriod.MONTH])

  const fetchPrice = (ch: ChartOption | undefined, ti: TimePeriod) => {
    if (ch?.coingeckoID) {
      return getCoingeckoPrice(ch?.coingeckoID, ti).then((coingeckoPrices) => setChartSetting([coingeckoPrices, ti]))
    }
  }

  useEffect(() => {
    fetchPrice(chart, chartSetting[1])
  }, [chart])

  return (
    <ChartContainer>
      <ParentSize>
        {(parent) => (
          <PriceChart
            prices={chartSetting[0] ?? null}
            width={parent.width}
            height={parent.height}
            timePeriod={chartSetting[1]}
          />
        )}
      </ParentSize>
      <TimeOptionsContainer>
        <TimePeriodSelector
          currentTimePeriod={chartSetting[1]}
          onTimeChange={(t: TimePeriod) => {
            fetchPrice(chart, t)
          }}
        />
      </TimeOptionsContainer>
    </ChartContainer>
  )
}
