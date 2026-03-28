import type { MarketHistoryPoint } from '../../game/core/types'
import { WEEKS_PER_MONTH } from '../../game/core/utils'

export type MarketChartRange = '1m' | 'ytd' | '1y' | '3y' | '5y' | 'all'

export type MarketChartPoint = {
  label: string
  shortLabel: string
  value: number
  week: number
  month: number
}

export type MarketAxisTick = {
  index: number
  label: string
}

export type MarketValueTick = {
  value: number
  ratio: number
}

const WEEKS_PER_YEAR = WEEKS_PER_MONTH * 12
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const MARKET_CHART_RANGES: Array<{ value: MarketChartRange; label: string }> = [
  { value: '1m', label: '1M' },
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: '1Y' },
  { value: '3y', label: '3Y' },
  { value: '5y', label: '5Y' },
  { value: 'all', label: 'All' },
]

function getRangeStartWeek(range: MarketChartRange, currentWeek: number) {
  if (range === 'all') return 1
  if (range === 'ytd') {
    const currentYearIndex = Math.floor((Math.max(1, currentWeek) - 1) / WEEKS_PER_YEAR)
    return currentYearIndex * WEEKS_PER_YEAR + 1
  }

  const durationWeeks =
    range === '1m'
      ? WEEKS_PER_MONTH
      : range === '1y'
        ? WEEKS_PER_YEAR
        : range === '3y'
          ? WEEKS_PER_YEAR * 3
          : WEEKS_PER_YEAR * 5

  return Math.max(1, currentWeek - durationWeeks + 1)
}

function getWeekOfMonth(week: number) {
  return ((week - 1) % WEEKS_PER_MONTH) + 1
}

function getYearFromMonth(month: number) {
  return Math.floor((Math.max(1, month) - 1) / 12) + 1
}

function getMonthOfYear(month: number) {
  return ((Math.max(1, month) - 1) % 12) + 1
}

function getShortPointLabel(point: MarketHistoryPoint, range: MarketChartRange) {
  if (range === '1m') return `W${getWeekOfMonth(point.week)}`
  if (range === '1y' || range === 'ytd') return MONTH_LABELS[getMonthOfYear(point.month) - 1]
  return `Y${getYearFromMonth(point.month)}`
}

export function formatMarketPointLabel(point: MarketHistoryPoint) {
  return `Y${getYearFromMonth(point.month)} M${getMonthOfYear(point.month)} W${getWeekOfMonth(point.week)}`
}

export function sliceMarketHistory(points: MarketHistoryPoint[], range: MarketChartRange, currentWeek: number) {
  if (points.length <= 1 || range === 'all') return points

  const startWeek = getRangeStartWeek(range, currentWeek)
  const sliced = points.filter((point) => point.week >= startWeek)
  return sliced.length > 0 ? sliced : points.slice(-1)
}

export function toMarketChartPoints(points: MarketHistoryPoint[], range: MarketChartRange, currentWeek: number): MarketChartPoint[] {
  return sliceMarketHistory(points, range, currentWeek).map((point) => ({
    label: formatMarketPointLabel(point),
    shortLabel: getShortPointLabel(point, range),
    value: point.price,
    week: point.week,
    month: point.month,
  }))
}

export function getMarketRangeChange(points: MarketHistoryPoint[], range: MarketChartRange, currentWeek: number) {
  const visiblePoints = sliceMarketHistory(points, range, currentWeek)
  if (visiblePoints.length < 2) return 0

  const first = visiblePoints[0]?.price ?? 0
  const latest = visiblePoints[visiblePoints.length - 1]?.price ?? 0
  if (first <= 0) return 0

  return ((latest - first) / first) * 100
}

export function buildMarketValueTicks(points: MarketChartPoint[], tickCount = 5): MarketValueTick[] {
  if (points.length === 0) return []
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const paddedMin = Math.max(0, min - range * 0.08)
  const paddedMax = max + range * 0.08
  const step = tickCount <= 1 ? paddedMax - paddedMin : (paddedMax - paddedMin) / (tickCount - 1)

  return Array.from({ length: tickCount }, (_, index) => {
    const value = paddedMax - step * index
    return {
      value,
      ratio: tickCount <= 1 ? 0 : index / (tickCount - 1),
    }
  })
}

export function buildMarketTimeTicks(points: MarketChartPoint[], range: MarketChartRange, maxTicks = 6): MarketAxisTick[] {
  if (points.length === 0) return []
  if (points.length === 1) return [{ index: 0, label: points[0].shortLabel }]

  const candidateIndexes = new Set<number>([0, points.length - 1])
  const steps = Math.max(1, maxTicks - 1)
  for (let index = 1; index < steps; index += 1) {
    candidateIndexes.add(Math.round((index / steps) * (points.length - 1)))
  }

  const orderedIndexes = Array.from(candidateIndexes).sort((left, right) => left - right)
  const uniqueLabelIndexes: number[] = []
  let previousLabel = ''

  orderedIndexes.forEach((index) => {
    const label = points[index]?.shortLabel ?? ''
    if (!label) return
    if (range === '1m') {
      uniqueLabelIndexes.push(index)
      return
    }
    if (label !== previousLabel || index === points.length - 1) {
      uniqueLabelIndexes.push(index)
      previousLabel = label
    }
  })

  return uniqueLabelIndexes.map((index) => ({
    index,
    label: points[index]?.shortLabel ?? '',
  }))
}

export function describeMarketTrend(change: number) {
  if (change > 0.35) return 'Up trend'
  if (change < -0.35) return 'Down trend'
  return 'Flat'
}
