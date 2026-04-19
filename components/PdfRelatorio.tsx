'use client'

import { Document, Page, Text, View, StyleSheet, Svg, Path, Rect } from '@react-pdf/renderer'
import type { AnaliseResult } from '@/lib/types'

// ── Paleta Turbo ─────────────────────────────────────────────────────────────
const COLORS = {
  bg: '#0B0726',
  card: '#100C35',
  border: '#1C202B',
  primary: '#415FF2',
  accent: '#37D3A4',
  danger: '#E84A5F',
  warning: '#F5A623',
  white: '#FFFFFF',
  muted: '#9398A1',
  mutedDark: '#6D727C',
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.bg,
    color: COLORS.white,
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    letterSpacing: 1.5,
  },
  logoSub: {
    fontSize: 8,
    color: COLORS.accent,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerLabel: {
    fontSize: 7,
    color: COLORS.mutedDark,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  headerDate: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },
  // URL
  urlBox: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  urlLabel: {
    fontSize: 7,
    color: COLORS.mutedDark,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  urlValue: {
    fontSize: 11,
    color: COLORS.white,
    fontFamily: 'Helvetica-Bold',
  },
  // Score
  scoreRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 22,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  scoreCardMain: {
    flex: 1.4,
  },
  scoreBig: {
    fontSize: 44,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
  },
  scoreLabel: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 4,
    textAlign: 'center',
  },
  scoreCaption: {
    fontSize: 9,
    color: COLORS.white,
    fontFamily: 'Helvetica-Bold',
    marginTop: 6,
    textAlign: 'center',
  },
  // Section
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    marginBottom: 10,
  },
  sectionSub: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 10,
    lineHeight: 1.5,
  },
  // Resumo
  resumoBox: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 22,
  },
  resumoText: {
    fontSize: 10,
    color: COLORS.white,
    lineHeight: 1.6,
  },
  // Item (problema/melhoria)
  item: {
    backgroundColor: COLORS.card,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  itemProblema: {
    borderLeftColor: COLORS.danger,
  },
  itemMelhoriaAlta: {
    borderLeftColor: COLORS.accent,
  },
  itemMelhoriaMedia: {
    borderLeftColor: COLORS.warning,
  },
  itemTitulo: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  itemImpacto: {
    fontSize: 9,
    color: COLORS.muted,
    lineHeight: 1.5,
  },
  // Badge
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  badge: {
    fontSize: 7,
    color: COLORS.muted,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 6,
    paddingRight: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  // Tabela de velocidade
  tableRow: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  tableCellLabel: {
    flex: 1.5,
    fontSize: 9,
    color: COLORS.white,
    fontFamily: 'Helvetica-Bold',
  },
  tableCellDesc: {
    flex: 3,
    fontSize: 8,
    color: COLORS.muted,
    lineHeight: 1.4,
  },
  tableCellValue: {
    flex: 1,
    fontSize: 10,
    color: COLORS.white,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  // CTA final
  ctaBox: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: 18,
    marginTop: 28,
  },
  ctaLabel: {
    fontSize: 8,
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  ctaTitulo: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  ctaDesc: {
    fontSize: 9,
    color: COLORS.muted,
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: COLORS.mutedDark,
  },
  footerStrong: {
    fontSize: 7,
    color: COLORS.accent,
    fontFamily: 'Helvetica-Bold',
  },
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 70) return COLORS.accent
  if (score >= 40) return COLORS.warning
  return COLORS.danger
}

function scoreCaption(score: number): string {
  if (score >= 80) return 'Excelente'
  if (score >= 60) return 'Bom, com ajustes'
  if (score >= 40) return 'Precisa melhorar'
  return 'Crítico'
}

const METRICAS_EXPLICACAO = {
  lcp: {
    nome: 'Tempo até a imagem principal aparecer',
    desc: 'Quanto tempo o cliente espera para ver o que importa. Acima de 2,5s o cliente começa a desistir.',
  },
  fcp: {
    nome: 'Tempo até a página começar a aparecer',
    desc: 'Quando o cliente vê algo na tela pela primeira vez. Acima de 1,8s parece que o site travou.',
  },
  cls: {
    nome: 'Layout estável enquanto carrega',
    desc: 'Se os elementos ficam pulando na tela durante o carregamento. Muito pulo irrita o cliente.',
  },
  ttfb: {
    nome: 'Tempo de resposta do servidor',
    desc: 'Quanto o servidor demora para responder. Lento aqui deixa tudo lento depois.',
  },
  speed_index: {
    nome: 'Velocidade geral de carregamento',
    desc: 'Um índice que resume quão rápido a página se monta aos olhos do visitante.',
  },
}

// ── Componente principal ─────────────────────────────────────────────────────

export function PdfRelatorio({ result }: { result: AnaliseResult }) {
  const dataFormatada = new Date(result.analisado_em).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <Document
      title={`Diagnóstico CRO — ${result.url}`}
      author="Turbo Partners"
      subject="Análise de conversão"
    >
      {/* ═══ PÁGINA 1: CAPA + SCORE + RESUMO ══════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Svg width="24" height="24" viewBox="0 0 24 24">
                <Rect x="0" y="0" width="24" height="24" rx="6" fill={COLORS.primary} />
                <Path d="M6 8 L12 5 L18 8 L18 16 L12 19 L6 16 Z" fill={COLORS.accent} />
              </Svg>
              <View>
                <Text style={styles.logoText}>TURBO PARTNERS</Text>
                <Text style={styles.logoSub}>DIAGNÓSTICO DE CONVERSÃO</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerLabel}>Análise gerada em</Text>
            <Text style={styles.headerDate}>{dataFormatada}</Text>
          </View>
        </View>

        {/* URL */}
        <View style={styles.urlBox}>
          <Text style={styles.urlLabel}>Site analisado</Text>
          <Text style={styles.urlValue}>{result.url}</Text>
        </View>

        {/* Scores */}
        <View style={styles.scoreRow}>
          <View style={[styles.scoreCard, styles.scoreCardMain, { borderColor: scoreColor(result.score_final) }]}>
            <Text style={[styles.scoreBig, { color: scoreColor(result.score_final) }]}>
              {result.score_final}
            </Text>
            <Text style={styles.scoreLabel}>Nota geral</Text>
            <Text style={[styles.scoreCaption, { color: scoreColor(result.score_final) }]}>
              {scoreCaption(result.score_final)}
            </Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={[styles.scoreBig, { fontSize: 32, color: scoreColor(result.cro.score_geral) }]}>
              {result.cro.score_geral}
            </Text>
            <Text style={styles.scoreLabel}>Conversão</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={[styles.scoreBig, { fontSize: 32, color: scoreColor(result.pagespeed.mobile_score) }]}>
              {result.pagespeed.mobile_score}
            </Text>
            <Text style={styles.scoreLabel}>Velocidade</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={[styles.scoreBig, { fontSize: 32, color: scoreColor(result.codigo.score) }]}>
              {result.codigo.score}
            </Text>
            <Text style={styles.scoreLabel}>Estrutura</Text>
          </View>
        </View>

        {/* Resumo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo</Text>
          <View style={styles.resumoBox}>
            <Text style={styles.resumoText}>{result.cro.resumo_executivo}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Turbo Partners · turbopartners.com.br</Text>
          <Text style={styles.footerStrong}>Página 1</Text>
        </View>
      </Page>

      {/* ═══ PÁGINA 2: PROBLEMAS + MELHORIAS ══════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logoText}>TURBO PARTNERS</Text>
          <Text style={styles.headerDate}>{result.url}</Text>
        </View>

        {/* Problemas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>O que está custando vendas agora</Text>
          <Text style={styles.sectionSub}>
            Os 3 pontos mais críticos identificados na análise. Resolver esses primeiro costuma ter o maior impacto imediato nas vendas.
          </Text>
          {result.cro.problemas_criticos.map((p, i) => (
            <View key={i} style={[styles.item, styles.itemProblema]} wrap={false}>
              <Text style={styles.itemTitulo}>{i + 1}. {p.titulo}</Text>
              <Text style={styles.itemImpacto}>{p.impacto}</Text>
              <View style={styles.badgeRow}>
                <Text style={styles.badge}>{p.categoria}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Melhorias */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Oportunidades para aumentar vendas</Text>
          <Text style={styles.sectionSub}>
            Mudanças que aumentam a chance do visitante virar cliente.
          </Text>
          {result.cro.melhorias.map((m, i) => {
            const style = m.prioridade === 'alta' ? styles.itemMelhoriaAlta
              : m.prioridade === 'media' ? styles.itemMelhoriaMedia
              : styles.item
            return (
              <View key={i} style={[styles.item, style]} wrap={false}>
                <Text style={styles.itemTitulo}>{i + 1}. {m.titulo}</Text>
                <Text style={styles.itemImpacto}>{m.impacto}</Text>
                <View style={styles.badgeRow}>
                  <Text style={styles.badge}>Prioridade {m.prioridade}</Text>
                  <Text style={styles.badge}>{m.categoria}</Text>
                </View>
              </View>
            )
          })}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Turbo Partners · turbopartners.com.br</Text>
          <Text style={styles.footerStrong}>Página 2</Text>
        </View>
      </Page>

      {/* ═══ PÁGINA 3: VELOCIDADE + CTA ═══════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logoText}>TURBO PARTNERS</Text>
          <Text style={styles.headerDate}>{result.url}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Como está a velocidade do site</Text>
          <Text style={styles.sectionSub}>
            Cada segundo a mais de espera diminui as vendas. Veja o tempo atual e o que cada item significa na prática.
          </Text>

          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>{METRICAS_EXPLICACAO.lcp.nome}</Text>
            <Text style={styles.tableCellDesc}>{METRICAS_EXPLICACAO.lcp.desc}</Text>
            <Text style={styles.tableCellValue}>{result.pagespeed.lcp}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>{METRICAS_EXPLICACAO.fcp.nome}</Text>
            <Text style={styles.tableCellDesc}>{METRICAS_EXPLICACAO.fcp.desc}</Text>
            <Text style={styles.tableCellValue}>{result.pagespeed.fcp}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>{METRICAS_EXPLICACAO.cls.nome}</Text>
            <Text style={styles.tableCellDesc}>{METRICAS_EXPLICACAO.cls.desc}</Text>
            <Text style={styles.tableCellValue}>{result.pagespeed.cls}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>{METRICAS_EXPLICACAO.ttfb.nome}</Text>
            <Text style={styles.tableCellDesc}>{METRICAS_EXPLICACAO.ttfb.desc}</Text>
            <Text style={styles.tableCellValue}>{result.pagespeed.ttfb}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellLabel}>{METRICAS_EXPLICACAO.speed_index.nome}</Text>
            <Text style={styles.tableCellDesc}>{METRICAS_EXPLICACAO.speed_index.desc}</Text>
            <Text style={styles.tableCellValue}>{result.pagespeed.speed_index}</Text>
          </View>
        </View>

        {/* CTA final */}
        <View style={styles.ctaBox}>
          <Text style={styles.ctaLabel}>Quer ver tudo isso implementado?</Text>
          <Text style={styles.ctaTitulo}>Fale com um especialista Turbo Partners</Text>
          <Text style={styles.ctaDesc}>
            A Turbo ajuda marcas brasileiras a crescer resolvendo exatamente os pontos deste diagnóstico. Agende uma conversa em turbopartners.com.br.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Turbo Partners · turbopartners.com.br</Text>
          <Text style={styles.footerStrong}>Página 3</Text>
        </View>
      </Page>
    </Document>
  )
}
