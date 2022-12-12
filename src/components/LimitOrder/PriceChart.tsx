import { AxisBottom, TickFormatter } from '@visx/axis'
import { localPoint } from '@visx/event'
import { EventType } from '@visx/event/lib/types'
import { GlyphCircle } from '@visx/glyph'
import { Group } from '@visx/group'
import { Line } from '@visx/shape'
import AnimatedInLineChart from 'components/Chart/AnimatedInLineChart'
import Column from 'components/Column'
import Row from 'components/Row'
import { bisect, curveCardinal, NumberValue, scaleLinear, timeDay, timeHour, timeMinute, timeMonth } from 'd3'
import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, TrendingUp } from 'react-feather'
import styled, { ThemeContext, useTheme } from 'styled-components'
import {
  dayHourFormatter,
  hourFormatter,
  monthDayFormatter,
  monthTickFormatter,
  monthYearDayFormatter,
  monthYearFormatter,
  weekFormatter,
} from 'utils/formatChartTimes'
import { formatDelta, formatDollar, formatTransactionAmount } from 'utils/formatNumbers'

import { TimePeriod } from './TimeSelector'

export const TokenPrice = styled.span`
  font-size: 36px;
  line-height: 44px;
`
const ArrowCell = styled.div`
  display: flex;
  height: 16px;
  width: 16px;
  margin-left: 4px;
`

const DeltaCell = styled.div<{
  positive: boolean
}>`
  background-color: ${({ theme }) =>
    ({ positive }) =>
      positive ? theme.green1 : theme.red1};
  color: ${({ theme }) => theme.white};
  font-size: 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  min-width: 60px;
  padding: 0 4px;
  box-sizing: content-box;
  justify-content: center;
  height: 16px;
`
const TimeCell = styled.div`
  color: ${({ theme }) => theme.text2};
  display: flex;
  height: 16px;
  font-size: 12px;
  padding-left: 8px;
  font-weight: bold;
`

const StyledUpArrow = styled(ArrowUpRight)`
  color: ${({ theme }) => theme.green1};
  height: 16px;
`
const StyledDownArrow = styled(ArrowDownRight)`
  color: ${({ theme }) => theme.red1};
  height: 16px;
`

export const Axis = styled.g`
  @media only screen and (max-width: 1115px) {
    display: none; /* Hide axis on small screen */
  }
`

function calculateDelta(start: number, current: number) {
  return (current / start - 1) * 100
}

function getDeltaArrow(delta: number | null | undefined) {
  // Null-check not including zero
  if (delta === null || delta === undefined) {
    return null
  } else if (Math.sign(delta) < 0) {
    return <StyledDownArrow key="arrow-down" />
  }
  return <StyledUpArrow key="arrow-up" />
}

function formatTimePeriod(timePeriod: TimePeriod) {
  switch (timePeriod) {
    case TimePeriod.HOUR:
      return 'Past Hour'
    case TimePeriod.DAY:
      return 'Past Day'
    case TimePeriod.WEEK:
      return 'Past Week'
    case TimePeriod.MONTH:
      return 'Past Month'
    case TimePeriod.YEAR:
      return 'Past Year'
    case TimePeriod.ALL:
      return 'Since All Time'
  }
}

function getPriceBounds(pricePoints: PricePoint[]): [number, number] {
  const prices = pricePoints.map((x) => x.value)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return [min, max]
}

const DATA_EMPTY = { value: 0, timestamp: 0 }
export const margin = { top: 40, bottom: 10 }

export type PricePoint = { timestamp: number; value: number }

interface PriceChartProps {
  width: number
  height: number
  prices: PricePoint[] | undefined | null
  isDollar: boolean
  timePeriod: TimePeriod
}

