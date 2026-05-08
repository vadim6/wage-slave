import { prisma } from '@/lib/prisma'
import { EVENT_TYPE_LABELS } from '@/lib/types'
import Link from 'next/link'

export async function RecentActivity() {
  const events = await prisma.applicationEvent.findMany({
    orderBy: { occurredAt: 'desc' },
    take: 5,
    include: {
      application: {
        include: { company: true },
      },
    },
  })

  if (events.length === 0) {
    return (
      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Recent Activity
        </h3>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>No activity yet.</p>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '20px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Recent Activity
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/applications/${event.applicationId}`}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', textDecoration: 'none' }}
          >
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
                {event.application.company.name} — {event.application.roleTitle}
              </span>
              <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: '2px 0 0' }}>
                {event.title ?? EVENT_TYPE_LABELS[event.eventType as import('@/lib/types').EventType]}
              </p>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)', flexShrink: 0, marginLeft: '12px' }}>
              {new Date(event.occurredAt).toLocaleDateString()}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
