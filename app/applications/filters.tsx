'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Input, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useCallback, useTransition } from 'react'

interface ApplicationFiltersProps {
  currentStage?: string
  currentPriority?: string
  currentSearch?: string
  currentSort?: string
}

export function ApplicationFilters({ currentStage, currentPriority, currentSearch, currentSort }: ApplicationFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams()
      if (currentStage) params.set('stage', currentStage)
      if (currentPriority) params.set('priority', currentPriority)
      if (currentSearch) params.set('search', currentSearch)
      if (currentSort) params.set('sort', currentSort)
      if (value) params.set(key, value)
      else params.delete(key)
      if (key === 'sort' && value) {
        document.cookie = `applications_sort=${value};path=/;max-age=31536000`
      }
      startTransition(() => router.push(`${pathname}?${params.toString()}`))
    },
    [router, pathname, currentStage, currentPriority, currentSearch, currentSort]
  )

  const hasFilters = currentStage || currentPriority || currentSearch

  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
      <Input
        defaultValue={currentSearch ?? ''}
        placeholder="Search role or company..."
        onChange={(e) => update('search', e.target.value)}
        style={{ width: '260px' }}
      />
      <Select
        value={currentStage ?? ''}
        onChange={(e) => update('stage', e.target.value)}
        style={{ width: '150px' }}
      >
        <option value="">All stages</option>
        <option value="WISHLIST">Wishlist</option>
        <option value="APPLIED">Applied</option>
        <option value="SCREENING">Screening</option>
        <option value="INTERVIEW">Interview</option>
        <option value="OFFER">Offer</option>
        <option value="REJECTED">Rejected</option>
        <option value="WITHDRAWN">Withdrawn</option>
        <option value="GHOSTED">Ghosted</option>
      </Select>
      <Select
        value={currentPriority ?? ''}
        onChange={(e) => update('priority', e.target.value)}
        style={{ width: '130px' }}
      >
        <option value="">All priorities</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </Select>
      <Select
        value={currentSort ?? 'date'}
        onChange={(e) => update('sort', e.target.value)}
        style={{ width: '150px' }}
      >
        <option value="date">Sort: Date</option>
        <option value="stage">Sort: Stage</option>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push(`${pathname}?sort=${currentSort ?? 'date'}`)}>
          Clear filters
        </Button>
      )}
    </div>
  )
}
