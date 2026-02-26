import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import EmailCaptureForm from '@/components/EmailCaptureForm'

export const metadata: Metadata = {
  title: 'Rivyls — Fantasy College Football',
  description:
    'Draft real college football teams, compete with friends, and win weekly prizes. Join the waitlist for the ultimate fantasy college football experience.',
  openGraph: {
    title: 'Rivyls — Fantasy College Football',
    description:
      'Draft real college football teams, compete with friends, and win weekly prizes.',
    url: 'https://rivyls.com/welcome',
    siteName: 'Rivyls',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rivyls — Fantasy College Football',
    description:
      'Draft real college football teams, compete with friends, and win weekly prizes.',
  },
  robots: { index: true, follow: true },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Rivyls',
  url: 'https://rivyls.com',
  description:
    'Fantasy college football platform — draft teams, compete with friends, win prizes.',
}

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to text-text-primary">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 bg-page/90 backdrop-blur-sm border-b border-border-subtle">
        <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="brand-nav text-xl text-text-primary tracking-wide">
            RIVYLS
          </Link>
          <div className="flex items-center gap-4 brand-nav">
            <Link href="/login" className="text-text-secondary hover:text-text-primary transition-colors">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-brand hover:bg-brand-hover text-text-inverse px-4 py-2 rounded-lg transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="container mx-auto px-4 md:px-8 pt-20 pb-16 md:pt-32 md:pb-24 text-center">
        <h1 className="brand-h1 text-4xl sm:text-5xl md:text-7xl text-text-primary mb-6">
          Your League.<br />Your Rivals.<br />Your Season.
        </h1>
        <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          Draft real college football teams, compete head-to-head with friends,
          and chase weekly prizes all season long. Rivyls makes it simple to
          run the league you&apos;ve always wanted.
        </p>
        <a
          href="#commissioner"
          className="inline-block bg-brand hover:bg-brand-hover text-text-inverse font-semibold py-4 px-10 rounded-lg text-lg transition-colors"
        >
          Join the Waitlist
        </a>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-surface-subtle py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="brand-h2 text-2xl md:text-4xl text-text-primary text-center mb-12 md:mb-16">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12 max-w-4xl mx-auto">
            {[
              {
                step: '1',
                title: 'Create Your League',
                desc: 'Set up a private league in minutes. Invite friends, customize your scoring rules, and choose your draft format.',
              },
              {
                step: '2',
                title: 'Draft Your Teams',
                desc: 'Pick real college football programs in a live snake draft. Every school you roster earns points based on real-game results.',
              },
              {
                step: '3',
                title: 'Compete & Win',
                desc: 'Track live scores, battle for weekly high points, and fight for the championship all the way through bowl season.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 bg-brand rounded-full flex items-center justify-center text-text-inverse text-xl font-bold mx-auto mb-4">
                  {step}
                </div>
                <h3 className="brand-h3 text-xl mb-3 text-text-primary">{title}</h3>
                <p className="text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Commissioner CTA ── */}
      <section id="commissioner" className="py-16 md:py-24" style={{ backgroundColor: '#F5A623' }}>
        <div className="container mx-auto px-4 md:px-8 max-w-3xl text-center">
          <h2 className="brand-h2 text-2xl md:text-4xl text-text-inverse mb-4">
            Be a Founding Commissioner
          </h2>
          <p className="text-lg mb-10 leading-relaxed" style={{ color: 'rgba(13, 21, 32, 0.75)' }}>
            Build your league first, free for life. As a founding commissioner,
            you&apos;ll shape the Rivyls experience and lock in permanent perks
            for your league.
          </p>
          <Suspense fallback={<div className="h-48" />}>
            <EmailCaptureForm source="commissioner" inverted />
          </Suspense>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="container mx-auto px-4 md:px-8 py-16 md:py-24">
        <h2 className="brand-h2 text-2xl md:text-4xl text-text-primary text-center mb-12 md:mb-16">
          Built for College Football Fans
        </h2>
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {[
            {
              title: 'Live Draft',
              desc: 'Real-time snake or linear drafts with customizable timers. Draft from anywhere — desktop or mobile.',
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              ),
            },
            {
              title: 'Real-Time Scoring',
              desc: 'Watch your points update as games unfold. Every win, upset, and shutout counts toward your total.',
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              ),
            },
            {
              title: 'Weekly Prizes',
              desc: 'Compete for weekly high-point honors. Every week is a new chance to win, keeping the excitement alive all season.',
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-7.54 0" />
                </svg>
              ),
            },
          ].map(({ title, desc, icon }) => (
            <div
              key={title}
              className="bg-surface rounded-xl p-6 md:p-8 border border-border"
            >
              <div className="text-brand mb-4">{icon}</div>
              <h3 className="brand-h3 text-lg mb-2 text-text-primary">{title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 md:px-8 text-center text-text-muted text-sm">
          <p>&copy; 2026 Rivyls. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
