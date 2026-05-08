import { NextRequest, NextResponse } from 'next/server'
import { resolveCV } from '@/lib/cv/resolve-yaml'
import type { TailoringAnalysis } from '@/types/cv'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { versionId, tailoringAnalysis } = body as {
      versionId: string
      tailoringAnalysis?: TailoringAnalysis
    }

    if (!versionId) {
      return NextResponse.json({ error: 'versionId required' }, { status: 400 })
    }

    const { cv, warnings } = resolveCV(versionId, tailoringAnalysis)
    return NextResponse.json({ cv, warnings })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
