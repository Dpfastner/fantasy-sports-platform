import type { Metadata } from 'next'
import Link from 'next/link'
import BackButton from '@/components/BackButton'

export const metadata: Metadata = {
  title: 'Do Not Sell or Share My Personal Information — Rivyls',
  description: 'Rivyls does not sell or share your personal information. Learn about your privacy rights.',
  robots: { index: true, follow: true },
}

export default function DoNotSellPage() {
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
          <h1 className="text-2xl font-bold mb-1">Do Not Sell or Share My Personal Information</h1>
          <div className="text-sm text-text-muted">
            <span>California Consumer Privacy Act (CCPA/CPRA) Notice</span>
          </div>
        </div>

        <div className="legal-content">
          <h2>We Do Not Sell Your Data</h2>
          <p>
            Rivyls LLC does not sell, rent, or share your personal information with third parties
            for their own marketing or advertising purposes. We have never sold personal information
            and have no plans to do so.
          </p>

          <h2>What This Means for You</h2>
          <p>
            Under the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA),
            California residents have the right to opt out of the &ldquo;sale&rdquo; or &ldquo;sharing&rdquo;
            of their personal information. Because Rivyls does not sell or share your personal information
            as defined by these laws, there is no sale or sharing to opt out of.
          </p>

          <h2>Your Privacy Rights</h2>
          <p>Regardless of your state of residence, you have the right to:</p>
          <ul className="list-disc pl-6 space-y-2 my-4 text-text-secondary">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate personal information</li>
            <li>Request deletion of your personal information</li>
            <li>Receive a copy of your data in a portable format</li>
            <li>Opt out of promotional communications</li>
          </ul>
          <p>
            You can delete your account and associated data at any time from
            your <Link href="/settings" className="text-brand-text hover:underline">Account Settings</Link>.
          </p>

          <h2>Global Privacy Control (GPC)</h2>
          <p>
            Rivyls honors the Global Privacy Control (GPC) browser signal. If your browser sends a
            GPC signal, we treat it as a valid opt-out request for the sale or sharing of personal
            information. Since we do not sell or share your data, this signal is acknowledged but
            requires no change to how we handle your information.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have questions about your privacy rights or wish to submit a privacy request,
            please contact us at:
          </p>
          <div className="my-3 leading-loose">
            <strong className="block">Rivyls LLC</strong>
            Email: privacy@rivyls.com<br />
            Website: www.rivyls.com
          </div>
          <p>
            For full details on how we collect, use, and protect your information, please review
            our <Link href="/privacy" className="text-brand-text hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </main>

    </div>
  )
}
