import type { PageSpeedResult } from './types'

const PSI_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

interface LighthouseAudit {
  displayValue?: string
  numericValue?: number
  score?: number | null
  details?: {
    data?: string                          // final-screenshot
    [key: string]: unknown
  }
}

interface PSIResponse {
  lighthouseResult?: {
    categories?: { performance?: { score?: number } }
    audits?: Record<string, LighthouseAudit>
  }
}

function formatMs(ms: number | undefined): string {
  if (!ms) return 'N/A'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

async function fetchPSI(url: string): Promise<PSIResponse> {
  const apiKey = process.env.PAGESPEED_API_KEY
  const endpoint = `${PSI_BASE}?url=${encodeURIComponent(url)}&strategy=mobile${apiKey ? `&key=${apiKey}` : ''}`
  const res = await fetch(endpoint, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`PageSpeed API error: ${res.status}`)
  return res.json()
}

export async function analisarPageSpeed(url: string): Promise<PageSpeedResult> {
  const mobile = await fetchPSI(url)

  const mAudits = mobile.lighthouseResult?.audits ?? {}
  const mScore = Math.round((mobile.lighthouseResult?.categories?.performance?.score ?? 0) * 100)

  // Usa final-screenshot (primeira dobra) — leve e dentro do limite de 8000px do Claude
  const screenshotDataUrl = mAudits['final-screenshot']?.details?.data

  let screenshot: string | undefined
  let screenshotMime = 'image/jpeg'
  if (screenshotDataUrl) {
    const match = screenshotDataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (match) {
      screenshotMime = match[1]
      screenshot = match[2]
    } else if (screenshotDataUrl.includes(',')) {
      screenshot = screenshotDataUrl.split(',')[1]
    }
  }

  return {
    mobile_score: mScore,
    lcp: mAudits['largest-contentful-paint']?.displayValue ?? formatMs(mAudits['largest-contentful-paint']?.numericValue),
    cls: mAudits['cumulative-layout-shift']?.displayValue ?? String(mAudits['cumulative-layout-shift']?.numericValue?.toFixed(2) ?? 'N/A'),
    fcp: mAudits['first-contentful-paint']?.displayValue ?? formatMs(mAudits['first-contentful-paint']?.numericValue),
    ttfb: mAudits['server-response-time']?.displayValue ?? formatMs(mAudits['server-response-time']?.numericValue),
    speed_index: mAudits['speed-index']?.displayValue ?? formatMs(mAudits['speed-index']?.numericValue),
    screenshot,
    screenshotMime,
  }
}
