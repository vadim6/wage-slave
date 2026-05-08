'use client'

import { useState } from 'react'
import type { Contact } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { PlusIcon, Trash2Icon, LinkedinIcon } from 'lucide-react'

interface ContactsListProps {
  applicationId: number
  contacts: Contact[]
}

export function ContactsList({ applicationId, contacts: initial }: ContactsListProps) {
  const [contacts, setContacts] = useState(initial)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ name: '', role: '', email: '', linkedin: '', notes: '' })

  async function handleAdd() {
    setSaving(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const contact = await res.json()
        setContacts([...contacts, contact])
        setOpen(false)
        setForm({ name: '', role: '', email: '', linkedin: '', notes: '' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`/api/contacts/${deleteTarget.id}`, { method: 'DELETE' })
      setContacts(contacts.filter((c) => c.id !== deleteTarget.id))
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Contacts</h3>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <PlusIcon size={13} />
          Add
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>No contacts yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {contacts.map((c) => (
            <div
              key={c.id}
              style={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{c.name}</span>
                {c.role && (
                  <span style={{ fontSize: '12px', color: 'var(--color-muted)', marginLeft: '8px' }}>
                    {c.role}
                  </span>
                )}
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  {c.email && (
                    <a href={`mailto:${c.email}`} style={{ fontSize: '12px', color: 'var(--color-accent)' }}>
                      {c.email}
                    </a>
                  )}
                  {c.linkedin && (
                    <a href={c.linkedin} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', color: 'var(--color-accent)' }}>
                      <LinkedinIcon size={11} /> LinkedIn
                    </a>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(c)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex' }}
              >
                <Trash2Icon size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Add Contact">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Field label="Name *">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" />
          </Field>
          <Field label="Role">
            <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Recruiter, Hiring Manager..." />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="LinkedIn URL">
            <Input value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
          </Field>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAdd} disabled={saving || !form.name.trim()}>
              {saving ? 'Adding...' : 'Add Contact'}
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove contact"
        message={`Remove ${deleteTarget?.name}?`}
        loading={deleting}
      />
    </div>
  )
}
