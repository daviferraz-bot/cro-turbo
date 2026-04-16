import Anthropic from '@anthropic-ai/sdk'
import type { CroResult, TipoPagina } from './types'

// ── Prompts especializados por tipo de página ─────────────────────────────────

function getSystemPrompt(tipo: TipoPagina): string {
  const base = `Você é um especialista em Conversion Rate Optimization (CRO) focado no mercado brasileiro de e-commerce e marketing digital.

METODOLOGIA: Aplique o LIFT Model:
- Value Proposition: O visitante entende em <5s o que é oferecido e por que é melhor?
- Clarity: A mensagem e o CTA são inequívocos?
- Anxiety: Há elementos que causam dúvida ou desconfiança?
- Distraction: Há elementos que desviam o foco da ação principal?
- Urgency: Existe motivo claro para agir AGORA?

CONTEXTO: Mobile-first, consumidor brasileiro desconfiado, WhatsApp é canal relevante.

FOCO: Analise a PRIMEIRA DOBRA (above the fold). É onde a decisão de ficar ou sair acontece em menos de 8 segundos.

REGRA SOBRE POPUPS: Se houver popup visível no screenshot, IGNORE-O. Analise apenas a página por trás.`

  const tipoEspecifico: Record<TipoPagina, string> = {
    homepage: `
TIPO: HOMEPAGE (benchmark: 3-5% de conversão)
Avalie na primeira dobra: headline com proposta de valor única, CTA visível e com contraste, prova social imediata, trust signals, hierarquia visual clara, usabilidade mobile.`,

    produto: `
TIPO: PÁGINA DE PRODUTO (benchmark: 2-4% de conversão)
Avalie na primeira dobra: imagens de qualidade, título e preço visíveis, CTA de compra proeminente, selos de confiança próximos ao botão, urgência real (estoque/prazo).`,

    landing_page: `
TIPO: LANDING PAGE (benchmark: 5-15% de conversão)
Avalie na primeira dobra: match headline/oferta, CTA único e dominante, ausência de distrações (sem menu/footer desnecessários), copy direto ao ponto, prova social concentrada.`,
  }

  const formato = `
IDENTIFICAÇÃO DO PERFIL DE SERVIÇO:
- "cro": site estruturalmente ok, precisa de otimização de conversão
- "landing_page": página que seria mais eficaz como landing page dedicada
- "ecommerce": loja virtual com problemas de UX ou estrutura
- "site_institucional": site corporativo desatualizado ou mal estruturado
- "otimizacao_tecnica": site com performance e código críticos

FORMATO — retorne APENAS um JSON válido com esta estrutura:
{
  "score_geral": <número 0-100>,
  "score_proposta_valor": <número 0-100>,
  "score_confianca": <número 0-100>,
  "score_mobile": <número 0-100>,
  "tipo_pagina": <"home" | "produto" | "outra">,
  "perfil_servico": <"cro" | "landing_page" | "ecommerce" | "site_institucional" | "otimizacao_tecnica">,
  "resumo_executivo": "<2 frases diretas sobre o estado atual e impacto nos resultados>",
  "problemas_criticos": [
    {
      "titulo": "<título objetivo do problema>",
      "impacto": "<o que esse problema está custando em conversões, em 1-2 frases diretas>",
      "categoria": <"design" | "copy" | "confianca" | "mobile" | "ux" | "velocidade">
    }
  ],
  "melhorias": [
    {
      "titulo": "<título da oportunidade>",
      "impacto": "<o que muda no resultado com essa melhoria, em 1 frase>",
      "prioridade": <"alta" | "media" | "baixa">,
      "categoria": <"design" | "copy" | "confianca" | "mobile" | "ux" | "velocidade">
    }
  ]
}

REGRAS:
- Exatamente 3 problemas_criticos e 3 melhorias
- Respostas curtas e diretas — sem blocos de código ou HTML
- Não use aspas duplas dentro dos valores de string
- NÃO inclua texto fora do JSON`

  return base + tipoEspecifico[tipo] + formato
}

// ── Análise CRO com Claude ────────────────────────────────────────────────────

