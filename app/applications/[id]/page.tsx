import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { StageBadge, PriorityBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StageSelect } from '@/components/applications/stage-select'
import { Timeline } from '@/components/applications/timeline'
import { ContactsList } from '@/components/applications/contacts-list'
import { NotesList } from '@/components/applications/notes-list'
import { FileUpload } from '@/components/applications/file-upload'
import { DeleteApplicationButton } from './delete-button'
import { RawJdSection } from '@/components/applications/raw-jd-section'
import { TailorCVButton } from '@/components/applications/tailor-cv-button'
import { BuildingIcon, MapPinIcon, DollarSignIcon, CalendarIcon, ExternalLinkIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params
  const app = await prisma.application.findUnique({
    where: { id: Number(id) },
    include: {
      company: true,
      files: { orderBy: { createdAt: 'desc' } },
      events: { orderBy: { occurredAt: 'desc' } },
      contacts: true,
      notes: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!app) notFound()

  const [prevApp, nextApp] = await Promise.all([
    prisma.application.findFirst({
      where: { id: { lt: app.id } },
      orderBy: { id: 'desc' },
      select: { id: true },
    }),
    prisma.application.findFirst({
      where: { id: { gt: app.id } },
      orderBy: { id: 'asc' },
      select: { id: true },
    }),
  ])

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '4px' }}>{app.roleTitle}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '15px', color: 'var(--color-muted)' }}>
                <BuildingIcon size={14} />
                {app.company.name}
              </span>
              {app.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', color: 'var(--color-muted)' }}>
                  <MapPinIcon size={13} />
                  {app.location}
                </span>
              )}
              {app.workType && (
                <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{app.workType}</span>
              )}
              {app.salary && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-muted)' }}>
                  <DollarSignIcon size={12} />
                  {app.salary}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <TailorCVButton applicationId={app.id} />
            <Link href={`/applications/${app.id}/edit`}>
              <Button variant="secondary" size="sm">Edit</Button>
            </Link>
            <DeleteApplicationButton applicationId={app.id} />
            <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)', marginLeft: '4px' }}>
              {prevApp ? (
                <Link
                  href={`/applications/${prevApp.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    borderRight: '1px solid var(--color-border)',
                    transition: 'background-color 0.15s',
                  }}
                  title="Previous application"
                >
                  <ChevronLeftIcon size={15} />
                </Link>
              ) : (
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-border)',
                  borderRight: '1px solid var(--color-border)',
                  cursor: 'default',
                }}>
                  <ChevronLeftIcon size={15} />
                </span>
              )}
              {nextApp ? (
                <Link
                  href={`/applications/${nextApp.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    transition: 'background-color 0.15s',
                  }}
                  title="Next application"
                >
                  <ChevronRightIcon size={15} />
                </Link>
              ) : (
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-border)',
                  cursor: 'default',
                }}>
                  <ChevronRightIcon size={15} />
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stage</span>
            <StageSelect applicationId={app.id} currentStage={app.stage as import('@/lib/types').Stage} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority</span>
            <PriorityBadge priority={app.priority as import('@/lib/types').Priority} />
          </div>
          {app.source && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source</span>
              <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>{app.source}</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Applied</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-text)' }}>
              <CalendarIcon size={12} />
              {new Date(app.appliedAt).toLocaleDateString()}
            </span>
          </div>
          {app.jobUrl && (
            <a
              href={app.jobUrl}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--color-accent)', marginLeft: 'auto', textDecoration: 'none' }}
            >
              <ExternalLinkIcon size={13} />
              Job Posting
            </a>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-5">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '20px',
            }}
          >
            <Timeline applicationId={app.id} events={app.events} />
          </section>

          <section
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '20px',
            }}
          >
            <FileUpload applicationId={app.id} existingFiles={app.files} />
          </section>

          <RawJdSection applicationId={app.id} initialValue={app.rawJd ?? ''} />
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <section
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '20px',
            }}
          >
            <ContactsList applicationId={app.id} contacts={app.contacts} />
          </section>

          <section
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '20px',
            }}
          >
            <NotesList applicationId={app.id} notes={app.notes} />
          </section>
        </div>
      </div>
    </div>
  )
}
