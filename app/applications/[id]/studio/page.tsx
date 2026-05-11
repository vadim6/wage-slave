import { notFound } from 'next/navigation'
import fs from 'fs'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { resolveCV } from '@/lib/cv/resolve-yaml'
import { StudioClient } from './studio-client'
import type { TailoringAnalysis } from '@/types/cv'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ analysisFileId?: string; versionId?: string }>
}

export default async function StudioPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { analysisFileId, versionId = 'v1_technical' } = await searchParams

  const app = await prisma.application.findUnique({
    where: { id: Number(id) },
    include: { company: true },
  })

  if (!app) notFound()

  // Load tailoring analysis from file
  let analysis: TailoringAnalysis | null = null
  if (analysisFileId) {
    const fileRecord = await prisma.applicationFile.findUnique({
      where: { id: Number(analysisFileId) },
    })
    if (fileRecord) {
      try {
        const raw = fs.readFileSync(fileRecord.storedPath, 'utf-8')
        analysis = JSON.parse(raw) as TailoringAnalysis
      } catch {
        // file missing or corrupt — proceed without analysis
      }
    }
  }

  if (!analysis) {
    return (
      <div style={{ maxWidth: '480px', padding: '60px 0', textAlign: 'center', margin: '0 auto' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>✦</div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>No Analysis Yet</h1>
        <p style={{ color: 'var(--color-muted)', marginBottom: '28px', lineHeight: '1.6', fontSize: '14px' }}>
          Run a tailoring analysis first to see how your CV matches this role, get bullet relevance scores, and generate a custom DOCX.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link
            href={`/applications/${id}?openTailor=1`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              backgroundColor: 'var(--color-accent)',
              color: '#fff', fontSize: '14px', fontWeight: 500,
              padding: '9px 18px', borderRadius: '6px', textDecoration: 'none',
            }}
          >
            ✦ Run Tailoring Analysis
          </Link>
          <Link
            href={`/applications/${id}`}
            style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-muted)', fontSize: '14px', textDecoration: 'none' }}
          >
            ← Back
          </Link>
        </div>
      </div>
    )
  }

  const { cv } = resolveCV(versionId, analysis)

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <Link
          href={`/applications/${id}`}
          style={{ fontSize: '13px', color: 'var(--color-muted)', textDecoration: 'none' }}
        >
          ← {app.company.name} — {app.roleTitle}
        </Link>
      </div>

      <StudioClient
        applicationId={app.id}
        applicationTitle={app.roleTitle}
        companyName={app.company.name}
        initialCV={cv}
        initialAnalysis={analysis}
        analysisFileId={Number(analysisFileId)}
      />
    </div>
  )
}
