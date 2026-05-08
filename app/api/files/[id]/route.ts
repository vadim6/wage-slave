import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const file = await prisma.applicationFile.findUnique({ where: { id: Number(id) } })
  if (!file) return NextResponse.json({ error: 'not found' }, { status: 404 })

  if (!fs.existsSync(file.storedPath)) {
    return NextResponse.json({ error: 'file not found on disk' }, { status: 404 })
  }

  const buffer = fs.readFileSync(file.storedPath)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': file.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="${file.filename}"`,
      'Content-Length': String(buffer.length),
    },
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const file = await prisma.applicationFile.findUnique({ where: { id: Number(id) } })
  if (!file) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await prisma.applicationFile.delete({ where: { id: Number(id) } })

  try {
    fs.unlinkSync(file.storedPath)
  } catch {
    // already gone
  }

  return NextResponse.json({ ok: true })
}
