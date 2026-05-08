'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BriefcaseIcon } from 'lucide-react'

export function Nav() {
  const pathname = usePathname()

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/applications', label: 'Applications' },
    { href: '/debug', label: 'Debug' },
  ]

  return (
    <nav
      style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-white">
          <BriefcaseIcon size={18} style={{ color: 'var(--color-accent)' }} />
          WageSlave
        </Link>

        <div className="flex items-center gap-1">
          {links.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: active ? 'var(--color-text)' : 'var(--color-muted)',
                  backgroundColor: active ? 'var(--color-surface-2)' : 'transparent',
                }}
                className="px-3 py-1.5 rounded text-sm font-medium transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
