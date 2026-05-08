import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { EventType } from '@/lib/types'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { eventType, title, description, occurredAt } = body

  const event = await prisma.applicationEvent.update({
    where: { id: Number(id) },
    data: {
      ...(eventType !== undefined ? { eventType: eventType as EventType } : {}),
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(occurredAt !== undefined ? { occurredAt: new Date(occurredAt) } : {}),
    },
  })

  return NextResponse.json(event)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.applicationEvent.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
