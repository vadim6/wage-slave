import { NextRequest, NextResponse } from 'next/server'
import { scrapeUrl } from '@/lib/scraper'
import { parseJD } from '@/lib/ollama'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { url } = body

  if (!url?.trim()) {
    return NextResponse.json({ error: 'url required' }, { status: 400 })
  }

  let rawText: string
  try {
    rawText = await scrapeUrl(url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'ashby_job_not_found') {
      return NextResponse.json({ error: 'scrape_failed', message: 'Job not found in Ashby board listing (may be unlisted or expired). Try pasting the JD text manually.' }, { status: 422 })
    }
    return NextResponse.json({ error: 'scrape_failed', message: 'Could not fetch the page. Try pasting the JD text manually.' }, { status: 422 })
  }

  try {
    const parsed = await parseJD(rawText)
    return NextResponse.json({ ...parsed, scrapedRaw: rawText })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    if (message === 'ollama_unreachable') {
      return NextResponse.json({
        error: 'ollama_unreachable',
        message: 'Ollama is not running. Start it with `ollama serve`.',
        rawText,
        parsed: null,
      })
    }
    return NextResponse.json({
      error: 'parse_failed',
      message: 'Could not parse the JD. Fill in fields manually.',
      rawText,
      parsed: null,
    })
  }
}
