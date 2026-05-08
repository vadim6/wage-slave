import type { ScrapedJD } from '@/lib/types'

export const DEFAULT_MODEL = 'qwen2.5:14b'

export const SYSTEM_PROMPT = `You are a job description parser. You receive raw text scraped from a careers page.
Your job is to extract only the relevant job description content and return it as valid JSON.

Ignore ALL of the following — do not include them anywhere in the output:
- Navigation menus, breadcrumbs, site headers and footers
- Job board chrome: "Save job", "Apply Now", "Share", "Back to jobs", "Similar jobs"
- ATS metadata: job ID numbers, requisition IDs, category/department tags
- Availability noise: "Available in X locations", "X applicants", date posted
- Broken or undefined labels (e.g. "undefined:")
- Cookie banners, GDPR notices, legal boilerplate
- Repeated content, social share links

Return ONLY a valid JSON object — no preamble, no markdown, no explanation.`

export function buildUserPrompt(scrapedText: string): string {
  return `Parse this careers page text and return a JSON object with these fields:
- roleTitle (string)
- company (string)
- location (string or null)
- workType ("Remote", "Hybrid", "On-site", or null)
- salary (string or null — include currency and range if present)
- requirements (array of strings — skills, qualifications, must-haves)
- responsibilities (array of strings — what the role actually does)
- rawText (string — the job description body ONLY: role overview, responsibilities, requirements/qualifications. No job board UI, no metadata, no apply buttons, no navigation.)

Page text:
${scrapedText}`
}

async function callOllama(text: string, model: string): Promise<string> {
  const { Ollama } = await import('ollama')
  const client = new Ollama()
  const response = await client.generate({
    model,
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(text),
    stream: false,
  })
  return response.response
}

export function parseResponse(raw: string): ScrapedJD {
  const cleaned = raw
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim()
  return JSON.parse(cleaned) as ScrapedJD
}

export async function parseJD(rawText: string, model = DEFAULT_MODEL): Promise<ScrapedJD> {
  let raw: string
  try {
    raw = await callOllama(rawText, model)
  } catch {
    throw new Error('ollama_unreachable')
  }

  try {
    return parseResponse(raw)
  } catch {
    // retry once
    try {
      raw = await callOllama(rawText, model)
      return parseResponse(raw)
    } catch {
      throw new Error('ollama_parse_failed')
    }
  }
}
