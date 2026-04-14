import Anthropic from '@anthropic-ai/sdk'
import type { CroResult, TipoPagina } from './types'

// ── Prompts especializados por tipo de página ─────────────────────────────────

function getSystemPrompt(tipo: TipoPagina): string {
  const base = `Você é um especialista sênior em Conversion Rate Optimization (CRO) com 10+ anos de experiência em e-commerce e marketing digital no mercado brasileiro. Já auditou mais de 500 páginas e entrega laudos usados tanto por equipes técnicas quanto por diretores de negócio.

METODOLOGIA: Aplique o LIFT Model em toda análise:
- Value Proposition: O visitante entende em <5s o que é oferecido e por que é melhor?
- Relevance: A página entrega o que a pessoa esperava ao chegar?
- Clarity: A mensagem e o CTA são inequívocos?
- Anxiety: Há elementos que causam dúvida ou desconfiança?
- Distraction: Há elementos que desviam o foco da ação principal?
- Urgency: Existe motivo claro para agir AGORA?

CONTEXTO DO MERCADO BRASILEIRO:
- Consumidor é desconfiado por padrão — Trust Signals são essenciais
- Mobile-first: 60%+ do tráfego brasileiro é mobile
- WhatsApp é canal de conversão relevante

FOCO DA ANÁLISE: Analise especificamente as PRIMEIRAS DUAS DOBRAS (above the fold + primeira rolagem). É onde 100% dos visitantes chegam e onde a decisão de ficar ou sair acontece.

REGRA SOBRE POPUPS: Se houver algum popup visível no screenshot (cookie banner, captura de e-mail, promoção, WhatsApp widget, etc.), IGNORE-O completamente. Analise apenas a página por trás do popup. Popups não fazem parte da estrutura fixa da página e não devem ser considerados como elementos de CRO na análise. Não mencione popups nos problemas ou melhorias.`

  const tipoEspecifico: Record<TipoPagina, string> = {
    homepage: `
TIPO DE PÁGINA: HOMEPAGE
Benchmarks: home page boa converte 3-5% dos visitantes.

CHECKLIST ESPECÍFICO — avalie cada item nas primeiras duas dobras:
- Headline claro acima do fold com proposta de valor única (o que faz, para quem, por que é diferente)
- Subheadline que complementa com benefício concreto ou prova
- CTA principal visível e com contraste adequado, copy orientado a benefício (não "Saiba mais")
- Prova social imediata (depoimentos com nome/foto, logos de clientes, números de resultado)
- Hierarquia visual clara (caminho do olho: headline → benefícios → CTA)
- Trust Signals (certificados, garantias, CNPJ, selos de segurança)
- Navegação intuitiva sem excesso de opções
- Layout e usabilidade em mobile (touch targets, fontes, espaçamento)
- Ausência de distrações (banners concorrentes, popups, links de saída desnecessários)
- Se tem formulário: número mínimo de campos, labels claros`,

    produto: `
TIPO DE PÁGINA: PÁGINA DE PRODUTO
Benchmarks: product page boa converte 2-4% em e-commerce.

CHECKLIST ESPECÍFICO — avalie cada item nas primeiras duas dobras:
- Imagens de produto de alta qualidade (quantidade, ângulos, zoom disponível)
- Título descritivo e preço visíveis acima do fold
- CTA "Comprar" / "Adicionar ao carrinho" proeminente e acima do fold
- Variações (cor, tamanho) com seletor claro e funcional
- Descrição focada em BENEFÍCIOS, não apenas especificações técnicas
- Reviews e avaliações com quantidade suficiente e nota média visível
- Urgência real (estoque limitado, promoção com prazo, frete grátis acima de X)
- Selos de confiança próximos ao botão de compra (pagamento seguro, devolução, entrega)
- Informações de frete e prazo de entrega claras (calculadora de CEP)
- Cross-sell ou upsell presente mas sem ofuscar o produto principal
- Política de devolução e garantia visível`,

    landing_page: `
TIPO DE PÁGINA: LANDING PAGE
Benchmarks: landing page boa converte 5-15% dependendo do tráfego.

CHECKLIST ESPECÍFICO — avalie cada item nas primeiras duas dobras:
- Match entre headline e oferta (se o tráfego vem de anúncio, a promessa bate?)
- CTA ÚNICO e dominante — sem links de saída, sem menu de navegação
- Formulário com mínimo de campos possível (cada campo extra reduz conversão em ~11%)
- Copy direto ao ponto: problema → solução → prova → ação
- Prova social concentrada (depoimentos, resultados, logos de clientes)
- Sem distrações: sem menu completo, sem footer com links, sem sidebar
- Urgência e escassez reais (vagas, prazo, bônus temporário)
- Elementos de confiança próximos ao formulário/CTA
- Mobile: formulário usável, CTA fixo ou facilmente acessível
- Benefícios claros em bullets (escaneáveis, não parágrafos longos)
- Hierarquia visual que guia para o formulário/CTA como destino final`,
  }

  const formato = `
PRINCÍPIO DE QUALIDADE DO LAUDO:
Cada problema e melhoria precisa ser tão específico e detalhado que um desenvolvedor ou designer consiga executar sem ter que fazer perguntas adicionais. Ao mesmo tempo, o impacto deve ser explicado em linguagem de negócio que um gestor não-técnico entenda.

IDENTIFICAÇÃO DO PERFIL DE SERVIÇO:
Analise os problemas encontrados e determine qual serviço resolveria melhor a situação principal:
- "cro": site estruturalmente ok, precisa de otimização de conversão e testes A/B
- "landing_page": página mal estruturada que seria mais eficaz como landing page dedicada
- "ecommerce": loja virtual com problemas graves de UX ou estrutura de produto
- "site_institucional": site corporativo desatualizado ou mal estruturado
- "otimizacao_tecnica": site com bons conteúdos mas performance e código críticos

FORMATO DE RESPOSTA — retorne APENAS um JSON válido com exatamente esta estrutura:
{
  "score_geral": <número 0-100>,
  "score_proposta_valor": <número 0-100>,
  "score_cta": <número 0-100>,
  "score_confianca": <número 0-100>,
  "score_mobile": <número 0-100>,
  "tipo_pagina": <"home" | "produto" | "outra">,
  "perfil_servico": <"cro" | "landing_page" | "ecommerce" | "site_institucional" | "otimizacao_tecnica">,
  "resumo_executivo": "<2-3 frases diretas sobre o estado atual da página e o impacto nos resultados do negócio>",
  "problemas_criticos": [
    {
      "titulo": "<título objetivo do problema>",
      "descricao": "<detalhe técnico: o que foi identificado visualmente, com elementos específicos da página>",
      "impacto": "<impacto no negócio em linguagem clara: o que esse problema está custando em conversões ou receita>",
      "como_resolver": "<passo a passo específico e acionável para corrigir, incluindo referências técnicas quando relevante>",
      "categoria": <"design" | "copy" | "confianca" | "mobile" | "ux" | "velocidade">,
      "esforco": <"baixo" | "medio" | "alto">
    }
  ],
  "melhorias": [
    {
      "titulo": "<título da oportunidade de melhoria>",
      "descricao": "<detalhe técnico: o que precisa ser implementado>",
      "impacto": "<o que muda no resultado do negócio com essa melhoria, com estimativa quando possível>",
      "como_implementar": "<passos concretos de implementação, suficientemente detalhados para um desenvolvedor ou designer executar>",
      "prioridade": <"alta" | "media" | "baixa">,
      "esforco": <"baixo" | "medio" | "alto">,
      "categoria": <"design" | "copy" | "confianca" | "mobile" | "ux" | "velocidade">
    }
  ]
}

REGRAS OBRIGATÓRIAS:
- Liste exatamente 3 problemas_criticos (os que mais prejudicam conversão)
- Liste exatamente 5 melhorias (ordenadas por prioridade decrescente)
- Em "descricao" de cada problema: seja específico sobre o que você vê na página (elemento, posição, cor, texto)
- Em "impacto": use dados e benchmarks reais do mercado quando possível ("53% dos usuários abandonam sites que demoram mais de 3s")
- Em "como_resolver" e "como_implementar": detalhe o suficiente para ser executável, mas sem blocos de código ou exemplos com HTML/CSS — apenas instruções em texto corrido
- IMPORTANTE para JSON válido: não use aspas duplas dentro dos valores de string. Use aspas simples ou paráfrases. Não use quebras de linha reais dentro dos valores — escreva tudo em uma linha contínua por campo
- NÃO inclua texto fora do JSON`

  return base + tipoEspecifico[tipo] + formato
}

