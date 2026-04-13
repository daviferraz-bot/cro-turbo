import type { PageSpeedResult } from './types'

const PSI_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

interface LighthouseAudit {
  displayValue?: string
  numericValue?: number
  score?: number | null
  details?: {
    data?: string                          // final-screenshot
    screenshot?: { data?: string }         // full-page-screenshot
    [key: string]: unknown
  }
}

interface PSIResponse {
  lighthouseResult?: {
    categories?: { performance?: { score?: number } }
    audits?: Record<string, LighthouseAudit>
    // full-page-screenshot pode estar aqui fora dos audits em algumas versões
    fullPageScreenshot?: {
      screenshot?: { data?: string }
    }
  }
}

function formatMs(ms: number | undefined): string {
  if (!ms) return 'N/A'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

async function fetchPSI(url: string, strategy: 'mobile' | 'desktop'): Promise<PSIResponse> {
  const apiKey = process.env.PAGESPEED_API_KEY
  const endpoint = `${PSI_BASE}?url=${encodeURIComponent(url)}&strategy=${strategy}${apiKey ? `&key=${apiKey}` : ''}`
  const res = await fetch(endpoint, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`PageSpeed API error: ${res.status}`)
  return res.json()
}

export async function analisarPageSpeed(url: string): Promise<PageSpeedResult> {
  const [mobile, desktop] = await Promise.all([
    fetchPSI(url, 'mobile'),
    fetchPSI(url, 'desktop'),
  ])

  const mAudits = mobile.lighthouseResult?.audits ?? {}
  const dAudits = desktop.lighthouseResult?.audits ?? {}

  const mScore = Math.round((mobile.lighthouseResult?.categories?.performance?.score ?? 0) * 100)
  const dScore = Math.round((desktop.lighthouseResult?.categories?.performance?.score ?? 0) * 100)

  // DEBUG temporário — inspecionar estrutura do full-page-screenshot
  const fpAudit = mAudits['full-page-screenshot']
  const fpTopLevel = mobile.lighthouseResult?.fullPageScreenshot
  console.log('[PSI DEBUG] audit keys com "screenshot":', Object.keys(mAudits).filter(k => k.includes('screenshot')))
  console.log('[PSI DEBUG] full-page-screenshot (audit) details keys:', Object.keys(fpAudit?.details ?? {}))
  console.log('[PSI DEBUG] full-page-screenshot (audit) screenshot.data?', !!(fpAudit?.details?.screenshot?.data))
  console.log('[PSI DEBUG] fullPageScreenshot (top-level) screenshot.data?', !!(fpTopLevel?.screenshot?.data))
  console.log('[PSI DEBUG] final-screenshot data?', !!(mAudits['final-screenshot']?.details?.data))

  // Tenta full-page-screenshot — 3 caminhos possíveis no PSI API
  // Caminho 1: lighthouseResult.fullPageScreenshot.screenshot.data (algumas versões do Lighthouse)
  // Caminho 2: audits['full-page-screenshot'].details.screenshot.data
  // Fallback: audits['final-screenshot'].details.data (só primeira dobra)
  let screenshotDataUrl: string | undefined

  if (fpTopLevel?.screenshot?.data) {
    screenshotDataUrl = fpTopLevel.screenshot.data
    console.log('[PSI DEBUG] Usando fullPageScreenshot top-level ✅')
  } else if (fpAudit?.details?.screenshot?.data) {
    screenshotDataUrl = fpAudit.details.screenshot.data
    console.log('[PSI DEBUG] Usando full-page-screenshot audit ✅')
  } else {
    screenshotDataUrl = mAudits['final-screenshot']?.details?.data
    console.log('[PSI DEBUG] Usando final-screenshot (fallback) ⚠️')
  }

  let screenshot: string | undefined
  let screenshotMime = 'image/jpeg'
  if (screenshotDataUrl) {
    const match = screenshotDataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (match) {
      screenshotMime = match[1]   // ex: image/webp ou image/jpeg
      screenshot = match[2]       // só o base64 puro
    } else if (screenshotDataUrl.includes(',')) {
      screenshot = screenshotDataUrl.split(',')[1]
    }
  }

  return {
    mobile_score: mScore,
    desktop_score: dScore,
    lcp: mAudits['largest-contentful-paint']?.displayValue ?? formatMs(mAudits['largest-contentful-paint']?.numericValue),
    cls: mAudits['cumulative-layout-shift']?.displayValue ?? String(mAudits['cumulative-layout-shift']?.numericValue?.toFixed(2) ?? 'N/A'),
    fcp: mAudits['first-contentful-paint']?.displayValue ?? formatMs(mAudits['first-contentful-paint']?.numericValue),
    ttfb: mAudits['server-response-time']?.displayValue ?? formatMs(mAudits['server-response-time']?.numericValue),
    speed_index: mAudits['speed-index']?.displayValue ?? formatMs(mAudits['speed-index']?.numericValue),
    screenshot,
    screenshotMime,
  }
}
