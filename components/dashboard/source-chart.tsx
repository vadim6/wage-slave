'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#6366f1', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb923c', '#94a3b8']

interface SourceChartProps {
  sourceCounts: { source: string; count: number }[]
}

export function SourceChart({ sourceCounts }: SourceChartProps) {
  const data = sourceCounts.map((s) => ({ name: s.source, value: s.count }))

  return (
    <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '20px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Source Breakdown
      </h3>
      {data.length === 0 ? (
        <p style={{ color: 'var(--color-muted)', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                color: 'var(--color-text)',
                fontSize: '13px',
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', color: 'var(--color-muted)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
