'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrapeForm } from './scrape-form'
import { FileUpload } from './file-upload'
import type { Company, ApplicationFile } from '@prisma/client'
import type { ScrapedJD } from '@/lib/types'

interface ApplicationFormProps {
  mode: 'create' | 'edit'
  companies: Company[]
  knownSources?: string[]
  initialData?: {
    id: number
    companyId: number
    roleTitle: string
    roleLevel?: string | null
    jobUrl?: string | null
    salary?: string | null
    location?: string | null
    workType?: string | null
    stage: string
    source?: string | null
    priority: string
    appliedAt: string
    rawJd?: string | null
    files?: ApplicationFile[]
  }
}

export function ApplicationForm({ mode, companies, knownSources = [], initialData }: ApplicationFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<number | null>(initialData?.id ?? null)

  const [companySearch, setCompanySearch] = useState('')
  const [companyId, setCompanyId] = useState<number | null>(initialData?.companyId ?? null)
  const [showCompanyList, setShowCompanyList] = useState(false)

  const [roleTitle, setRoleTitle] = useState(initialData?.roleTitle ?? '')
  const [roleLevel, setRoleLevel] = useState(initialData?.roleLevel ?? '')
  const [jobUrl, setJobUrl] = useState(initialData?.jobUrl ?? '')
  const [salary, setSalary] = useState(initialData?.salary ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [workType, setWorkType] = useState(initialData?.workType ?? '')
  const [stage, setStage] = useState(initialData?.stage ?? 'APPLIED')
  const [source, setSource] = useState(initialData?.source ?? (mode === 'create' ? 'LinkedIn' : ''))
  const [priority, setPriority] = useState(initialData?.priority ?? 'MEDIUM')
  const [appliedAt, setAppliedAt] = useState(
    initialData?.appliedAt
      ? new Date(initialData.appliedAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  )
  const [rawJd, setRawJd] = useState(initialData?.rawJd ?? '')

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  )
  const selectedCompany = companies.find((c) => c.id === companyId)

  useEffect(() => {
    if (selectedCompany) setCompanySearch(selectedCompany.name)
  }, [selectedCompany])

  function handleScraped(data: ScrapedJD & { rawText: string; scrapedUrl: string }) {
    if (data.roleTitle) setRoleTitle(data.roleTitle)
    if (data.location) setLocation(Array.isArray(data.location) ? (data.location as string[]).join(', ') : data.location)
    if (data.workType) setWorkType(data.workType)
    if (data.salary) setSalary(data.salary)
    if (data.scrapedUrl && !jobUrl) setJobUrl(data.scrapedUrl)

    const parts: string[] = []
    if (data.rawText) parts.push(data.rawText)
    if (data.responsibilities?.length) {
      parts.push('Responsibilities:\n' + data.responsibilities.map(r => `• ${r}`).join('\n'))
    }
    if (data.requirements?.length) {
      parts.push('Requirements:\n' + data.requirements.map(r => `• ${r}`).join('\n'))
    }
    if (parts.length) setRawJd(parts.join('\n\n'))
    if (data.company) {
      setCompanySearch(data.company)
      const existing = companies.find(
        (c) => c.name.toLowerCase() === data.company.toLowerCase()
      )
      if (existing) setCompanyId(existing.id)
      else setCompanyId(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!roleTitle.trim()) { setError('Role title is required'); return }
    if (!companyId && !companySearch.trim()) { setError('Company is required'); return }

    setSaving(true)
    setError(null)

    const payload = {
      companyId,
      companyName: companyId ? undefined : companySearch.trim(),
      roleTitle: roleTitle.trim(),
      roleLevel: roleLevel || null,
      jobUrl: jobUrl || null,
      salary: salary || null,
      location: location || null,
      workType: workType || null,
      stage,
      source: source || null,
      priority,
      appliedAt,
      rawJd: rawJd || null,
    }

    try {
      let res: Response
      if (mode === 'create') {
        res = await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/applications/${initialData!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to save')
        return
      }

      const saved = await res.json()
      setSavedId(saved.id)
      router.push(`/applications/${saved.id}`)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {mode === 'create' && <ScrapeForm onScraped={handleScraped} />}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        {/* Company */}
        <div style={{ position: 'relative' }}>
          <Field label="Company *">
            <Input
              value={companySearch}
              onChange={(e) => {
                setCompanySearch(e.target.value)
                setCompanyId(null)
                setShowCompanyList(true)
              }}
              onFocus={() => setShowCompanyList(true)}
              onBlur={() => setTimeout(() => setShowCompanyList(false), 150)}
              placeholder="Acme Corp"
              required
            />
          </Field>
          {showCompanyList && filteredCompanies.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 10,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                marginTop: '2px',
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              {filteredCompanies.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    fontSize: '14px',
                    color: 'var(--color-text)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseDown={() => {
                    setCompanyId(c.id)
                    setCompanySearch(c.name)
                    setShowCompanyList(false)
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Role Title */}
        <Field label="Role Title *">
          <Input
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            placeholder="Senior DevOps Engineer"
            required
          />
        </Field>

        {/* Role Level */}
        <Field label="Level">
          <Input
            value={roleLevel}
            onChange={(e) => setRoleLevel(e.target.value)}
            placeholder="Senior, Staff, Director..."
          />
        </Field>

        {/* Location */}
        <Field label="Location">
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Remote, Barcelona, Hybrid..."
          />
        </Field>

        {/* Work Type */}
        <Field label="Work Type">
          <Select value={workType} onChange={(e) => setWorkType(e.target.value)}>
            <option value="">— unset —</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </Select>
        </Field>

        {/* Salary */}
        <Field label="Salary">
          <Input
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            placeholder="€120k–€140k"
          />
        </Field>

        {/* Stage */}
        <Field label="Stage">
          <Select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="WISHLIST">Wishlist</option>
            <option value="APPLIED">Applied</option>
            <option value="SCREENING">Screening</option>
            <option value="INTERVIEW">Interview</option>
            <option value="OFFER">Offer</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
            <option value="GHOSTED">Ghosted</option>
          </Select>
        </Field>

        {/* Priority */}
        <Field label="Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </Select>
        </Field>

        {/* Source */}
        <Field label="Source">
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="LinkedIn, Referral, AngelList..."
            list="source-options"
          />
          <datalist id="source-options">
            {(['LinkedIn', 'Referral', 'AngelList', 'Indeed', 'Glassdoor', 'Company Website', 'Recruiter', 'Other'] as const)
              .concat(knownSources.filter(s => !['LinkedIn', 'Referral', 'AngelList', 'Indeed', 'Glassdoor', 'Company Website', 'Recruiter', 'Other'].includes(s)) as never[])
              .map(s => <option key={s} value={s} />)}
          </datalist>
        </Field>

        {/* Job URL */}
        <Field label="Job URL">
          <Input
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://..."
            type="url"
          />
        </Field>

        {/* Applied At */}
        <Field label="Applied Date">
          <Input
            value={appliedAt}
            onChange={(e) => setAppliedAt(e.target.value)}
            type="date"
          />
        </Field>
      </div>

      {/* Job Description */}
      <div style={{ marginBottom: '16px' }}>
        <Field label="Job Description">
          <Textarea
            value={rawJd}
            onChange={(e) => setRawJd(e.target.value)}
            placeholder="Paste the job description here..."
            style={{ minHeight: '160px' }}
          />
        </Field>
      </div>

      {/* File upload — only show after creation (need an ID) */}
      {(mode === 'edit' || savedId) && (
        <div style={{ marginBottom: '16px' }}>
          <FileUpload
            applicationId={savedId ?? initialData!.id}
            existingFiles={initialData?.files ?? []}
          />
        </div>
      )}

      {error && (
        <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Saving...' : mode === 'create' ? 'Save Application' : 'Update Application'}
        </Button>
      </div>
    </form>
  )
}
