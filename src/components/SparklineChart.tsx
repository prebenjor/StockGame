type Point = {
  label: string
  value: number
}

type Props = {
  points: Point[]
  lineColor?: string
  fillColor?: string
  className?: string
  label: string
  compact?: boolean
}

function buildPath(points: Point[], width: number, height: number) {
  if (points.length === 0) return ''
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)

  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
      const y = height - ((point.value - min) / range) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function buildArea(path: string, width: number, height: number) {
  if (!path) return ''
  return `${path} L ${width} ${height} L 0 ${height} Z`
}

export function SparklineChart({
  points,
  lineColor = '#1d6a8a',
  fillColor = 'rgba(35, 128, 171, 0.14)',
  className = '',
  label,
  compact = false,
}: Props) {
  const width = 180
  const height = compact ? 44 : 96
  const path = buildPath(points, width, height)
  const areaPath = buildArea(path, width, height)
  const latest = points[points.length - 1]
  const previous = points[points.length - 2]
  const trend = previous && latest ? latest.value - previous.value : 0

  return (
    <div className={`sparkline ${compact ? 'compact' : ''} ${className}`.trim()} aria-label={label}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden="true">
        {areaPath ? <path d={areaPath} fill={fillColor} /> : null}
        {path ? <path d={path} fill="none" stroke={lineColor} strokeWidth={compact ? 2 : 3} strokeLinecap="round" strokeLinejoin="round" /> : null}
      </svg>
      {!compact && latest ? (
        <div className="sparkline-meta">
          <strong>{latest.label}</strong>
          <span className={trend >= 0 ? 'positive' : 'negative'}>{trend >= 0 ? 'Up trend' : 'Down trend'}</span>
        </div>
      ) : null}
    </div>
  )
}
