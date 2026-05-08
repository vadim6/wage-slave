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
  } catch {
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
