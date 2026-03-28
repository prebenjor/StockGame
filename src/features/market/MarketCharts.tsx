import { useId, useState } from 'react'
import { money } from '../../game/core/format'
import {
  buildMarketTimeTicks,
  buildMarketValueTicks,
  describeMarketTrend,
  type MarketAxisTick,
  type MarketChartPoint,
} from './chartRanges'
import type { MarketChartRange } from './chartRanges'

const POSITIVE = '#2D8C3C'
const NEGATIVE = '#C0392B'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatPercent(value: number) {
  const rounded = Math.round(value * 10) / 10
  return `${rounded >= 0 ? '+' : ''}${rounded.toFixed(1)}%`
}

function getChartBounds(points: MarketChartPoint[]) {
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const paddedMin = Math.max(0, min - range * 0.08)
  const paddedMax = max + range * 0.08
  return {
    min: paddedMin,
    max: paddedMax,
    range: Math.max(1, paddedMax - paddedMin),
  }
}

type SvgPoint = {
  x: number
  y: number
  point: MarketChartPoint
}

function toSvgPoints(points: MarketChartPoint[], width: number, height: number, left = 0, top = 0): SvgPoint[] {
  if (points.length === 0) return []
  const bounds = getChartBounds(points)
  return points.map((point, index) => {
    const x = left + (points.length === 1 ? width / 2 : (index / (points.length - 1)) * width)
    const y = top + height - ((point.value - bounds.min) / bounds.range) * height
    return { x, y, point }
  })
}

function buildSmoothLine(points: SvgPoint[]) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const controlX = (current.x + next.x) / 2
    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`
  }
  return path
}

function buildAreaLine(points: SvgPoint[], chartBottom: number) {
  const line = buildSmoothLine(points)
  if (!line) return ''
  const first = points[0]
  const last = points[points.length - 1]
  return `${line} L ${last.x} ${chartBottom} L ${first.x} ${chartBottom} Z`
}

function formatRangePoint(point: MarketChartPoint, range: MarketChartRange) {
  if (range === '1m') return `Week ${point.week}`
  if (range === '1y' || range === 'ytd') return point.shortLabel
  return `Year ${Math.floor((Math.max(1, point.month) - 1) / 12) + 1}`
}

type SparklineProps = {
  points: MarketChartPoint[]
  label: string
  change: number
  className?: string
}

export function MarketSparkline({ points, label, change, className = '' }: SparklineProps) {
  const gradientId = useId()
  const width = 240
  const height = 48
  const svgPoints = toSvgPoints(points, width, height)
  const linePath = buildSmoothLine(svgPoints)
  const areaPath = buildAreaLine(svgPoints, height)
  const color = change >= 0 ? POSITIVE : NEGATIVE

  return (
    <svg className={`market-sparkline ${className}`.trim()} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
      {linePath ? <path d={linePath} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  )
}

type HeroProps = {
  points: MarketChartPoint[]
  range: MarketChartRange
  change: number
  label: string
}

export function MarketHeroChart({ points, range, change, label }: HeroProps) {
  const gradientId = useId()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const viewWidth = 640
  const viewHeight = 300
  const margin = { top: 16, right: 14, bottom: 36, left: 54 }
  const chartWidth = viewWidth - margin.left - margin.right
  const chartHeight = viewHeight - margin.top - margin.bottom
  const color = change >= 0 ? POSITIVE : NEGATIVE
  const svgPoints = toSvgPoints(points, chartWidth, chartHeight, margin.left, margin.top)
  const linePath = buildSmoothLine(svgPoints)
  const areaPath = buildAreaLine(svgPoints, margin.top + chartHeight)
  const valueTicks = buildMarketValueTicks(points, 5)
  const timeTicks = buildMarketTimeTicks(points, range, range === '1m' ? 5 : 6)
  const hoveredPoint = hoverIndex !== null ? svgPoints[hoverIndex] : null

  const handleMouseMove = (event: React.MouseEvent<SVGRectElement>) => {
    if (svgPoints.length === 0) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const relativeX = clamp(event.clientX - bounds.left - margin.left, 0, chartWidth)
    const ratio = chartWidth <= 0 ? 0 : relativeX / chartWidth
    const nearestIndex = clamp(Math.round(ratio * Math.max(0, svgPoints.length - 1)), 0, svgPoints.length - 1)
    setHoverIndex(nearestIndex)
  }

  const chartStartValue = points[0]?.value ?? 0
  const tooltipChange = hoveredPoint && chartStartValue > 0
    ? ((hoveredPoint.point.value - chartStartValue) / chartStartValue) * 100
    : 0

  return (
    <div className="market-hero-chart" aria-label={label}>
      <svg className="market-hero-chart-svg" viewBox={`0 0 ${viewWidth} ${viewHeight}`} role="img" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.24" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {valueTicks.map((tick) => {
          const y = margin.top + tick.ratio * chartHeight
          return (
            <g key={tick.value}>
              <line
                x1={margin.left}
                y1={y}
                x2={margin.left + chartWidth}
                y2={y}
                className="market-hero-gridline"
              />
              <text x={margin.left - 8} y={y + 4} className="market-hero-axis-label" textAnchor="end">
                {money(tick.value)}
              </text>
            </g>
          )
        })}

        {timeTicks.map((tick: MarketAxisTick) => {
          const point = svgPoints[tick.index]
          if (!point) return null
          return (
            <text key={`${tick.label}-${tick.index}`} x={point.x} y={viewHeight - 10} className="market-hero-axis-label" textAnchor="middle">
              {tick.label}
            </text>
          )
        })}

        {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
        {linePath ? <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /> : null}

        {hoveredPoint ? (
          <>
            <line
              x1={hoveredPoint.x}
              y1={margin.top}
              x2={hoveredPoint.x}
              y2={margin.top + chartHeight}
              className="market-hero-crosshair"
            />
            <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="4.5" fill={color} stroke="#ffffff" strokeWidth="2" />
          </>
        ) : null}

        <rect
          x={margin.left}
          y={margin.top}
          width={chartWidth}
          height={chartHeight}
          fill="transparent"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hoveredPoint ? (
        <div
          className="market-hero-tooltip"
          style={{
            left: `${clamp(((hoveredPoint.x - margin.left) / chartWidth) * 100, 8, 92)}%`,
          }}
        >
          <strong>{money(hoveredPoint.point.value)}</strong>
          <span>{formatRangePoint(hoveredPoint.point, range)}</span>
          <span>{formatPercent(tooltipChange)}</span>
        </div>
      ) : (
        <div className="market-hero-tooltip market-hero-tooltip-static">
          <strong>{describeMarketTrend(change)}</strong>
          <span>Hover for price and date</span>
          <span>{formatPercent(change)}</span>
        </div>
      )}
    </div>
  )
}
