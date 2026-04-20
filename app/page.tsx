'use client'

import { useState, useEffect, useRef } from 'react'
import type { AnaliseResult, CroMelhoria, CroProblema, CodigoCheck, TipoPagina } from '@/lib/types'
import { pdf } from '@react-pdf/renderer'
import { PdfRelatorio } from '@/components/PdfRelatorio'

type View = 'input' | 'loading' | 'results'
type Tab = 'design' | 'codigo' | 'speed'

// Chips macro: 5 etapas visíveis no topo do loading
const LOADING_STEPS = [
  { label: 'Acessando o site', icon: '🌐', macro: 'acesso' as const },
  { label: 'Medindo desempenho', icon: '⚡', macro: 'desempenho' as const },
  { label: 'Checando estrutura', icon: '🔍', macro: 'estrutura' as const },
  { label: 'Capturando visual', icon: '📸', macro: 'visual' as const },
  { label: 'Análise por IA', icon: '🤖', macro: 'ia' as const },
]

type MacroFase = 'acesso' | 'desempenho' | 'estrutura' | 'visual' | 'ia'

// Microfases narrativas — avançam monotonicamente até a última (sem ciclar).
// ~17 fases × ~3.5s ≈ 60s, casando com o tempo máximo do /api/analisar.
// Se a análise terminar antes, o fluxo é interrompido e pula para os resultados.
// Se passar dos 60s, fica travado na última fase ("Finalizando") em vez de reiniciar.
const AI_INSIGHTS: { icon: string; text: string; macro: MacroFase }[] = [
  // Fase 1: Acesso
  { icon: '🌐', text: 'Acessando o site...', macro: 'acesso' },
  { icon: '📄', text: 'Carregando a página por inteiro...', macro: 'acesso' },
  // Fase 2: Desempenho (PageSpeed)
  { icon: '⚡', text: 'Medindo a velocidade no celular...', macro: 'desempenho' },
  { icon: '⏱️', text: 'Avaliando o tempo de carregamento...', macro: 'desempenho' },
  { icon: '📡', text: 'Verificando a resposta do servidor...', macro: 'desempenho' },
  // Fase 3: Estrutura (código/SEO)
  { icon: '🏗️', text: 'Analisando a estrutura do código...', macro: 'estrutura' },
  { icon: '🔧', text: 'Verificando boas práticas e tags...', macro: 'estrutura' },
  { icon: '📱', text: 'Checando experiência no mobile...', macro: 'estrutura' },
  // Fase 4: Visual (screenshot)
  { icon: '📸', text: 'Capturando print da página...', macro: 'visual' },
  { icon: '🖼️', text: 'Preparando a imagem para análise...', macro: 'visual' },
  // Fase 5: IA (CRO)
  { icon: '🎯', text: 'Analisando a primeira dobra...', macro: 'ia' },
  { icon: '💡', text: 'Avaliando proposta de valor e clareza...', macro: 'ia' },
  { icon: '🛡️', text: 'Verificando prova social e confiança...', macro: 'ia' },
  { icon: '🛒', text: 'Revisando o botão principal de compra...', macro: 'ia' },
  { icon: '🔎', text: 'Identificando gaps de conversão...', macro: 'ia' },
  { icon: '✨', text: 'Gerando recomendações personalizadas...', macro: 'ia' },
  { icon: '🧠', text: 'Finalizando o diagnóstico...', macro: 'ia' },
]

// Mensagens que aparecem quando a análise demora mais que o esperado (site lento)
const SLOW_SITE_HINTS = [
  { icon: '⏳', text: 'O site está demorando para responder — isso já é um dado importante. Velocidade impacta diretamente a conversão.' },
  { icon: '📉', text: 'Cada segundo extra de carregamento reduz a conversão em até 7%. Estamos medindo isso com precisão.' },
  { icon: '🔎', text: 'Site lento detectado. Isso já aparecerá como ponto crítico no seu diagnóstico — vale a espera.' },
  { icon: '📡', text: 'Aguardando resposta do servidor... A demora aqui é, ela mesma, um problema de CRO.' },
]

// ── Helpers de score ──────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 80) return '#37D3A4'
  if (s >= 60) return '#F59E0B'
  if (s >= 40) return '#F97316'
  return '#EF4444'
}
function scoreBg(s: number) {
  if (s >= 80) return 'border-emerald-500/25 bg-emerald-500/8'
  if (s >= 60) return 'border-yellow-500/25 bg-yellow-500/8'
  if (s >= 40) return 'border-orange-500/25 bg-orange-500/8'
  return 'border-red-500/25 bg-red-500/8'
}
function scoreEmoji(s: number) {
  if (s >= 80) return '🟢'
  if (s >= 60) return '🟡'
  if (s >= 40) return '🟠'
  return '🔴'
}
function scoreFrase(s: number) {
  if (s >= 80) return 'Seu site está em boa forma'
  if (s >= 60) return 'Seu site tem espaço para melhorar'
  if (s >= 40) return 'Seu site está perdendo clientes'
  return 'Seu site está afastando clientes'
}

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 96, strokeWidth = 9 }: { score: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1C202B" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={scoreColor(score)} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  )
}

// ── Card de módulo (header do resultado) ──────────────────────────────────────
function ModuleScore({ icon, label, sublabel, score, onClick, active }: {
  icon: string; label: string; sublabel: string; score: number; onClick: () => void; active: boolean
}) {
  const color = scoreColor(score)
  return (
    <button onClick={onClick} className="flex-1 min-w-0 group relative cursor-pointer text-left">
      <div
        className="flex items-center gap-3 sm:gap-4 rounded-2xl border px-4 py-3.5 transition-all duration-200"
        style={{
          borderColor: active ? color + '60' : '#1C202B',
          background: active ? color + '12' : 'transparent',
          boxShadow: active ? `0 0 0 1px ${color}30, 0 4px 24px ${color}10` : undefined,
        }}
      >
        {/* Ring */}
        <div className="relative inline-flex flex-shrink-0">
          <ScoreRing score={score} size={52} strokeWidth={5} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-white">{score}</span>
        </div>
        {/* Labels */}
        <div className="text-left flex-1 min-w-0">
          <p className={`text-xs font-extrabold leading-tight truncate transition-colors ${active ? 'text-white' : 'text-[#9398A1] group-hover:text-white'}`}>
            {label}
          </p>
          <p className="text-xs text-[#6D727C] mt-0.5 leading-tight truncate">{sublabel}</p>
          {/* "Ver análise" só aparece nos inativos */}
          {!active && (
            <p className="text-xs font-bold mt-1 transition-all duration-200 group-hover:translate-x-0.5"
              style={{ color: color + 'CC' }}>
              Ver análise →
            </p>
          )}
        </div>
        {/* Check ativo */}
        {active && (
          <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
            style={{ background: color + '25', color }}>✓</span>
        )}
      </div>
    </button>
  )
}

// ── Problema crítico ──────────────────────────────────────────────────────────
function ProblemaCard({ p, i }: { p: CroProblema; i: number }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 flex items-start gap-4 px-5 py-4">
      <span className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm leading-snug">{p.titulo}</p>
        <p className="text-xs text-red-400 mt-1.5 leading-relaxed">{p.impacto}</p>
      </div>
    </div>
  )
}

