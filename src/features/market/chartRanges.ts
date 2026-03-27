import type { MarketHistoryPoint } from '../../game/core/types'
import { WEEKS_PER_MONTH } from '../../game/core/utils'

export type MarketChartRange = '1m' | 'ytd' | '1y' | '3y' | '5y' | 'all'

type ChartPoint = {
  label: string
  value: number
}

const WEEKS_PER_YEAR = WEEKS_PER_MONTH * 12

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

export function formatMarketPointLabel(point: MarketHistoryPoint) {
  return `Y${getYearFromMonth(point.month)} M${getMonthOfYear(point.month)} W${getWeekOfMonth(point.week)}`
}

export function sliceMarketHistory(points: MarketHistoryPoint[], range: MarketChartRange, currentWeek: number) {
  if (points.length <= 1 || range === 'all') return points

  const startWeek = getRangeStartWeek(range, currentWeek)
  const sliced = points.filter((point) => point.week >= startWeek)
  return sliced.length > 0 ? sliced : points.slice(-1)
}

export function toMarketChartPoints(points: MarketHistoryPoint[], range: MarketChartRange, currentWeek: number): ChartPoint[] {
  return sliceMarketHistory(points, range, currentWeek).map((point) => ({
    label: formatMarketPointLabel(point),
    value: point.price,
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
