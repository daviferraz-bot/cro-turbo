import * as cheerio from 'cheerio'
import type { CodigoCheck, CodigoResult } from './types'

export async function analisarCodigo(url: string): Promise<CodigoResult> {
  let html = ''
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TurboCROBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    html = await res.text()
  } catch {
    return {
      score: 0,
      checks: [{
        nome: 'Acesso à página',
        passou: false,
        descricao: 'Não foi possível acessar o HTML da página.',
        impacto_negocio: 'Se o bot não consegue acessar, mecanismos de busca podem ter o mesmo problema.',
        como_resolver: 'Verifique se a URL está correta, o servidor está online e não há bloqueio por User-Agent ou firewall.',
        peso: 'critico',
      }],
    }
  }

  const $ = cheerio.load(html)
  const checks: CodigoCheck[] = []

  // 1. Title Tag
  const title = $('title').text().trim()
  const titleOk = title.length >= 30 && title.length <= 70
  checks.push({
    nome: 'Title Tag',
    passou: titleOk,
    descricao: title
      ? `Title encontrado: "${title.slice(0, 60)}${title.length > 60 ? '…' : ''}" (${title.length} caracteres).`
      : 'Tag <title> ausente na página.',
    impacto_negocio: titleOk
      ? undefined
      : title.length > 70
      ? 'O Google corta titles acima de 60-70 caracteres, exibindo "..." e reduzindo a taxa de clique na busca.'
      : 'Title muito curto ou ausente prejudica o ranqueamento e a identidade da página nos resultados de busca.',
    como_resolver: titleOk
      ? undefined
      : `Editar a tag <title> no <head> do HTML. Formato ideal: "Palavra-chave principal — Nome da marca". Manter entre 30 e 70 caracteres. Atual: ${title.length} caracteres.`,
    peso: 'alto',
  })

  // 2. Meta Description
  const metaDesc = $('meta[name="description"]').attr('content') ?? ''
  const descOk = metaDesc.length >= 80 && metaDesc.length <= 160
  checks.push({
    nome: 'Meta Description',
    passou: descOk,
    descricao: metaDesc
      ? `Meta description com ${metaDesc.length} caracteres: "${metaDesc.slice(0, 80)}${metaDesc.length > 80 ? '…' : ''}".`
      : 'Meta description ausente.',
    impacto_negocio: descOk
      ? undefined
      : 'A meta description é o texto que aparece abaixo do título nos resultados do Google. Uma boa descrição aumenta a taxa de clique orgânico em até 30%.',
    como_resolver: descOk
      ? undefined
      : 'Adicionar <meta name="description" content="..."> no <head>. Texto deve ter entre 80 e 160 caracteres, incluir a palavra-chave principal e uma chamada para ação clara.',
    peso: 'alto',
  })

  // 3. H1 único
  const h1Count = $('h1').length
  const h1Ok = h1Count === 1
  checks.push({
    nome: 'H1 Único',
    passou: h1Ok,
    descricao: h1Count === 0
      ? 'Nenhuma tag H1 encontrada.'
      : h1Count > 1
      ? `${h1Count} tags H1 encontradas — deve existir apenas 1.`
      : `H1 único encontrado: "${$('h1').first().text().trim().slice(0, 60)}".`,
    impacto_negocio: h1Ok
      ? undefined
      : h1Count === 0
      ? 'Sem H1, o Google não sabe qual é o tema principal da página, o que prejudica o ranqueamento para palavras-chave relevantes.'
      : 'Múltiplos H1 confundem os mecanismos de busca sobre o tema principal e diluem a autoridade da página.',
    como_resolver: h1Ok
      ? undefined
      : h1Count === 0
      ? 'Adicionar uma tag <h1> com o título principal da página, incluindo a palavra-chave mais importante. Deve ser único por página.'
      : 'Manter apenas um <h1> com o tema principal. Converter os demais para <h2> ou <h3> conforme a hierarquia do conteúdo.',
    peso: 'alto',
  })

  // 4. Alt em imagens
  const imgs = $('img')
  const semAlt = imgs.filter((_, el) => !$(el).attr('alt')).length
  const totalImgs = imgs.length
  const altOk = totalImgs === 0 || semAlt === 0
  checks.push({
    nome: 'Alt em Imagens',
    passou: altOk,
    descricao: totalImgs === 0
      ? 'Nenhuma imagem detectada no HTML.'
      : semAlt === 0
      ? `Todas as ${totalImgs} imagens têm atributo alt preenchido.`
      : `${semAlt} de ${totalImgs} imagens sem atributo alt.`,
    impacto_negocio: altOk
      ? undefined
      : 'Imagens sem alt text são invisíveis para o Google Images (perda de tráfego orgânico) e prejudicam a acessibilidade para usuários com deficiência visual.',
    como_resolver: altOk
      ? undefined
      : 'Adicionar atributo alt descritivo em todas as imagens: <img src="..." alt="Descrição objetiva do que aparece na imagem">. Para imagens decorativas, usar alt="" (vazio intencional).',
    peso: 'medio',
  })

  // 5. Open Graph
  const ogTitle = $('meta[property="og:title"]').attr('content')
  const ogDesc = $('meta[property="og:description"]').attr('content')
  const ogImage = $('meta[property="og:image"]').attr('content')
  const ogOk = !!(ogTitle && ogDesc && ogImage)
  checks.push({
    nome: 'Open Graph (Redes Sociais)',
    passou: ogOk,
    descricao: ogOk
      ? 'Tags og:title, og:description e og:image presentes.'
      : `Faltando: ${[!ogTitle && 'og:title', !ogDesc && 'og:description', !ogImage && 'og:image'].filter(Boolean).join(', ')}.`,
    impacto_negocio: ogOk
      ? undefined
      : 'Sem Open Graph, compartilhamentos no WhatsApp, Instagram e LinkedIn aparecem sem imagem e sem texto — reduzindo drasticamente o engajamento nesses compartilhamentos.',
    como_resolver: ogOk
      ? undefined
      : 'Adicionar no <head>: <meta property="og:title" content="Título da página">, <meta property="og:description" content="Descrição">, <meta property="og:image" content="https://url-da-imagem.jpg"> (tamanho recomendado: 1200x630px).',
    peso: 'medio',
  })

  // 6. Schema Markup
  const schemas = $('script[type="application/ld+json"]').length
  const schemaOk = schemas > 0
  checks.push({
    nome: 'Schema Markup (Dados Estruturados)',
    passou: schemaOk,
    descricao: schemaOk
      ? `${schemas} bloco(s) de Schema Markup (JSON-LD) encontrado(s).`
      : 'Nenhum Schema Markup encontrado.',
    impacto_negocio: schemaOk
      ? undefined
      : 'Schema Markup permite que o Google exiba resultados enriquecidos (estrelas de avaliação, FAQ, preço) nos resultados de busca — aumentando a taxa de clique em até 30%.',
    como_resolver: schemaOk
      ? undefined
      : 'Implementar JSON-LD conforme o tipo de página: Organization e WebSite para home page; Product com Review para e-commerce; FAQPage para páginas com FAQ. Usar o Schema Markup Validator do Google para validar.',
    peso: 'medio',
  })

  // 7. Viewport
  const viewport = $('meta[name="viewport"]').attr('content') ?? ''
  const viewportOk = viewport.includes('width=device-width')
  checks.push({
    nome: 'Configuração Mobile (Viewport)',
    passou: viewportOk,
    descricao: viewportOk
      ? 'Meta viewport configurada corretamente.'
      : 'Meta viewport ausente ou incorreta.',
    impacto_negocio: viewportOk
      ? undefined
      : 'Sem viewport configurada, a página aparece como versão desktop em celulares — ilegível e inutilizável. O Google penaliza páginas não mobile-friendly no ranking.',
    como_resolver: viewportOk
      ? undefined
      : 'Adicionar no <head>: <meta name="viewport" content="width=device-width, initial-scale=1">. Verificar em seguida com a ferramenta Mobile-Friendly Test do Google.',
    peso: 'critico',
  })

  // 8. HTTPS
  const httpsOk = url.startsWith('https://')
  checks.push({
    nome: 'HTTPS (Conexão Segura)',
    passou: httpsOk,
    descricao: httpsOk
      ? 'Site acessado via HTTPS — conexão criptografada.'
      : 'Site acessado via HTTP — conexão não segura.',
    impacto_negocio: httpsOk
      ? undefined
      : 'Navegadores modernos exibem "Não seguro" em sites HTTP, gerando desconfiança imediata. O Google usa HTTPS como fator de ranqueamento desde 2014.',
    como_resolver: httpsOk
      ? undefined
      : 'Instalar certificado SSL/TLS no servidor (Let\'s Encrypt oferece certificados gratuitos). Configurar redirecionamento 301 de HTTP para HTTPS. Atualizar links internos para HTTPS.',
    peso: 'critico',
  })

  // 9. Scripts render-blocking
  const headScripts = $('head script[src]').filter((_, el) => {
    const attrs = el.attribs
    return !attrs.async && !attrs.defer && !attrs.type?.includes('module')
  }).length
  const scriptsOk = headScripts === 0
  checks.push({
    nome: 'Scripts Sem Bloqueio de Renderização',
    passou: scriptsOk,
    descricao: scriptsOk
      ? 'Nenhum script bloqueante encontrado no <head>.'
      : `${headScripts} script(s) no <head> sem async ou defer — bloqueiam o carregamento.`,
    impacto_negocio: scriptsOk
      ? undefined
      : 'Scripts bloqueantes fazem o navegador pausar o carregamento da página para executar JavaScript. Cada script pode adicionar 100-500ms ao tempo de carregamento, impactando diretamente o LCP e a taxa de abandono.',
    como_resolver: scriptsOk
      ? undefined
      : `Adicionar o atributo "defer" em scripts que não precisam executar antes do carregamento: <script src="..." defer>. Scripts de analytics e terceiros: usar "async". Exemplo: <script src="analytics.js" async>. Scripts críticos podem permanecer sem atributo apenas se forem essenciais para o first render.`,
    peso: 'alto',
  })

  // 10. Dimensões de imagens
  const imgsSemDimensao = imgs.filter((_, el) => {
    const a = el.attribs
    return !a.width && !a.height && !(a.style || '').includes('width')
  }).length
  const dimsOk = totalImgs === 0 || imgsSemDimensao < totalImgs * 0.3
  checks.push({
    nome: 'Dimensões de Imagens Definidas',
    passou: dimsOk,
    descricao: dimsOk
      ? 'Imagens com dimensões definidas ou dentro do limite aceitável.'
      : `${imgsSemDimensao} de ${totalImgs} imagens sem atributos width e height.`,
    impacto_negocio: dimsOk
      ? undefined
      : 'Imagens sem dimensões causam Cumulative Layout Shift (CLS) — a página "pula" enquanto carrega, o que frustra usuários e penaliza o Core Web Vitals do Google.',
    como_resolver: dimsOk
      ? undefined
      : 'Adicionar width e height correspondentes ao tamanho real de cada imagem: <img src="foto.jpg" width="800" height="600" alt="...">. Em CSS, usar aspect-ratio para manter proporção responsiva: img { aspect-ratio: 4/3; width: 100%; }.',
    peso: 'medio',
  })

  // 11. Canonical
  const canonical = $('link[rel="canonical"]').attr('href')
  const canonicalOk = !!canonical
  checks.push({
    nome: 'Tag Canonical',
    passou: canonicalOk,
    descricao: canonicalOk
      ? `Canonical definida: ${canonical}`
      : 'Tag canonical ausente.',
    impacto_negocio: canonicalOk
      ? undefined
      : 'Sem canonical, o Google pode indexar versões duplicadas da mesma página (com/sem www, com/sem parâmetros de UTM), dividindo a autoridade e prejudicando o ranqueamento.',
    como_resolver: canonicalOk
      ? undefined
      : 'Adicionar no <head>: <link rel="canonical" href="https://seusite.com/url-desta-pagina">. Em e-commerces com filtros de URL, o canonical deve apontar para a versão principal do produto.',
    peso: 'medio',
  })

  // 12. H2
  const h2Count = $('h2').length
  const h2Ok = h2Count > 0
  checks.push({
    nome: 'Estrutura de Títulos (H2)',
    passou: h2Ok,
    descricao: h2Ok
      ? `${h2Count} subtítulo(s) H2 encontrado(s) — estrutura de conteúdo presente.`
      : 'Nenhuma tag H2 encontrada.',
    impacto_negocio: h2Ok
      ? undefined
      : 'Sem subtítulos, o conteúdo fica em um bloco único difícil de escanear. Usuários e mecanismos de busca precisam de hierarquia para identificar seções relevantes.',
    como_resolver: h2Ok
      ? undefined
      : 'Estruturar o conteúdo com subtítulos <h2> para cada seção principal. Seguir hierarquia: um H1 > vários H2 > H3 quando necessário. Cada H2 deve incluir variações da palavra-chave principal quando natural.',
    peso: 'medio',
  })

  // 13. Links funcionais
  const linksVazios = $('a').filter((_, el) => {
    const href = $(el).attr('href') ?? ''
    return !href || href === '#' || href === 'javascript:void(0)'
  }).length
  const linksOk = linksVazios === 0
  checks.push({
    nome: 'Links com Destino Definido',
    passou: linksOk,
    descricao: linksOk
      ? 'Todos os links têm destino válido.'
      : `${linksVazios} link(s) sem destino ou com href="#".`,
    impacto_negocio: linksOk
      ? undefined
      : 'Links quebrados ou sem destino frustram usuários que tentam navegar e são sinal negativo de qualidade para o Google.',
    como_resolver: linksOk
      ? undefined
      : 'Auditar todos os <a> e definir href correto ou remover o elemento. Para botões que executam ações via JavaScript, usar <button> em vez de <a href="#">.',
    peso: 'medio',
  })

  // 14. Meta robots
  const robots = $('meta[name="robots"]').attr('content') ?? ''
  const bloqueando = robots.includes('noindex') || robots.includes('nofollow')
  const robotsOk = !bloqueando
  checks.push({
    nome: 'Página Indexável (Meta Robots)',
    passou: robotsOk,
    descricao: bloqueando
      ? `ATENÇÃO: meta robots configurada como "${robots}" — página bloqueada para indexação.`
      : 'Página não bloqueada para indexação pelos mecanismos de busca.',
    impacto_negocio: robotsOk
      ? undefined
      : 'Esta configuração torna a página invisível no Google. Nenhum esforço de SEO ou conteúdo terá efeito enquanto isso estiver ativo.',
    como_resolver: robotsOk
      ? undefined
      : 'Remover ou alterar a meta tag: <meta name="robots" content="index, follow">. Verificar também se o arquivo robots.txt não está bloqueando a URL.',
    peso: 'critico',
  })

  // 15. Charset
  const charset =
    $('meta[charset]').attr('charset') ??
    $('meta[http-equiv="Content-Type"]').attr('content') ?? ''
  const charsetOk = !!charset
  checks.push({
    nome: 'Charset (Codificação de Texto)',
    passou: charsetOk,
    descricao: charsetOk
      ? `Charset definido: ${charset}`
      : 'Charset não declarado no HTML.',
    impacto_negocio: charsetOk
      ? undefined
      : 'Sem charset declarado, caracteres especiais do português (ã, ç, é, etc.) podem aparecer corrompidos para alguns usuários, prejudicando credibilidade e experiência.',
    como_resolver: charsetOk
      ? undefined
      : 'Adicionar como primeira tag no <head>: <meta charset="UTF-8">. Deve ser declarado antes de qualquer outro elemento para garantir interpretação correta.',
    peso: 'medio',
  })

  // Score ponderado
  const pesos = { critico: 3, alto: 2, medio: 1 }
  const totalPossivel = checks.reduce((acc, c) => acc + pesos[c.peso], 0)
  const totalObtido = checks.filter(c => c.passou).reduce((acc, c) => acc + pesos[c.peso], 0)
  const score = Math.round((totalObtido / totalPossivel) * 100)

  return { score, checks }
}
