'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PencilIcon } from 'lucide-react'

interface RawJdSectionProps {
  applicationId: number
  initialValue: string
}

export function RawJdSection({ applicationId, initialValue }: RawJdSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [draft, setDraft] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawJd: draft }),
      })
      if (!res.ok) { setError('Failed to save'); return }
      setValue(draft)
      setEditing(false)
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft(value)
    setEditing(false)
    setError(null)
  }

  return (
    <section
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Job Description
        </h2>
        {!editing && (
          <button
            onClick={() => { setDraft(value); setEditing(true) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '2px', display: 'flex', alignItems: 'center' }}
            title="Edit"
          >
            <PencilIcon size={14} />
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{
              width: '100%',
              minHeight: '320px',
              padding: '10px',
              fontSize: '13px',
              lineHeight: '1.6',
              fontFamily: 'inherit',
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text)',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          {error && <p style={{ color: '#f87171', fontSize: '13px', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" size="sm" onClick={handleCancel}>Cancel</Button>
            <Button type="button" variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : !value ? (
        <button
          onClick={() => { setDraft(''); setEditing(true) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--color-muted)', padding: 0 }}
        >
          + Add job description
        </button>
      ) : (
        <div style={{ position: 'relative' }}>
          <div
            style={{
              maxHeight: expanded ? 'none' : '200px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <pre
              style={{
                fontSize: '13px',
                lineHeight: '1.6',
                color: 'var(--color-text)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0,
                fontFamily: 'inherit',
              }}
            >
              {value}
            </pre>
            {!expanded && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '80px',
                  background: 'linear-gradient(to bottom, transparent, var(--color-surface))',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              marginTop: expanded ? '12px' : '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--color-accent)',
              padding: 0,
            }}
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        </div>
      )}
    </section>
  )
}
