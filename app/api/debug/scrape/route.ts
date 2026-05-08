import { NextRequest, NextResponse } from 'next/server'
import { scrapeUrl } from '@/lib/scraper'
import { SYSTEM_PROMPT, buildUserPrompt, parseResponse, DEFAULT_MODEL } from '@/lib/ollama'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { url, model = DEFAULT_MODEL } = body

  if (!url?.trim()) {
    return NextResponse.json({ error: 'url required' }, { status: 400 })
  }

  let rawText: string
  let truncatedText: string
  try {
    rawText = await scrapeUrl(url)
    truncatedText = rawText
  } catch (err) {
    return NextResponse.json({
      scrapeError: err instanceof Error ? err.message : 'scrape failed',
      rawText: null,
      truncatedText: null,
      systemPrompt: null,
      userPrompt: null,
      ollamaRaw: null,
      parsed: null,
      ollamaError: null,
    })
  }

  const userPrompt = buildUserPrompt(truncatedText)

  let ollamaRaw: string | null = null
  let parsed = null
  let ollamaError: string | null = null

  try {
    const { Ollama } = await import('ollama')
    const client = new Ollama()
    const response = await client.generate({
      model,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      stream: false,
    })
    ollamaRaw = response.response

    try {
      parsed = parseResponse(ollamaRaw)
    } catch {
      ollamaError = 'JSON parse failed — raw response is not valid JSON'
    }
  } catch (err) {
    ollamaError = err instanceof Error ? err.message : 'ollama unreachable'
  }

  return NextResponse.json({
    scrapeError: null,
    rawText,
    truncatedText,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    ollamaRaw,
    parsed,
    ollamaError,
  })
}