// ── Melhoria ──────────────────────────────────────────────────────────────────
function MelhoriaCard({ m, i }: { m: CroMelhoria; i: number }) {
  return (
    <div className="rounded-2xl border border-[#1C202B] bg-[#100C35] flex items-start gap-4 px-5 py-4">
      <span className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-[#1D1E6C] text-[#37D3A4] text-xs font-bold flex items-center justify-center">{i + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.prioridade === 'alta' ? 'bg-red-500/15 text-red-400' : m.prioridade === 'media' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-green-500/15 text-green-400'}`}>
            {m.prioridade === 'alta' ? '🔴 Alta' : m.prioridade === 'media' ? '🟡 Média' : '🟢 Contínua'}
          </span>
        </div>
        <p className="font-bold text-white text-sm leading-snug">{m.titulo}</p>
        <p className="text-xs text-[#9398A1] mt-1.5 leading-relaxed">{m.impacto}</p>
      </div>
    </div>
  )
}

// ── Check de código ───────────────────────────────────────────────────────────
function CodigoRow({ c }: { c: CodigoCheck }) {
  const [open, setOpen] = useState(false)
  const temDetalhe = !c.passou && (c.impacto_negocio || c.como_resolver)
  return (
    <div className={`rounded-xl border overflow-hidden ${c.passou ? 'border-emerald-500/15 bg-emerald-500/5' : 'border-red-400/20 bg-red-400/5'}`}>
      <button onClick={() => temDetalhe && setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${temDetalhe ? 'hover:bg-white/5 transition-colors' : 'cursor-default'}`}>
        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${c.passou ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {c.passou ? '✓' : '✗'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{c.nome}</p>
          <p className="text-xs text-[#9398A1] mt-0.5 leading-relaxed">{c.descricao}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`hidden sm:inline-block text-xs font-medium px-2 py-0.5 rounded-full ${c.peso === 'critico' ? 'bg-red-500/15 text-red-400' : c.peso === 'alto' ? 'bg-orange-500/15 text-orange-400' : 'bg-[#1C202B] text-[#9398A1]'}`}>
            {c.peso === 'critico' ? 'Urgente' : c.peso === 'alto' ? 'Importante' : 'Melhoria'}
          </span>
          {temDetalhe && <span className="text-[#6D727C] text-xs">{open ? '▲' : '▼'}</span>}
        </div>
      </button>
      {open && temDetalhe && (
        <div className="border-t border-red-400/10 px-4 py-3 space-y-2">
          {c.impacto_negocio && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/15 px-3 py-2.5">
              <p className="text-xs font-bold text-red-400 mb-1">⚠ Por que isso importa</p>
              <p className="text-xs text-white/75 leading-relaxed">{c.impacto_negocio}</p>
            </div>
          )}
          {c.como_resolver && (
            <div className="rounded-lg bg-[#0B0726] border border-[#1C202B] px-3 py-2.5">
              <p className="text-xs font-bold text-[#37D3A4] mb-1">✓ Como resolver</p>
              <p className="text-xs text-white/75 leading-relaxed">{c.como_resolver}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Métrica de velocidade ─────────────────────────────────────────────────────
function VelocidadeMetrica({ nome, sigla, valor, meta, bom, oQueSig }: {
  nome: string; sigla: string; valor: string; meta: string; bom: boolean; oQueSig: string
}) {
  return (
    <div className={`rounded-2xl border p-5 ${bom ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-400/20 bg-red-400/5'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-bold text-white leading-tight">{nome}</p>
          <p className="text-xs text-[#6D727C] mt-0.5">{sigla}</p>
        </div>
        <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${bom ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {bom ? '✓ Bom' : '✗ Lento'}
        </span>
      </div>
      <p className="text-3xl font-extrabold text-white">{valor}</p>
      <p className="text-xs text-[#6D727C] mt-1">Meta: {meta}</p>
      {!bom && <p className="text-xs text-[#9398A1] mt-3 pt-3 border-t border-white/5 leading-relaxed">{oQueSig}</p>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function Home() {
  const [view, setView] = useState<View>('input')
  const [activeTab, setActiveTab] = useState<Tab>('design')
  const [url, setUrl] = useState('')
  const [step, setStep] = useState(0)
  const [aiMsg, setAiMsg] = useState(0)
  const [elapsed, setElapsed] = useState(0) // segundos desde início do loading
  const [result, setResult] = useState<AnaliseResult | null>(null)
  const [error, setError] = useState('')
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const aiTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  // Popup de tipo de página
  const [showTipoPopup, setShowTipoPopup] = useState(false)

  // Export de PDF
  const [exportandoPdf, setExportandoPdf] = useState(false)

  useEffect(() => {
    if (view === 'loading') {
      setStep(0)
      setAiMsg(0)
      setElapsed(0)

      // Contador de tempo real (segundos)
      elapsedTimer.current = setInterval(() => {
        setElapsed(e => e + 1)
      }, 1000)

      // Avança 1 microfase a cada 3.5s, monotonicamente.
      // Ao chegar na última, FICA parado ali (sem voltar pro 1) — evita o visual de bug.
      // Quando a análise real termina (view muda pra 'results'), o interval é limpo.
      aiTimer.current = setInterval(() => {
        setAiMsg(m => (m >= AI_INSIGHTS.length - 1 ? m : m + 1))
      }, 3500)
    } else {
      if (timer.current) clearInterval(timer.current)
      if (aiTimer.current) clearInterval(aiTimer.current)
      if (elapsedTimer.current) clearInterval(elapsedTimer.current)
    }
    return () => {
      if (timer.current) clearInterval(timer.current)
      if (aiTimer.current) clearInterval(aiTimer.current)
      if (elapsedTimer.current) clearInterval(elapsedTimer.current)
    }
  }, [view])

  // O chip macro ativo é derivado da microfase atual (AI_INSIGHTS[aiMsg].macro).
  // Quando aiMsg chega na última (IA finalizando), a macro "ia" está ativa desde antes.
  const macroAtiva: MacroFase = AI_INSIGHTS[aiMsg]?.macro ?? 'acesso'
  const macroAtivaIndex = LOADING_STEPS.findIndex(s => s.macro === macroAtiva)

  const [retryCount, setRetryCount] = useState(0)
  const MAX_RETRIES = 2

  async function tentarAnalise(urlToAnalyze: string, tipo: TipoPagina): Promise<AnaliseResult> {
    const res = await fetch('/api/analisar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlToAnalyze, tipo_pagina: tipo }),
    })
    const text = await res.text()
    let data: AnaliseResult & { error?: string }
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error('TIMEOUT')
    }
    if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
    return data
  }

  // Quando o usuário clica no botão do formulário, abre o popup de tipo
  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setError('')
    setShowTipoPopup(true)
  }

  // Quando o usuário seleciona o tipo, inicia a análise
  async function iniciarAnalise(tipo: TipoPagina) {
    setShowTipoPopup(false)
    setRetryCount(0)
    setActiveTab('design')
    setView('loading')

    const trimmedUrl = url.trim()
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          setRetryCount(attempt)
          setStep(0)
          setAiMsg(0)
        }
        const data = await tentarAnalise(trimmedUrl, tipo)
        setResult(data)
        setView('results')
        topRef.current?.scrollIntoView({ behavior: 'smooth' })
        return
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error('Erro desconhecido')
        if (lastError.message !== 'TIMEOUT' || attempt === MAX_RETRIES) break
      }
    }

    const msg = lastError?.message === 'TIMEOUT'
      ? 'A análise não conseguiu ser concluída após várias tentativas. O site pode estar demorando para responder. Tente novamente em alguns minutos.'
      : lastError?.message ?? 'Não conseguimos analisar esse endereço. Tente novamente.'
    setError(msg)
    setRetryCount(0)
    setView('input')
  }

  // Exporta o relatório atual em PDF com branding Turbo
  async function baixarPdf() {
    if (!result || exportandoPdf) return
    setExportandoPdf(true)
    try {
      const blob = await pdf(<PdfRelatorio result={result} />).toBlob()
      const urlBlob = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = urlBlob
      const dominio = (() => { try { return new URL(result.url).hostname.replace(/^www\./, '') } catch { return 'site' } })()
      const data = new Date(result.analisado_em).toISOString().slice(0, 10)
      a.download = `diagnostico-turbo-${dominio}-${data}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(urlBlob)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Não foi possível gerar o PDF. Tente novamente em alguns segundos.')
    } finally {
      setExportandoPdf(false)
    }
  }

  function novaAnalise() {
    setResult(null)
    setUrl('')
    setView('input')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ════ INPUT / LANDING PAGE ═════════════════════════════════════════════════
  if (view === 'input') return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0B0726]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <img src="/logo-turbo.svg" alt="Turbo Partners" className="h-8 sm:h-12" />
          <a href="https://turbopartners.com.br" target="_blank" rel="noreferrer"
            className="rounded-xl border border-[#415FF2]/40 hover:border-[#415FF2] hover:bg-[#415FF2]/10 text-white text-xs font-bold px-3 sm:px-4 py-2 transition-all whitespace-nowrap">
            <span className="hidden sm:inline">Falar com especialista</span>
            <span className="sm:hidden">Falar →</span>
          </a>
        </div>
      </header>

      {/* ── HERO ── */}
      <section id="diagnostico" className="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-10 pb-10 sm:pt-20 sm:pb-16 overflow-hidden">
        {/* Background glows */}
        <div className="glow-orb absolute top-[-120px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#415FF2]/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] rounded-full bg-[#37D3A4]/6 blur-[100px] pointer-events-none" />

        {/* Badge */}
        <div className="relative mb-7 inline-flex items-center gap-2.5 rounded-full border border-[#37D3A4]/25 bg-[#37D3A4]/8 px-5 py-2">
          <span className="w-2 h-2 rounded-full bg-[#37D3A4] animate-pulse flex-shrink-0" />
          <span className="text-xs font-bold text-[#37D3A4] tracking-wider uppercase">Diagnóstico gratuito por IA</span>
        </div>

        {/* Headline */}
        <h1 className="relative text-center font-extrabold leading-[1.05] tracking-tight max-w-4xl">
          <span className="block text-white" style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)' }}>
            Seu site pode estar perdendo clientes
          </span>
          <span className="block gradient-text pb-[0.15em]" style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)' }}>
            agora mesmo.
          </span>
        </h1>

        <p className="relative mt-5 text-[#9398A1] text-center max-w-xl leading-relaxed" style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)' }}>
          Seus clientes podem estar saindo sem você saber.{' '}
          <span className="text-white font-semibold">Cole a URL e descubra o que está afastando clientes, por que carrega devagar e o que fazer para vender mais.</span>
        </p>

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="relative mt-9 w-full max-w-2xl">
          <div className="rounded-2xl border border-[#1C202B] bg-[#100C35]/80 backdrop-blur p-2 flex flex-col sm:flex-row gap-2 shadow-2xl shadow-black/40">
            <div className="flex-1 flex items-center gap-3 px-4">
              <svg className="w-5 h-5 text-[#6D727C] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
              <input
                type="text" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="www.seusite.com.br"
                className="flex-1 bg-transparent text-white placeholder-[#6D727C] py-3 text-base outline-none"
                autoFocus
              />
            </div>
            <button type="submit"
              className="rounded-xl bg-[#37D3A4] hover:bg-[#2BB88E] active:scale-[0.98] text-[#0B0726] font-extrabold px-8 py-3.5 text-base transition-all whitespace-nowrap shadow-lg shadow-[#37D3A4]/25 flex-shrink-0">
              Ver diagnóstico grátis →
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-400 text-center">{error}</p>}
          <p className="mt-3 text-xs text-[#6D727C] text-center">
            Funciona com qualquer site: home, e-commerce, landing page · 100% gratuito · Sem cadastro
          </p>
        </form>

        {/* Stats row */}
        <div className="relative mt-10 flex flex-wrap items-center justify-center gap-8">
          {[
            { num: '350+', label: 'empresas aceleradas' },
            { num: 'R$ 225M+', label: 'gerados para clientes' },
            { num: '87%', label: 'aumentaram a conversão' },
          ].map(({ num, label }, i) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <span className="text-2xl font-extrabold text-white">{num}</span>
              <span className="text-xs text-[#6D727C]">{label}</span>
            </div>
          ))}
        </div>
      </section>


      {/* ── O QUE O DIAGNÓSTICO REVELA ── */}
      <section className="px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs text-[#415FF2] font-bold uppercase tracking-widest mb-3">O diagnóstico</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Três perguntas que seu site <br className="hidden sm:block" />
              <span className="gradient-text">precisa responder bem</span>
            </h2>
            <p className="mt-4 text-[#9398A1] max-w-xl mx-auto text-sm leading-relaxed">
              A maioria dos sites falha em pelo menos uma dessas três áreas. Nossa IA verifica as três ao mesmo tempo e mostra exatamente o que precisa mudar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                num: '01',
                icon: '🎯',
                color: '#415FF2',
                titulo: 'Está convencendo o visitante?',
                desc: 'Nossa IA lê sua página como um cliente que acabou de chegar: a mensagem está clara? O CTA está visível? O site passa confiança o suficiente para alguém comprar?',
                stat: '87% dos clientes da Turbo aumentaram a conversão após ajustes de CRO',
                statColor: '#415FF2',
              },
              {
                num: '02',
                icon: '⚡',
                color: '#37D3A4',
                titulo: 'Está carregando rápido o suficiente?',
                desc: 'Medimos LCP, CLS, FCP e velocidade do servidor no celular, onde estão 60%+ dos seus clientes. Sites lentos perdem a maioria dos visitantes antes de carregar.',
                stat: 'Cada 1 segundo a mais no carregamento reduz a conversão em até 7%',
                statColor: '#37D3A4',
              },
              {
                num: '03',
                icon: '🔧',
                color: '#F59E0B',
                titulo: 'Está bem construído por dentro?',
                desc: '15 verificações técnicas: título, meta descrição, H1, imagens otimizadas, canonical, schema, Open Graph, HTTPS, velocidade de servidor e mais.',
                stat: '79% dos clientes da Turbo tiveram incremento no ticket médio após ajustes técnicos',
                statColor: '#F59E0B',
              },
            ].map(f => (
              <div key={f.num} className="relative rounded-2xl border border-[#1C202B] bg-[#100C35] p-7 flex flex-col overflow-hidden group hover:border-[#1C202B]/80 transition-all hover:-translate-y-1">
                <div className="absolute top-0 right-0 text-[80px] font-black leading-none opacity-5 select-none pointer-events-none pr-4 pt-2" style={{ color: f.color }}>
                  {f.num}
                </div>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-5 flex-shrink-0" style={{ background: `${f.color}18` }}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-white text-base leading-snug mb-3">{f.titulo}</h3>
                <p className="text-sm text-[#9398A1] leading-relaxed flex-1">{f.desc}</p>
                <div className="mt-5 pt-4 border-t border-[#1C202B]">
                  <p className="text-xs font-semibold leading-snug" style={{ color: f.color }}>↑ {f.stat}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="px-4 sm:px-6 py-10 sm:py-16 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs text-[#37D3A4] font-bold uppercase tracking-widest mb-3">Como funciona</p>
            <h2 className="text-3xl font-extrabold text-white">Diagnóstico completo em 3 passos</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                step: '1',
                titulo: 'Cole a URL do seu site',
                desc: 'Qualquer página funciona: home, produto, loja, landing page. Não precisa instalar nada nem criar conta.',
                icon: '🔗',
              },
              {
                step: '2',
                titulo: 'Aguarde ~60 segundos',
                desc: 'Nossa IA acessa o site, tira um print, mede a velocidade com o Google e analisa 15 pontos técnicos ao mesmo tempo.',
                icon: '⚙️',
              },
              {
                step: '3',
                titulo: 'Receba o diagnóstico completo',
                desc: 'Score geral + problemas específicos com impacto no negócio + como resolver cada um, em linguagem clara e sem jargão técnico.',
                icon: '📋',
              },
            ].map((s, i) => (
              <div key={s.step} className="flex gap-5 items-start rounded-2xl border border-[#1C202B] bg-[#100C35] p-6">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#415FF2]/15 border border-[#415FF2]/25 flex items-center justify-center text-sm font-extrabold text-[#415FF2]">
                  {s.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">{s.icon}</span>
                    <h3 className="font-bold text-white text-base">{s.titulo}</h3>
                  </div>
                  <p className="text-sm text-[#9398A1] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESULTADOS REAIS ── */}
      <section className="px-4 sm:px-6 py-10 sm:py-16 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs text-[#37D3A4] font-bold uppercase tracking-widest mb-3">Resultados reais</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              O que acontece quando os problemas <br className="hidden sm:block" />
              <span className="gradient-text">encontrados são corrigidos</span>
            </h2>
            <p className="mt-4 text-[#9398A1] max-w-lg mx-auto text-sm">
              Esses resultados são de marcas reais que identificaram problemas e trabalharam com a Turbo para corrigir.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                empresa: 'Bready',
                segmento: 'Suplementos',
                resultado: 'R$ 300k/mês',
                detalhe: '2,36% de conversão média',
                quote: 'O time da Turbo fez um trabalho absolutamente incrível.',
                autor: 'Pedro Menezes, CEO',
                color: '#37D3A4',
              },
              {
                empresa: 'Calê',
                segmento: 'Moda feminina',
                resultado: '+86% de receita',
                detalhe: '+100% na taxa de conversão',
                quote: 'Nosso site ficou muito mais intuitivo e rápido.',
                autor: 'Lara Fernandes, CEO',
                color: '#415FF2',
              },
              {
                empresa: 'Solvee',
                segmento: 'Serviços digitais',
                resultado: '+170% faturamento',
                detalhe: '-50% no CAC',
                quote: 'Nosso faturamento aumentou em 170%.',
                autor: 'Lucas Liborio, CEO',
                color: '#F59E0B',
              },
              {
                empresa: 'Cristal Graffiti',
                segmento: 'Moda/Surf',
                resultado: '+226% resultado',
                detalhe: 'nos dois primeiros meses',
                quote: 'Aumentaram nosso resultado em 226% em 2 meses.',
                autor: 'Wagner, Gerente',
                color: '#EC4899',
              },
            ].map(c => (
              <div key={c.empresa} className="rounded-2xl border border-[#1C202B] bg-[#100C35] p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-[#6D727C] mb-0.5">{c.segmento}</p>
                    <p className="font-extrabold text-white text-base">{c.empresa}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: c.color }} />
                </div>
                <div className="rounded-xl p-4" style={{ background: `${c.color}10`, border: `1px solid ${c.color}20` }}>
                  <p className="text-2xl font-extrabold leading-none" style={{ color: c.color }}>{c.resultado}</p>
                  <p className="text-xs mt-1" style={{ color: `${c.color}99` }}>{c.detalhe}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#9398A1] leading-relaxed italic">"{c.quote}"</p>
                  <p className="text-xs text-[#6D727C] mt-2">— {c.autor}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trusted badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
            {['Shopify Expert Certificada', 'Google Partner Premier', 'Meta Business Partner', '4.7/5 no Shopify Directory'].map(b => (
              <div key={b} className="flex items-center gap-2 text-xs text-[#6D727C]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#37D3A4]" />
                {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="px-4 sm:px-6 py-12 sm:py-20 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative rounded-3xl border border-[#415FF2]/20 bg-gradient-to-b from-[#0E0B30] to-[#0B0726] p-10 overflow-hidden">
            <div className="absolute inset-0 bg-[#415FF2]/5 rounded-3xl pointer-events-none" />
            <div className="glow-orb absolute top-[-60px] left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-[#415FF2]/10 blur-[80px] pointer-events-none" />

            <p className="relative text-xs text-[#37D3A4] font-bold uppercase tracking-widest mb-4">Comece agora</p>
            <h2 className="relative text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-3">
              Descubra o que está impedindo <br className="hidden sm:block" />suas vendas em 60 segundos
            </h2>
            <p className="relative text-sm text-[#9398A1] mb-8 leading-relaxed">
              Gratuito, sem cadastro, sem instalar nada. Cole a URL e receba o diagnóstico completo.
            </p>

            <a href="#diagnostico"
              className="relative inline-flex items-center gap-2 rounded-2xl bg-[#37D3A4] hover:bg-[#2BB88E] active:scale-[0.98] text-[#0B0726] font-extrabold px-10 py-4 text-base transition-all shadow-lg shadow-[#37D3A4]/25">
              Ver diagnóstico grátis →
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src="/logo-turbo.svg" alt="Turbo Partners" className="h-8 opacity-60" />
            <span className="text-xs text-[#6D727C]">© {new Date().getFullYear()} Turbo Partners</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://turbopartners.com.br" target="_blank" rel="noreferrer" className="text-xs text-[#6D727C] hover:text-white transition-colors">turbopartners.com.br</a>
            <span className="text-xs text-[#3C4150]">Shopify Expert · Google Partner · Meta Business Partner</span>
          </div>
        </div>
      </footer>

      {/* ── POPUP: TIPO DE PÁGINA ── */}
      {showTipoPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-[#1C202B] bg-[#0E0B30] p-8 shadow-2xl">
            <button onClick={() => setShowTipoPopup(false)} className="absolute top-4 right-4 text-[#6D727C] hover:text-white text-xl transition-colors">✕</button>

            <div className="text-center mb-8">
              <p className="text-xs text-[#37D3A4] font-bold uppercase tracking-widest mb-3">Antes de começar</p>
              <h2 className="text-2xl font-extrabold text-white leading-tight">Qual é essa página?</h2>
              <p className="text-sm text-[#9398A1] mt-2">A análise muda de acordo com o tipo. Isso garante um diagnóstico mais preciso.</p>
            </div>

            <div className="space-y-3">
              {([
                { tipo: 'homepage' as TipoPagina, icon: '🏠', label: 'Homepage', desc: 'Página principal do site ou empresa' },
                { tipo: 'produto' as TipoPagina, icon: '🛍', label: 'Página de Produto', desc: 'Produto específico ou página de loja' },
                { tipo: 'landing_page' as TipoPagina, icon: '🎯', label: 'Landing Page', desc: 'Página de captura, oferta ou campanha' },
              ]).map(opt => (
                <button
                  key={opt.tipo}
                  onClick={() => iniciarAnalise(opt.tipo)}
                  className="w-full flex items-center gap-4 rounded-2xl border border-[#1C202B] bg-[#100C35] hover:border-[#415FF2]/50 hover:bg-[#415FF2]/8 px-6 py-5 text-left transition-all group"
                >
                  <span className="text-3xl flex-shrink-0">{opt.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-white text-base group-hover:text-[#415FF2] transition-colors">{opt.label}</p>
                    <p className="text-xs text-[#6D727C] mt-0.5">{opt.desc}</p>
                  </div>
                  <span className="text-[#6D727C] group-hover:text-[#415FF2] transition-colors text-sm">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ════ LOADING ══════════════════════════════════════════════════════════════
  if (view === 'loading') {
    const isSlow = elapsed >= 15 // site lento detectado após 15s
    const isLastPhase = aiMsg >= AI_INSIGHTS.length - 1
    const slowHint = SLOW_SITE_HINTS[Math.floor(elapsed / 6) % SLOW_SITE_HINTS.length]
    // Se o site tá lento E estamos na última fase, mostramos dica contextual em vez da fase
    const insight = isSlow && isLastPhase ? slowHint : AI_INSIGHTS[aiMsg]

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-12">
        <img src="/logo-turbo.svg" alt="Turbo Partners" className="h-14 mb-12 opacity-60" />

        <div className="w-full max-w-md">
          {/* Título */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-white mb-2">
              {macroAtiva === 'ia' ? 'IA analisando sua página' : 'Preparando o diagnóstico'}
            </h2>
            {/* URL em estilo browser bar */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#1C202B] bg-[#100C35] px-4 py-1.5 max-w-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#37D3A4] flex-shrink-0" />
              <span className="text-xs text-[#6D727C] truncate">{url}</span>
            </div>
          </div>

          {/* Chips macro — baseados em qual macro está ativa agora */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {LOADING_STEPS.map((s, i) => {
              const done = i < macroAtivaIndex
              const active = i === macroAtivaIndex
              return (
                <div key={s.label} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-500 ${
                  done ? 'border border-emerald-500/25 bg-emerald-500/8 text-emerald-400'
                  : active ? 'border border-[#415FF2]/40 bg-[#415FF2]/10 text-white'
                  : 'border border-[#1C202B] bg-[#100C35] text-[#3C4150]'
                }`}>
                  <span className="text-sm leading-none">
                    {done ? '✓' : active ? <span className="inline-block animate-pulse">{s.icon}</span> : s.icon}
                  </span>
                  {s.label}
                </div>
              )
            })}
          </div>

          {/* Painel com a microfase atual — sempre ativo, narrando o progresso real */}
          <div className="rounded-2xl border border-[#415FF2]/30 bg-[#415FF2]/8 overflow-hidden">
            {/* Header do painel */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-[#37D3A4] animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-[#415FF2] animate-pulse delay-150" />
                <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse delay-300" />
              </div>
              <span className="text-xs text-[#6D727C] font-medium">
                {LOADING_STEPS[macroAtivaIndex]?.label ?? 'Análise em andamento'}
              </span>
            </div>

            {/* Insight atual */}
            <div className="px-5 py-5 min-h-[80px] flex items-center gap-4">
              <span className="text-2xl flex-shrink-0 transition-all duration-500">
                {insight.icon}
              </span>
              <p className="text-sm text-white/80 leading-relaxed transition-all duration-500">
                {insight.text}
              </p>
            </div>

            {/* Barra de progresso monotônica — nunca volta pro início */}
            <div className="px-5 pb-4">
              <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#415FF2] to-[#37D3A4] rounded-full"
                  style={{
                    width: `${((aiMsg + 1) / AI_INSIGHTS.length) * 100}%`,
                    transition: 'width 3s ease-in-out',
                  }}
                />
              </div>
              <p className="text-xs text-[#6D727C] mt-2 text-right">
                {isLastPhase ? 'Finalizando…' : `Etapa ${aiMsg + 1} de ${AI_INSIGHTS.length}`}
              </p>
            </div>
          </div>

          <div className="mt-6 text-center space-y-1.5">
            {retryCount > 0 ? (
              <p className="text-xs text-[#F59E0B]">
                ⏳ Tentativa {retryCount + 1} de {MAX_RETRIES + 1} — o site demorou para responder, tentando novamente...
              </p>
            ) : isSlow ? (
              <>
                <p className="text-xs font-semibold text-[#F59E0B]">
                  🐢 Seu site está demorando para carregar — isso já é um dado do diagnóstico
                </p>
                <p className="text-xs text-[#6D727C]">
                  Sites lentos perdem até 53% dos visitantes antes do primeiro clique. Aguarde — vale a análise.
                </p>
              </>
            ) : (
              <p className="text-xs text-[#3C4150]">
                Análise completa em até 60 segundos. Não feche a janela.
              </p>
            )}
            {elapsed > 0 && (
              <p className="text-[10px] text-[#3C4150]">{elapsed}s</p>
            )}
          </div>
        </div>

      </div>
    )
  }

  // ════ RESULTS ══════════════════════════════════════════════════════════════
  if (!result) return null

  const mobileScore = result.pagespeed.mobile_score
  const checksRuins = result.codigo.checks.filter(c => !c.passou)
  const checksBons = result.codigo.checks.filter(c => c.passou)
  const urgentes = checksRuins.filter(c => c.peso === 'critico')
  const importantes = checksRuins.filter(c => c.peso === 'alto')
  const melhorias = checksRuins.filter(c => c.peso === 'medio')

  const lcpVal = parseFloat(result.pagespeed.lcp)
  const clsVal = parseFloat(result.pagespeed.cls)
  const fcpVal = parseFloat(result.pagespeed.fcp)
  const ttfbStr = result.pagespeed.ttfb
  const siStr = result.pagespeed.speed_index
  const lcpBom = !isNaN(lcpVal) && lcpVal < 2.5
  const clsBom = !isNaN(clsVal) && clsVal < 0.1
  const fcpBom = !isNaN(fcpVal) && fcpVal < 1.8
  const ttfbBom = ttfbStr !== 'N/A' && (ttfbStr.includes('ms') ? parseInt(ttfbStr) < 800 : parseFloat(ttfbStr) < 0.8)
  const siBom = !isNaN(parseFloat(siStr)) && parseFloat(siStr) < 3.4

  return (
    <div ref={topRef} className="min-h-screen flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-[#1C202B] bg-[#0B0726]/95 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 xl:px-10 py-3 sm:py-4 flex items-center justify-between gap-3">
          <img src="/logo-turbo.svg" alt="Turbo Partners" className="h-8 sm:h-12 flex-shrink-0" />
          <div className="hidden sm:flex items-center gap-3 min-w-0">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${scoreBg(result.score_final)}`}
              style={{ color: scoreColor(result.score_final) }}>
              {scoreEmoji(result.score_final)} Score {result.score_final}/100
            </span>
            <span className="text-xs text-[#6D727C] truncate max-w-[260px]">{result.url}</span>
          </div>
          <button onClick={novaAnalise}
            className="flex-shrink-0 rounded-xl border border-[#1C202B] hover:border-[#415FF2] text-white text-xs font-bold px-4 py-2.5 transition-all">
            ← Nova análise
          </button>
        </div>
      </header>

      {/* ── Hero do resultado ── */}
      <div className="border-b border-[#1C202B] bg-gradient-to-b from-[#0E0B30] to-[#0B0726]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 xl:px-10 py-6 sm:py-10">

          {/* Score principal */}
          <div className="flex flex-row items-center gap-4 sm:gap-6 mb-6 sm:mb-10">
            {/* Ring — menor no mobile */}
            <div className="relative inline-flex flex-shrink-0">
              <div className="block sm:hidden relative">
                <ScoreRing score={result.score_final} size={88} strokeWidth={8} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-white leading-none">{result.score_final}</span>
                  <span className="text-[10px] text-[#9398A1]">/100</span>
                </div>
              </div>
              <div className="hidden sm:block relative">
                <ScoreRing score={result.score_final} size={130} strokeWidth={12} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold text-white leading-none">{result.score_final}</span>
                  <span className="text-xs text-[#9398A1] mt-0.5">/100</span>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-[#9398A1] font-semibold uppercase tracking-widest mb-1 sm:mb-2">Diagnóstico concluído</p>
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold leading-tight" style={{ color: scoreColor(result.score_final) }}>
                {scoreFrase(result.score_final)}
              </h1>

              {/* Stats — grid 3 colunas fixas */}
              <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-1.5 sm:gap-3 sm:flex sm:flex-wrap">
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-2.5 rounded-xl sm:rounded-2xl border border-[#37D3A4]/20 bg-[#37D3A4]/8 px-2 sm:px-4 py-2 sm:py-2.5 text-center sm:text-left">
                  <span className="text-base sm:text-lg">📈</span>
                  <div>
                    <p className="text-[9px] sm:text-xs text-[#9398A1] leading-tight">Potencial</p>
                    <p className="text-sm sm:text-base font-extrabold text-[#37D3A4] leading-none">+{100 - result.score_final}pts</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-2.5 rounded-xl sm:rounded-2xl border border-[#415FF2]/20 bg-[#415FF2]/8 px-2 sm:px-4 py-2 sm:py-2.5 text-center sm:text-left">
                  <span className="text-base sm:text-lg">⚠️</span>
                  <div>
                    <p className="text-[9px] sm:text-xs text-[#9398A1] leading-tight">Problemas</p>
                    <p className="text-sm sm:text-base font-extrabold text-white leading-none">{result.cro.problemas_criticos.length} críticos</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-2.5 rounded-xl sm:rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/8 px-2 sm:px-4 py-2 sm:py-2.5 text-center sm:text-left">
                  <span className="text-base sm:text-lg">💡</span>
                  <div>
                    <p className="text-[9px] sm:text-xs text-[#9398A1] leading-tight">Melhorias</p>
                    <p className="text-sm sm:text-base font-extrabold text-white leading-none">{result.cro.melhorias.length} sugeridas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo executivo */}
          <p className="text-xs sm:text-sm text-[#9398A1] leading-relaxed max-w-3xl mb-4 sm:mb-6 border-l-2 border-[#415FF2]/40 pl-3 sm:pl-4">
            {result.cro.resumo_executivo}
          </p>

          {/* 3 módulos como botões de aba */}
          <p className="text-[10px] sm:text-xs text-[#6D727C] font-semibold uppercase tracking-widest mb-2">Ver análise detalhada por área</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <ModuleScore icon="🎯" label="Design e Copy" sublabel="Convence o cliente?" score={result.cro.score_geral}
              onClick={() => setActiveTab('design')} active={activeTab === 'design'} />
            <ModuleScore icon="🔧" label="Qualidade do código" sublabel="Está bem construído?" score={result.codigo.score}
              onClick={() => setActiveTab('codigo')} active={activeTab === 'codigo'} />
            <ModuleScore icon="⚡" label="Velocidade e Performance" sublabel="Carrega rápido?" score={mobileScore}
              onClick={() => setActiveTab('speed')} active={activeTab === 'speed'} />
          </div>
        </div>
      </div>

      {/* ── Conteúdo das abas ── */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 xl:px-10 py-5 sm:py-8">

        {/* ══ ABA: VISUAL & VENDAS ══ */}
        {activeTab === 'design' && (
          <div className="lg:grid lg:grid-cols-[420px_1fr] xl:grid-cols-[500px_1fr] 2xl:grid-cols-[560px_1fr] lg:gap-10 xl:gap-12 lg:items-start">

            {/* ── COLUNA ESQUERDA: sticky com altura fixa = viewport - header ── */}
            <div className="hidden lg:block sticky top-[73px] mb-8 lg:mb-0">

              {result.screenshot ? (
                <div className="rounded-3xl border border-[#1C202B] bg-[#100C35] overflow-hidden shadow-2xl flex flex-col"
                  style={{ height: 'calc(100vh - 73px - 2rem)' }}>
                  {/* Barra do browser */}
                  <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 border-b border-[#1C202B]">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                    </div>
                    <span className="text-xs text-[#6D727C] truncate">{result.url}</span>
                  </div>
                  {/* Imagem com scroll interno — mostra as 3 dobras */}
                  <div className="flex-1 overflow-y-auto min-h-0 scroll-smooth"
                    style={{ scrollbarWidth: 'thin' }}>
                    <img
                      src={`data:${result.screenshotMime ?? 'image/jpeg'};base64,${result.screenshot}`}
                      alt="Como seu site está aparecendo agora"
                      className="w-full block"
                    />
                  </div>
                  <div className="flex-shrink-0 flex items-center justify-center gap-1.5 py-2 border-t border-[#1C202B]">
                    <span className="text-[10px] text-[#3C4150]">Primeira dobra — visão mobile</span>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-3xl border border-[#1C202B] bg-[#100C35] overflow-hidden shadow-2xl flex items-center justify-center"
                  style={{ height: 'calc(100vh - 73px - 2rem)' }}
                >
                  <p className="text-xs text-[#6D727C]">Screenshot não disponível</p>
                </div>
              )}

            </div>

            {/* ── COLUNA DIREITA: sub-scores + problemas + melhorias + CTA ── */}
            <div className="space-y-8">

              {/* Sub-scores em linguagem de negócio */}
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-[#9398A1] mb-2 sm:mb-2.5 uppercase tracking-wide">Como sua página se sai em cada área</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Clareza da mensagem', score: result.cro.score_proposta_valor },
                    { label: 'Transmite confiança', score: result.cro.score_confianca },
                    { label: 'Experiência mobile', score: result.cro.score_mobile },
                  ].map(({ label, score }) => (
                    <div key={label} className={`rounded-2xl border p-3.5 flex flex-col items-center gap-2 ${scoreBg(score)}`}>
                      <div className="relative inline-flex">
                        <ScoreRing score={score} size={48} strokeWidth={5} />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-white">{score}</span>
                      </div>
                      <span className="text-xs text-[#9398A1] text-center leading-tight">{label}</span>
                      <span className="text-xs font-bold" style={{ color: scoreColor(score) }}>{scoreEmoji(score)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Problemas */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center text-lg">⚠️</div>
                  <div>
                    <h2 className="text-base font-extrabold text-white">
                      {result.cro.problemas_criticos.length} problemas que estão custando vendas
                    </h2>
                    <p className="text-xs text-[#9398A1]">Clique em cada um para ver o impacto e como resolver</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {result.cro.problemas_criticos.map((p, i) => <ProblemaCard key={i} p={p} i={i} />)}
                </div>
              </div>

              {/* Melhorias */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#37D3A4]/15 flex items-center justify-center text-lg">💡</div>
                  <div>
                    <h2 className="text-base font-extrabold text-white">
                      {result.cro.melhorias.length} melhorias que podem aumentar suas vendas
                    </h2>
                    <p className="text-xs text-[#9398A1]">Com nível de prioridade e esforço para cada uma</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {result.cro.melhorias.map((m, i) => <MelhoriaCard key={i} m={m} i={i} />)}
                </div>
              </div>

              {/* CTA inline no final: baixar análise em PDF */}
              <div className="relative rounded-3xl border border-[#415FF2]/25 bg-gradient-to-br from-[#0E0B30] to-[#0B0726] overflow-hidden p-8">
                <div className="absolute top-[-60px] right-[-60px] w-[240px] h-[240px] rounded-full bg-[#415FF2]/10 blur-[80px] pointer-events-none" />
                <div className="relative">
                  <p className="text-xs font-bold text-[#37D3A4] uppercase tracking-widest mb-3">Próximo passo</p>
                  <h3 className="text-xl font-extrabold text-white leading-snug mb-2">Leve essa análise com você</h3>
                  <p className="text-sm text-[#9398A1] leading-relaxed mb-6">
                    Baixe o diagnóstico completo em PDF com branding Turbo para apresentar ao cliente ou guardar no histórico da conta.
                  </p>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <button
                      onClick={baixarPdf}
                      disabled={exportandoPdf}
                      className="rounded-xl bg-[#37D3A4] hover:bg-[#2BB88E] active:scale-95 text-[#0B0726] font-extrabold px-7 py-3.5 text-sm transition-all shadow-lg shadow-[#37D3A4]/20 whitespace-nowrap disabled:opacity-50 disabled:cursor-wait inline-flex items-center gap-2">
                      {exportandoPdf ? (
                        <>
                          <span className="inline-block w-4 h-4 rounded-full border-2 border-[#0B0726]/30 border-t-[#0B0726] animate-spin" />
                          Gerando PDF…
                        </>
                      ) : (
                        <>📄 Baixar análise em PDF</>
                      )}
                    </button>
                    <div>
                      <p className="text-xs font-bold text-white">Relatório completo</p>
                      <p className="text-xs text-[#9398A1] mt-0.5">
                        Nota geral, problemas, oportunidades e velocidade — em 3 páginas
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ══ ABA: SAÚDE DO SITE ══ */}
        {activeTab === 'codigo' && (
          <div className="space-y-8">

            {/* Resumo visual */}
            <div className={`rounded-3xl border p-7 flex flex-col sm:flex-row items-start sm:items-center gap-6 ${scoreBg(result.codigo.score)}`}>
              <div className="relative inline-flex flex-shrink-0">
                <ScoreRing score={result.codigo.score} size={90} strokeWidth={8} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-white leading-none">{result.codigo.score}</span>
                  <span className="text-xs text-[#9398A1]">/100</span>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white mb-1">
                  {checksRuins.length === 0
                    ? '✅ Seu site está bem construído!'
                    : `${checksRuins.length} ponto${checksRuins.length > 1 ? 's' : ''} que ${checksRuins.length > 1 ? 'precisam' : 'precisa'} de atenção`}
                </h2>
                <p className="text-sm text-[#9398A1] leading-relaxed max-w-lg">
                  {urgentes.length > 0
                    ? `${urgentes.length} ${urgentes.length > 1 ? 'itens urgentes' : 'item urgente'} que afeta${urgentes.length === 1 ? '' : 'm'} diretamente o Google e a segurança do site.`
                    : importantes.length > 0
                    ? `Nenhum problema crítico. Há ${importantes.length} ${importantes.length > 1 ? 'itens importantes' : 'item importante'} para melhorar.`
                    : 'Nenhum problema sério encontrado. Foco em pequenas melhorias.'}
                </p>
                <p className="text-xs text-[#6D727C] mt-2">
                  {checksBons.length} de {result.codigo.checks.length} verificações aprovadas
                </p>
              </div>
            </div>

            {/* Por que isso importa — explicação para o leigo */}
            <div className="rounded-2xl border border-[#415FF2]/20 bg-[#415FF2]/5 px-5 py-4">
              <p className="text-sm text-white leading-relaxed">
                <span className="font-bold text-[#415FF2]">Por que isso importa para o seu negócio?</span>{' '}
                A estrutura técnica do site afeta diretamente o quanto o Google recomenda seu site nas buscas, a velocidade de carregamento e a segurança dos seus visitantes. Problemas aqui podem estar limitando todo o seu esforço de marketing.
              </p>
            </div>

            {urgentes.length > 0 && (
              <div>
                <p className="text-sm font-extrabold text-red-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  🔴 Urgente: corrija o mais rápido possível
                </p>
                <div className="space-y-2">{urgentes.map((c, i) => <CodigoRow key={i} c={c} />)}</div>
              </div>
            )}
            {importantes.length > 0 && (
              <div>
                <p className="text-sm font-extrabold text-orange-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  🟠 Importante: corrija em breve
                </p>
                <div className="space-y-2">{importantes.map((c, i) => <CodigoRow key={i} c={c} />)}</div>
              </div>
            )}
            {melhorias.length > 0 && (
              <div>
                <p className="text-sm font-extrabold text-yellow-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  🟡 Oportunidades de melhoria
                </p>
                <div className="space-y-2">{melhorias.map((c, i) => <CodigoRow key={i} c={c} />)}</div>
              </div>
            )}
            {checksBons.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer select-none flex items-center gap-2 text-sm font-semibold text-[#6D727C] hover:text-[#9398A1] transition-colors">
                  🟢 Ver {checksBons.length} {checksBons.length > 1 ? 'itens' : 'item'} aprovado{checksBons.length > 1 ? 's' : ''}
                </summary>
                <div className="space-y-2 mt-3">{checksBons.map((c, i) => <CodigoRow key={i} c={c} />)}</div>
              </details>
            )}
          </div>
        )}

        {/* ══ ABA: VELOCIDADE ══ */}
        {activeTab === 'speed' && (
          <div className="space-y-8">

            {/* Score mobile */}
            <div className={`rounded-3xl border p-8 flex flex-col sm:flex-row items-center gap-6 ${scoreBg(mobileScore)}`}>
              <div className="relative inline-flex flex-shrink-0">
                <ScoreRing score={mobileScore} size={110} strokeWidth={10} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-white">{mobileScore}</span>
                  <span className="text-xs text-[#9398A1]">/100</span>
                </div>
              </div>
              <div>
                <p className="text-lg font-extrabold text-white mb-1">📱 Velocidade no celular</p>
                <p className="text-sm font-bold" style={{ color: scoreColor(mobileScore) }}>
                  {scoreEmoji(mobileScore)} {mobileScore >= 80 ? 'Seu site é rápido!' : mobileScore >= 60 ? 'Aceitável, mas dá para melhorar' : mobileScore >= 40 ? 'Está lento para a maioria dos visitantes' : 'Muito lento — visitantes estão saindo'}
                </p>
                <p className="text-xs text-[#9398A1] mt-2">Medido onde 60%+ dos seus clientes estão: no celular.</p>
              </div>
            </div>

            {/* Frase de impacto se lento */}
            {mobileScore < 75 && (
              <div className="rounded-2xl border border-orange-500/25 bg-orange-500/5 px-6 py-5">
                <p className="text-base font-bold text-white mb-1">⏱ Seu site está demorando para abrir</p>
                <p className="text-sm text-[#9398A1] leading-relaxed">
                  {mobileScore < 50
                    ? 'Sites com essa velocidade perdem mais da metade dos visitantes antes de carregar. É como abrir uma loja com a porta emperrada.'
                    : 'Sites mais rápidos convertem mais. Cada segundo a menos de carregamento pode aumentar suas vendas em até 7%.'}
                </p>
              </div>
            )}

            {/* Métricas com linguagem humana */}
            <div>
              <p className="text-sm font-bold text-[#9398A1] mb-4 uppercase tracking-wide">O que medimos (no celular)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <VelocidadeMetrica
                  nome="Tempo até a imagem principal aparecer" sigla="Quanto o cliente espera para ver o que importa"
                  valor={result.pagespeed.lcp} meta="menos de 2,5 segundos" bom={lcpBom}
                  oQueSig="A imagem ou bloco principal está demorando demais para carregar. O cliente vê tela quase em branco e boa parte desiste antes do site terminar." />
                <VelocidadeMetrica
                  nome="Layout estável enquanto carrega" sigla="Se os elementos ficam pulando na tela"
                  valor={result.pagespeed.cls} meta="abaixo de 0,1" bom={clsBom}
                  oQueSig="A página está 'pulando' enquanto carrega. O cliente tenta clicar num botão e acerta outro — isso irrita e faz muita gente sair antes de comprar." />
                <VelocidadeMetrica
                  nome="Tempo até a página começar a aparecer" sigla="Primeira coisa que o cliente vê na tela"
                  valor={result.pagespeed.fcp} meta="menos de 1,8 segundo" bom={fcpBom}
                  oQueSig="O cliente olha para uma tela vazia por muito tempo antes de ver qualquer coisa. Passa a sensação de que o site travou e muita gente fecha a aba." />
                <VelocidadeMetrica
                  nome="Tempo de resposta do servidor" sigla="O quão rápido o site começa a responder"
                  valor={ttfbStr} meta="menos de 0,8 segundo" bom={ttfbBom}
                  oQueSig="O servidor demora para responder ao primeiro pedido. Isso deixa tudo lento depois — cada página que o cliente abre herda essa lentidão." />
                <VelocidadeMetrica
                  nome="Velocidade geral de carregamento" sigla="Percepção de rapidez do site como um todo"
                  valor={siStr} meta="menos de 3,4 segundos" bom={siBom}
                  oQueSig="Este é o número que resume como o cliente sente a velocidade. Quanto maior, mais tempo ele passa vendo uma página incompleta e perdendo paciência." />
                <div className={`rounded-2xl border p-5 flex flex-col justify-center ${mobileScore >= 80 ? 'border-emerald-500/20 bg-emerald-500/5' : mobileScore >= 60 ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-red-400/20 bg-red-400/5'}`}>
                  <p className="text-xs text-[#9398A1] font-medium mb-2">Nota geral de velocidade</p>
                  <p className="text-4xl font-extrabold text-white">{mobileScore}<span className="text-base text-[#9398A1] font-normal">/100</span></p>
                  <p className="text-sm font-bold mt-2" style={{ color: scoreColor(mobileScore) }}>
                    {scoreEmoji(mobileScore)} {mobileScore >= 80 ? 'Seu site é rápido!' : mobileScore >= 60 ? 'Dá pra melhorar' : mobileScore >= 40 ? 'Está lento' : 'Muito lento'}
                  </p>
                </div>
              </div>
            </div>

            {/* O que fazer */}
            {mobileScore < 85 && (
              <div>
                <p className="text-sm font-bold text-white mb-4">O que fazer para melhorar a velocidade</p>
                <div className="space-y-3">
                  {[
                    { titulo: 'Comprimir as imagens do site', desc: 'Imagens pesadas são a causa número 1 de sites lentos. Converter para formato moderno (WebP) e comprimir sem perder qualidade pode reduzir o tempo de carregamento em até 60%.', ganho: 'Maior impacto na velocidade' },
                    { titulo: 'Carregar imagens só quando necessário', desc: 'Em vez de carregar todas as imagens de uma vez, o site pode esperar o usuário rolar a página para carregar as que ainda não aparecem na tela.', ganho: 'Reduz o carregamento inicial' },
                    { titulo: 'Usar uma rede de distribuição de conteúdo (CDN)', desc: 'Um CDN deixa arquivos do site mais perto de onde o usuário está, reduzindo o tempo de entrega. Serviços como Cloudflare têm plano gratuito.', ganho: 'Melhora para usuários em todo o Brasil' },
                    { titulo: 'Avaliar a hospedagem atual', desc: 'Se o servidor demora para responder, nenhuma outra otimização resolve. Uma hospedagem mais robusta pode ser a solução mais rápida.', ganho: 'Resolve problema de base' },
                  ].map((item, i) => (
                    <div key={i} className="rounded-2xl border border-[#1C202B] bg-[#100C35] p-5">
                      <p className="text-sm font-bold text-white mb-2">{item.titulo}</p>
                      <p className="text-sm text-[#9398A1] leading-relaxed">{item.desc}</p>
                      <span className="inline-block mt-3 text-xs font-bold text-[#37D3A4] bg-[#37D3A4]/10 px-3 py-1 rounded-full">↑ {item.ganho}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

    </div>
  )
}
