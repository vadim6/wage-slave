'use client'

import { CV_DESIGN as D } from '@/lib/cv/design'
import type { ResolvedCV, ResolvedBullet, TailoringAnalysis } from '@/types/cv'

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g)
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (m) return <a key={i} href={m[2]} target="_blank" rel="noopener noreferrer" style={{ color: D.colors.accent }}>{m[1]}</a>
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

interface CVPreviewProps {
  cv: ResolvedCV
  analysis: TailoringAnalysis | null
  onChange: (cv: ResolvedCV) => void
  onDeleteSkill?: (index: number) => void
}

interface BulletItemProps {
  bullet: ResolvedBullet
  onToggle: (id: string) => void
  onEdit: (id: string, text: string) => void
  onRevert: (id: string) => void
}

function BulletItem({ bullet, onToggle, onEdit, onRevert }: BulletItemProps) {
  const isExcluded = !bullet.included
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px',
        marginBottom: D.spacing.bulletGap,
        opacity: isExcluded ? 0.35 : 1,
        backgroundColor: bullet.rewritten ? D.colors.rewrite : 'transparent',
        borderLeft: bullet.rewritten ? `2px solid ${D.colors.rewriteBorder}` : 'none',
        paddingLeft: bullet.rewritten ? '6px' : '0',
        listStyle: 'none',
      }}
    >
      <button
        onClick={() => onToggle(bullet.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0',
          fontSize: '12px',
          flexShrink: 0,
          marginTop: '1px',
          color: D.colors.muted,
        }}
        title={isExcluded ? 'Re-include bullet' : 'Exclude bullet'}
      >
        {isExcluded ? '☐' : '☑'}
      </button>

      {/\[[^\]]+\]\([^)]+\)/.test(bullet.text) ? (
        <span style={{ flex: 1, fontSize: `${D.fonts.sizes.body}pt`, lineHeight: '1.5', color: D.colors.dark, textDecoration: isExcluded ? 'line-through' : 'none' }}>
          <InlineText text={bullet.text} />
        </span>
      ) : (
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={e => onEdit(bullet.id, e.currentTarget.textContent ?? '')}
          style={{
            flex: 1,
            fontSize: `${D.fonts.sizes.body}pt`,
            lineHeight: '1.5',
            color: D.colors.dark,
            textDecoration: isExcluded ? 'line-through' : 'none',
            outline: 'none',
            cursor: 'text',
          }}
        >
          {bullet.text}
        </span>
      )}

      {bullet.relevanceScore !== undefined && (
        <span
          style={{
            fontSize: '9px',
            color: D.colors.muted,
            flexShrink: 0,
            marginTop: '2px',
            fontFamily: 'monospace',
          }}
          title="Relevance score"
        >
          {bullet.relevanceScore}
        </span>
      )}

      {bullet.rewriteText && (
        <button
          onClick={() => onRevert(bullet.id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '9px',
            color: D.colors.rewriteBorder,
            flexShrink: 0,
            padding: '0',
            marginTop: '2px',
          }}
          title={bullet.text === bullet.rewriteText ? 'Revert to original' : 'Restore Claude rewrite'}
        >
          {bullet.text === bullet.rewriteText ? '↩' : '↺'}
        </button>
      )}
    </li>
  )
}

