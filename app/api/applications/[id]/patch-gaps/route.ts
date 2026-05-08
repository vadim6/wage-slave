import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { loadUnlistedSkills, loadMasterBullets } from '@/lib/cv/resolve-yaml'
import { patchGapActions } from '@/lib/cv/patch-gaps'
import { reEvaluateCoverage } from '@/lib/cv/re-evaluate'
import { getUploadPath, ensureUploadsDir } from '@/lib/uploads'
import type { TailoringAnalysis, ResolvedCV } from '@/types/cv'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: PageProps) {
  try {
    const { id } = await params
    const { analysisFileId, resolvedCV } = await request.json() as { analysisFileId: number; resolvedCV?: ResolvedCV }

    if (!analysisFileId) {
      return NextResponse.json({ error: 'analysisFileId required' }, { status: 400 })
    }

    const fileRecord = await prisma.applicationFile.findUnique({
      where: { id: analysisFileId },
    })
    if (!fileRecord || fileRecord.applicationId !== Number(id)) {
      return NextResponse.json({ error: 'Analysis file not found' }, { status: 404 })
    }

    const raw = fs.readFileSync(fileRecord.storedPath, 'utf-8')
    let analysis = JSON.parse(raw) as TailoringAnalysis

    // Re-evaluate coverage against current CV state before deriving gap actions
    if (resolvedCV) {
      analysis = reEvaluateCoverage(analysis, resolvedCV)
    }

    const unlistedSkills = loadUnlistedSkills()
    const masterBullets = loadMasterBullets()

    const patched = patchGapActions(analysis, unlistedSkills, masterBullets)

    // Save patched analysis as a new ApplicationFile
    ensureUploadsDir()
    const uuid = uuidv4()
    const date = new Date().toISOString().slice(0, 10)
    const filename = `tailoring-patched-${id}-${uuid.slice(0, 8)}.json`
    const storedPath = getUploadPath(uuid, filename)
    fs.writeFileSync(storedPath, JSON.stringify(patched, null, 2))

    const savedFile = await prisma.applicationFile.create({
      data: {
        applicationId: Number(id),
        type: 'OTHER',
        label: `Tailoring Analysis — patched gaps — ${date}`,
        filename,
        storedPath,
        mimeType: 'application/json',
        sizeBytes: Buffer.byteLength(JSON.stringify(patched)),
      },
    })

    const actioned = patched.coverageByRequirement.filter(c => c.gap && c.gapAction?.action !== 'uncoverable').length
    const uncoverable = patched.coverageByRequirement.filter(c => c.gap && c.gapAction?.action === 'uncoverable').length

    return NextResponse.json({
      analysis: patched,
      fileId: savedFile.id,
      summary: { actioned, uncoverable },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
