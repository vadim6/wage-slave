'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Stage } from '@/lib/types'
import { StageBadge } from '@/components/ui/badge'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ALL_STAGES: Stage[] = ['WISHLIST', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN', 'GHOSTED']

const REJECT_REASONS = [
  { value: 'SALARY', label: 'Salary mismatch' },
  { value: 'OVERQUALIFIED', label: 'Overqualified' },
  { value: 'UNDERQUALIFIED', label: 'Underqualified / experience gap' },
  { value: 'CULTURE', label: 'Culture / fit' },
  { value: 'GHOSTED', label: 'Ghosted / no response' },
  { value: 'POSITION_FILLED', label: 'Position filled internally' },
  { value: 'OTHER', label: 'Other' },
]

interface StageSelectProps {
  applicationId: number
  currentStage: Stage
}

export function StageSelect({ applicationId, currentStage }: StageSelectProps) {
  const router = useRouter()
  const [stage, setStage] = useState(currentStage)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [pendingStage, setPendingStage] = useState<Stage | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectNote, setRejectNote] = useState('')

  async function doStageChange(newStage: Stage, extra?: { rejectReason?: string }) {
    setSaving(true)
    setPendingStage(null)
    try {
      await fetch(`/api/applications/${applicationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage, ...extra }),
      })
      setStage(newStage)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  function handleStageClick(newStage: Stage) {
    if (newStage === stage) { setOpen(false); return }
    setOpen(false)
    if (newStage === 'REJECTED') {
      setRejectReason('')
      setRejectNote('')
      setPendingStage('REJECTED')
    } else {
      doStageChange(newStage)
    }
  }

  function handleRejectConfirm() {
    const combined = rejectNote ? `${rejectReason}:${rejectNote}` : rejectReason
    doStageChange('REJECTED', { rejectReason: combined || undefined })
  }

  return (
    <>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            opacity: saving ? 0.6 : 1,
          }}
        >
          <StageBadge stage={stage} />
          <ChevronDownIcon size={13} style={{ color: 'var(--color-muted)' }} />
        </button>

        {open && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 9 }}
              onClick={() => setOpen(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                zIndex: 10,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                marginTop: '4px',
                minWidth: '160px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              }}
            >
              {ALL_STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStageClick(s)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    background: s === stage ? 'var(--color-surface-2)' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <StageBadge stage={s} size="sm" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Rejection reason modal */}
      {pendingStage === 'REJECTED' && (
        <div
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={e => { if (e.target === e.currentTarget) setPendingStage(null) }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px',
              width: '380px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Why rejected?</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '16px' }}>
              Optional — helps track patterns over time.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              {REJECT_REASONS.map(r => (
                <label
                  key={r.value}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                    border: `1px solid ${rejectReason === r.value ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    backgroundColor: rejectReason === r.value ? 'rgba(99,102,241,0.1)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    value={r.value}
                    checked={rejectReason === r.value}
                    onChange={() => setRejectReason(r.value)}
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  {r.label}
                </label>
              ))}
            </div>
            {rejectReason === 'OTHER' && (
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="Brief note..."
                style={{
                  width: '100%', minHeight: '60px', padding: '8px 10px',
                  fontSize: '13px', fontFamily: 'inherit',
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)', borderRadius: '6px',
                  color: 'var(--color-text)', resize: 'vertical',
                  boxSizing: 'border-box', marginBottom: '14px',
                }}
              />
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <Button variant="secondary" size="sm" onClick={() => doStageChange('REJECTED')}>
                Skip
              </Button>
              <Button
                size="sm"
                onClick={handleRejectConfirm}
                style={{ backgroundColor: '#f87171', color: '#fff', border: 'none' }}
              >
                Mark Rejected
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
