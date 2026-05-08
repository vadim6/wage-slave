# Wage Slave

Local-first job application tracker with Claude-powered CV tailoring and DOCX export.

## What it does

- **Track applications** — pipeline stages (Wishlist → Offer/Rejected), priority, salary, source, contacts, notes, and file attachments
- **Scrape job postings** — Puppeteer fetches JS-rendered ATS pages; a local LLM (Ollama) parses the JD into structured fields
- **Tailor your CV** — Claude API scores your bullet points against the JD, suggests rewrites, identifies coverage gaps, and produces a match score
- **Export DOCX** — generates a formatted, ATS-friendly resume from your tailored CV state
- **CV Studio** — interactive editor: toggle bullets in/out, accept/revert AI rewrites, inline-edit text, then export

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Database | SQLite via Prisma |
| Scraping | Puppeteer |
| JD parsing | Ollama (`qwen2.5:14b`) |
| CV tailoring | Anthropic Claude API (`claude-sonnet-4-5`) |
| DOCX export | docx-js |
| CV data | YAML (`master.yaml` + version files) |

## Prerequisites

- Node.js 18+
- [Ollama](https://ollama.ai) running locally (`ollama serve`)
- `qwen2.5:14b` model pulled (`ollama pull qwen2.5:14b`)
- Anthropic API key

## Setup

```bash
git clone <repo>
cd wage-slave
npm install
cp .env.local.example .env.local   # then fill in your values
npx prisma migrate dev --name init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

```bash
DATABASE_URL=file:./dev.db
CV_MASTER_PATH=./cv/master.yaml
CV_VERSIONS_PATH=./cv/versions/
ANTHROPIC_API_KEY=sk-ant-...
```

## CV data model

Your CV lives in two YAML files:

- `cv/master.yaml` — full bullet library: every job, every bullet point, tagged with domain/signal/keywords for scoring
- `cv/versions/*.yaml` — lightweight selectors: which bullets appear in each CV variant (e.g. `v1_technical.yaml`, `v2_leadership.yaml`)

This separation means one source of truth for your experience, with multiple tailored cuts for different role types.

## CV Studio workflow

1. Open an application → **Tailor CV**
2. Claude scores all bullets against the JD and suggests rewrites
3. Review in the Studio: toggle bullets, accept/revert rewrites, edit inline
4. **Export DOCX** — saves to the application's file attachments

## Pages

```
/                          Dashboard (stats, funnel, activity)
/applications              List with filters
/applications/new          Create (URL scrape → auto-fill)
/applications/[id]         Detail (timeline, files, contacts, notes)
/applications/[id]/studio  CV Studio
/debug                     Dev tool: scrape debugger + CV template preview
```

## Single-user, local only

No auth, no cloud sync, no multi-tenancy. Runs on your machine.
