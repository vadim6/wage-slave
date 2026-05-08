import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.note.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })
  const note = await prisma.note.update({
    where: { id: Number(id) },
    data: { content: content.trim() },
  })
  return NextResponse.json(note)
}