// ── Análise CRO com Claude ──────────────────────────────────────────────────

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
    text: `Analise esta ${tipoLabel} aplicando o framework completo de CRO.\n\nURL: ${url}\nTipo declarado pelo dono do site: ${tipoLabel}\n\n${screenshotBase64 ? 'A imagem acima é um screenshot das primeiras dobras da página (visão mobile). Use os elementos visuais identificados para embasar cada ponto do laudo.' : 'Screenshot não disponível — analise com base na URL e contexto disponível.'}\n\nRetorne apenas o JSON conforme instruído no system prompt.`,
  })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
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

/**
 * Tenta reparar problemas comuns em JSONs gerados por IA:
 * - Trailing commas
 * - Caracteres de controle dentro de strings
 */
function repararJson(raw: string): string {
  let fixed = raw.replace(/,\s*([\]}])/g, '$1')

  fixed = fixed.replace(
    /"((?:[^"\\]|\\.)*)"/g,
    (match: string, inner: string) => {
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
    score_cta: 35,
    score_confianca: 28,
    score_mobile: 50,
    tipo_pagina: isProduct ? 'produto' : 'home',
    perfil_servico: 'cro',
    resumo_executivo:
      'Esta análise está em modo de demonstração — configure sua ANTHROPIC_API_KEY para análise real com IA. A página analisada apresenta oportunidades claras de melhoria que impactam diretamente a taxa de conversão e a geração de receita.',
    problemas_criticos: [
      {
        titulo: 'Proposta de valor ausente acima do fold',
        descricao: 'O headline principal não comunica o diferencial da empresa nos primeiros 5 segundos. O texto atual é genérico e não responde à pergunta central do visitante: por que devo escolher vocês?',
        impacto: 'Estudos de eye-tracking mostram que visitantes decidem ficar ou sair em menos de 8 segundos. Um headline fraco gera taxa de rejeição 40-60% maior que o necessário.',
        como_resolver: 'Reescrever o headline principal seguindo a fórmula: [O que você faz] + [Para quem] + [Principal benefício/resultado]. Posicionar acima do fold, fonte mínima 36px desktop / 28px mobile, peso bold.',
        categoria: 'copy',
        esforco: 'baixo',
      },
      {
        titulo: 'CTA principal sem destaque visual suficiente',
        descricao: 'O botão de ação principal não se diferencia visualmente dos demais elementos da página. A proporção de contraste está abaixo do recomendado e o copy do botão é passivo em vez de orientado a benefício.',
        impacto: 'CTAs com baixo contraste e copy passivo reduzem a taxa de clique em até 35% comparado a botões otimizados.',
        como_resolver: 'Definir UMA cor de destaque exclusiva para CTAs primários que não apareça em nenhum outro elemento da página. Tamanho mínimo: 44x44px. Copy no formato imperativo + benefício.',
        categoria: 'design',
        esforco: 'baixo',
      },
      {
        titulo: 'Ausência de prova social visível',
        descricao: 'A página não apresenta evidências de que outras pessoas/empresas já confiaram e tiveram resultado. Não há depoimentos com nome e foto real, logos de clientes ou número de clientes atendidos.',
        impacto: 'O consumidor brasileiro é historicamente desconfiante em compras online. Páginas com prova social visível convertem em média 34% a mais que páginas sem.',
        como_resolver: 'Implementar: (1) 3-5 depoimentos reais com foto, nome e cargo/empresa; (2) Linha de logos de clientes; (3) Um número de impacto em destaque. Posicionar dentro dos primeiros 2 scrolls.',
        categoria: 'confianca',
        esforco: 'medio',
      },
    ],
    melhorias: [
      {
        titulo: 'Implementar urgência e escassez reais',
        descricao: 'Adicionar elementos que motivem ação imediata, baseados em dados reais do negócio.',
        impacto: 'Urgência bem implementada aumenta taxa de conversão em 20-30% sem alterar tráfego ou budget.',
        como_implementar: 'Identificar limitadores reais: vagas disponíveis, estoque, prazo de oferta. Adicionar próximo ao CTA com destaque visual.',
        prioridade: 'alta',
        esforco: 'baixo',
        categoria: 'ux',
      },
      {
        titulo: 'Otimizar layout e CTAs para mobile',
        descricao: 'Garantir que o CTA principal seja acessível sem scroll em telas de 390px e que todos os elementos de toque tenham mínimo 44x44px.',
        impacto: 'Com +60% do tráfego brasileiro vindo de mobile, cada ponto de atrito representa perda direta de conversões.',
        como_implementar: 'Testar no Chrome DevTools em iPhone SE (375px) e Galaxy S21 (360px). Verificar CTA visível, fonte mínima 16px, espaçamento adequado entre links.',
        prioridade: 'alta',
        esforco: 'medio',
        categoria: 'mobile',
      },
      {
        titulo: 'Adicionar seção de FAQ respondendo objeções principais',
        descricao: 'Criar seção com as 5-7 principais dúvidas que impedem a conversão.',
        impacto: 'FAQs bem estruturados reduzem contatos pré-venda e aumentam conversão de indecisos em até 18%.',
        como_implementar: 'Listar objeções mais comuns. Formatar como accordion. Posicionar antes do CTA final.',
        prioridade: 'media',
        esforco: 'baixo',
        categoria: 'copy',
      },
      {
        titulo: 'Inserir Trust Signals no fluxo de conversão',
        descricao: 'Adicionar selos de segurança, garantias e indicadores de confiança próximos ao CTA e formulários.',
        impacto: 'Selos visíveis reduzem abandono no momento de decisão em até 42%.',
        como_implementar: 'Próximo ao CTA: selo SSL, dados protegidos, política de privacidade. Se e-commerce: selos de pagamento, prazo de devolução.',
        prioridade: 'media',
        esforco: 'baixo',
        categoria: 'confianca',
      },
      {
        titulo: 'Estruturar hierarquia visual orientada a conversão',
        descricao: 'Reorganizar a página para criar caminho visual único que leve do headline ao CTA sem desvios.',
        impacto: 'Páginas com hierarquia visual clara têm tempo de engajamento 55% maior e taxa de clique no CTA até 2x superior.',
        como_implementar: 'Aplicar princípio F-pattern ou Z-pattern. Criar 3 níveis de importância visual: Headline → Benefícios → CTA. Remover elementos que competem.',
        prioridade: 'media',
        esforco: 'medio',
        categoria: 'design',
      },
    ],
  }
}
