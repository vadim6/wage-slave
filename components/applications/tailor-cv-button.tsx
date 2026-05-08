'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const VERSIONS = [
  { id: 'v1_technical',  label: 'Technical Depth & Platform Engineering' },
  { id: 'v2_leadership', label: 'Leadership & People Management Focus' },
]

interface TailorCVButtonProps {
  applicationId: number
}

export function TailorCVButton({ applicationId }: TailorCVButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [versionId, setVersionId] = useState('v1_technical')
  const [useOllama, setUseOllama] = useState(false)
  const [ollamaModel, setOllamaModel] = useState('qwen2.5:14b')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}/tailor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId,
          ...(useOllama ? { provider: 'ollama', ollamaModel } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Tailoring failed')
      router.push(
        `/applications/${applicationId}/studio?analysisFileId=${data.fileId}&versionId=${versionId}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        style={{ backgroundColor: 'var(--color-accent)', color: '#fff', border: 'none' }}
      >
        Tailor CV
      </Button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={e => { if (e.target === e.currentTarget && !loading) setOpen(false) }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '28px',
              width: '420px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Tailor CV</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '20px' }}>
              {useOllama
                ? `Local Ollama (${ollamaModel || 'qwen2.5:14b'}) will score your CV bullets against this JD.`
                : 'Claude will score your CV bullets against this JD and suggest rewrites. Takes ~10 seconds.'}
            </p>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
              CV Version
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {VERSIONS.map(v => (
                <label
                  key={v.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `2px solid ${versionId === v.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    backgroundColor: 'transparent',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  <input
                    type="radio"
                    name="version"
                    value={v.id}
                    checked={versionId === v.id}
                    onChange={() => setVersionId(v.id)}
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  {v.label}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={useOllama}
                  onChange={e => setUseOllama(e.target.checked)}
                  style={{ accentColor: 'var(--color-accent)', width: '14px', height: '14px' }}
                />
                Use local Ollama
              </label>
              {useOllama && (
                <input
                  type="text"
                  value={ollamaModel}
                  onChange={e => setOllamaModel(e.target.value)}
                  placeholder="model name"
                  style={{
                    flex: 1,
                    fontSize: '12px',
                    padding: '5px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontFamily: 'monospace',
                  }}
                />
              )}
            </div>

            {error && (
              <div style={{
                fontSize: '12px',
                color: '#c0392b',
                backgroundColor: '#fdf0ee',
                border: '1px solid #e8b4ae',
                borderRadius: '6px',
                padding: '10px 12px',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={loading}
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff', border: 'none', minWidth: '120px' }}
              >
                {loading ? 'Tailoring…' : 'Start Tailoring'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
