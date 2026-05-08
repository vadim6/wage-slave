import { prisma } from '@/lib/prisma'
import { ApplicationForm } from '@/components/applications/application-form'

export default async function NewApplicationPage() {
  const [companies, sourceGroups] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: 'asc' } }),
    prisma.application.groupBy({ by: ['source'], where: { source: { not: null } } }),
  ])
  const knownSources = sourceGroups.map(s => s.source!).filter(Boolean)

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>New Application</h1>
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '28px',
        }}
      >
        <ApplicationForm mode="create" companies={companies} knownSources={knownSources} />
      </div>
    </div>
  )
}