export function PriceChart({ width, height, prices, isDollar, timePeriod }: PriceChartProps) {
  const locale = 'en-US'
  const theme = useContext(ThemeContext)

  const hasData = prices && prices.length > 0

  const startingPrice = prices?.[0] ?? DATA_EMPTY
  const endingPrice = prices?.[prices.length - 1] ?? DATA_EMPTY

  const [displayPrice, setDisplayPrice] = useState(startingPrice)

  // set display price to ending price when prices have changed.
  useEffect(() => {
    if (prices) {
      setDisplayPrice(endingPrice)
    }
  }, [prices, endingPrice])

  const graphHeight = height - 64 - 16 > 0 ? height - 64 - 16 : 0
  const graphInnerHeight =
    graphHeight - margin.top - margin.bottom - 40 > 0 ? graphHeight - margin.top - margin.bottom - 40 : 0

  // x scale
  const timeScale = useMemo(
    () => scaleLinear().domain([startingPrice.timestamp, endingPrice.timestamp]).range([0, width]),
    [startingPrice, endingPrice, width]
  )
  // y scale
  const rdScale = useMemo(
    () =>
      scaleLinear()
        .domain(getPriceBounds(prices ?? []))
        .range([graphInnerHeight, 0]),
    [prices, graphInnerHeight]
  )

  const formattedTimePeriod = formatTimePeriod(timePeriod)

  function tickFormat(
    timePeriod: TimePeriod,
    locale: string
  ): [TickFormatter<NumberValue>, (v: number) => string, NumberValue[]] {
    const offsetTime = (endingPrice.timestamp.valueOf() - startingPrice.timestamp.valueOf()) / 24
    const startDateWithOffset = new Date((startingPrice.timestamp.valueOf() + offsetTime) * 1000)
    const endDateWithOffset = new Date((endingPrice.timestamp.valueOf() - offsetTime) * 1000)

    switch (timePeriod) {
      case TimePeriod.HOUR:
        return [
          hourFormatter(locale),
          dayHourFormatter(locale),
          (timeMinute.every(5) ?? timeMinute)
            .range(startDateWithOffset, endDateWithOffset, 2)
            .map((x: number) => x.valueOf() / 1000),
        ]
      case TimePeriod.DAY:
        return [
          hourFormatter(locale),
          dayHourFormatter(locale),
          timeHour.range(startDateWithOffset, endDateWithOffset, 4).map((x: number) => x.valueOf() / 1000),
        ]
      case TimePeriod.WEEK:
        return [
          weekFormatter(locale),
          dayHourFormatter(locale),
          timeDay.range(startDateWithOffset, endDateWithOffset, 1).map((x: number) => x.valueOf() / 1000),
        ]
      case TimePeriod.MONTH:
        return [
          monthDayFormatter(locale),
          dayHourFormatter(locale),
          timeDay.range(startDateWithOffset, endDateWithOffset, 7).map((x: number) => x.valueOf() / 1000),
        ]
      case TimePeriod.YEAR:
        return [
          monthTickFormatter(locale),
          monthYearDayFormatter(locale),
          timeMonth.range(startDateWithOffset, endDateWithOffset, 2).map((x: number) => x.valueOf() / 1000),
        ]
      case TimePeriod.ALL:
        return [
          monthYearFormatter(locale),
          monthYearDayFormatter(locale),
          timeMonth
            .range(
              startDateWithOffset,
              endDateWithOffset,
              (endDateWithOffset.getMonth() -
                startDateWithOffset.getMonth() +
                12 * (endDateWithOffset.getFullYear() - startDateWithOffset.getFullYear())) /
                4
            )
            .map((x: number) => x.valueOf() / 1000),
        ]
    }
  }

  const [crosshair, setCrosshair] = useState<number | null>(null)

  const handleHover = useCallback(
    (event: Element | EventType) => {
      if (!prices) return

      const { x } = localPoint(event) || { x: 0 }
      const x0 = timeScale.invert(x) // get timestamp from the scalexw
      const index = bisect(
        prices.map((x) => x.timestamp),
        x0,
        1
      )

      const d0 = prices[index - 1]
      const d1 = prices[index]
      let pricePoint = d0

      const hasPreviousData = d1 && d1.timestamp
      if (hasPreviousData) {
        pricePoint = x0.valueOf() - d0.timestamp.valueOf() > d1.timestamp.valueOf() - x0.valueOf() ? d1 : d0
      }

      if (pricePoint) {
        setCrosshair(timeScale(pricePoint.timestamp))
        setDisplayPrice(pricePoint)
      }
    },
    [timeScale, prices]
  )

  const resetDisplay = useCallback(() => {
    setCrosshair(null)
    setDisplayPrice(endingPrice)
  }, [setCrosshair, setDisplayPrice, endingPrice])

  const [tickFormatter, crosshairDateFormatter, ticks] = tickFormat(timePeriod, locale)
  const delta = calculateDelta(startingPrice.value, displayPrice.value)
  const formattedDelta = formatDelta(delta)
  const arrow = getDeltaArrow(delta)

  const curveTension = timePeriod === TimePeriod.HOUR ? 1 : 0.75
  const curve = useMemo(() => curveCardinal.tension(curveTension), [curveTension])

  const getX = useMemo(() => (p: PricePoint) => timeScale(p.timestamp), [timeScale])
  const getY = useMemo(() => (p: PricePoint) => rdScale(p.value), [rdScale])

  return (
    <Column style={{ gap: '16px' }}>
      <Column style={{ gap: '4px' }}>
        <TokenPrice>
          {hasData
            ? isDollar
              ? formatDollar({ num: displayPrice.value, isPrice: true })
              : formatTransactionAmount(displayPrice.value)
            : '-'}
        </TokenPrice>
        <Row>
          <DeltaCell positive={delta >= 0}>{formattedDelta}</DeltaCell>
          <TimeCell>
            {crosshair != null ? crosshairDateFormatter(displayPrice.timestamp) : formattedTimePeriod}
          </TimeCell>
          <ArrowCell>{arrow}</ArrowCell>
        </Row>
      </Column>
      <svg height={graphHeight}>
        {!hasData ? (
          <MissingPriceChart height={graphInnerHeight} width={width} message={'Missing chart data'} />
        ) : (
          <>
            <AnimatedInLineChart
              data={prices}
              strokeWidth={1.5}
              color={endingPrice.value - startingPrice.value >= 0 ? theme.green1 : theme.red1}
              marginTop={margin.top}
              getX={getX}
              getY={getY}
              yScale={rdScale}
              curve={curve}
              height={graphInnerHeight}
              width={width}
            />

            {crosshair !== null && (
              <Group>
                <Axis>
                  <AxisBottom
                    scale={timeScale}
                    stroke={'transparent'}
                    tickFormat={tickFormatter}
                    tickLength={4}
                    hideTicks={true}
                    tickValues={ticks}
                    tickTransform="translate(0 -5)"
                    top={graphHeight - 24}
                    tickLabelProps={() => ({
                      fill: theme.text1,
                      fontSize: 12,
                      textAnchor: 'middle',
                    })}
                  />
                </Axis>
                <Group style={{ filter: `drop-shadow(0 0 0mm ${theme.red1}) contrast(120%)` }}>
                  <Line
                    from={{ x: crosshair, y: 0 }}
                    to={{ x: crosshair, y: graphHeight - 24 }}
                    stroke={endingPrice.value - startingPrice.value >= 0 ? theme.green1 : theme.red1}
                    strokeWidth={2}
                    pointerEvents="none"
                    strokeDasharray="2,4"
                  />
                  <rect
                    x={crosshair - 60 - 1 > 0 ? (crosshair > width - 60 - 1 ? width - 120 - 1 : crosshair - 60 - 1) : 1}
                    y={graphHeight - 35 + 0 + 8}
                    fill={theme.bg1}
                    width="120"
                    height="20"
                    stroke={endingPrice.value - startingPrice.value >= 0 ? theme.green1 : theme.red1}
                    strokeWidth={1}
                    rx={5}
                  ></rect>
                  <text
                    x={crosshair - 60 - 1 > 0 ? (crosshair > width - 60 - 1 ? width - 60 - 1 : crosshair) : 60 + 1}
                    y={graphHeight - 20 + 8}
                    textAnchor={'middle'}
                    fontSize={12}
                    fontWeight={'500'}
                    fill={theme.text1}
                  >
                    {crosshairDateFormatter(displayPrice.timestamp)}
                  </text>
                  <GlyphCircle
                    left={crosshair}
                    top={rdScale(displayPrice.value) + margin.top}
                    size={50}
                    fill={endingPrice.value - startingPrice.value >= 0 ? theme.green1 : theme.red1}
                    stroke={theme.white}
                    strokeWidth={2}
                  />
                </Group>
              </Group>
            )}
            <rect
              x={0}
              y={0}
              width={width}
              height={graphHeight}
              fill="transparent"
              onTouchStart={handleHover}
              onTouchMove={handleHover}
              onMouseMove={handleHover}
              onMouseLeave={resetDisplay}
            ></rect>
          </>
        )}
      </svg>
    </Column>
  )
}

const StyledMissingChart = styled.svg`
  text {
    user-select: none;
    -webkit-user-select: none;
    font-size: 20px;
    font-weight: 600;
  }
`

const chartBottomPadding = 40

function MissingPriceChart({ width, height, message }: { width: number; height: number; message: ReactNode }) {
  const theme = useTheme()
  const midPoint = height / 2 + 45
  return (
    <StyledMissingChart width={width} height={height} style={{ minWidth: '100%' }}>
      <path
        d={`M 0 ${midPoint} Q 104 ${midPoint - 70}, 208 ${midPoint} T 416 ${midPoint}
        M 416 ${midPoint} Q 520 ${midPoint - 70}, 624 ${midPoint} T 832 ${midPoint},
        M 832 ${midPoint} Q 936 ${midPoint - 70}, 1040 ${midPoint} T 1248 ${midPoint}`}
        stroke={theme.bg4}
        fill="transparent"
        strokeWidth="2"
      />
      <TrendingUp stroke={theme.text1} size={40} y={height - chartBottomPadding - 60} x={width / 2 - 20} />
      <text y={height - chartBottomPadding} x={width / 2} textAnchor={'middle'} fill={theme.text1}>
        {message}
      </text>
    </StyledMissingChart>
  )
}
