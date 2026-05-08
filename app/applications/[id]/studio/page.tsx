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
      <div style={{ maxWidth: '600px', padding: '40px 0' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>CV Studio</h1>
        <p style={{ color: 'var(--color-muted)', marginBottom: '20px' }}>
          No tailoring analysis found. Return to the application and click <strong>Tailor CV</strong> first.
        </p>
        <Link
          href={`/applications/${id}`}
          style={{ color: 'var(--color-accent)', fontSize: '14px' }}
        >
          ← Back to application
        </Link>
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
