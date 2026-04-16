export type TipoPagina = 'homepage' | 'produto' | 'landing_page'

export interface LeadData {
  nome: string
  telefone: string
  nicho: string
  faturamento: string
}

export interface PageSpeedResult {
  mobile_score: number
  lcp: string
  cls: string
  fcp: string
  ttfb: string
  speed_index: string
  screenshot?: string
  screenshotMime?: string
}

export interface CodigoCheck {
  nome: string
  passou: boolean
  descricao: string
  impacto_negocio?: string
  como_resolver?: string
  peso: 'critico' | 'alto' | 'medio'
}

export interface CodigoResult {
  score: number
  checks: CodigoCheck[]
}

export interface CroProblema {
  titulo: string
  impacto: string   // o que esse problema está custando em conversões
  categoria: 'design' | 'copy' | 'confianca' | 'mobile' | 'ux' | 'velocidade'
}

export interface CroMelhoria {
  titulo: string
  impacto: string   // o que muda no resultado do negócio com essa melhoria
  prioridade: 'alta' | 'media' | 'baixa'
  categoria: 'design' | 'copy' | 'confianca' | 'mobile' | 'ux' | 'velocidade'
}

export interface CroResult {
  score_geral: number
  score_proposta_valor: number
  score_confianca: number
  score_mobile: number
  tipo_pagina: 'home' | 'produto' | 'outra'
  problemas_criticos: CroProblema[]
  melhorias: CroMelhoria[]
  resumo_executivo: string
  perfil_servico: 'cro' | 'landing_page' | 'ecommerce' | 'site_institucional' | 'otimizacao_tecnica'
}

export interface AnaliseResult {
  url: string
  screenshot?: string
  screenshotMime?: string
  pagespeed: PageSpeedResult
  codigo: CodigoResult
  cro: CroResult
  score_final: number
  analisado_em: string
}
