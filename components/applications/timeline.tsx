'use client'

import { useState } from 'react'
import type { ApplicationEvent } from '@prisma/client'
import type { EventType } from '@/lib/types'
import { EVENT_TYPE_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { PlusIcon, CalendarIcon, PencilIcon, Trash2Icon } from 'lucide-react'

const EVENT_ICONS: Partial<Record<EventType, string>> = {
  APPLICATION_SENT: '📤',
  RECRUITER_CALL: '📞',
  TECHNICAL_SCREEN: '💻',
  INTERVIEW_ROUND: '🎯',
  TAKE_HOME_TASK: '📝',
  OFFER_RECEIVED: '🎉',
  REJECTION_RECEIVED: '❌',
  FOLLOW_UP_SENT: '📬',
  OTHER: '📌',
}

const EMPTY_FORM = {
  eventType: 'OTHER' as EventType,
  title: '',
  description: '',
  occurredAt: new Date().toISOString().slice(0, 10),
}

interface TimelineProps {
  applicationId: number
  events: ApplicationEvent[]
}

export function Timeline({ applicationId, events: initialEvents }: TimelineProps) {
  const [events, setEvents] = useState(initialEvents)
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ApplicationEvent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApplicationEvent | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  function openEdit(event: ApplicationEvent) {
    setForm({
      eventType: event.eventType as EventType,
      title: event.title ?? '',
      description: event.description ?? '',
      occurredAt: new Date(event.occurredAt).toISOString().slice(0, 10),
    })
    setEditTarget(event)
  }

  function closeAdd() {
    setAddOpen(false)
    setForm(EMPTY_FORM)
  }

  function closeEdit() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
  }

  async function handleAdd() {
    setSaving(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const event = await res.json()
        setEvents([event, ...events])
        closeAdd()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit() {
    if (!editTarget) return
    setSaving(true)
    try {
      const res = await fetch(`/api/events/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const updated = await res.json()
        setEvents(events.map((e) => (e.id === updated.id ? updated : e)))
        closeEdit()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`/api/events/${deleteTarget.id}`, { method: 'DELETE' })
      setEvents(events.filter((e) => e.id !== deleteTarget.id))
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Timeline</h3>
        <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
          <PlusIcon size={13} />
          Add Event
        </Button>
      </div>

      {events.length === 0 ? (
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>No events yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.map((event) => (
            <div
              key={event.id}
              style={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>
                {EVENT_ICONS[event.eventType as EventType] ?? '📌'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
                      {event.title ?? EVENT_TYPE_LABELS[event.eventType as EventType]}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-muted)', marginLeft: '8px' }}>
                      {EVENT_TYPE_LABELS[event.eventType as EventType]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-muted)', fontSize: '12px' }}>
                      <CalendarIcon size={11} />
                      {new Date(event.occurredAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => openEdit(event)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', padding: 0 }}
                    >
                      <PencilIcon size={12} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(event)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', padding: 0 }}
                    >
                      <Trash2Icon size={12} />
                    </button>
                  </div>
                </div>
                {event.description && (
                  <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: '6px 0 0' }}>
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onClose={closeAdd} title="Add Event">
        <EventForm form={form} setForm={setForm} />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' }}>
          <Button variant="secondary" onClick={closeAdd}>Cancel</Button>
          <Button variant="primary" onClick={handleAdd} disabled={saving}>
            {saving ? 'Adding...' : 'Add Event'}
          </Button>
        </div>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onClose={closeEdit} title="Edit Event">
        <EventForm form={form} setForm={setForm} />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' }}>
          <Button variant="secondary" onClick={closeEdit}>Cancel</Button>
          <Button variant="primary" onClick={handleEdit} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete event"
        message={`Delete "${deleteTarget?.title ?? EVENT_TYPE_LABELS[deleteTarget?.eventType as EventType]}"? This cannot be undone.`}
        loading={deleting}
      />
    </div>
  )
}

function EventForm({
  form,
  setForm,
}: {
  form: typeof EMPTY_FORM
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Field label="Event Type">
        <Select
          value={form.eventType}
          onChange={(e) => setForm({ ...form, eventType: e.target.value as EventType })}
        >
          {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </Field>
      <Field label="Title (optional)">
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Technical interview – System Design"
        />
      </Field>
      <Field label="Date">
        <Input
          type="date"
          value={form.occurredAt}
          onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
        />
      </Field>
      <Field label="Notes (optional)">
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="What happened..."
        />
      </Field>
    </div>
  )
}
