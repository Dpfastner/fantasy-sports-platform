import Link from 'next/link'
import ReportIssue from './ReportIssue'

export default function Footer() {
  return (
    <footer className="border-t border-border py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-surface">
      <div className="max-w-7xl mx-auto px-4 md:px-8 text-text-muted text-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>&copy; 2026 Rivyls. All rights reserved.</p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link href="/terms" className="hover:text-text-primary transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-text-primary transition-colors">Privacy</Link>
            <Link href="/do-not-sell" className="hover:text-text-primary transition-colors">Do Not Sell</Link>
            <Link href="/help" className="hover:text-text-primary transition-colors">Help</Link>
            <Link href="/support" className="hover:text-text-primary transition-colors">Support Rivyls</Link>
            <ReportIssue />
          </div>
        </div>
      </div>
    </footer>
  )
}
