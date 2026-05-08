'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Stage } from '@/lib/types'
import { STAGE_LABELS } from '@/lib/types'
import { StageBadge } from '@/components/ui/badge'
import { ChevronDownIcon } from 'lucide-react'

const ALL_STAGES: Stage[] = ['WISHLIST', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN', 'GHOSTED']

interface StageSelectProps {
  applicationId: number
  currentStage: Stage
}

export function StageSelect({ applicationId, currentStage }: StageSelectProps) {
  const router = useRouter()
  const [stage, setStage] = useState(currentStage)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  async function changeStage(newStage: Stage) {
    if (newStage === stage) { setOpen(false); return }
    setSaving(true)
    setOpen(false)
    try {
      await fetch(`/api/applications/${applicationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      })
      setStage(newStage)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
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
                onClick={() => changeStage(s)}
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
  )
}
