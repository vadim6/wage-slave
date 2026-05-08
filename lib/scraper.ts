export async function scrapeUrl(url: string): Promise<string> {
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
