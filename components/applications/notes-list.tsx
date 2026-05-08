'use client'

import { useState } from 'react'
import type { Note } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Trash2Icon, SendIcon } from 'lucide-react'

interface NotesListProps {
  applicationId: number
  notes: Note[]
}

export function NotesList({ applicationId, notes: initial }: NotesListProps) {
  const [notes, setNotes] = useState(initial)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleAdd() {
    if (!content.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        const note = await res.json()
        setNotes([note, ...notes])
        setContent('')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`/api/notes/${deleteTarget.id}`, { method: 'DELETE' })
      setNotes(notes.filter((n) => n.id !== deleteTarget.id))
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div>
      <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>Notes</h3>

      <div style={{ marginBottom: '16px' }}>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note..."
          style={{ marginBottom: '8px' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd()
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" size="sm" onClick={handleAdd} disabled={saving || !content.trim()}>
            <SendIcon size={12} />
            {saving ? 'Adding...' : 'Add Note'}
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>No notes yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <p style={{ fontSize: '14px', color: 'var(--color-text)', margin: 0, whiteSpace: 'pre-wrap', flex: 1 }}>
                  {note.content}
                </p>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(note)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', flexShrink: 0 }}
                >
                  <Trash2Icon size={13} />
                </button>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--color-muted)', margin: '6px 0 0' }}>
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete note"
        message="Delete this note? Cannot be undone."
        loading={deleting}
      />
    </div>
  )
}
