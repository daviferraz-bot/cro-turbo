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
    fullPageScreenshot?: {
      screenshot?: { data?: string; width?: number; height?: number }
    }
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

  // O PSI tem falhas transientes frequentes (Lighthouse returned error) —
  // em geral a tentativa seguinte já passa. Tentamos até 3x com backoff.
  const MAX_ATTEMPTS = 3
  const BACKOFF_MS = [0, 2000, 4000] // espera antes de cada tentativa
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (BACKOFF_MS[attempt] > 0) {
      await new Promise(r => setTimeout(r, BACKOFF_MS[attempt]))
    }

    try {
      const res = await fetch(endpoint, { next: { revalidate: 0 } })
      if (res.ok) {
        const json = (await res.json()) as PSIResponse
        // Considera sucesso só se veio screenshot — senão tenta de novo
        const hasScreenshot =
          !!json.lighthouseResult?.fullPageScreenshot?.screenshot?.data ||
          !!json.lighthouseResult?.audits?.['final-screenshot']?.details?.data
        if (hasScreenshot || attempt === MAX_ATTEMPTS - 1) return json
        lastError = new Error('PSI respondeu sem screenshot')
        continue
      }

      // 5xx são transientes — tenta de novo. 4xx não vale retry.
      if (res.status >= 500 && attempt < MAX_ATTEMPTS - 1) {
        lastError = new Error(`PageSpeed API error: ${res.status}`)
        continue
      }
      throw new Error(`PageSpeed API error: ${res.status}`)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt === MAX_ATTEMPTS - 1) throw lastError
    }
  }

  throw lastError ?? new Error('PageSpeed API falhou após múltiplas tentativas')
}

export async function analisarPageSpeed(url: string): Promise<PageSpeedResult> {
  const mobile = await fetchPSI(url)

  const mAudits = mobile.lighthouseResult?.audits ?? {}
  const mScore = Math.round((mobile.lighthouseResult?.categories?.performance?.score ?? 0) * 100)

  // Prioriza fullPageScreenshot (página inteira) para análise de CRO ampla.
  // Cai para final-screenshot (primeira dobra) apenas se o PSI não retornar o full page.
  // O crop para o limite de 8000px da Claude Vision é feito no route.ts via sharp.
  const fullPageData = mobile.lighthouseResult?.fullPageScreenshot?.screenshot?.data
  const firstFoldData = mAudits['final-screenshot']?.details?.data
  const screenshotDataUrl = fullPageData ?? firstFoldData

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
