import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { resolveCV, loadUnlistedSkills, formatUnlistedSkillsForPrompt } from '@/lib/cv/resolve-yaml'
import { getUploadPath, ensureUploadsDir } from '@/lib/uploads'
import type { TailoringAnalysis } from '@/types/cv'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function callOllama(model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('http://localhost:11434/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`)
  const data = await res.json() as { choices: { message: { content: string } }[] }
  return data.choices[0]?.message?.content ?? ''
}

const SYSTEM_PROMPT = `You are an expert CV tailoring assistant optimizing for ATS keyword coverage and recruiter callbacks.
You receive a structured CV (bullet library), a job description, and a list of the candidate's verified unlisted skills.

Your job:
1. Score each CV bullet's relevance to this specific JD (0-100)
2. Identify which JD requirements are uncovered by any bullet or skills
3. Suggest rewrites for bullets to maximize ATS keyword coverage. Rules for rewrites:
   - Suggest a rewrite whenever adding JD keywords would improve ATS match — be aggressive, not conservative
   - You MAY inject technology names from UNLISTED SKILLS into rewrites when the bullet's context supports it — these are real verified experience, not invented
   - Preserve ALL factual claims exactly: numbers, years, percentages, company names, scale figures — never alter them
   - Never invent achievements, outcomes, or scope not present in the original bullet — only tool/technology names from UNLISTED SKILLS may be added
   - Keep the candidate's voice and sentence structure
4. For each gap (JD requirement with no coverage), provide a concrete action:
   - "inject_rewrite": if an existing bullet can be rewritten to mention a relevant unlisted skill, specify which bullet and write the rewrite
   - "add_skills_row": if the gap is a tool/technology the candidate has (in UNLISTED SKILLS), write a ready-to-add skills line (e.g. "Container Orchestration: Kubernetes (AKS/EKS), Helm, ArgoCD, Kustomize")
   - "uncoverable": only if the candidate genuinely has no relevant experience or unlisted skill for this requirement
5. Rewrite the CURRENT SUMMARY to lead with what this JD cares about most — weave in JD keywords naturally, preserve all factual claims verbatim
6. Return ONLY valid JSON, no preamble, no markdown fences

Scoring rules:
- Direct keyword match in bullet text: +20
- Keyword match in bullet tags or unlisted skills: +10
- Signal type matches JD culture (leadership/scale/technical-depth): +15
- Domain match: +15
- No relevance to any requirement: score 0-20
- Never score above 95`

function buildUserPrompt(
  versionId: string,
  bulletsYaml: string,
  jdText: string,
  currentSummary: string,
  unlistedSkillsBlock: string,
): string {
  const jdTruncated = jdText.slice(0, 3000)
  return `VERSION: ${versionId}

CURRENT SUMMARY (rewrite this, preserve all facts):
${currentSummary}

CV BULLETS (from master.yaml, version-filtered):
${bulletsYaml}

UNLISTED SKILLS (candidate's verified real experience — safe to inject by name into rewrites):
${unlistedSkillsBlock}

JD TEXT:
${jdTruncated}

Return JSON matching exactly this interface:
{
  matchScore: number,
  missingKeywords: string[],
  bulletsRanked: [
    {
      id: string,
      relevanceScore: number,
      rewriteSuggestion: string | null,
      reason: string
    }
  ],
  summaryRewrite: string,
  coverageByRequirement: [
    {
      requirement: string,
      coveredBy: string[],
      gap: boolean,
      gapAction: {
        action: "inject_rewrite" | "add_skills_row" | "uncoverable",
        targetBulletId: string | null,
        suggestedText: string | null,
        reason: string
      } | null
    }
  ]
}`
}

interface PageProps {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: PageProps) {
  try {
    const { id } = await params
    const body = await request.json()
    const { versionId, provider, ollamaModel } = body as {
      versionId: string
      provider?: 'ollama'
      ollamaModel?: string
    }

    if (!versionId) {
      return NextResponse.json({ error: 'versionId required' }, { status: 400 })
    }

    const app = await prisma.application.findUnique({
      where: { id: Number(id) },
      include: { files: { where: { type: 'JOB_DESCRIPTION' }, orderBy: { createdAt: 'desc' } } },
    })

    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    // Get JD text: prefer rawJd, fall back to JD file on disk
    let jdText = app.rawJd ?? ''
    if (!jdText && app.files.length > 0) {
      try {
        jdText = fs.readFileSync(app.files[0].storedPath, 'utf-8')
      } catch {
        // file missing from disk
      }
    }

    if (!jdText.trim()) {
      return NextResponse.json(
        { error: 'No JD found. Add job description text or upload a JD file first.' },
        { status: 422 },
      )
    }

    // Resolve CV without tailoring to get bullet list for prompt
    const { cv } = resolveCV(versionId)

    // Build a compact YAML-like bullet list for the prompt
    const bulletsYaml = cv.experience
      .flatMap(exp =>
        exp.bullets.map(b => `- id: ${b.id}\n  text: "${b.text.replace(/"/g, '\\"').trim()}"`)
      )
      .join('\n')

    const unlistedSkillsBlock = formatUnlistedSkillsForPrompt(loadUnlistedSkills())
    const userPrompt = buildUserPrompt(versionId, bulletsYaml, jdText, cv.summary, unlistedSkillsBlock)

    let rawText: string
    if (provider === 'ollama') {
      const model = ollamaModel?.trim() || 'qwen2.5:14b'
      rawText = await callOllama(model, SYSTEM_PROMPT, userPrompt)
    } else {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      })
      rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    }
    // Strip any accidental markdown fences
    const jsonText = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

    let analysis: TailoringAnalysis
    try {
      analysis = JSON.parse(jsonText) as TailoringAnalysis
    } catch {
      // Retry with a re-parse attempt stripping to first { ... }
      const match = jsonText.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Claude returned invalid JSON')
      analysis = JSON.parse(match[0]) as TailoringAnalysis
    }

    // Save analysis JSON as ApplicationFile
    ensureUploadsDir()
    const uuid = uuidv4()
    const date = new Date().toISOString().slice(0, 10)
    const filename = `tailoring-${id}-${uuid.slice(0, 8)}.json`
    const storedPath = getUploadPath(uuid, filename)
    fs.writeFileSync(storedPath, JSON.stringify(analysis, null, 2))

    const fileRecord = await prisma.applicationFile.create({
      data: {
        applicationId: Number(id),
        type: 'OTHER',
        label: `Tailoring Analysis — ${versionId} — ${date}`,
        filename,
        storedPath,
        mimeType: 'application/json',
        sizeBytes: Buffer.byteLength(JSON.stringify(analysis)),
      },
    })

    return NextResponse.json({ analysis, fileId: fileRecord.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
