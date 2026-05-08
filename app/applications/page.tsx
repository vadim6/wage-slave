import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { StageBadge, PriorityBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ApplicationFilters } from './filters'
import type { Stage, Priority } from '@/lib/types'
import { PlusIcon, BuildingIcon, MapPinIcon, CalendarIcon } from 'lucide-react'
import { TERMINAL_STAGES } from '@/lib/types'

const STAGE_ORDER: Record<string, number> = {
  OFFER: 0, INTERVIEW: 1, SCREENING: 2, APPLIED: 3, WISHLIST: 4,
  REJECTED: 5, WITHDRAWN: 6, GHOSTED: 7,
}

interface PageProps {
  searchParams: Promise<{ stage?: string; priority?: string; search?: string; sort?: string }>
}

export default async function ApplicationsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const cookieStore = await cookies()
  const { stage, priority, search, sort = cookieStore.get('applications_sort')?.value ?? 'date' } = params

  const applications = await prisma.application.findMany({
    where: {
      ...(stage ? { stage: stage as Stage } : {}),
      ...(priority ? { priority: priority as Priority } : {}),
      ...(search
        ? {
            OR: [
              { roleTitle: { contains: search } },
              { company: { name: { contains: search } } },
            ],
          }
        : {}),
    },
    include: { company: true },
    orderBy: { appliedAt: 'desc' },
  })

  if (sort === 'stage') {
    applications.sort((a, b) => {
      const stageDiff = (STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99)
      if (stageDiff !== 0) return stageDiff
      return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
          Applications
          <span style={{ fontSize: '16px', fontWeight: 400, color: 'var(--color-muted)', marginLeft: '10px' }}>
            {applications.length}
          </span>
        </h1>
        <Link href="/applications/new">
          <Button variant="primary">
            <PlusIcon size={14} />
            New Application
          </Button>
        </Link>
      </div>

      <ApplicationFilters currentStage={stage} currentPriority={priority} currentSearch={search} currentSort={sort} />

      {applications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No applications found</p>
          <p style={{ fontSize: '14px' }}>
            {search || stage || priority ? 'Try clearing filters' : 'Add your first application to get started'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {applications.map((app) => {
            const isTerminal = TERMINAL_STAGES.includes(app.stage as Stage)
            return (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                style={{
                  display: 'block',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '16px',
                  textDecoration: 'none',
                  opacity: isTerminal ? 0.6 : 1,
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
                        {app.roleTitle}
                      </span>
                      {app.roleLevel && (
                        <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{app.roleLevel}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-muted)' }}>
                        <BuildingIcon size={12} />
                        {app.company.name}
                      </span>
                      {app.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-muted)' }}>
                          <MapPinIcon size={12} />
                          {app.location}
                        </span>
                      )}
                      {app.salary && (
                        <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{app.salary}</span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-muted)' }}>
                        <CalendarIcon size={11} />
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <PriorityBadge priority={app.priority as Priority} />
                    <StageBadge stage={app.stage as Stage} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
