# WageSlave — CLAUDE.md

## Project Overview

Local-first job application tracker for a single user. Runs locally via `npm run dev`. Goal: structured pipeline stages, file attachments, rich notes, stats — and an integrated CV tailoring workflow powered by Claude API.

---

## Stack

- **Framework**: Next.js 14+ (App Router) — `app/` directory
- **Database**: SQLite via Prisma ORM — `prisma/schema.prisma`, DB at `prisma/dev.db`
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **File storage**: Local filesystem `/uploads/`, paths stored in DB
- **Scraping**: Puppeteer (headless Chrome — handles JS-rendered ATS pages)
- **JD parsing**: Ollama local LLM via `ollama` npm client — default model `qwen2.5:14b`
- **CV tailoring**: Claude API via `@anthropic-ai/sdk` — `claude-sonnet-4-20250514`
- **DOCX export**: `docx` npm package
- **YAML parsing**: `js-yaml` + Zod validation

**Prerequisites**: Ollama daemon running (`ollama serve`), `qwen2.5:14b` pulled. `ANTHROPIC_API_KEY` in `.env.local`.

---

## Key Files

```
lib/
  prisma.ts              — singleton Prisma client
  scraper.ts             — Puppeteer scrape → plain text
  ollama.ts              — Ollama JD parser (qwen2.5:14b), prompt + parse logic
  uploads.ts             — ensureUploadsDir, getUploadPath helpers
  types.ts               — shared app types (ScrapedJD, etc.)
  stage-events.ts        — auto-create ApplicationEvent on stage change
  cv/
    resolve-yaml.ts      — merge master.yaml + version.yaml → ResolvedCV
    design.ts            — CV_DESIGN constants (colors, fonts, docx units)
    generate-docx.ts     — docx-js generator, accepts ResolvedCV

types/
  cv.ts                  — ResolvedCV, TailoringAnalysis, all CV interfaces

cv/
  master.yaml            — full bullet library (all experience, skills, projects)
  versions/
    v1_technical.yaml    — technical-focus version (bullet selection)
    v2_leadership.yaml   — leadership-focus version (bullet selection)

app/api/
  scrape/route.ts        — POST: Puppeteer + Ollama → structured JD fields
  applications/          — CRUD for applications
  applications/[id]/tailor/route.ts  — POST: Claude API scoring + TailoringAnalysis
  cv/resolve/route.ts    — POST: merge YAML → ResolvedCV (with optional tailoring overrides)
  cv/export/route.ts     — POST: ResolvedCV → DOCX download + save ApplicationFile
  upload/route.ts        — POST: multipart → /uploads/
  files/[id]/route.ts    — GET/DELETE: serve or delete ApplicationFile
  stats/route.ts         — GET: aggregate dashboard stats
  companies/route.ts     — GET/POST companies

components/cv/
  CVPreview.tsx          — live CV preview with bullet toggle/edit/rewrite UI

app/applications/[id]/studio/
  page.tsx               — CV Studio route (server shell)
  studio-client.tsx      — client component: loads tailoring + resolve, manages state
```

---

## Data Model (Prisma — SQLite)

Enums stored as strings (SQLite has no native enum).

**Application** — core entity. Fields: `roleTitle`, `roleLevel`, `jobUrl`, `salary`, `location`, `workType`, `stage` (default `APPLIED`), `source`, `priority` (default `MEDIUM`), `rawJd` (scraped JD text stored directly on record for quick access). Relations: Company, ApplicationFile[], ApplicationEvent[], Contact[], Note[].

**Stage values**: `WISHLIST` `APPLIED` `SCREENING` `INTERVIEW` `OFFER` `REJECTED` `WITHDRAWN` `GHOSTED`

**Priority values**: `LOW` `MEDIUM` `HIGH`

**ApplicationFile** — file attachments on disk. `type` values: `JOB_DESCRIPTION` `COVER_LETTER` `RESUME` `OTHER`. `storedPath` = path under `/uploads/`. CV Studio saves two files per tailored application: a `OTHER` Tailoring Analysis JSON and a `RESUME` DOCX.

**ApplicationEvent** — timestamped activity log. `eventType` values: `APPLICATION_SENT` `RECRUITER_CALL` `TECHNICAL_SCREEN` `INTERVIEW_ROUND` `TAKE_HOME_TASK` `OFFER_RECEIVED` `REJECTION_RECEIVED` `FOLLOW_UP_SENT` `OTHER`. Stage changes auto-create events via `lib/stage-events.ts`.

**Contact** — people at company (recruiter, HM, interviewer). Optional.

**Note** — freeform notes per application. Separate from events.

**Company** — employer record, decoupled so same company appears across multiple applications.

