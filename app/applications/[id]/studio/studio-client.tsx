'use client'

import { useState } from 'react'
import { CVPreview } from '@/components/cv/CVPreview'
import { CV_DESIGN as D } from '@/lib/cv/design'
import type { ResolvedCV, TailoringAnalysis } from '@/types/cv'

interface StudioClientProps {
  applicationId: number
  applicationTitle: string
  companyName: string
  initialCV: ResolvedCV
  initialAnalysis: TailoringAnalysis
  analysisFileId: number
}

export function StudioClient({
  applicationId,
  applicationTitle,
  companyName,
  initialCV,
  initialAnalysis,
  analysisFileId,
}: StudioClientProps) {
  const [resolvedCV, setResolvedCV] = useState<ResolvedCV>(initialCV)
  const [analysis, setAnalysis] = useState<TailoringAnalysis>(initialAnalysis)
  const [currentAnalysisFileId, setCurrentAnalysisFileId] = useState(analysisFileId)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportedFileId, setExportedFileId] = useState<number | null>(null)
  const [patching, setPatching] = useState(false)
  const [patchError, setPatchError] = useState<string | null>(null)
  const [appliedGaps, setAppliedGaps] = useState<Set<number>>(new Set())

  const includedCount = resolvedCV.experience.flatMap(e => e.bullets).filter(b => b.included).length
  const totalCount = resolvedCV.experience.flatMap(e => e.bullets).length

  const coverageItems = analysis.coverageByRequirement ?? []
  const covered = coverageItems.filter(c => !c.gap)
  const gaps = coverageItems.map((c, i) => ({ ...c, _idx: i })).filter(c => c.gap)
  const actionableGaps = gaps.filter(c => c.gapAction && c.gapAction.action !== 'uncoverable')
  const uncoverableGaps = gaps.filter(c => !c.gapAction || c.gapAction.action === 'uncoverable')
  const hasGapActions = gaps.some(c => c.gapAction != null)

  async function handlePatchGaps() {
    setPatching(true)
    setPatchError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}/patch-gaps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisFileId: currentAnalysisFileId, resolvedCV }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Patch failed')
      setAnalysis(data.analysis)
      setCurrentAnalysisFileId(data.fileId)
      setAppliedGaps(new Set())
    } catch (err) {
      setPatchError(err instanceof Error ? err.message : 'Patch failed')
    } finally {
      setPatching(false)
    }
  }

  function handleAcceptSkillsRow(idx: number, suggestedText: string) {
    const colonIdx = suggestedText.indexOf(':')
    if (colonIdx === -1) return
    const category = suggestedText.slice(0, colonIdx).trim()
    const value = suggestedText.slice(colonIdx + 1).trim()
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    const normCat = normalize(category)
    setResolvedCV(cv => {
      const existingIdx = cv.skills.findIndex(s => normalize(s.category) === normCat)
      if (existingIdx === -1) {
        return { ...cv, skills: [...cv.skills, { category, value }] }
      }
      // Merge: combine existing + new skill tokens, deduplicate
      const existing = cv.skills[existingIdx]
      const merged = [
        ...existing.value.split(',').map(s => s.trim()),
        ...value.split(',').map(s => s.trim()),
      ]
      const seen = new Set<string>()
      const deduped = merged.filter(s => {
        const k = normalize(s)
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      const updated = [...cv.skills]
      updated[existingIdx] = { ...existing, value: deduped.join(', ') }
      return { ...cv, skills: updated }
    })
    setAppliedGaps(s => new Set([...s, idx]))
  }

  function handleApplyInjectRewrite(idx: number, targetBulletId: string, suggestedText: string) {
    setResolvedCV(cv => ({
      ...cv,
      experience: cv.experience.map(exp => ({
        ...exp,
        bullets: exp.bullets.map(b =>
          b.id === targetBulletId
            ? { ...b, text: suggestedText, rewritten: true, originalText: b.originalText || b.text }
            : b
        ),
      })),
    }))
    setAppliedGaps(s => new Set([...s, idx]))
  }

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    try {
      const res = await fetch('/api/cv/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv: resolvedCV, applicationId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Export failed')
      }
      const fileId = res.headers.get('X-File-Id')
      if (fileId) setExportedFileId(Number(fileId))
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `cv_${companyName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${date}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Header panel */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        padding: '20px 24px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '2px' }}>CV Studio</h1>
            <div style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
              {companyName} — {applicationTitle}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--color-muted)' }}>
              {includedCount}/{totalCount} bullets included
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                backgroundColor: D.colors.accent,
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: exporting ? 'not-allowed' : 'pointer',
                opacity: exporting ? 0.7 : 1,
              }}
            >
              {exporting ? 'Generating…' : 'Export DOCX'}
            </button>
          </div>
        </div>

        {/* Match score */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)' }}>Match score:</span>
            <span style={{
              fontSize: '16px',
              fontWeight: 700,
              color: analysis.matchScore >= 70 ? '#0E7C7B' : analysis.matchScore >= 50 ? '#E67E22' : '#C0392B',
            }}>
              {analysis.matchScore}/100
            </span>
            <div style={{ width: '120px', height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                width: `${analysis.matchScore}%`,
                height: '100%',
                backgroundColor: analysis.matchScore >= 70 ? D.colors.accent : analysis.matchScore >= 50 ? '#E67E22' : '#C0392B',
                borderRadius: '3px',
              }} />
            </div>
          </div>
          {coverageItems.length > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              {covered.length}/{coverageItems.length} requirements covered
            </div>
          )}
        </div>

        {/* Covered requirements — compact pills */}
        {covered.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {covered.map((item, i) => (
              <span key={i} style={{
                fontSize: '10px',
                backgroundColor: '#F0F7F7',
                color: D.colors.accent,
                border: `1px solid #B0D8D8`,
                borderRadius: '4px',
                padding: '2px 6px',
              }} title={`Covered by: ${item.coveredBy.join(', ')}`}>
                ✅ {item.requirement}
              </span>
            ))}
          </div>
        )}

        {/* Missing keywords */}
        {analysis.missingKeywords.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#E67E22', flexShrink: 0 }}>⚠ Missing keywords:</span>
            {analysis.missingKeywords.map(kw => (
              <span key={kw} style={{
                fontSize: '11px',
                backgroundColor: '#FFF3E0',
                color: '#E67E22',
                border: '1px solid #FFE0B2',
                borderRadius: '4px',
                padding: '1px 6px',
              }}>
                {kw}
              </span>
            ))}
          </div>
        )}

        {exportError && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#c0392b', backgroundColor: '#fdf0ee', border: '1px solid #e8b4ae', borderRadius: '6px', padding: '8px 12px' }}>
            Export error: {exportError}
          </div>
        )}
        {exportedFileId && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: D.colors.accent, backgroundColor: '#F0F7F7', border: `1px solid ${D.colors.accent}`, borderRadius: '6px', padding: '8px 12px' }}>
            ✓ DOCX saved to application record (file #{exportedFileId})
          </div>
        )}
      </div>

      {/* Gap Actions panel */}
      {gaps.length > 0 && (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 700 }}>Gap Actions</span>
              <span style={{ fontSize: '12px', color: 'var(--color-muted)', marginLeft: '8px' }}>
                {actionableGaps.length} actionable · {uncoverableGaps.length} uncoverable
              </span>
            </div>
            <button
              onClick={handlePatchGaps}
              disabled={patching}
              title="Re-run local gap matching against your unlisted skills (no API call)"
              style={{
                backgroundColor: 'transparent',
                color: D.colors.accent,
                border: `1px solid ${D.colors.accent}`,
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: patching ? 'not-allowed' : 'pointer',
                opacity: patching ? 0.6 : 1,
              }}
            >
              {patching ? 'Evaluating…' : hasGapActions ? '↺ Re-evaluate' : '⚡ Evaluate Gaps'}
            </button>
          </div>

          {patchError && (
            <div style={{ marginBottom: '10px', fontSize: '12px', color: '#c0392b', backgroundColor: '#fdf0ee', border: '1px solid #e8b4ae', borderRadius: '6px', padding: '8px 12px' }}>
              {patchError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {gaps.map((item) => {
              const idx = item._idx
              const action = item.gapAction
              const applied = appliedGaps.has(idx)

              if (!action || action.action === 'uncoverable') {
                return (
                  <div key={idx} style={{
                    fontSize: '11px',
                    color: 'var(--color-muted)',
                    padding: '6px 10px',
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: '6px',
                    display: 'flex',
                    gap: '6px',
                    alignItems: 'flex-start',
                  }}>
                    <span>✗</span>
                    <span style={{ flex: 1 }}>{item.requirement}</span>
                    <span style={{ flexShrink: 0, fontStyle: 'italic' }}>uncoverable</span>
                  </div>
                )
              }

              const isSkillsRow = action.action === 'add_skills_row'
              const isInject = action.action === 'inject_rewrite'

              return (
                <div key={idx} style={{
                  border: applied ? `1px solid #B0D8D8` : '1px solid #FFE0B2',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  backgroundColor: applied ? '#F0F7F7' : '#FFFAF0',
                  opacity: applied ? 0.75 : 1,
                }}>
                  {/* Requirement label */}
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginBottom: '4px' }}>
                    <span style={{ color: applied ? D.colors.accent : '#E67E22', marginRight: '6px' }}>
                      {applied ? '✓' : '⚠'}
                    </span>
                    {item.requirement}
                  </div>

                  {/* Action type badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: isSkillsRow ? D.colors.accent : '#7B68EE',
                      backgroundColor: isSkillsRow ? '#F0F7F7' : '#F0EEFF',
                      border: `1px solid ${isSkillsRow ? '#B0D8D8' : '#C5BBF5'}`,
                      borderRadius: '4px',
                      padding: '1px 6px',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}>
                      {isSkillsRow ? '+ skills row' : '✎ inject rewrite'}
                    </span>

                    {/* Suggested text */}
                    {action.suggestedText && (
                      <div style={{
                        fontSize: '11px',
                        color: '#1a1a1a',
                        flex: 1,
                        lineHeight: '1.4',
                        wordBreak: 'break-word',
                      }}>
                        {isInject && action.targetBulletId && (
                          <span style={{ color: 'var(--color-muted)', fontSize: '10px', display: 'block', marginBottom: '2px' }}>
                            → {action.targetBulletId}
                          </span>
                        )}
                        {action.suggestedText}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {!applied && action.suggestedText && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => navigator.clipboard.writeText(action.suggestedText!)}
                        style={ghostBtn}
                      >
                        Copy
                      </button>
                      {isSkillsRow && (
                        <button
                          onClick={() => handleAcceptSkillsRow(idx, action.suggestedText!)}
                          style={acceptBtn}
                        >
                          + Add to CV
                        </button>
                      )}
                      {isInject && action.targetBulletId && (
                        <button
                          onClick={() => handleApplyInjectRewrite(idx, action.targetBulletId!, action.suggestedText!)}
                          style={acceptBtn}
                        >
                          Apply Rewrite
                        </button>
                      )}
                    </div>
                  )}

                  {applied && (
                    <div style={{ fontSize: '11px', color: D.colors.accent, marginTop: '6px', textAlign: 'right' }}>
                      ✓ Applied
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* CV Preview */}
      <CVPreview
        cv={resolvedCV}
        analysis={analysis}
        onChange={setResolvedCV}
        onDeleteSkill={i => setResolvedCV(cv => ({ ...cv, skills: cv.skills.filter((_, idx) => idx !== i) }))}
      />

      <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--color-muted)', textAlign: 'center' }}>
        Click any bullet to edit inline · Toggle ☑/☐ to include/exclude · Amber bullets have Claude rewrites — click ↩ to revert
      </div>
    </div>
  )
}

const ghostBtn: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: 'var(--color-muted)',
  border: '1px solid var(--color-border)',
  borderRadius: '5px',
  padding: '3px 10px',
  fontSize: '11px',
  cursor: 'pointer',
}

const acceptBtn: React.CSSProperties = {
  backgroundColor: D.colors.accent,
  color: '#fff',
  border: 'none',
  borderRadius: '5px',
  padding: '3px 10px',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
}
