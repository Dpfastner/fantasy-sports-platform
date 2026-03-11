import type { Metadata } from 'next'
import Link from 'next/link'
import BackButton from '@/components/BackButton'
import { HelpCenter } from '@/components/HelpCenter'

export const metadata: Metadata = {
  title: 'Help Center — Rivyls',
  description: 'Get help with Rivyls fantasy college football. Learn how leagues, drafts, scoring, trading, and more work.',
  robots: { index: true, follow: true },
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-page text-text-primary">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-page/90 backdrop-blur-sm border-b border-border-subtle">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="brand-nav text-xl tracking-wide">
            RIVYLS
          </Link>
          <BackButton />
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-8 pb-4 border-b border-border">
          <h1 className="text-2xl font-bold mb-1">Help Center</h1>
          <p className="text-sm text-text-muted">
            Everything you need to know about Rivyls fantasy college football.
          </p>
        </div>

        <HelpCenter />
      </main>
    </div>
  )
}
