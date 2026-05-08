import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { z } from 'zod'
import type { ResolvedCV, ResolvedBullet, ResolvedSkillCategory, TailoringAnalysis } from '@/types/cv'

// ─── Zod schemas for master.yaml validation ───────────────────────────────

const MasterBulletSchema = z.object({
  id: z.string(),
  text: z.string(),
  tags: z.object({
    domain: z.array(z.string()).optional(),
    signal: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
})

const MasterExperienceSchema = z.object({
  id: z.string(),
  company: z.string(),
  companyMeta: z.string().optional(),
  title: z.string(),
  period: z.string(),
  location: z.string(),
  award: z.string().optional(),
  note: z.string().optional(),
  bullets: z.array(MasterBulletSchema),
})

const MasterSkillSchema = z.object({
  id: z.string(),
  category: z.string(),
  text: z.string(),
  tags: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
})

const MasterProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().optional(),
  status: z.string(),
  text: z.string(),
})

const MasterSchema = z.object({
  meta: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    languages: z.array(z.string()),
  }),
  summary: z.object({
    leadership_variant: z.string(),
    technical_variant: z.string(),
  }),
  experience: z.array(MasterExperienceSchema),
  skills: z.array(MasterSkillSchema),
  projects: z.array(MasterProjectSchema),
  unlisted_skills: z.record(z.string(), z.array(z.string())).optional(),
})

const VersionSchema = z.object({
  id: z.string(),
  label: z.string(),
  summary_variant: z.enum(['leadership_variant', 'technical_variant']),
  experience: z.record(z.string(), z.object({ bullets: z.array(z.string()) })),
  skills: z.array(z.array(z.string())),
  projects: z.array(z.string()),
})

type Master = z.infer<typeof MasterSchema>
type Version = z.infer<typeof VersionSchema>

// ─── Path resolution ──────────────────────────────────────────────────────

function masterPath(): string {
  const p = process.env.CV_MASTER_PATH
  if (!p) throw new Error('CV_MASTER_PATH env var not set')
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p)
}

function versionPath(versionId: string): string {
  const dir = process.env.CV_VERSIONS_PATH
  if (!dir) throw new Error('CV_VERSIONS_PATH env var not set')
  const base = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir)
  return path.join(base, `${versionId}.yaml`)
}

// ─── Unlisted skills loader ───────────────────────────────────────────────

export function loadUnlistedSkills(): Record<string, string[]> {
  const masterRaw = yaml.load(fs.readFileSync(masterPath(), 'utf-8'))
  const master = MasterSchema.parse(masterRaw)
  return master.unlisted_skills ?? {}
}

// Formats unlisted_skills as a compact prompt block
export function formatUnlistedSkillsForPrompt(unlisted: Record<string, string[]>): string {
  return Object.entries(unlisted)
    .map(([group, items]) => {
      const label = group.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      return `${label}: ${items.join(', ')}`
    })
    .join('\n')
}

export interface MasterBulletInfo {
  id: string
  text: string
  keywords: string[]
  domain: string[]
  signal: string[]
}

export function loadMasterBullets(): Map<string, MasterBulletInfo> {
  const masterRaw = yaml.load(fs.readFileSync(masterPath(), 'utf-8'))
  const master = MasterSchema.parse(masterRaw)
  const map = new Map<string, MasterBulletInfo>()
  for (const exp of master.experience) {
    for (const b of exp.bullets) {
      map.set(b.id, {
        id: b.id,
        text: b.text.trim(),
        keywords: b.tags?.keywords ?? [],
        domain: b.tags?.domain ?? [],
        signal: b.tags?.signal ?? [],
      })
    }
  }
  return map
}

// ─── Core resolve logic ───────────────────────────────────────────────────

