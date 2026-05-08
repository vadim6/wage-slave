import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const dir = process.env.CV_VERSIONS_PATH ?? './cv/versions'
    const resolved = path.resolve(process.cwd(), dir)
    const files = fs.readdirSync(resolved)
    const versions = files
      .filter(f => f.endsWith('.yaml') && !f.endsWith('.sample.yaml'))
      .map(f => f.replace(/\.yaml$/, ''))
    return NextResponse.json({ versions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
