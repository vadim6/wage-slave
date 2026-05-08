// Ashby job board listing API — public, no auth required
const ASHBY_BOARD_API = 'https://api.ashbyhq.com/posting-api/job-board'

function parseAshbyUrl(url: string): { company: string; jobId: string } | null {
  try {
    const { hostname, pathname } = new URL(url)
    if (hostname !== 'jobs.ashbyhq.com') return null
    const parts = pathname.split('/').filter(Boolean)
    // pathname: /{company}/{jobId}
    if (parts.length < 2) return null
    return { company: parts[0], jobId: parts[1] }
  } catch {
    return null
  }
}

async function scrapeAshby(url: string): Promise<string> {
  const parsed = parseAshbyUrl(url)
  if (!parsed) throw new Error('not_ashby')

  const { company, jobId } = parsed
  const res = await fetch(`${ASHBY_BOARD_API}/${company}`)
  if (!res.ok) throw new Error('ashby_api_failed')

  const data = await res.json() as { jobs?: AshbyJob[] }
  const job = data.jobs?.find((j) => j.id === jobId)
  if (!job) throw new Error('ashby_job_not_found')

  const lines = [
    `Job Title: ${job.title}`,
    `Company: ${company}`,
    `Location: ${job.location}`,
    `Work Type: ${job.workplaceType ?? job.employmentType ?? ''}`,
    '',
    job.descriptionPlain ?? '',
  ]
  return lines.join('\n').trim().slice(0, 8000)
}

interface AshbyJob {
  id: string
  title: string
  location: string
  workplaceType?: string
  employmentType?: string
  descriptionPlain?: string
}

async function scrapeWithPuppeteer(url: string): Promise<string> {
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    await page.goto(url, { timeout: 15000, waitUntil: 'networkidle2' })

    const text = await page.evaluate(() => document.body.innerText)
    const cleaned = text
      .replace(/\s{3,}/g, '\n\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim()

    return cleaned.slice(0, 8000)
  } finally {
    await browser.close()
  }
}

export async function scrapeUrl(url: string): Promise<string> {
  if (parseAshbyUrl(url)) {
    try {
      return await scrapeAshby(url)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      // job_not_found = listing pulled, job just isn't there — Puppeteer won't help either
      if (msg === 'ashby_job_not_found') throw new Error('ashby_job_not_found')
      // any other failure: fall through to Puppeteer
    }
  }

  return scrapeWithPuppeteer(url)
}
