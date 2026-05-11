'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import type { ApplicationFile } from '@prisma/client'
import type { FileType } from '@/lib/types'
import { UploadIcon, Trash2Icon, FileIcon, ExternalLinkIcon, LayoutDashboardIcon, ChevronDownIcon, ChevronRightIcon, SparklesIcon } from 'lucide-react'
import Link from 'next/link'
import { ConfirmDialog } from '@/components/ui/dialog'

const FILE_TYPE_LABELS: Record<FileType, string> = {
  JOB_DESCRIPTION: 'Job Description',
  COVER_LETTER: 'Cover Letter',
  RESUME: 'Resume',
  OTHER: 'Other',
}

interface FileUploadProps {
  applicationId: number
  existingFiles?: ApplicationFile[]
  onFilesChange?: (files: ApplicationFile[]) => void
}

export function FileUpload({ applicationId, existingFiles = [], onFilesChange }: FileUploadProps) {
  const [files, setFiles] = useState<ApplicationFile[]>(existingFiles)
  const [uploading, setUploading] = useState(false)
  const [fileType, setFileType] = useState<FileType>('OTHER')
  const [deleteTarget, setDeleteTarget] = useState<ApplicationFile | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [aiExpanded, setAiExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(selectedFile: File) {
    setUploading(true)
    const form = new FormData()
    form.append('file', selectedFile)
    form.append('applicationId', String(applicationId))
    form.append('type', fileType)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (res.ok) {
        const record = await res.json()
        const updated = [...files, record]
        setFiles(updated)
        onFilesChange?.(updated)
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`/api/files/${deleteTarget.id}`, { method: 'DELETE' })
      const updated = files.filter((f) => f.id !== deleteTarget.id)
      setFiles(updated)
      onFilesChange?.(updated)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const userFiles = files.filter(f => !f.label?.startsWith('Tailoring Analysis'))
  const aiFiles = files.filter(f => f.label?.startsWith('Tailoring Analysis'))

  function renderFileRow(f: ApplicationFile) {
    return (
      <div
        key={f.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          padding: '8px 12px',
        }}
      >
        <FileIcon size={14} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text)' }}>
          {f.label || f.filename}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
          {FILE_TYPE_LABELS[f.type as FileType]}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--color-muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          {new Date(f.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
        {f.label?.startsWith('Tailoring Analysis') ? (
          <Link
            href={(() => {
              const part = f.label.split(' — ')[1] ?? ''
              const versionId = part.startsWith('v') ? part : 'v1_technical'
              return `/applications/${applicationId}/studio?analysisFileId=${f.id}&versionId=${versionId}`
            })()}
            style={{ color: 'var(--color-accent)', display: 'flex' }}
            title="Open in CV Studio"
          >
            <LayoutDashboardIcon size={13} />
          </Link>
        ) : (
          <a
            href={`/api/files/${f.id}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--color-muted)', display: 'flex' }}
          >
            <ExternalLinkIcon size={13} />
          </a>
        )}
        <button
          type="button"
          onClick={() => setDeleteTarget(f)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', padding: 0 }}
        >
          <Trash2Icon size={13} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', marginBottom: '10px' }}>
        Files
      </p>

      {userFiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
          {userFiles.map(renderFileRow)}
        </div>
      )}

      {aiFiles.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <button
            type="button"
            onClick={() => setAiExpanded(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-muted)', fontSize: '11px', padding: '4px 0',
              marginBottom: aiExpanded ? '6px' : '0',
            }}
          >
            {aiExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
            <SparklesIcon size={11} />
            AI Artifacts ({aiFiles.length})
          </button>
          {aiExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {aiFiles.map(renderFileRow)}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: files.length > 0 ? '8px' : '0', borderTop: files.length > 0 ? '1px solid var(--color-border)' : 'none' }}>
        <Select
          value={fileType}
          onChange={(e) => setFileType(e.target.value as FileType)}
          style={{ width: '160px', flex: 'none' }}
        >
          {(Object.entries(FILE_TYPE_LABELS) as [FileType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Button
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <UploadIcon size={13} />
          {uploading ? 'Uploading...' : 'Upload File'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleUpload(f)
          }}
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete file"
        message={`Delete "${deleteTarget?.filename}"? This cannot be undone.`}
        loading={deleting}
      />
    </div>
  )
}
