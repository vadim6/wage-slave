import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ApplicationForm } from '@/components/applications/application-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditApplicationPage({ params }: PageProps) {
  const { id } = await params

  const [app, companies, sourceGroups] = await Promise.all([
    prisma.application.findUnique({
      where: { id: Number(id) },
      include: { files: true },
    }),
    prisma.company.findMany({ orderBy: { name: 'asc' } }),
    prisma.application.groupBy({ by: ['source'], where: { source: { not: null } } }),
  ])
  const knownSources = sourceGroups.map(s => s.source!).filter(Boolean)

  if (!app) notFound()

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Edit Application</h1>
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '28px',
        }}
      >
        <ApplicationForm
          mode="edit"
          companies={companies}
          knownSources={knownSources}
          initialData={{
            id: app.id,
            companyId: app.companyId,
            roleTitle: app.roleTitle,
            roleLevel: app.roleLevel,
            jobUrl: app.jobUrl,
            salary: app.salary,
            location: app.location,
            workType: app.workType,
            stage: app.stage,
            source: app.source,
            priority: app.priority,
            appliedAt: app.appliedAt.toISOString(),
            rawJd: app.rawJd,
            files: app.files,
          }}
        />
      </div>
    </div>
  )
}
