import { NextRequest, NextResponse } from 'next/server'
import { analisarPageSpeed } from '@/lib/pagespeed'
import { analisarCodigo } from '@/lib/codigo'
import { analisarCRO } from '@/lib/cro'
import type { AnaliseResult } from '@/lib/types'

export const maxDuration = 120 // segundos

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL inválida.' }, { status: 400 })
    }

    // Normaliza a URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    try {
      new URL(normalizedUrl)
    } catch {
      return NextResponse.json({ error: 'URL inválida. Verifique o endereço digitado.' }, { status: 400 })
    }

    // Roda PageSpeed e análise de código em paralelo
    const [pagespeed, codigo] = await Promise.all([
      analisarPageSpeed(normalizedUrl).catch(() => ({
        mobile_score: 0,
        desktop_score: 0,
        lcp: 'N/A',
        cls: 'N/A',
        fcp: 'N/A',
        ttfb: 'N/A',
        speed_index: 'N/A',
        screenshot: undefined,
      })),
      analisarCodigo(normalizedUrl).catch(() => ({
        score: 0,
        checks: [],
      })),
    ])

    // Análise de CRO com o screenshot capturado pelo PageSpeed
    const cro = await analisarCRO(normalizedUrl, pagespeed.screenshot, pagespeed.screenshotMime)

    // Score final ponderado: CRO 50% + PageSpeed 30% + Código 20%
    const psScore = Math.round((pagespeed.mobile_score + pagespeed.desktop_score) / 2)
    const score_final = Math.round(cro.score_geral * 0.5 + psScore * 0.3 + codigo.score * 0.2)

    const result: AnaliseResult = {
      url: normalizedUrl,
      screenshot: pagespeed.screenshot,
      screenshotMime: pagespeed.screenshotMime,
      pagespeed,
      codigo,
      cro,
      score_final,
      analisado_em: new Date().toISOString(),
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno ao processar a análise.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
