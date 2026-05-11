'use client'

import Link from 'next/link'
import type { Stage, Priority } from '@/lib/types'
import { STAGE_LABELS, TERMINAL_STAGES } from '@/lib/types'
import { StageBadge, PriorityBadge } from '@/components/ui/badge'
import { BuildingIcon, MapPinIcon, ClockIcon } from 'lucide-react'

interface AppCard {
  id: number
  roleTitle: string
  roleLevel: string | null
  salary: string | null
  location: string | null
  priority: string
  stage: string
  appliedAt: Date
  company: { name: string }
}

interface KanbanBoardProps {
  applications: AppCard[]
}

const ACTIVE_STAGES: Stage[] = ['WISHLIST', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER']
const TERMINAL_COLS: Stage[] = ['REJECTED', 'GHOSTED', 'WITHDRAWN']

const STAGE_COLORS: Record<string, string> = {
  WISHLIST: 'var(--color-stage-wishlist)',
  APPLIED: 'var(--color-stage-applied)',
  SCREENING: 'var(--color-stage-screening)',
  INTERVIEW: 'var(--color-stage-interview)',
  OFFER: 'var(--color-stage-offer)',
  REJECTED: 'var(--color-stage-rejected)',
  GHOSTED: 'var(--color-stage-ghosted)',
  WITHDRAWN: 'var(--color-stage-withdrawn)',
}

function stalenessColor(days: number): string {
  if (days < 7) return '#34d399'
  if (days < 14) return '#fbbf24'
  return '#f87171'
}

function KanbanCard({ app }: { app: AppCard }) {
  const daysSince = Math.floor((Date.now() - new Date(app.appliedAt).getTime()) / 86400000)
  const daysLabel = daysSince === 0 ? 'today' : `${daysSince}d`
  const isTerminal = TERMINAL_STAGES.includes(app.stage as Stage)

  return (
    <Link
      href={`/applications/${app.id}`}
      style={{
        display: 'block',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '12px',
        textDecoration: 'none',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px', lineHeight: '1.3' }}>
        {app.roleTitle}
        {app.roleLevel && (
          <span style={{ fontWeight: 400, color: 'var(--color-muted)', marginLeft: '6px', fontSize: '11px' }}>{app.roleLevel}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-muted)', marginBottom: '8px' }}>
        <BuildingIcon size={11} />
        {app.company.name}
        {app.location && (
          <>
            <span>·</span>
            <MapPinIcon size={10} />
            <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.location}</span>
          </>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <PriorityBadge priority={app.priority as Priority} />
        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: isTerminal ? 'var(--color-muted)' : stalenessColor(daysSince) }}>
          <ClockIcon size={9} />
          {daysLabel}
        </span>
      </div>
    </Link>
  )
}

function KanbanColumn({ stage, apps }: { stage: Stage; apps: AppCard[] }) {
  const color = STAGE_COLORS[stage] ?? 'var(--color-muted)'
  return (
    <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', paddingBottom: '8px', borderBottom: `2px solid ${color}` }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {STAGE_LABELS[stage]}
        </span>
        <span style={{
          fontSize: '11px', fontWeight: 700,
          backgroundColor: color + '22',
          color: color,
          borderRadius: '10px', padding: '1px 7px',
        }}>
          {apps.length}
        </span>
      </div>
      {apps.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--color-muted)', textAlign: 'center', padding: '20px 0', opacity: 0.5 }}>
          Empty
        </div>
      ) : (
        apps.map(app => <KanbanCard key={app.id} app={app} />)
      )}
    </div>
  )
}

export function KanbanBoard({ applications }: KanbanBoardProps) {
  const byStage = (stage: Stage) => applications.filter(a => a.stage === stage)

  const terminalApps = TERMINAL_COLS.flatMap(s => byStage(s))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Active pipeline */}
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
        {ACTIVE_STAGES.map(stage => (
          <KanbanColumn key={stage} stage={stage} apps={byStage(stage)} />
        ))}
      </div>

      {/* Terminal (collapsed summary) */}
      {terminalApps.length > 0 && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Terminal — {terminalApps.length} applications
          </p>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
            {TERMINAL_COLS.map(stage => {
              const apps = byStage(stage)
              if (apps.length === 0) return null
              return <KanbanColumn key={stage} stage={stage} apps={apps} />
            })}
          </div>
        </div>
      )}
    </div>
  )
}
