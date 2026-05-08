import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { content } = body

  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const note = await prisma.note.create({
    data: { applicationId: Number(id), content: content.trim() },
  })

  return NextResponse.json(note, { status: 201 })
}
