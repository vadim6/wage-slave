'use client'

import { useState, useEffect } from 'react'
import { Input, Field } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CVPreview } from '@/components/cv/CVPreview'
import type { ResolvedCV } from '@/types/cv'

interface DebugResult {
  scrapeError: string | null
  rawText: string | null
  truncatedText: string | null
  systemPrompt: string | null
  userPrompt: string | null
  ollamaRaw: string | null
  parsed: unknown | null
  ollamaError: string | null
}

function Panel({ title, meta, content, defaultOpen = false }: {
  title: string
  meta?: string
  content: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: 'var(--color-surface-2)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text)' }}>{title}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {meta && <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{meta}</span>}
          <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && (
        <pre style={{
          margin: 0,
          padding: '14px 16px',
          fontSize: '12px',
          lineHeight: '1.6',
          color: 'var(--color-text)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'ui-monospace, monospace',
          backgroundColor: 'var(--color-surface)',
          maxHeight: '480px',
          overflowY: 'auto',
        }}>
          {content}
        </pre>
      )}
    </div>
  )
}

function CVTemplateDebug() {
  const [versions, setVersions] = useState<string[]>([])
  const [selectedVersion, setSelectedVersion] = useState('')
  const [loading, setLoading] = useState(false)
  const [cv, setCv] = useState<ResolvedCV | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/cv/versions')
      .then(r => r.json())
      .then(data => {
        if (data.versions?.length) {
          setVersions(data.versions)
          setSelectedVersion(data.versions[0])
          return fetch('/api/cv/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ versionId: data.versions[0] }),
          }).then(r => r.json()).then(d => {
            if (!d.error) { setCv(d.cv); setWarnings(d.warnings ?? []) }
            else setError(d.error)
          })
        }
      })
      .catch(() => {})
  }, [])

  async function handleRefresh() {
    if (!selectedVersion) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cv/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId: selectedVersion }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setCv(null)
      } else {
        setCv(data.cv)
        setWarnings(data.warnings ?? [])
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>CV Template Preview</h2>
      <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '16px' }}>
        Live render of master.yaml + selected version. No tailoring applied.
      </p>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '16px' }}>
        <div style={{ width: '260px' }}>
          <Field label="Version">
            <select
              value={selectedVersion}
              onChange={e => setSelectedVersion(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: '13px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              {versions.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </Field>
        </div>
        <Button variant="primary" onClick={handleRefresh} disabled={loading || !selectedVersion} style={{ flexShrink: 0 }}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#7f1d1d22', border: '1px solid #f8717144', borderRadius: '8px', fontSize: '13px', color: '#f87171', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{ padding: '10px 14px', backgroundColor: '#78350f22', border: '1px solid #f59e0b44', borderRadius: '8px', fontSize: '12px', color: '#f59e0b', marginBottom: '12px' }}>
          {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}

      {cv && (
        <CVPreview
          cv={cv}
          analysis={null}
          onChange={setCv}
        />
      )}
    </div>
  )
}

export default function DebugPage() {
  const [url, setUrl] = useState('')
  const [model, setModel] = useState('qwen2.5:14b')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DebugResult | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)

  async function handleRun() {
    if (!url.trim()) return
    setLoading(true)
    setResult(null)
    setElapsed(null)
    const t0 = Date.now()
    try {
      const res = await fetch('/api/debug/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, model }),
      })
      setResult(await res.json())
      setElapsed(Date.now() - t0)
    } catch {
      setResult({ scrapeError: 'Network error', rawText: null, truncatedText: null, systemPrompt: null, userPrompt: null, ollamaRaw: null, parsed: null, ollamaError: null })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '860px' }}>
      <CVTemplateDebug />

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '40px 0' }} />

      <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Scrape Debugger</h1>
      <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '24px' }}>
        Inspect each stage of the scrape → parse pipeline. No DB writes.
      </p>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div style={{ flex: 1 }}>
          <Field label="Job URL">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRun() }}
              placeholder="https://boards.greenhouse.io/..."
            />
          </Field>
        </div>
        <div style={{ width: '200px' }}>
          <Field label="Model">
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="qwen2.5:14b"
            />
          </Field>
        </div>
        <Button variant="primary" onClick={handleRun} disabled={loading || !url.trim()} style={{ marginBottom: '0', flexShrink: 0 }}>
          {loading ? 'Running...' : 'Run'}
        </Button>
      </div>

      {loading && (
        <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
          Scraping + parsing… this can take 15–30s
        </p>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {elapsed !== null && (
            <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>
              Completed in {(elapsed / 1000).toFixed(1)}s
            </p>
          )}

          {result.scrapeError && (
            <div style={{ padding: '12px 16px', backgroundColor: '#7f1d1d22', border: '1px solid #f8717144', borderRadius: '8px', fontSize: '13px', color: '#f87171' }}>
              Scrape failed: {result.scrapeError}
            </div>
          )}

          {result.ollamaError && (
            <div style={{ padding: '12px 16px', backgroundColor: '#7f1d1d22', border: '1px solid #f8717144', borderRadius: '8px', fontSize: '13px', color: '#f87171' }}>
              Ollama error: {result.ollamaError}
            </div>
          )}

          {result.rawText && (
            <Panel
              title="1 · Raw Scrape"
              meta={`${result.rawText.length.toLocaleString()} chars`}
              content={result.rawText}
            />
          )}

          {result.userPrompt && result.systemPrompt && (
            <Panel
              title="2 · Prompt sent to Ollama"
              meta={`${(result.systemPrompt.length + result.userPrompt.length).toLocaleString()} chars total`}
              content={`=== SYSTEM ===\n${result.systemPrompt}\n\n=== USER ===\n${result.userPrompt}`}
            />
          )}

          {result.ollamaRaw && (
            <Panel
              title="3 · Ollama raw response"
              meta={`${result.ollamaRaw.length.toLocaleString()} chars`}
              content={result.ollamaRaw}
              defaultOpen
            />
          )}

          {!!result.parsed && (
            <Panel
              title="4 · Parsed result"
              content={JSON.stringify(result.parsed, null, 2)}
              defaultOpen
            />
          )}
        </div>
      )}
    </div>
  )
}
