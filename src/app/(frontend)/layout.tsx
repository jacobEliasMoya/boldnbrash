import { existsSync } from 'node:fs'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './styles.css'

export const metadata: Metadata = {
  description:
    'Jacob Moya’s frontend and product engineering portfolio. Interfaces, systems, and experiments.',
  title: 'Jacob Moya | Creative Developer',
  icons: { icon: '/jm-symbol.svg' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const candidates = [
    ['fedro/Fedro-Black.woff2', 'woff2'],
    ['fedro/Fedro-Black.woff', 'woff'],
    ['fedro/Fedro-Black.otf', 'opentype'],
    ['fedro/Fedro-Black.ttf', 'truetype'],
  ]
  if (process.env.NODE_ENV === 'development') {
    candidates.push(
      ['fedro-preview/Fedro-Black.otf', 'opentype'],
      ['fedro-preview/Fedro-Black.woff', 'woff'],
    )
  }
  const font = candidates.find(([file]) => existsSync(`public/fonts/${file}`))
  const fontSource = font ? `url('/fonts/${font[0]}') format('${font[1]}')` : null

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem('portfolio-theme')==='dark'?'dark':'light'}catch{};window.addEventListener('storage',function(e){if(e.key==='portfolio-theme'){document.documentElement.dataset.theme=e.newValue==='dark'?'dark':'light';window.dispatchEvent(new Event('portfolio:theme'))}})`,
          }}
        />
        {fontSource && (
          <style>{`@font-face{font-family:'Fedro';src:${fontSource};font-weight:900;font-style:normal;font-display:swap;}`}</style>
        )}
      </head>
      <body>{children}</body>
    </html>
  )
}
