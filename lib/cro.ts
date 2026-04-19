import Anthropic from '@anthropic-ai/sdk'
import type { CroResult, TipoPagina } from './types'

// ── Prompts especializados por tipo de página ─────────────────────────────────

function getSystemPrompt(tipo: TipoPagina): string {
  const tipoLabel = { homepage: 'página inicial', produto: 'página de produto', landing_page: 'landing page' }[tipo]

  const base = `Você é um consultor de conversão e otimização de lojas online que atende empresas brasileiras. Está analisando uma ${tipoLabel}.

A SUA ANÁLISE SERÁ LIDA POR:
- Gestores de performance e tráfego da agência (internos)
- Vendedores que vão apresentar o diagnóstico direto ao cliente (dono do negócio)

Por isso, a linguagem precisa ser CLARA, DIRETA E SEM JARGÃO. Qualquer pessoa deve entender em poucos segundos o que está errado e o que isso está custando em vendas.

REGRAS DE LINGUAGEM (CRÍTICAS):
1. Escreva como quem explica para o DONO do negócio, não para um desenvolvedor.
2. Proibido usar SIGLAS sozinhas: LCP, CLS, TTFB, CTA, UX, fold, above-the-fold, lazy-load, bounce rate, SEO técnico, Core Web Vitals, heatmap. Se precisar mencionar, traduza em linguagem humana.
3. Cada texto deve ter no máximo 2 frases curtas e diretas.
4. Impacto sempre em linguagem de negócio: "perde cliente antes de ver o produto", "cliente desiste da compra", "cliente não confia e vai embora".
5. Use comparações do mundo real quando fizer sentido ("é como uma loja física com porta suja", "é como não ter preço na vitrine").
6. Você recebe o screenshot da PÁGINA INTEIRA (do topo ao rodapé, no celular). Analise tudo: primeira dobra, meio da página (prova social, detalhamento, depoimentos) e rodapé. Dê peso EXTRA à primeira dobra, já que é onde o visitante decide ficar ou sair em poucos segundos — mas aponte problemas de qualquer ponto da página.
7. Se houver popup visível no screenshot, ignore o popup e analise a página por trás.`

  const tipoEspecifico: Record<TipoPagina, string> = {
    homepage: `
TIPO DE PÁGINA: Homepage / Página inicial (benchmark: 3% a 5% de conversão).
Análise mobile-first, seguindo a metodologia Turbo Partners. Verifique a PRESENÇA, QUALIDADE e POSICIONAMENTO de cada elemento abaixo. Cada elemento ausente ou mal posicionado é um gap de conversão:

1) TOP BAR (faixa fina no topo)
- Comunica benefício principal imediato? (frete grátis a partir de X, desconto do 1º pedido, prazo expresso, garantia)

2) PRIMEIRA DOBRA — HERO
- Proposta de valor única em até 2 linhas, deixando claro: o que vende + pra quem + por que é diferente
- CTA principal claro e único (Comprar, Ver coleção, Explorar) com destaque visual
- Imagem ou vídeo mostrando o produto em uso (não só packshot)
- Prova social imediata: estrelas, número de clientes, selos de mídia, "mais de X vendidos"

3) CATEGORIAS / COLEÇÕES DESTACADAS
- Grid visual com as categorias principais — ajuda visitante que ainda não sabe o que quer
- Uso de imagens reais dos produtos/ambientes (não ícones genéricos)

4) PRODUTOS EM DESTAQUE / BEST-SELLERS
- Carrossel ou grid com 4-8 produtos populares
- Card com: imagem, nome, preço, avaliações, botão "Ver produto"

5) SEÇÕES DE CONTEÚDO
- Prova social expandida: depoimentos, vídeos UGC, avaliações reais
- Sobre a marca / história (importante para marcas D2C): constrói confiança e conexão emocional
- Benefícios da marca em bullets com ícones (frete grátis BR, troca fácil, feito no Brasil, sustentável)
- Instagram feed / UGC (fotos de clientes reais usando os produtos)

6) OFERTAS / PROMOÇÕES
- Destaque para promoção ativa (quando existir)
- Urgência real: prazo, estoque limitado, cupom com validade

7) RODAPÉ FORTE
- Links para categorias, atendimento, FAQ, formas de pagamento, selos de segurança

REGRA DE PRIORIZAÇÃO:
- A Homepage converte menos que LP ou Produto porque o papel dela é DIRECIONAR o visitante para onde ele quer ir. Clareza e hierarquia visual valem mais que CTA agressivo.
- Gaps na PRIMEIRA DOBRA têm impacto muito maior — priorize por lá.
- Ausência de proposta de valor clara na 1ª dobra é o gap mais comum e o que mais destrói conversão em homepage.`,

    produto: `
TIPO DE PÁGINA: Página de produto (benchmark: 2% a 4% de conversão).
Análise mobile-first, seguindo a metodologia Turbo Partners. Verifique a PRESENÇA, QUALIDADE e POSICIONAMENTO de cada elemento abaixo. Cada elemento ausente ou mal posicionado é um gap de conversão:

1) TOP BAR (faixa fina no topo)
- Comunica benefício principal imediato? (frete grátis, desconto, prazo especial, garantia)

2) PRIMEIRA DOBRA — 80/20 da página (elemento mais crítico)
- Título do produto claro e com diferencial, próximo à galeria
- Avaliações (estrelas + número) logo abaixo do título, antes de qualquer scroll — com destaque ainda maior se tiver fotos e vídeos de clientes reais junto
- Galeria de mídia com miniaturas e pelo menos 5 imagens de qualidade, cobrindo diferentes ângulos (packshot limpo, produto em uso/contexto, detalhe de textura, escala de tamanho, vídeo curto ou infográfico de benefícios)
- Imagens com pessoas reais usando o produto dentro da galeria (gera prova social imediata)
- Seletor de variantes (tamanho, cor, sabor, voltagem) claro, com botões grandes, indicação de variante sem estoque e tabela de medidas quando aplicável
- Benefícios em bullets curtos com ícones, escaneáveis
- Descrição atrativa de até 3 linhas, com "ver mais" se for maior
- Preço, parcelamento e condições visíveis bem próximos ao título
- Campo de CEP / calculadora de frete perto do CTA, mostrando prazo e valor sem recarregar a página (fundamental no e-commerce brasileiro)
- Botão de compra visível na PRIMEIRA dobra (a segunda dobra já é concessão)
- Em mobile, barra sticky de compra no rodapé com nome + preço + botão é um ganho grande quando a página é longa

3) LOGO ABAIXO DA PRIMEIRA DOBRA
- Reforço de prova social: avaliações detalhadas com fotos/vídeos reais, número de clientes atendidos, depoimentos

4) SEÇÕES AO LONGO DA PÁGINA (ordem flexível)
- Comparativo Nós x Eles (diferenciação clara vs concorrência)
- Benefícios em bullets com explicação direta
- Vídeos UGC (clientes reais usando o produto)
- Cross-sell / kit / "compre junto" / desconto progressivo — oportunidade de aumentar ticket médio
- Políticas de compra explícitas: garantia, prazo de troca/devolução, política clara ("7 dias pra arrepender", "troca grátis em 30 dias", "garantia de 1 ano") — idealmente também em linha curta perto do CTA
- Selos de confiança (segurança, garantia, formas de pagamento)
- FAQ quebrando objeções reais de compra

5) OFERTA CLARA EM TODA A PÁGINA
- Preço, parcelamento, prazo de entrega visíveis sempre
- Urgência/escassez REAL quando presente (contador com prazo verdadeiro, estoque baixo genuíno, frete grátis por tempo limitado). Urgência FALSA ("5 pessoas vendo agora" óbvio demais, contador que reseta a cada refresh) destrói confiança — aponte como problema se identificar.

REGRA DE PRIORIZAÇÃO:
- Gaps na PRIMEIRA DOBRA têm impacto MUITO maior que gaps em seções inferiores — priorize problemas e melhorias começando por lá.
- Ausência de prova social (estrelas na 1ª dobra, UGC, depoimentos com foto/vídeo) costuma ser o gap que mais destrói conversão no mercado brasileiro.
- Ausência de cálculo de frete na PDP é um dos gaps mais caros do e-commerce brasileiro — o consumidor BR não adiciona ao carrinho sem saber quanto paga e quanto demora.`,

    landing_page: `
TIPO DE PÁGINA: Landing page (benchmark: 5% a 15% de conversão).
Análise mobile-first, seguindo a metodologia Turbo Partners. Verifique a PRESENÇA, QUALIDADE e POSICIONAMENTO de cada elemento abaixo. Cada elemento ausente ou mal posicionado é um gap de conversão:

1) TOP BAR (opcional em LP)
- Só se for oferta com urgência clara (ex: "Últimas 24h do desconto de 40%")

2) PRIMEIRA DOBRA — O TUDO OU NADA
- Headline com MATCH de mensagem com o anúncio/campanha que trouxe o visitante (quem clicou precisa ver a mesma promessa aqui — é o fator #1 de conversão em LP)
- Subheadline explicando o benefício principal em 1 frase
- CTA único e dominante (sem menu no topo, sem links que levam pra fora)
- Imagem ou vídeo do produto em uso ou do resultado prometido
- Prova social imediata: estrelas, selos de imprensa, número de clientes

3) BENEFÍCIOS DO PRODUTO / OFERTA
- 3 a 6 benefícios em bullets com ícones, escaneáveis
- Focados em RESULTADO para o cliente, não em features técnicas

4) PROVA SOCIAL CONCENTRADA E FORTE
- Depoimentos em vídeo (UGC é rei)
- Antes e depois quando aplicável
- Número de clientes, avaliação média, selos de mídia

5) COMO FUNCIONA / O QUE VOCÊ RECEBE
- Explicação visual em passos numerados (1, 2, 3...)
- Fotos do produto em detalhes

6) OFERTA ANCORADA
- Preço com ancoragem (valor original riscado + valor com desconto)
- Parcelamento visível
- O que está incluído na compra (bônus, brindes, kit)
- Urgência/escassez real (estoque, prazo, bônus por tempo limitado)
- Garantia explícita (ex: "7 dias pra experimentar sem risco")

7) FAQ QUEBRANDO OBJEÇÕES ESPECÍFICAS DA OFERTA

8) CTA FINAL REPETIDO ANTES DO RODAPÉ

REGRA DE PRIORIZAÇÃO:
- LP tem UM ÚNICO OBJETIVO — tudo que tira atenção é inimigo. Menu grande, rodapé pesado, links pra outras páginas DEVEM ser apontados como problema.
- Match de mensagem entre anúncio e LP é o fator #1 de conversão — se a página parece "genérica", isso já é um gap crítico.
- Prova social CONCENTRADA (agrupada em 1-2 seções fortes) converte mais que espalhada pela página.
- Gaps na PRIMEIRA DOBRA têm impacto muito maior — priorize por lá.`,
  }

  const formato = `
CLASSIFICAÇÃO INTERNA (não mostrada ao cliente):
- "cro": site estruturalmente ok, precisa só de otimização de conversão
- "landing_page": página que funcionaria melhor como landing page dedicada
- "ecommerce": loja com problemas de experiência ou estrutura
- "site_institucional": site corporativo desatualizado ou mal estruturado
- "otimizacao_tecnica": site com problemas sérios de velocidade ou código

FORMATO — retorne APENAS um JSON válido com esta estrutura:
{
  "score_geral": <número 0-100>,
  "score_proposta_valor": <número 0-100>,
  "score_confianca": <número 0-100>,
  "score_mobile": <número 0-100>,
  "tipo_pagina": <"home" | "produto" | "outra">,
  "perfil_servico": <"cro" | "landing_page" | "ecommerce" | "site_institucional" | "otimizacao_tecnica">,
  "resumo_executivo": "<2 frases simples sobre como o site está hoje e o que isso significa para as vendas>",
  "problemas_criticos": [
    {
      "titulo": "<título curto e direto, sem jargão>",
      "impacto": "<em 1-2 frases simples, o que isso está custando em vendas>",
      "categoria": <"design" | "copy" | "confianca" | "mobile" | "ux" | "velocidade">
    }
  ],
  "melhorias": [
    {
      "titulo": "<o que fazer, em linguagem simples>",
      "impacto": "<em 1 frase simples, o que muda nas vendas quando isso for feito>",
      "prioridade": <"alta" | "media" | "baixa">,
      "categoria": <"design" | "copy" | "confianca" | "mobile" | "ux" | "velocidade">
    }
  ]
}

REGRAS FINAIS:
- Exatamente 3 problemas_criticos e 3 melhorias
- Frases curtas e diretas — sem blocos de código ou HTML
- Sem aspas duplas dentro dos valores de string
- NÃO inclua NENHUM texto fora do JSON`

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
    text: `Analise esta ${tipoLabel}.\n\nURL: ${url}\n\n${screenshotBase64 ? 'A imagem acima é o screenshot da PÁGINA INTEIRA no celular (do topo ao rodapé, com scroll completo). Dê peso extra à primeira dobra, mas considere também o meio e o fim da página para detectar problemas estruturais, de prova social, de hierarquia e de jornada.' : 'Screenshot não disponível — analise com base na URL.'}\n\nRetorne apenas o JSON.`,
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
    resumo_executivo: 'Esta análise está em modo demonstração — configure sua ANTHROPIC_API_KEY para análise real com IA. A página tem oportunidades claras que estão custando vendas todos os dias.',
    problemas_criticos: [
      {
        titulo: 'Visitante não entende o que você vende em 5 segundos',
        impacto: 'A página não deixa claro logo de cara o que o negócio oferece e por que comprar aí. Isso faz muita gente ir embora antes mesmo de conhecer o produto.',
        categoria: 'copy',
      },
      {
        titulo: 'Botão principal some no meio da página',
        impacto: 'O botão que leva à compra passa despercebido por falta de contraste e destaque. Clientes que queriam comprar acabam saindo sem encontrar onde clicar.',
        categoria: 'design',
      },
      {
        titulo: 'Falta prova de que outras pessoas já compraram',
        impacto: 'Sem avaliações, depoimentos ou selos visíveis, o consumidor brasileiro fica em dúvida e vai comparar em outro lugar — e raramente volta.',
        categoria: 'confianca',
      },
    ],
    melhorias: [
      {
        titulo: 'Criar urgência real (estoque limitado, prazo, bônus)',
        impacto: 'Quando o cliente sente que pode perder a oportunidade, decide mais rápido — gerando mais vendas sem aumentar o tráfego.',
        prioridade: 'alta',
        categoria: 'ux',
      },
      {
        titulo: 'Deixar o botão de compra grande e fácil de tocar no celular',
        impacto: 'Mais de 60% das vendas vêm do celular. Um botão difícil de clicar faz o cliente desistir no último passo.',
        prioridade: 'alta',
        categoria: 'mobile',
      },
      {
        titulo: 'Colocar selos de segurança e avaliações perto do botão de compra',
        impacto: 'Quando o cliente vê garantias no momento da decisão, a chance dele finalizar a compra cresce bastante.',
        prioridade: 'media',
        categoria: 'confianca',
      },
    ],
  }
}
