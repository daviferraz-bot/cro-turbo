import Anthropic from '@anthropic-ai/sdk'
import type { CroResult } from './types'

const SYSTEM_PROMPT = `Você é um especialista sênior em Conversion Rate Optimization (CRO) com 10+ anos de experiência em e-commerce e marketing digital no mercado brasileiro. Já auditou mais de 500 páginas e entrega laudos usados tanto por equipes técnicas quanto por diretores de negócio.

METODOLOGIA: Aplique o LIFT Model em toda análise:
- Value Proposition: O visitante entende em <5s o que é oferecido e por que é melhor?
- Relevance: A página entrega o que a pessoa esperava ao chegar?
- Clarity: A mensagem e o CTA são inequívocos?
- Anxiety: Há elementos que causam dúvida ou desconfiança?
- Distraction: Há elementos que desviam o foco da ação principal?
- Urgency: Existe motivo claro para agir AGORA?

CONTEXTO DO MERCADO:
- Brasil: consumidor é desconfiado por padrão — Trust Signals são essenciais
- Mobile-first: 60%+ do tráfego brasileiro é mobile
- Benchmark: home page boa converte 3-5%; product page boa, 2-4%

PARA HOME PAGE — avalie:
- Headline clara acima do fold com proposta de valor
- CTA principal visível, com contraste adequado e copy orientado a benefício
- Prova social (depoimentos, logos de clientes, números de resultado)
- Hierarquia visual (caminho claro para o olho seguir)
- Trust Signals (certificados, garantias, CNPJ visível)
- Urgência e escassez
- Ausência de distrações desnecessárias
- Layout e usabilidade em mobile
- FAQ ou resposta às principais objeções

PARA PRODUCT PAGE — avalie:
- Imagens de produto (quantidade, qualidade, zoom)
- Título e preço visíveis acima do fold
- CTA "Comprar/Adicionar ao carrinho" proeminente
- Descrição focada em benefícios, não apenas especificações
- Reviews e avaliações com quantidade suficiente
- Urgência/estoque disponível
- Selos de confiança, política de devolução clara
- Informações de frete e prazo de entrega
- Cross-sell ou upsell presente

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

export async function analisarCRO(
  url: string,
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
    // Claude suporta image/jpeg, image/png, image/gif, image/webp
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

  content.push({
    type: 'text',
    text: `Analise esta página aplicando o framework completo de CRO.\n\nURL: ${url}\n\n${screenshotBase64 ? 'A imagem acima é um screenshot atual da página. Use os elementos visuais identificados para embasar cada ponto do laudo.' : 'Screenshot não disponível — analise com base na URL e contexto disponível.'}\n\nRetorne apenas o JSON conforme instruído no system prompt.`,
  })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extrai o bloco JSON da resposta
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta da IA não contém JSON válido')

    const parsed = JSON.parse(repararJson(jsonMatch[0])) as CroResult
    return parsed
  } catch (err) {
    console.error('Erro na análise CRO:', err)
    // Repassa o erro para a route, que vai mostrar mensagem adequada
    throw err
  }
}

/**
 * Tenta reparar problemas comuns em JSONs gerados por IA:
 * - Strings com aspas não escapadas
 * - Caracteres de controle dentro de strings
 * - Trailing commas
 */
function repararJson(raw: string): string {
  // Remove trailing commas antes de ] ou }
  let fixed = raw.replace(/,\s*([\]}])/g, '$1')

  // Remove caracteres de controle invisíveis dentro de strings JSON
  // (mantém \n, \t, \r escapados corretamente)
  fixed = fixed.replace(
    /"((?:[^"\\]|\\.)*)"/g,
    (match: string, inner: string) => {
      const cleaned = inner
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') // controle inválidos
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
        descricao:
          'O headline principal não comunica o diferencial da empresa nos primeiros 5 segundos. O texto atual é genérico e não responde à pergunta central do visitante: "Por que devo escolher vocês?".',
        impacto:
          'Estudos de eye-tracking mostram que visitantes decidem ficar ou sair em menos de 8 segundos. Um headline fraco gera taxa de rejeição 40-60% maior que o necessário.',
        como_resolver:
          'Reescrever o headline principal seguindo a fórmula: [O que você faz] + [Para quem] + [Principal benefício/resultado]. Exemplo: "Dobramos as vendas de e-commerces em 90 dias — ou devolvemos o investimento". Posicionar acima do fold, fonte mínima 36px desktop / 28px mobile, peso bold.',
        categoria: 'copy',
        esforco: 'baixo',
      },
      {
        titulo: 'CTA principal sem destaque visual suficiente',
        descricao:
          'O botão de ação principal não se diferencia visualmente dos demais elementos da página. A proporção de contraste está abaixo do recomendado pela WCAG (mínimo 4.5:1), e o copy do botão é passivo ("Saiba mais", "Clique aqui") em vez de orientado a benefício.',
        impacto:
          'CTAs com baixo contraste e copy passivo reduzem a taxa de clique em até 35% comparado a botões otimizados. Em mobile, o problema é amplificado pela dificuldade de toque em áreas de baixo contraste.',
        como_resolver:
          'Definir UMA cor de destaque exclusiva para CTAs primários (ex: verde #37D3A4 ou laranja #F97316) que não apareça em nenhum outro elemento da página. Tamanho mínimo: 44x44px (padrão Apple HIG). Copy no formato imperativo + benefício: "Quero aumentar minhas vendas", "Começar agora — grátis", "Ver demonstração".',
        categoria: 'design',
        esforco: 'baixo',
      },
      {
        titulo: 'Ausência de prova social visível',
        descricao:
          'A página não apresenta evidências de que outras pessoas/empresas já confiaram e tiveram resultado. Não há depoimentos com nome e foto real, logos de clientes, número de clientes atendidos ou casos de sucesso acima do fold.',
        impacto:
          'O consumidor brasileiro é historicamente desconfiante em compras online. Páginas com prova social visível convertem em média 34% a mais que páginas sem. A ausência de evidências sociais é a principal causa de abandono em etapas de decisão.',
        como_resolver:
          'Implementar imediatamente: (1) Seção com 3-5 depoimentos reais com foto, nome e cargo/empresa; (2) Linha de logos de clientes conhecidos; (3) Um número de impacto em destaque ("+ 500 clientes" / "R$ 10M em vendas geradas"). Posicionar dentro dos primeiros 2 scrolls da página.',
        categoria: 'confianca',
        esforco: 'medio',
      },
    ],
    melhorias: [
      {
        titulo: 'Implementar urgência e escassez reais',
        descricao: 'Adicionar elementos que motivem ação imediata, baseados em dados reais do negócio.',
        impacto: 'Urgência bem implementada aumenta taxa de conversão em 20-30% sem alterar tráfego ou budget.',
        como_implementar:
          'Identificar limitadores reais: vagas disponíveis, estoque, prazo de oferta, bônus por tempo limitado. Adicionar próximo ao CTA com destaque visual (badge, contador ou texto em cor de destaque). Nunca usar urgência falsa — prejudica confiança a longo prazo.',
        prioridade: 'alta',
        esforco: 'baixo',
        categoria: 'ux',
      },
      {
        titulo: 'Otimizar layout e CTAs para mobile',
        descricao: 'Garantir que o CTA principal seja acessível sem scroll em telas de 390px (iPhone 14) e que todos os elementos de toque tenham mínimo 44x44px.',
        impacto: 'Com +60% do tráfego brasileiro vindo de mobile, cada ponto de atrito em celular representa perda direta de conversões.',
        como_implementar:
          'Testar no Chrome DevTools em iPhone SE (375px) e Galaxy S21 (360px). Verificar: (1) CTA visível acima do fold; (2) Fonte mínima 16px (evita zoom automático no iOS); (3) Espaçamento entre links clicáveis mínimo 8px; (4) Formulários com input type correto (tel, email) para teclado adequado.',
        prioridade: 'alta',
        esforco: 'medio',
        categoria: 'mobile',
      },
      {
        titulo: 'Adicionar seção de FAQ respondendo objeções principais',
        descricao: 'Criar seção com as 5-7 principais dúvidas que impedem a conversão, respondidas de forma direta.',
        impacto: 'FAQs bem estruturados reduzem o volume de contatos pré-venda e aumentam conversão de visitantes indecisos em até 18%.',
        como_implementar:
          'Listar as objeções mais comuns recebidas pela equipe comercial. Formatar como accordion (pergunta + resposta expansível) para não poluir o layout. Posicionar antes do CTA final da página. Incluir links para políticas detalhadas quando necessário.',
        prioridade: 'media',
        esforco: 'baixo',
        categoria: 'copy',
      },
      {
        titulo: 'Inserir Trust Signals no fluxo de conversão',
        descricao: 'Adicionar selos de segurança, garantias e indicadores de confiança próximos ao CTA e formulários.',
        impacto: 'Selos visíveis (SSL, pagamento seguro, garantia) reduzem abandono no momento de decisão em até 42% segundo pesquisas de checkout.',
        como_implementar:
          'Próximo ao CTA principal: selo SSL, "Dados protegidos", política de privacidade linkada. Se e-commerce: selos de pagamento aceitos (Visa, Mastercard, Pix), prazo de devolução em destaque. Se serviço: garantia de satisfação, CNPJ visível no footer.',
        prioridade: 'media',
        esforco: 'baixo',
        categoria: 'confianca',
      },
      {
        titulo: 'Estruturar hierarquia visual clara com design orientado a conversão',
        descricao: 'Reorganizar a página para criar um caminho visual único que leve o olho do visitante do headline ao CTA sem desvios.',
        impacto: 'Páginas com hierarquia visual clara têm tempo de engajamento 55% maior e taxa de clique no CTA até 2x superior.',
        como_implementar:
          'Aplicar o princípio F-pattern ou Z-pattern conforme o conteúdo. Usar tamanho, peso e cor para criar 3 níveis de importância: (1) Headline principal; (2) Benefícios chave ou subheadline; (3) CTA. Remover ou reduzir elementos que competem visualmente com o CTA (banners secundários, links de saída, menus complexos).',
        prioridade: 'media',
        esforco: 'medio',
        categoria: 'design',
      },
    ],
  }
}
