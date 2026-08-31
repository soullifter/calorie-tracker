// Shared chart utilities for smooth curves and consistent styling

// Catmull-Rom spline → SVG cubic bezier path
export function smoothPath(points) {
  if (points.length < 2) return ''
  if (points.length === 2) return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`

  let d = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += `C${cp1x},${cp1y},${cp2x},${cp2y},${p2.x},${p2.y}`
  }
  return d
}

// Build area path (closed at bottom) from a smooth line path
export function smoothAreaPath(points, baseline = 40) {
  if (points.length < 2) return ''
  const linePath = smoothPath(points)
  const last = points[points.length - 1]
  const first = points[0]
  return `${linePath}L${last.x},${baseline}L${first.x},${baseline}Z`
}

// Convert data array to SVG coordinate points
export function toChartPoints(values, { width = 100, height = 40, padding = 2.5 }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  return values.map((v, i) => ({
    x: (i / Math.max(1, values.length - 1)) * width,
    y: padding + ((max - v) / range) * (height - padding * 2),
  }))
}

// Chart gradient definitions
export function ChartGradient({ id, color, opacity = 0.35 }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={opacity} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  )
}
