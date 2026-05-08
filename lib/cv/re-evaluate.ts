import type { TailoringAnalysis, ResolvedCV } from '@/types/cv'

const STOP = new Set([
  'and', 'or', 'the', 'for', 'with', 'using', 'in', 'of', 'to', 'a', 'an',
  'including', 'across', 'their', 'its', 'are', 'via', 'on', 'at', 'as',
  'be', 'is', 'by', 'new', 'own', 'our',
])

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[()\/,\-:.+&]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && !STOP.has(t))
  )
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0
  for (const t of a) if (b.has(t)) n++
  return n
}

export function reEvaluateCoverage(
  analysis: TailoringAnalysis,
  resolvedCV: ResolvedCV,
): TailoringAnalysis {
  // Build searchable content from current CV state
  const bulletEntries = resolvedCV.experience
    .flatMap(exp => exp.bullets)
    .filter(b => b.included)
    .map(b => ({ id: b.id, toks: tokenize(b.text) }))

  const skillEntries = resolvedCV.skills.map((s, i) => ({
    id: `skill:${s.category}`,
    toks: tokenize(`${s.category} ${s.value}`),
  }))

  const updated = analysis.coverageByRequirement.map(cov => {
    const reqToks = tokenize(cov.requirement)

    const coveredBy: string[] = []

    for (const b of bulletEntries) {
      if (overlap(reqToks, b.toks) >= 1) coveredBy.push(b.id)
    }
    for (const s of skillEntries) {
      if (overlap(reqToks, s.toks) >= 1) coveredBy.push(s.id)
    }

    const nowCovered = coveredBy.length > 0
    return {
      ...cov,
      coveredBy: nowCovered ? coveredBy : cov.coveredBy,
      gap: !nowCovered,
      // Clear gapAction if now covered
      gapAction: nowCovered ? null : cov.gapAction,
    }
  })

  // Recompute a simple coverage-based match score alongside the original
  const total = updated.length
  const coveredCount = updated.filter(c => !c.gap).length
  const coverageScore = total > 0 ? Math.round((coveredCount / total) * 100) : analysis.matchScore

  return {
    ...analysis,
    matchScore: Math.max(analysis.matchScore, coverageScore),
    coverageByRequirement: updated,
  }
}
