import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUploadPath } from '@/lib/uploads'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import type { FileType } from '@/lib/types'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const applicationId = formData.get('applicationId')
  const type = (formData.get('type') as FileType) ?? 'OTHER'
  const label = formData.get('label') as string | null

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
  if (!applicationId) return NextResponse.json({ error: 'applicationId required' }, { status: 400 })

  const uuid = uuidv4()
  const storedPath = getUploadPath(uuid, file.name)

  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(storedPath, buffer)

  const record = await prisma.applicationFile.create({
    data: {
      applicationId: Number(applicationId),
      type,
      label,
      filename: file.name,
      storedPath,
      mimeType: file.type || null,
      sizeBytes: file.size,
    },
  })

  return NextResponse.json(record, { status: 201 })
}