export async function analisarCRO(
  url: string,
  tipoPagina: TipoPagina,
  screenshotBase64?: string,
  screenshotMime: string = 'image/jpeg',
): Promise<CroResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return mockCroResult(url)
  }

  const client = new Anthropic({ apiKey })

  const content: Anthropic.MessageParam['content'] = []

  if (screenshotBase64) {
    const validMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
    type ValidMime = typeof validMimes[number]
    const mime: ValidMime = validMimes.includes(screenshotMime as ValidMime)
      ? (screenshotMime as ValidMime)
      : 'image/jpeg'

    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mime,
        data: screenshotBase64,
      },
    })
  }

  const tipoLabel = { homepage: 'Homepage', produto: 'Página de Produto', landing_page: 'Landing Page' }[tipoPagina]

  content.push({
    type: 'text',
    text: `Analise esta ${tipoLabel}.\n\nURL: ${url}\n\n${screenshotBase64 ? 'A imagem acima é o screenshot da primeira dobra (above the fold, visão mobile). Use os elementos visuais para embasar a análise.' : 'Screenshot não disponível — analise com base na URL.'}\n\nRetorne apenas o JSON.`,
  })

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2000,
      system: getSystemPrompt(tipoPagina),
      messages: [{ role: 'user', content }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta da IA não contém JSON válido')

    const parsed = JSON.parse(repararJson(jsonMatch[0])) as CroResult
    return parsed
  } catch (err) {
    console.error('Erro na análise CRO:', err)
    throw err
  }
}

function repararJson(raw: string): string {
  let fixed = raw.replace(/,\s*([\]}])/g, '$1')
  fixed = fixed.replace(
    /"((?:[^"\\]|\\.)*)"/g,
    (_match: string, inner: string) => {
      const cleaned = inner
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
      return `"${cleaned}"`
    }
  )
  return fixed
}

// ── Mock para desenvolvimento sem API key ─────────────────────────────────────
function mockCroResult(url: string): CroResult {
  const isProduct = url.includes('produto') || url.includes('product') || url.includes('/p/')
  return {
    score_geral: 38,
    score_proposta_valor: 30,
    score_confianca: 28,
    score_mobile: 50,
    tipo_pagina: isProduct ? 'produto' : 'home',
    perfil_servico: 'cro',
    resumo_executivo: 'Esta análise está em modo de demonstração — configure sua ANTHROPIC_API_KEY para análise real com IA. A página apresenta oportunidades claras de melhoria que impactam diretamente a taxa de conversão.',
    problemas_criticos: [
      {
        titulo: 'Proposta de valor ausente acima do fold',
        impacto: 'O visitante não entende em 5 segundos o que você oferece e por que é diferente, causando taxa de rejeição 40-60% maior que o necessário.',
        categoria: 'copy',
      },
      {
        titulo: 'CTA sem destaque visual suficiente',
        impacto: 'CTAs com baixo contraste e copy passivo reduzem a taxa de clique em até 35% comparado a botões otimizados.',
        categoria: 'design',
      },
      {
        titulo: 'Ausência de prova social visível',
        impacto: 'Páginas sem prova social convertem em média 34% menos — o consumidor brasileiro precisa ver que outras pessoas já confiaram.',
        categoria: 'confianca',
      },
    ],
    melhorias: [
      {
        titulo: 'Implementar urgência e escassez reais',
        impacto: 'Urgência bem implementada aumenta conversão em 20-30% sem alterar tráfego ou budget.',
        prioridade: 'alta',
        categoria: 'ux',
      },
      {
        titulo: 'Otimizar CTA para mobile',
        impacto: 'Com +60% do tráfego brasileiro em mobile, cada ponto de atrito representa perda direta de conversões.',
        prioridade: 'alta',
        categoria: 'mobile',
      },
      {
        titulo: 'Inserir Trust Signals próximos ao CTA',
        impacto: 'Selos visíveis reduzem abandono no momento de decisão em até 42%.',
        prioridade: 'media',
        categoria: 'confianca',
      },
    ],
  }
}
