'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Trash2Icon } from 'lucide-react'

export function DeleteApplicationButton({ applicationId }: { applicationId: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/applications/${applicationId}`, { method: 'DELETE' })
      router.push('/applications')
      router.refresh()
    } finally {
      setDeleting(false)
      setOpen(false)
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <Trash2Icon size={13} />
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        title="Delete application"
        message="Delete this application and all its files, events, contacts, and notes? This cannot be undone."
        loading={deleting}
      />
    </>
  )
}
