export interface ResolvedCV {
  meta: {
    name: string
    email: string
    phone: string
    location: string
    linkedin?: string
    github?: string
    languages: string[]
  }
  summary: string
  experience: ResolvedExperience[]
  skills: ResolvedSkillCategory[]
  projects: ResolvedProject[]
  versionLabel: string
}

export interface ResolvedExperience {
  id: string
  company: string
  companyMeta?: string
  title: string
  period: string
  location: string
  award?: string
  note?: string
  bullets: ResolvedBullet[]
}

export interface ResolvedBullet {
  id: string
  text: string
  originalText: string
  rewriteText?: string
  rewritten: boolean
  relevanceScore?: number
  included: boolean
}

export interface ResolvedSkillCategory {
  category: string
  value: string
}

export interface ResolvedProject {
  id: string
  title: string
  url?: string
  status: string
  text: string
}

export interface GapAction {
  action: 'inject_rewrite' | 'add_skills_row' | 'uncoverable'
  targetBulletId?: string   // inject_rewrite: which bullet to target
  suggestedText?: string    // inject_rewrite: the rewrite text; add_skills_row: the full skills line to add
  reason: string
}

export interface TailoringAnalysis {
  matchScore: number
  missingKeywords: string[]
  bulletsRanked: {
    id: string
    relevanceScore: number
    rewriteSuggestion: string | null
    reason: string
  }[]
  summaryRewrite: string
  coverageByRequirement: {
    requirement: string
    coveredBy: string[]
    gap: boolean
    gapAction: GapAction | null
  }[]
}
