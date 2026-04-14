import { NextRequest, NextResponse } from 'next/server'
import { analisarPageSpeed } from '@/lib/pagespeed'
import { analisarCodigo } from '@/lib/codigo'
import { analisarCRO } from '@/lib/cro'
import type { AnaliseResult, TipoPagina } from '@/lib/types'

export const maxDuration = 60 // segundos (máximo no plano Hobby da Vercel)

const TIPOS_VALIDOS: TipoPagina[] = ['homepage', 'produto', 'landing_page']

export async function POST(req: NextRequest) {
  try {
    const { url, tipo_pagina } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL inválida.' }, { status: 400 })
    }

    if (!tipo_pagina || !TIPOS_VALIDOS.includes(tipo_pagina)) {
      return NextResponse.json({ error: 'Tipo de página inválido.' }, { status: 400 })
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

    // Roda TUDO em paralelo — PageSpeed, código e CRO ao mesmo tempo
    // CRO roda sem screenshot (analisa pela URL) para não depender do PageSpeed
    const [pagespeed, codigo, cro] = await Promise.all([
      analisarPageSpeed(normalizedUrl).catch(() => ({
        mobile_score: 0,
        lcp: 'N/A',
        cls: 'N/A',
        fcp: 'N/A',
        ttfb: 'N/A',
        speed_index: 'N/A',
        screenshot: undefined,
        screenshotMime: undefined,
      })),
      analisarCodigo(normalizedUrl).catch(() => ({
        score: 0,
        checks: [],
      })),
      analisarCRO(normalizedUrl, tipo_pagina).catch(() => null),
    ])

    // Se CRO falhou, tenta de novo (agora com screenshot se PageSpeed terminou)
    const croResult = cro ?? await analisarCRO(normalizedUrl, tipo_pagina, pagespeed.screenshot, pagespeed.screenshotMime)

    // Score final ponderado: CRO 50% + PageSpeed Mobile 30% + Código 20%
    const score_final = Math.round(croResult.score_geral * 0.5 + pagespeed.mobile_score * 0.3 + codigo.score * 0.2)

    const result: AnaliseResult = {
      url: normalizedUrl,
      screenshot: pagespeed.screenshot,
      screenshotMime: pagespeed.screenshotMime,
      pagespeed,
      codigo,
      cro: croResult,
      score_final,
      analisado_em: new Date().toISOString(),
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno ao processar a análise.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
