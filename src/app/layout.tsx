import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'

const mont = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-mont',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Recently Played',
  description: 'A self-hosted Apple Music listening history page — mockup template.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mont.variable}>
      <body className="font-mont antialiased">{children}</body>
    </html>
  )
}
