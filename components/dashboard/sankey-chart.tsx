'use client'

import { Sankey, Tooltip, ResponsiveContainer } from 'recharts'

interface SankeyLink {
  source: number
  target: number
  value: number
}

interface SankeyNode {
  name: string
}

interface Props {
  data: { nodes: SankeyNode[]; links: SankeyLink[] }
}

const STAGE_COLORS: Record<string, string> = {
  APPLIED: '#60a5fa',
  SCREENING: '#a78bfa',
  INTERVIEW: '#f59e0b',
  OFFER: '#34d399',
  REJECTED: '#f87171',
  GHOSTED: '#fb923c',
  WITHDRAWN: '#94a3b8',
}

const STAGE_LABELS: Record<string, string> = {
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  GHOSTED: 'Ghosted',
  WITHDRAWN: 'Withdrawn',
}

function nodeColor(name: string): string {
  return STAGE_COLORS[name] ?? '#0E7C7B'  // teal for source nodes
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomNode({ x, y, width, height, payload }: any) {
  const color = nodeColor(payload.name)
  const label = STAGE_LABELS[payload.name] ?? payload.name
  const isLeft = payload.depth === 0
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.9} rx={2} />
      <text
        x={isLeft ? x - 6 : x + width + 6}
        y={y + height / 2}
        textAnchor={isLeft ? 'end' : 'start'}
        dominantBaseline="middle"
        fontSize={11}
        fill="var(--color-text, #222)"
      >
        {label} ({payload.value})
      </text>
    </g>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomLink({ sourceX, sourceY, sourceControlX, targetX, targetY, targetControlX, linkWidth, payload }: any) {
  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={nodeColor(payload.target.name)}
      strokeWidth={linkWidth}
      strokeOpacity={0.3}
    />
  )
}

export function SankeyChart({ data }: Props) {
  if (data.links.length === 0) {
    return (
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        padding: '20px',
        color: 'var(--color-muted)',
        fontSize: '13px',
      }}>
        No transition data yet — events will populate this as applications progress through stages.
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '10px',
      padding: '20px',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
        Pipeline Flow
        <span style={{ fontWeight: 400, color: 'var(--color-muted)', marginLeft: '6px', fontSize: '12px' }}>
          stage transitions across all applications
        </span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <Sankey
          data={data}
          node={<CustomNode />}
          link={<CustomLink />}
          nodePadding={16}
          margin={{ left: 90, right: 90, top: 8, bottom: 8 }}
        >
          <Tooltip formatter={(value: number) => [value, 'applications']} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  )
}
