import type { Metadata } from 'next'
import Link from 'next/link'
import BackButton from '@/components/BackButton'
import { ShareButton } from '@/components/ShareButton'

export const metadata: Metadata = {
  title: 'Support Rivyls',
  description: 'Help keep Rivyls free. Support the platform with a voluntary contribution.',
  robots: { index: true, follow: true },
}

const amounts = [
  {
    label: '$3',
    subtitle: 'Buy a coffee',
    href: process.env.NEXT_PUBLIC_STRIPE_SUPPORT_3,
  },
  {
    label: '$5',
    subtitle: 'Cover a day of hosting',
    href: process.env.NEXT_PUBLIC_STRIPE_SUPPORT_5,
  },
  {
    label: '$10',
    subtitle: 'Fund a feature',
    href: process.env.NEXT_PUBLIC_STRIPE_SUPPORT_10,
  },
  {
    label: 'Custom',
    subtitle: 'You choose',
    href: process.env.NEXT_PUBLIC_STRIPE_SUPPORT_CUSTOM,
  },
]

const cards = [
  {
    title: 'Servers & hosting',
    description: 'Database, API, live scoring infrastructure',
    borderColor: 'border-l-brand',
    bgColor: 'bg-brand-subtle',
  },
  {
    title: 'New features',
    description: 'Multi-sport expansion, mobile app, tools',
    borderColor: 'border-l-accent',
    bgColor: 'bg-accent-subtle',
  },
  {
    title: 'Keeping it free',
    description: 'No entry fees, no house edge, no paywall',
    borderColor: 'border-l-success',
    bgColor: 'bg-success-subtle',
  },
  {
    title: 'Game day reliability',
    description: 'Live scoring, real-time drafts, zero downtime',
    borderColor: 'border-l-info',
    bgColor: 'bg-info-subtle',
  },
]

export default function SupportPage() {
  const anyAvailable = amounts.some((a) => a.href)

  return (
    <div className="min-h-screen bg-page text-text-primary">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-page/90 backdrop-blur-sm border-b border-border-subtle">
        <div className="max-w-[620px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="brand-nav text-xl tracking-wide">
            RIVYLS
          </Link>
          <BackButton />
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-[620px] mx-auto px-4 md:px-8 py-10">
        {/* Section 1: Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-3">Support Rivyls</h1>
          <p className="text-text-secondary leading-relaxed">
            Rivyls is built by one person, runs on zero outside funding, and is
            completely free to play. Every dollar of support goes directly toward
            keeping the platform running and making it better for your league.
          </p>
        </div>

        {/* Section 2: Legal Disclaimer Callout */}
        <div className="border-l-[3px] border-brand bg-brand-subtle rounded-r-lg p-4 mb-8">
          <p className="text-sm text-text-primary leading-relaxed">
            This is not a required purchase and does not unlock any features or
            provide any in-game advantage. Rivyls is free. This is purely
            voluntary support for an independent platform.
          </p>
        </div>

        {/* Section 3: Where Your Support Goes */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Where your support goes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card) => (
              <div
                key={card.title}
                className={`rounded-lg border border-border p-5 border-l-4 ${card.borderColor} ${card.bgColor}`}
              >
                <h3 className="font-semibold text-text-primary mb-1">
                  {card.title}
                </h3>
                <p className="text-sm text-text-secondary">{card.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Support Buttons */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-3">
            {amounts.map((amount) =>
              amount.href ? (
                <a
                  key={amount.label}
                  href={amount.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center min-w-[120px] bg-brand hover:bg-brand-hover text-text-primary font-semibold rounded-lg px-6 py-4 text-center transition-colors"
                >
                  <span className="text-lg">{amount.label}</span>
                  <span className="text-xs font-normal opacity-80">
                    {amount.subtitle}
                  </span>
                </a>
              ) : (
                <span
                  key={amount.label}
                  className="flex flex-col items-center min-w-[120px] bg-surface-inset text-text-muted font-semibold rounded-lg px-6 py-4 text-center cursor-not-allowed opacity-50"
                >
                  <span className="text-lg">{amount.label}</span>
                  <span className="text-xs font-normal">{amount.subtitle}</span>
                </span>
              )
            )}
          </div>
          {!anyAvailable && (
            <p className="text-center text-text-muted text-sm mt-3">
              Support links coming soon
            </p>
          )}
        </div>

        {/* Section 5: Alternative Support */}
        <div className="mb-8 text-center">
          <p className="text-text-secondary text-sm mb-4">
            You can also support Rivyls by starting a league, inviting a friend,
            or sharing on social media.
          </p>
          <ShareButton
            shareData={{
              title: 'Rivyls — Free Fantasy Sports',
              text: 'Check out Rivyls — a free fantasy sports platform for college sports!',
              url: 'https://rivyls.com',
            }}
            label="Share Rivyls"
          />
        </div>

        {/* Section 6: Footer Disclaimer */}
        <p className="text-text-muted text-xs text-center pt-6 border-t border-border">
          Rivyls LLC is a for-profit company. Contributions are not
          tax-deductible.
        </p>
      </main>
    </div>
  )
}