export function resolveCV(
  versionId: string,
  tailoring?: TailoringAnalysis,
): { cv: ResolvedCV; warnings: string[] } {
  const warnings: string[] = []

  const masterRaw = yaml.load(fs.readFileSync(masterPath(), 'utf-8'))
  const master = MasterSchema.parse(masterRaw)

  const versionRaw = yaml.load(fs.readFileSync(versionPath(versionId), 'utf-8'))
  const version = VersionSchema.parse(versionRaw)

  // Build lookup maps
  const bulletIndex = new Map<string, Master['experience'][0]['bullets'][0]>()
  const experienceIndex = new Map<string, Master['experience'][0]>()
  for (const exp of master.experience) {
    experienceIndex.set(exp.id, exp)
    for (const b of exp.bullets) bulletIndex.set(b.id, b)
  }

  const skillIndex = new Map<string, Master['skills'][0]>()
  for (const s of master.skills) skillIndex.set(s.id, s)

  const projectIndex = new Map<string, Master['projects'][0]>()
  for (const p of master.projects) projectIndex.set(p.id, p)

  // Build tailoring lookup
  const tailorMap = new Map<string, { score: number; rewrite: string | null }>()
  if (tailoring) {
    for (const b of tailoring.bulletsRanked) {
      tailorMap.set(b.id, { score: b.relevanceScore, rewrite: b.rewriteSuggestion })
    }
  }

  // Resolve experience sections (preserve order from master.experience)
  const resolvedExperience = master.experience
    .filter(exp => exp.id in version.experience)
    .map(exp => {
      const versionBulletIds = version.experience[exp.id]?.bullets ?? []
      const resolvedBullets: ResolvedBullet[] = []

      for (const bulletId of versionBulletIds) {
        const masterBullet = bulletIndex.get(bulletId)
        if (!masterBullet) {
          warnings.push(`Bullet ID "${bulletId}" not found in master.yaml`)
          continue
        }

        const tailorEntry = tailorMap.get(bulletId)
        const originalText = masterBullet.text.trim()
        const rewriteText = tailorEntry?.rewrite?.trim() ?? null
        const score = tailorEntry?.score

        resolvedBullets.push({
          id: bulletId,
          text: rewriteText ?? originalText,
          originalText,
          rewriteText: rewriteText ?? undefined,
          rewritten: !!rewriteText,
          relevanceScore: score,
          included: score === undefined ? true : score >= 30,
        })
      }

      // Sort by score descending if tailoring provided
      if (tailoring) {
        resolvedBullets.sort((a, b) => {
          const sa = a.relevanceScore ?? 50
          const sb = b.relevanceScore ?? 50
          return sb - sa
        })
      }

      // Always keep at least the top-scored bullet included per experience
      if (tailoring && resolvedBullets.length > 0 && resolvedBullets.every(b => !b.included)) {
        resolvedBullets[0].included = true
      }

      return {
        id: exp.id,
        company: exp.company,
        companyMeta: exp.companyMeta,
        title: exp.title,
        period: exp.period,
        location: exp.location,
        award: exp.award,
        note: exp.note,
        bullets: resolvedBullets,
      }
    })

  // Resolve skills (version.skills is array of rows, each row is array of skill IDs)
  const resolvedSkills: ResolvedSkillCategory[] = []
  for (const row of version.skills) {
    for (const skillId of row) {
      const s = skillIndex.get(skillId)
      if (!s) {
        warnings.push(`Skill ID "${skillId}" not found in master.yaml`)
        continue
      }
      resolvedSkills.push({ category: s.category, value: s.text })
    }
  }

  // Resolve projects
  const resolvedProjects = version.projects.flatMap(projId => {
    const p = projectIndex.get(projId)
    if (!p) {
      warnings.push(`Project ID "${projId}" not found in master.yaml`)
      return []
    }
    return [{ id: p.id, title: p.title, url: p.url, status: p.status, text: p.text.trim() }]
  })

  const summary = tailoring?.summaryRewrite?.trim()
    ?? master.summary[version.summary_variant].trim()

  return {
    cv: {
      meta: master.meta,
      summary,
      experience: resolvedExperience,
      skills: resolvedSkills,
      projects: resolvedProjects,
      versionLabel: version.label,
    },
    warnings,
  }
}
