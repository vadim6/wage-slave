import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { generateDocx } from '@/lib/cv/generate-docx'
import { getUploadPath, ensureUploadsDir } from '@/lib/uploads'
import type { ResolvedCV } from '@/types/cv'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cv, applicationId, filename } = body as {
      cv: ResolvedCV
      applicationId: number
      filename?: string
    }

    if (!cv || !applicationId) {
      return NextResponse.json({ error: 'cv and applicationId required' }, { status: 400 })
    }

    const buffer = await generateDocx(cv)

    ensureUploadsDir()
    const uuid = uuidv4()
    const date = new Date().toISOString().slice(0, 10)
    const safeLabel = cv.versionLabel.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    const docxFilename = filename ?? `cv_${safeLabel}_${date}.docx`
    const storedPath = getUploadPath(uuid, docxFilename)

    fs.writeFileSync(storedPath, buffer)

    const record = await prisma.applicationFile.create({
      data: {
        applicationId: Number(applicationId),
        type: 'RESUME',
        label: `CV — ${cv.versionLabel} — ${date}`,
        filename: docxFilename,
        storedPath,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sizeBytes: buffer.length,
      },
    })

    const response = new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${docxFilename}"`,
        'X-File-Id': String(record.id),
      },
    })

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
