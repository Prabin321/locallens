import { useState } from 'react'
import type { HistogramBin } from '../types/dataset'

interface DistributionChartProps {
  bins: HistogramBin[]
  height?: number
  color?: string
}

export function DistributionChart({
  bins,
  height = 110,
  color = '#38bdf8',
}: DistributionChartProps) {
  const [hoveredBin, setHoveredBin] = useState<HistogramBin | null>(null)

  if (!bins || bins.length === 0) {
    return <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No distribution data</div>
  }

  const maxCount = Math.max(...bins.map((b) => b.count), 1)
  const chartPaddingTop = 18
  const chartHeight = height - chartPaddingTop
  const barGap = 4
  const totalBars = bins.length

  return (
    <div style={{ position: 'relative', width: '100%', paddingTop: '0.5rem' }}>
      {/* Tooltip */}
      <div
        style={{
          minHeight: '22px',
          fontSize: '0.72rem',
          color: hoveredBin ? '#f8fafc' : '#94a3b8',
          marginBottom: '4px',
          textAlign: 'center',
          fontWeight: 500,
        }}
      >
        {hoveredBin ? (
          <span>
            [{hoveredBin.binStart} → {hoveredBin.binEnd}]: <strong>{hoveredBin.count}</strong> (
            {hoveredBin.percentage}%)
          </span>
        ) : (
          <span style={{ opacity: 0.6 }}>Hover over bars to inspect frequency distribution</span>
        )}
      </div>

      <svg
        viewBox={`0 0 100 ${height}`}
        style={{ width: '100%', height: `${height}px`, overflow: 'visible' }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`bar-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {bins.map((bin, index) => {
          const barWidth = (100 - barGap * (totalBars - 1)) / totalBars
          const x = index * (barWidth + barGap)
          const barNormalizedHeight = (bin.count / maxCount) * chartHeight
          const barH = Math.max(barNormalizedHeight, bin.count > 0 ? 3 : 1)
          const y = chartPaddingTop + (chartHeight - barH)
          const isHovered = hoveredBin === bin

          return (
            <g
              key={index}
              onMouseEnter={() => setHoveredBin(bin)}
              onMouseLeave={() => setHoveredBin(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={2}
                fill={isHovered ? '#67e8f9' : `url(#bar-grad-${color.replace('#', '')})`}
                stroke={isHovered ? '#ffffff' : 'none'}
                strokeWidth={isHovered ? 0.8 : 0}
                style={{ transition: 'all 0.15s ease' }}
              />
            </g>
          )
        })}
      </svg>

      {/* Axis range labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.68rem',
          color: '#64748b',
          marginTop: '2px',
        }}
      >
        <span>{bins[0]?.binStart ?? 0}</span>
        <span>{bins[bins.length - 1]?.binEnd ?? 0}</span>
      </div>
    </div>
  )
}
