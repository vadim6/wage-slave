import type { TailoringAnalysis, GapAction } from '@/types/cv'
import type { MasterBulletInfo } from './resolve-yaml'

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

const GROUP_LABELS: Record<string, string> = {
  container_orchestration: 'Container Orchestration',
  cicd_and_pipelines: 'CI/CD & Pipelines',
  iac_and_config: 'Infrastructure as Code',
  observability_and_alerting: 'Observability & Alerting',
  cloud_services: 'Cloud Services',
  databases_and_storage: 'Databases & Storage',
  networking_and_proxy: 'Networking & Proxy',
  messaging_and_streaming: 'Messaging & Streaming',
  security_and_compliance: 'Security & Compliance',
  developer_tools: 'Developer Tools',
}

function groupLabel(key: string): string {
  return GROUP_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Strip prose descriptions from skill items, keep the tool name + short qualifier
// "Vault (HashiCorp — secrets management)" → "HashiCorp Vault"
// "Kubernetes (AKS, EKS, GKE, self-managed)" → "Kubernetes (AKS, EKS, GKE)"
// "GitHub Actions (advanced — matrix builds, reusable workflows, OIDC)" → "GitHub Actions"
function cleanSkill(raw: string): string {
  // If parens contain only version/qualifier identifiers (short, no spaces or commas → capitals), keep them
  // Otherwise strip the parens content
  return raw
    .replace(/\s*—[^)]*\)/g, ')') // strip "— description" inside parens
    .replace(/\s*\([^)]*advanced[^)]*\)/gi, '') // strip "(advanced ...)"
    .replace(/\s*\([^)]*self-managed[^)]*\)/gi, '') // strip "(self-managed)"
    .replace(/\s*\([^)]*administration[^)]*\)/gi, '') // strip "(... administration)"
    .replace(/\s*\([^)]*management[^)]*\)/gi, '') // strip "(... management)"
    .replace(/\s*\([^)]*discovery[^)]*\)/gi, '') // strip "(... discovery)"
    .replace(/\s*—.*/g, '') // strip trailing "— description"
    .replace(/\s+/g, ' ')
    .trim()
}

interface GroupMatch {
  group: string
  matched: string[]
  rest: string[]
  score: number
}

function findGroupMatches(
  reqToks: Set<string>,
  unlistedSkills: Record<string, string[]>,
): GroupMatch[] {
  const results: GroupMatch[] = []
  for (const [group, items] of Object.entries(unlistedSkills)) {
    const matched: string[] = []
    const rest: string[] = []
    for (const skill of items) {
      if (overlap(reqToks, tokenize(skill)) > 0) matched.push(skill)
      else rest.push(skill)
    }
    if (matched.length > 0) results.push({ group, matched, rest, score: matched.length })
  }
  return results.sort((a, b) => b.score - a.score)
}

function buildSkillsRowText(match: GroupMatch): string {
  // matched skills first, then up to 3 related from same group
  const extras = match.rest.slice(0, 3)
  return [...match.matched, ...extras].map(cleanSkill).join(', ')
}

// Simple local keyword injection into bullet text
function injectIntoText(bulletText: string, keyword: string): string {
  const text = bulletText.trim()
  if (text.toLowerCase().includes(keyword.toLowerCase())) return text

  // If bullet has a parenthetical tool list, extend it
  const toolList = text.match(/\(([A-Z][A-Za-z0-9, /]+)\)/)
  if (toolList) {
    return text.replace(toolList[0], `(${toolList[1]}, ${keyword})`)
  }

  // Append naturally
  return text.replace(/\.$/, '') + `, leveraging ${keyword}.`
}

export function patchGapActions(
  analysis: TailoringAnalysis,
  unlistedSkills: Record<string, string[]>,
  masterBullets: Map<string, MasterBulletInfo>,
): TailoringAnalysis {
  const patched = analysis.coverageByRequirement.map(cov => {
    // Skip non-gaps and already-actioned gaps
    if (!cov.gap) return { ...cov, gapAction: cov.gapAction ?? null }
    if (cov.gapAction != null) return cov

    const reqToks = tokenize(cov.requirement)
    const groupMatches = findGroupMatches(reqToks, unlistedSkills)

    if (groupMatches.length === 0) {
      return {
        ...cov,
        gapAction: {
          action: 'uncoverable' as const,
          reason: 'No matching experience found in unlisted skills',
        } satisfies GapAction,
      }
    }

    const best = groupMatches[0]

    // Look for a near-miss bullet (score 35–78, not already covering this req)
    // that shares ≥2 tokens with the requirement — strong enough to be a real thematic match
    const nearMiss = analysis.bulletsRanked
      .filter(b => {
        if (b.relevanceScore < 35 || b.relevanceScore > 78) return false
        if (cov.coveredBy.includes(b.id)) return false
        const info = masterBullets.get(b.id)
        if (!info) return false
        const bulletToks = new Set([...tokenize(info.text), ...info.keywords.map(k => k.toLowerCase())])
        return overlap(reqToks, bulletToks) >= 2
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)[0]

    if (nearMiss) {
      const info = masterBullets.get(nearMiss.id)!
      const primaryKeyword = cleanSkill(best.matched[0]).split('(')[0].trim()
      return {
        ...cov,
        gapAction: {
          action: 'inject_rewrite' as const,
          targetBulletId: nearMiss.id,
          suggestedText: injectIntoText(info.text, primaryKeyword),
          reason: `Bullet overlaps with requirement context — injecting ${primaryKeyword} from unlisted skills adds ATS keyword coverage`,
        } satisfies GapAction,
      }
    }

    // No inject candidate — suggest a new skills row
    return {
      ...cov,
      gapAction: {
        action: 'add_skills_row' as const,
        suggestedText: `${groupLabel(best.group)}: ${buildSkillsRowText(best)}`,
        reason: `Candidate has ${best.matched.length} matching unlisted skill(s) in ${groupLabel(best.group)} — add as a skills row for ATS coverage`,
      } satisfies GapAction,
    }
  })

  return { ...analysis, coverageByRequirement: patched }
}
