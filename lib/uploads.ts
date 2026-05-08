import fs from 'fs'
import path from 'path'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

export function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  }
}

export function getUploadPath(uuid: string, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return path.join(UPLOADS_DIR, `${uuid}-${safeName}`)
}

export function getUploadsDir(): string {
  return UPLOADS_DIR
}
