import type { Stage, Priority } from '@/lib/types'
import { STAGE_LABELS, PRIORITY_LABELS, TERMINAL_STAGES } from '@/lib/types'

const STAGE_COLORS: Record<Stage, string> = {
  WISHLIST: 'var(--color-stage-wishlist)',
  APPLIED: 'var(--color-stage-applied)',
  SCREENING: 'var(--color-stage-screening)',
  INTERVIEW: 'var(--color-stage-interview)',
  OFFER: 'var(--color-stage-offer)',
  REJECTED: 'var(--color-stage-rejected)',
  WITHDRAWN: 'var(--color-stage-withdrawn)',
  GHOSTED: 'var(--color-stage-ghosted)',
}

const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'var(--color-priority-low)',
  MEDIUM: 'var(--color-priority-medium)',
  HIGH: 'var(--color-priority-high)',
}

interface StageBadgeProps {
  stage: Stage
  size?: 'sm' | 'md'
}

export function StageBadge({ stage, size = 'md' }: StageBadgeProps) {
  const color = STAGE_COLORS[stage]
  const isTerminal = TERMINAL_STAGES.includes(stage)
  const px = size === 'sm' ? '6px' : '10px'
  const py = size === 'sm' ? '2px' : '4px'
  const fontSize = size === 'sm' ? '11px' : '12px'

  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        borderRadius: '4px',
        padding: `${py} ${px}`,
        fontSize,
        fontWeight: 500,
        letterSpacing: '0.02em',
        opacity: isTerminal ? 0.75 : 1,
      }}
    >
      {STAGE_LABELS[stage]}
    </span>
  )
}

interface PriorityBadgeProps {
  priority: Priority
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const color = PRIORITY_COLORS[priority]
  return (
    <span
      style={{
        display: 'inline-block',
        color,
        fontSize: '12px',
        fontWeight: 500,
      }}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
