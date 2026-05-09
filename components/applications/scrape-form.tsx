'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SlotMachineLoader } from '@/components/ui/slot-machine-loader'
import type { ScrapedJD } from '@/lib/types'
import { SearchIcon, AlertCircleIcon } from 'lucide-react'

interface ScrapeFormProps {
  onScraped: (data: ScrapedJD & { rawText: string; scrapedUrl: string }) => void
}

export function ScrapeForm({ onScraped }: ScrapeFormProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleScrape() {
    if (!url.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()

      if (data.error === 'scrape_failed') {
        setError(data.message)
        return
      }

      if (data.error === 'ollama_unreachable' || data.error === 'parse_failed') {
        setError(data.message)
        if (data.rawText) {
          onScraped({ rawText: data.rawText, scrapedUrl: url, roleTitle: '', company: '', location: null, workType: null, salary: null, requirements: [], responsibilities: [] })
        }
        return
      }

      // success: data.rawText is Ollama's cleaned JD (from ScrapedJD), scrapedRaw is the full Puppeteer output
      onScraped({ ...data, scrapedUrl: url })
    } catch {
      setError('Network error. Check that the dev server is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        style={{
          backgroundColor: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '16px',
        }}
      >
        {loading ? (
          <SlotMachineLoader variant="scrape" />
        ) : (
          <>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '10px' }}>
              Paste a job posting URL to auto-fill the form
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://boards.greenhouse.io/..."
                onKeyDown={(e) => { if (e.key === 'Enter') handleScrape() }}
                style={{ flex: 1 }}
              />
              <Button variant="primary" onClick={handleScrape} disabled={!url.trim()}>
                <SearchIcon size={14} />
                Scrape JD
              </Button>
            </div>
            {error && (
              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  color: '#fbbf24',
                  fontSize: '13px',
                }}
              >
                <AlertCircleIcon size={14} style={{ marginTop: '1px', flexShrink: 0 }} />
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