export function CVPreview({ cv, analysis: _analysis, onChange, onDeleteSkill }: CVPreviewProps) {
  function updateBullet(
    experienceId: string,
    bulletId: string,
    patch: Partial<ResolvedBullet>,
  ) {
    onChange({
      ...cv,
      experience: cv.experience.map(exp =>
        exp.id !== experienceId
          ? exp
          : {
              ...exp,
              bullets: exp.bullets.map(b =>
                b.id !== bulletId ? b : { ...b, ...patch }
              ),
            }
      ),
    })
  }

  function handleToggle(experienceId: string, bulletId: string) {
    const exp = cv.experience.find(e => e.id === experienceId)
    const bullet = exp?.bullets.find(b => b.id === bulletId)
    if (!bullet) return
    updateBullet(experienceId, bulletId, { included: !bullet.included })
  }

  function handleEdit(experienceId: string, bulletId: string, text: string) {
    updateBullet(experienceId, bulletId, { text })
  }

  function handleRevert(experienceId: string, bulletId: string) {
    const exp = cv.experience.find(e => e.id === experienceId)
    const bullet = exp?.bullets.find(b => b.id === bulletId)
    if (!bullet || !bullet.rewriteText) return
    const showingRewrite = bullet.text === bullet.rewriteText
    updateBullet(experienceId, bulletId, {
      text: showingRewrite ? bullet.originalText : bullet.rewriteText,
    })
  }

  const containerStyle: React.CSSProperties = {
    fontFamily: D.fonts.primary,
    fontSize: `${D.fonts.sizes.body}pt`,
    color: D.colors.dark,
    backgroundColor: '#ffffff',
    padding: '32px',
    maxWidth: '760px',
    margin: '0 auto',
    boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
    lineHeight: '1.4',
  }

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: `${D.fonts.sizes.heading}pt`,
    fontWeight: 700,
    color: D.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    borderBottom: `2px solid ${D.colors.accent}`,
    paddingBottom: '2px',
    marginBottom: '8px',
    marginTop: D.spacing.sectionGap,
  }

  const companyNameStyle: React.CSSProperties = {
    fontSize: `${D.fonts.sizes.heading}pt`,
    fontWeight: 700,
    color: D.colors.dark,
    marginBottom: '1px',
    marginTop: D.spacing.companyGap,
  }

  const jobTitleStyle: React.CSSProperties = {
    fontSize: `${D.fonts.sizes.jobTitle}pt`,
    fontWeight: 700,
    color: D.colors.accent,
    marginBottom: '2px',
  }

  const metaStyle: React.CSSProperties = {
    fontSize: `${D.fonts.sizes.meta}pt`,
    color: D.colors.muted,
    marginBottom: '4px',
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: `${D.fonts.sizes.name}pt`, fontWeight: 700, color: D.colors.dark, marginBottom: '4px' }}>
          {cv.meta.name}
        </div>
        <div style={{ fontSize: `${D.fonts.sizes.contact}pt`, color: D.colors.mid }}>
          {[cv.meta.email, cv.meta.phone, cv.meta.location].filter(Boolean).join('  |  ')}
          {(cv.meta.linkedin || cv.meta.github) && (
            <>
              {'  |  '}
              {[
                cv.meta.linkedin && <a key="li" href={cv.meta.linkedin.startsWith('http') ? cv.meta.linkedin : `https://${cv.meta.linkedin}`} target="_blank" rel="noopener noreferrer" style={{ color: D.colors.accent, textDecoration: 'none' }}>{cv.meta.linkedin}</a>,
                cv.meta.github && <a key="gh" href={cv.meta.github.startsWith('http') ? cv.meta.github : `https://${cv.meta.github}`} target="_blank" rel="noopener noreferrer" style={{ color: D.colors.accent, textDecoration: 'none' }}>{cv.meta.github}</a>,
              ].filter(Boolean).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, '  |  ', el], [])}
            </>
          )}
        </div>
        <div style={{ fontSize: `${D.fonts.sizes.meta}pt`, color: D.colors.muted, fontStyle: 'italic', marginTop: '2px' }}>
          {cv.meta.languages.join('  ·  ')}
        </div>
        <hr style={{ border: 'none', borderBottom: `2px solid ${D.colors.accent}`, margin: '8px 0 0' }} />
      </div>

      {/* Summary */}
      <div style={{ marginBottom: D.spacing.sectionGap }}>
        <div style={sectionHeadingStyle}>Professional Summary</div>
        <p style={{ fontSize: `${D.fonts.sizes.body}pt`, color: D.colors.dark, margin: 0, lineHeight: '1.6' }}>
          {cv.summary}
        </p>
      </div>

      {/* Skills */}
      {cv.skills.length > 0 && (
        <div style={{ marginBottom: D.spacing.sectionGap }}>
          <div style={sectionHeadingStyle}>Core Competencies</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px' }}>
            {cv.skills.map((skill, i) => (
              <div key={i} style={{ fontSize: `${D.fonts.sizes.meta}pt`, color: D.colors.mid, display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                <span style={{ flex: 1 }}>
                  <strong style={{ color: D.colors.dark }}>{skill.category}:</strong>{' '}
                  {skill.value}
                </span>
                {onDeleteSkill && (
                  <button
                    onClick={() => onDeleteSkill(i)}
                    title="Remove skill row"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: D.colors.muted,
                      fontSize: `${D.fonts.sizes.meta}pt`,
                      padding: '0',
                      lineHeight: 1,
                      flexShrink: 0,
                      marginTop: '1px',
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      <div style={{ marginBottom: D.spacing.sectionGap }}>
        <div style={sectionHeadingStyle}>Professional Experience</div>
        {cv.experience.map(exp => (
          <div key={exp.id} style={{ marginBottom: '12px' }}>
            <div style={companyNameStyle}>
              {exp.company}
              {exp.companyMeta && (
                <span style={{ fontWeight: 400, color: D.colors.muted, fontStyle: 'italic', fontSize: `${D.fonts.sizes.meta}pt` }}>
                  {' '}— {exp.companyMeta}
                </span>
              )}
            </div>
            <div style={jobTitleStyle}>{exp.title}</div>
            <div style={metaStyle}>{exp.period} · {exp.location}</div>
            {exp.award && (
              <div style={{ fontSize: `${D.fonts.sizes.small}pt`, color: D.colors.accent, fontStyle: 'italic', marginBottom: '3px' }}>
                {exp.award}
              </div>
            )}
            {exp.note && (
              <div style={{ fontSize: `${D.fonts.sizes.small}pt`, color: D.colors.mid, fontStyle: 'italic', marginBottom: '3px' }}>
                {exp.note}
              </div>
            )}
            <ul style={{ margin: '4px 0 0 0', padding: '0 0 0 16px' }}>
              {exp.bullets.map(bullet => (
                <BulletItem
                  key={bullet.id}
                  bullet={bullet}
                  onToggle={id => handleToggle(exp.id, id)}
                  onEdit={(id, text) => handleEdit(exp.id, id, text)}
                  onRevert={id => handleRevert(exp.id, id)}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Projects */}
      {cv.projects.length > 0 && (
        <div>
          <div style={sectionHeadingStyle}>Projects</div>
          {cv.projects.map(proj => (
            <div key={proj.id} style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: `${D.fonts.sizes.body}pt`, fontWeight: 700, color: D.colors.dark }}>
                {proj.url
                  ? <a href={proj.url} target="_blank" rel="noopener noreferrer" style={{ color: D.colors.accent, textDecoration: 'none' }}>{proj.title}</a>
                  : proj.title}
                <span style={{ fontWeight: 400, fontSize: `${D.fonts.sizes.small}pt`, color: D.colors.muted, marginLeft: '6px' }}>
                  [{proj.status}]
                </span>
              </div>
              <div style={{ fontSize: `${D.fonts.sizes.body}pt`, color: D.colors.mid, lineHeight: '1.5' }}>
                <InlineText text={proj.text} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
