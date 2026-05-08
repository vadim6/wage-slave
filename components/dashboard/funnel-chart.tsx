'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Stage } from '@/lib/types'
import { STAGE_LABELS, PIPELINE_STAGES } from '@/lib/types'

const STAGE_COLORS: Record<string, string> = {
  WISHLIST: '#a78bfa',
  APPLIED: '#60a5fa',
  SCREENING: '#34d399',
  INTERVIEW: '#fbbf24',
  OFFER: '#10b981',
}

interface FunnelChartProps {
  stageCounts: { stage: Stage; count: number }[]
}

export function FunnelChart({ stageCounts }: FunnelChartProps) {
  const data = PIPELINE_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: stageCounts.find((s) => s.stage === stage)?.count ?? 0,
  }))

  return (
    <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '20px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Pipeline Funnel
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text)',
              fontSize: '13px',
            }}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? '#64748b'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
