import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Análise de CRO | Turbo Partners',
  description:
    'Descubra por que seu site não converte. Análise gratuita de Design, Velocidade e Código — powered by IA.',
  openGraph: {
    title: 'Análise de CRO | Turbo Partners',
    description: 'Descubra por que seu site não converte. Análise gratuita em segundos.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={jakarta.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
