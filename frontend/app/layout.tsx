import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DinoSave Marketing Studio',
  description: 'Scarica, edita e remixa video da TikTok e Instagram con il Dino 🦖',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body className={inter.className}>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  )
}
