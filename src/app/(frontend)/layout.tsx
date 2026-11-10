import { existsSync } from 'node:fs'
import { ThemeToggle } from '@/components/atoms/ThemeToggle'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'

import './styles.css'

export const metadata: Metadata = {
  description: 'Jacob Moya’s frontend and product engineering portfolio.',
  title: 'Jacob Moya | Frontend & Product Engineering',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const savedTheme = (await cookies()).get('portfolio-theme')?.value
  const theme = savedTheme === 'light' ? 'light' : 'dark'

  const showFedroPreview =
    process.env.NODE_ENV === 'development' && existsSync('public/fonts/fedro-preview/Fedro-Black.woff')

  return (
    <html lang="en" data-theme={theme} className="scroll-pt-24 motion-safe:scroll-smooth">
      {showFedroPreview && (
        <head>
          <style>{`
            @font-face {
              font-family: 'Fedro Preview';
              src: url('/fonts/fedro-preview/Fedro-Black.woff') format('woff');
              font-weight: 900;
              font-display: swap;
            }
            :root {
              --portfolio-display: 'Fedro Preview', Georgia, serif;
            }
            .hero-name {
              font-weight: 900;
              text-transform: none;
            }
          `}</style>
        </head>
      )}
      <body id="top" className="min-h-svh bg-canvas font-body text-ink">
        <div className="mx-auto max-w-[112rem] px-gutter">
          <header className="sticky top-0 z-30 -mx-gutter flex min-h-18 items-center justify-between gap-3 border-b border-rule/20 bg-canvas/85 px-gutter backdrop-blur-xl max-sm:flex-wrap max-sm:py-3">
            <a className="portfolio-mark inline-flex min-h-11 items-center font-display text-3xl leading-none font-black tracking-tight hover:text-accent" href="/" aria-label="Jacob Moya home">
              JM
            </a>
            <nav aria-label="Portfolio" className="flex flex-wrap items-center gap-x-4 gap-y-2 font-body text-sm font-semibold tracking-wide sm:gap-x-6">
              <a className="hover:text-accent" href="/#work">
                Work
              </a>
              <a className="hover:text-accent" href="/#about">About</a>
              <a className="hover:text-accent" href="/#contact">Contact</a>
              <ThemeToggle initialTheme={theme} />
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}
