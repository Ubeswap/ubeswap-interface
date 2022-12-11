import { LinearGradient } from '@visx/gradient'
import { Group } from '@visx/group'
import { AreaClosed, LinePath } from '@visx/shape'
import { CurveFactory, easeCubicInOut, ScaleLinear } from 'd3'
import React, { useEffect, useRef, useState } from 'react'
import { animated, useSpring } from 'react-spring'

const config = {
  duration: 800,
  easing: easeCubicInOut,
}

// code reference: https://airbnb.io/visx/lineradial

function AnimatedInLineChart<T>({
  data,
  getX,
  getY,
  yScale,
  marginTop,
  curve,
  strokeWidth,
  height,
  width,
  color,
}: {
  data: T[]
  getX: (t: T) => number
  getY: (t: T) => number
  yScale: ScaleLinear<number, number, never>
  marginTop?: number
  curve: CurveFactory
  strokeWidth: number
  height: number
  width: number
  color: string
}) {
  const lineRef = useRef<SVGPathElement>(null)
  const [lineLength, setLineLength] = useState(0)
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false)

  const { frame } = useSpring({
    frame: shouldAnimate ? 0 : 1,
    config,
    onRest: () => {
      setShouldAnimate(false)
      setHasAnimatedIn(true)
    },
  })

  // We need to check to see after the "invisble" line has been drawn
  // what the length is to be able to animate in the line for the first time
  // This will run on each render to see if there is a new line length
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (lineRef.current) {
      const length = lineRef.current.getTotalLength()
      if (length !== lineLength) {
        setLineLength(length)
      }
      if (length > 0 && !shouldAnimate && !hasAnimatedIn) {
        setShouldAnimate(true)
      }
    }
  })

  return (
    <Group top={marginTop} style={{ filter: `drop-shadow(0 0 0 ${color}) contrast(120%)` }}>
      <defs>
        <clipPath id="clip">
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>
      </defs>
      <LinearGradient id="area" from={color} to={color} fromOpacity={0.75} toOpacity={0} />

      <AreaClosed data={data} x={getX} y={getY} yScale={yScale} fill="url(#area)" clipPath="url(#clip)" curve={curve} />

      <LinePath curve={curve} x={getX} y={getY}>
        {({ path }) => {
          const d = path(data) || ''
          return (
            <>
              <animated.path
                d={d}
                ref={lineRef}
                strokeWidth={strokeWidth}
                strokeOpacity={hasAnimatedIn ? 1 : 0}
                fill="none"
                stroke={color}
              />

              {shouldAnimate && lineLength !== 0 && (
                <animated.path
                  d={d}
                  strokeWidth={strokeWidth}
                  fill="none"
                  stroke={color}
                  strokeDashoffset={frame.interpolate((v) => v * lineLength)}
                  strokeDasharray={lineLength}
                />
              )}
            </>
          )
        }}
      </LinePath>
    </Group>
  )
}

export default AnimatedInLineChart
