import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stageToEventType, stageToEventTitle } from '@/lib/stage-events'
import fs from 'fs'
import type { Stage } from '@/lib/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const application = await prisma.application.findUnique({
    where: { id: Number(id) },
    include: {
      company: true,
      files: { orderBy: { createdAt: 'desc' } },
      events: { orderBy: { occurredAt: 'desc' } },
      contacts: true,
      notes: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!application) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(application)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const existing = await prisma.application.findUnique({
    where: { id: Number(id) },
    select: { stage: true },
  })
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const {
    companyName,
    companyId,
    roleTitle,
    roleLevel,
    jobUrl,
    salary,
    location,
    workType,
    stage,
    source,
    priority,
    appliedAt,
    rawJd,
    rejectReason,
    followUpDate,
  } = body

  let resolvedCompanyId = companyId
  if (!resolvedCompanyId && companyName?.trim()) {
    const existingCompany = await prisma.company.findFirst({
      where: { name: { equals: companyName.trim() } },
    })
    resolvedCompanyId = existingCompany?.id
    if (!resolvedCompanyId) {
      const created = await prisma.company.create({ data: { name: companyName.trim() } })
      resolvedCompanyId = created.id
    }
  }

  const stageChanged = stage && stage !== existing.stage
  const newStage = stage as Stage | undefined

  const [application] = await prisma.$transaction([
    prisma.application.update({
      where: { id: Number(id) },
      data: {
        ...(resolvedCompanyId ? { companyId: resolvedCompanyId } : {}),
        ...(roleTitle !== undefined ? { roleTitle: roleTitle.trim() } : {}),
        ...(roleLevel !== undefined ? { roleLevel } : {}),
        ...(jobUrl !== undefined ? { jobUrl } : {}),
        ...(salary !== undefined ? { salary } : {}),
        ...(location !== undefined ? { location: Array.isArray(location) ? location.join(', ') : location } : {}),
        ...(workType !== undefined ? { workType } : {}),
        ...(stage !== undefined ? { stage } : {}),
        ...(source !== undefined ? { source } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(appliedAt !== undefined ? { appliedAt: new Date(appliedAt) } : {}),
        ...(rawJd !== undefined ? { rawJd } : {}),
        ...(rejectReason !== undefined ? { rejectReason } : {}),
        ...(followUpDate !== undefined ? { followUpDate: followUpDate ? new Date(followUpDate) : null } : {}),
      },
      include: { company: true },
    }),
    ...(stageChanged && newStage
      ? [
          prisma.applicationEvent.create({
            data: {
              applicationId: Number(id),
              eventType: stageToEventType(newStage) ?? 'OTHER',
              title: stageToEventTitle(newStage) ?? `Stage changed to ${newStage}`,
              occurredAt: new Date(),
            },
          }),
        ]
      : []),
  ])

  return NextResponse.json(application)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const files = await prisma.applicationFile.findMany({
    where: { applicationId: Number(id) },
    select: { storedPath: true },
  })

  await prisma.application.delete({ where: { id: Number(id) } })

  for (const file of files) {
    try {
      fs.unlinkSync(file.storedPath)
    } catch {
      // file already gone — no action needed
    }
  }

  return NextResponse.json({ ok: true })
}
