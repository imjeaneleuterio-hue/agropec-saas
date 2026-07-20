import type { Metadata, Viewport } from 'next'
import { Manrope, Instrument_Serif } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'Jeleupec', template: '%s | Jeleupec' },
  description: 'Sistema completo de gestão para pecuária leiteira',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${manrope.variable} ${instrumentSerif.variable}`}>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`
        }} />
      </body>
    </html>
  )
}
