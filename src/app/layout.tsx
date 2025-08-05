import type { Metadata } from 'next'
import { Inter, Caveat, Kalam } from 'next/font/google'
import '@/styles/globals.css'

const inter = Inter({ subsets: ['latin'] })
const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat' })
const kalam = Kalam({ subsets: ['latin'], weight: ['300', '400', '700'], variable: '--font-kalam' })

export const metadata: Metadata = {
  title: 'Financial Therapy App',
  description: 'Transform your relationship with money through personalized financial coaching',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${caveat.variable} ${kalam.variable}`}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
          {children}
        </div>
      </body>
    </html>
  )
}