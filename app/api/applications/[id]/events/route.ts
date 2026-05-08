import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { EventType } from '@/lib/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { eventType, title, description, occurredAt } = body

  if (!eventType) return NextResponse.json({ error: 'eventType required' }, { status: 400 })

  const event = await prisma.applicationEvent.create({
    data: {
      applicationId: Number(id),
      eventType: eventType as EventType,
      title,
      description,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    },
  })

  return NextResponse.json(event, { status: 201 })
}
