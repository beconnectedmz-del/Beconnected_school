import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Beconnect School – Escola Virtual Multidisciplinar',
  description: 'A escola online do grupo Beconnect. Conectamos estudantes e professores em Moçambique.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{children}</body>
    </html>
  )
}
