import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stageToEventType, stageToEventTitle } from '@/lib/stage-events'
import type { Stage, Priority } from '@/lib/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const stage = searchParams.get('stage') as Stage | null
  const priority = searchParams.get('priority') as Priority | null
  const search = searchParams.get('search')

  const applications = await prisma.application.findMany({
    where: {
      ...(stage ? { stage } : {}),
      ...(priority ? { priority } : {}),
      ...(search
        ? {
            OR: [
              { roleTitle: { contains: search } },
              { company: { name: { contains: search } } },
              { location: { contains: search } },
            ],
          }
        : {}),
    },
    include: { company: true },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(applications)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
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
  } = body

  if (!roleTitle?.trim()) {
    return NextResponse.json({ error: 'roleTitle required' }, { status: 400 })
  }

  let resolvedCompanyId = companyId
  if (!resolvedCompanyId && companyName?.trim()) {
    const existing = await prisma.company.findFirst({
      where: { name: { equals: companyName.trim() } },
    })
    if (existing) {
      resolvedCompanyId = existing.id
    } else {
      const created = await prisma.company.create({
        data: { name: companyName.trim() },
      })
      resolvedCompanyId = created.id
    }
  }

  if (!resolvedCompanyId) {
    return NextResponse.json({ error: 'company required' }, { status: 400 })
  }

  const application = await prisma.application.create({
    data: {
      companyId: resolvedCompanyId,
      roleTitle: roleTitle.trim(),
      roleLevel,
      jobUrl,
      salary,
      location: Array.isArray(location) ? location.join(', ') : location,
      workType,
      stage: stage ?? 'APPLIED',
      source,
      priority: priority ?? 'MEDIUM',
      appliedAt: appliedAt ? new Date(appliedAt) : undefined,
      rawJd: rawJd ?? null,
    },
    include: { company: true },
  })

  const initialStage = (stage ?? 'APPLIED') as Stage
  const eventType = stageToEventType(initialStage)
  const eventTitle = stageToEventTitle(initialStage)
  if (eventType && eventTitle) {
    await prisma.applicationEvent.create({
      data: {
        applicationId: application.id,
        eventType,
        title: eventTitle,
        occurredAt: application.appliedAt ?? new Date(),
      },
    })
  }

  return NextResponse.json(application, { status: 201 })
}
