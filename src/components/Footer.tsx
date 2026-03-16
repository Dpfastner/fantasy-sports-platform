import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-border py-6 relative z-30 bg-surface">
      <div className="max-w-7xl mx-auto px-4 md:px-8 text-text-muted text-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>&copy; 2026 Rivyls. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-text-primary transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-text-primary transition-colors">Privacy</Link>
            <Link href="/do-not-sell" className="hover:text-text-primary transition-colors">Do Not Sell</Link>
            <Link href="/help" className="hover:text-text-primary transition-colors">Help</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