---

## CV Studio Feature

Summary of what's built:

### CV Data Pipeline
- `cv/master.yaml` — single source of truth: all bullets with `id`, `text`, `tags`, `keywords`
- `cv/versions/*.yaml` — select which bullet IDs appear in each CV version
- `lib/cv/resolve-yaml.ts` — merges master + version → `ResolvedCV`. Applies `TailoringAnalysis` overrides (rewrite suggestions, relevance scores, `included` flags).
- `POST /api/cv/resolve` — thin API wrapper

### Tailoring (Claude API)
- `POST /api/applications/[id]/tailor` — fetches app + its JD, loads CV bullets for chosen version, calls Claude (`claude-sonnet-4-20250514`, temp=0) to score bullets and suggest rewrites, saves raw `TailoringAnalysis` JSON as `ApplicationFile` (type `OTHER`).
- Prompt is in `app/api/applications/[id]/tailor/route.ts`. Scoring rules: keyword match +20, tag match +10, signal/domain match +15. Never score >95.
- Rewrites must preserve all facts (numbers, years, company names, tech names) verbatim.

### DOCX Export
- `lib/cv/generate-docx.ts` — docx-js generator. Pure functions per section. Only renders `bullet.included === true`. No amber tints (preview-only).
- `POST /api/cv/export` — accepts `ResolvedCV` + `applicationId`, generates DOCX, saves to `/uploads/`, creates `ApplicationFile` (type `RESUME`), streams file download.

### Studio UI
- Route: `/applications/[id]/studio`
- Shows match score, gap warnings, requirement coverage
- CVPreview component: bullet toggles, inline edit, amber tint for rewrites, revert button
- All edits are local React state — no re-tailoring on toggle/edit
- Export sends current `resolvedCV` state to `/api/cv/export`

### CV Types (`types/cv.ts`)
Key interfaces: `ResolvedCV`, `ResolvedExperience`, `ResolvedBullet` (has `included`, `rewritten`, `relevanceScore`, `originalText`), `TailoringAnalysis` (has `matchScore`, `bulletsRanked`, `summaryRewrite`, `coverageByRequirement`).

### Design Constants (`lib/cv/design.ts`)
`CV_DESIGN` — single source of truth for colors, fonts, spacing, docx units. Imported by both CVPreview and generate-docx.

---

## JD Scraper

Puppeteer → `networkidle2` → `innerText` → strip whitespace → slice to 8000 chars → Ollama (`qwen2.5:14b`).

Returns: `{ roleTitle, company, location, workType, salary, requirements[], responsibilities[], rawText }`.

Error handling: Puppeteer timeout → user pastes manually. Ollama unreachable → empty fields, raw text saved. Malformed JSON → retry once, then fall back.

Ollama called via `ollama` npm client in `lib/ollama.ts`. Model default exported as `DEFAULT_MODEL = 'qwen2.5:14b'`.

---

## API Routes

```
POST   /api/scrape                — Puppeteer + Ollama → JD fields
GET    /api/applications          — list (filters: stage, priority, search)
POST   /api/applications          — create
GET    /api/applications/[id]     — detail with all relations
PUT    /api/applications/[id]     — update (stage change auto-creates event)
DELETE /api/applications/[id]     — delete + cascade disk files
POST   /api/applications/[id]/tailor — Claude API tailoring → TailoringAnalysis
POST   /api/cv/resolve            — YAML merge → ResolvedCV
POST   /api/cv/export             — ResolvedCV → DOCX download + ApplicationFile
POST   /api/upload                — multipart → /uploads/
GET    /api/files/[id]            — serve file
DELETE /api/files/[id]            — delete record + disk file
GET    /api/companies             — list
POST   /api/companies             — create
GET    /api/stats                 — dashboard aggregates
```

---

## Pages

```
/                           → Dashboard (stats cards, funnel, timeline, source charts)
/applications               → List with stage/priority filters + search
/applications/new           → Create form (URL scrape → auto-populate)
/applications/[id]          → Detail (timeline, files, contacts, notes, Tailor CV button)
/applications/[id]/edit     → Edit form
/applications/[id]/studio   → CV Studio (tailoring + preview + export)
/debug                      → Debug scrape page (dev tool)
```

---

## Environment Variables (`.env.local`)

```bash
DATABASE_URL=file:./dev.db
CV_MASTER_PATH=./cv/master.yaml
CV_VERSIONS_PATH=./cv/versions/
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Local Setup

```bash
ollama pull qwen2.5:14b    # one-time
npm install
npx prisma migrate dev --name init
npm run dev
```

---

## Out of Scope

Auth, email integration, calendar sync, multi-user, cloud deployment.
