import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { name, role, email, linkedin, notes } = body

  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const contact = await prisma.contact.create({
    data: { applicationId: Number(id), name: name.trim(), role, email, linkedin, notes },
  })

  return NextResponse.json(contact, { status: 201 })
}
