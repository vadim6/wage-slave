import type { Metadata } from 'next'
import './globals.css'
import { Nav } from '@/components/layout/nav'

export const metadata: Metadata = {
  title: 'WageSlave',
  description: 'Job application tracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
