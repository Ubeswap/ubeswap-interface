import { useApolloClient } from '@apollo/client'
import { Token } from '@ubeswap/sdk'
import { ParentSize } from '@visx/responsive'
import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

import { ChartOption } from './ChartSelector'
import { PriceChart, PricePoint } from './PriceChart'
import { getBlocksFromTimestamps, HOURLY_PAIR_RATES, splitQuery } from './queries'
import { LoadingChart } from './Skeleton'
import TimePeriodSelector, { isRestricted, TimePeriod } from './TimeSelector'

const ChartContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 6px 0;
  border: 0 solid ${({ theme }) => theme.bg4};
  border-bottom-width: 1px;
  height: 436px;
  margin-bottom: 16px;
  width: 100%;
  @media screen and (max-width: 1115px) {
    border: 0;
    padding-bottom: 20px;
    height: 330px;
    position: static;
  }
`

const TimeOptionsContainer = styled.div`
  position: absolute;
  margin-top: 12px;
  width: 100%;
  @media only screen and (max-width: 1115px) {
    position: fixed;
    display: flex;
    align-items: flex-end;
    bottom: 80px;
    left: 1rem;
    width: calc(100% - 2rem);
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

async function getCoingeckoPrice(id: string, t: TimePeriod, signal: any) {
  return await fetch(
    `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=USD&days=${toCoingeckoHistoryDuration(t)}`,
    { signal: signal }
  )
    .then((response) => (response.ok ? response.json() : Promise.reject(response)))
    .then((data) => data.prices)
    .then((prices) => (t == TimePeriod.HOUR ? prices.slice(-12) : prices))
    .then((prices) => prices.map((p: [number, number]) => ({ timestamp: p[0] / 1000, value: p[1] })))
    .catch((e) => console.log('Error:', e))
}

function toHourDuration(timePeriod: TimePeriod) {
  switch (timePeriod) {
    case TimePeriod.DAY:
      return [3600 * 24, 1] // 24 Points
    case TimePeriod.WEEK:
      return [3600 * 24 * 7, 4] // 42 Points
    case TimePeriod.MONTH:
      return [3600 * 24 * 31, 24] // 31 Points
    case TimePeriod.YEAR:
    default:
      return [3600 * 24 * 365, 219] // 73 Points
  }
}

async function getPairPrice(id: string, t: TimePeriod, gqlClient: any, token1: boolean, signal: any) {
  try {
    const [seconds, step] = toHourDuration(t)
    const utcEndTime = Math.round(new Date().getTime() / 1000)
    let time = utcEndTime - seconds

    // create an array of hour start times until we reach current hour
    const timestamps = []
    while (time <= utcEndTime - 3600 * step) {
      timestamps.push(time)
      time += 3600 * step
    }

    // once you have all the timestamps, get the blocks for each timestamp in a bulk query
    const blocks = await getBlocksFromTimestamps(timestamps, 100, { context: { fetchOptions: { signal } } })
    // catch failing case
    if (!blocks || blocks?.length === 0) {
      return []
    }

    const result = await splitQuery(HOURLY_PAIR_RATES, gqlClient, [id], blocks, 100, {
      context: { fetchOptions: { signal } },
    })

    const values = []
    for (const row in result) {
      const timestamp = row.split('t')[1]
      if (timestamp && result[row]) {
        values.push({
          timestamp: Number(timestamp),
          value: parseFloat(token1 ? result[row].token1Price : result[row].token0Price),
        })
      }
    }

    return values
  } catch (e) {
    console.log('Error:', e)
  }
}

const defaultTimePeriod = TimePeriod.DAY
export default function ChartSection({ chart }: { chart: ChartOption | undefined }) {
  const [chartSetting, setChartSetting] = useState<[PricePoint[] | null, TimePeriod, boolean]>([
    null,
    defaultTimePeriod,
    false,
  ])
  const controllerRef = useRef<AbortController | null>()

  const client = useApolloClient()
  const restrictTimeFrame = !(chart?.currencies instanceof Token)

  const fetchPrice = async (ch: ChartOption | undefined, ti: TimePeriod) => {
    if (controllerRef.current) {
      controllerRef.current.abort()
    }
    const controller = new AbortController()
    controllerRef.current = controller
    const signal = controllerRef.current?.signal

    if (ch?.coingeckoID) {
      return getCoingeckoPrice(ch?.coingeckoID, ti, signal).then((coingeckoPrices) => {
        setChartSetting([coingeckoPrices, ti, false])
      })
    } else if (ch?.pairID) {
      return getPairPrice(
        ch?.pairID,
        ti,
        client,
        ch.currencies[0].address.toLowerCase() > ch.currencies[1].address.toLowerCase(),
        signal
      ).then((graphqlPrices) => {
        setChartSetting([graphqlPrices, ti, false])
      })
    }
  }
  useEffect(() => {
    setChartSetting([chartSetting[0], isRestricted(chartSetting[1]) ? defaultTimePeriod : chartSetting[1], true])
    fetchPrice(chart, chartSetting[1])
  }, [chart?.currencies])

  if (chartSetting[2]) {
    return (
      <ChartContainer>
        <ParentSize>{(parent) => <LoadingChart width={parent.width} height={parent.height} />}</ParentSize>
        <TimeOptionsContainer>
          <TimePeriodSelector
            currentTimePeriod={chartSetting[1]}
            onTimeChange={(t: TimePeriod) => {
              fetchPrice(chart, t)
            }}
            restrict={restrictTimeFrame}
          />
        </TimeOptionsContainer>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer>
      <ParentSize>
        {(parent) => (
          <PriceChart
            prices={chartSetting[0] ?? null}
            width={parent.width}
            height={parent.height}
            isDollar={chart?.currencies instanceof Token}
            timePeriod={chartSetting[1]}
          />
        )}
      </ParentSize>
      <TimeOptionsContainer>
        <TimePeriodSelector
          currentTimePeriod={chartSetting[1]}
          onTimeChange={(t: TimePeriod) => {
            setChartSetting([chartSetting[0], chartSetting[1], true])
            fetchPrice(chart, t)
          }}
          restrict={restrictTimeFrame}
        />
      </TimeOptionsContainer>
    </ChartContainer>
  )
}
