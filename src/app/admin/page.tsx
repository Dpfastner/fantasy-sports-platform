import Link from 'next/link'

const adminPages = [
  {
    href: '/admin/sync',
    title: 'Data Sync',
    description: 'Sync schools, games, rankings, and live scores from external APIs.',
  },
  {
    href: '/admin/badges',
    title: 'Badges',
    description: 'Manage badge definitions, grant/revoke badges, upload icons.',
  },
  {
    href: '/admin/analytics',
    title: 'Analytics',
    description: 'Platform metrics, user activity, and usage trends.',
  },
  {
    href: '/admin/reports',
    title: 'Issue Reports',
    description: 'View and manage user-submitted bug reports and issues.',
  },
]

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <header className="bg-surface/50 border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-text-primary">
            Rivyls
          </Link>
          <span className="text-text-primary font-medium">Admin</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Admin Dashboard</h1>
        <p className="text-text-secondary mb-8">Platform management tools.</p>

        <div className="grid gap-4">
          {adminPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="block bg-surface rounded-lg p-6 hover:bg-surface-subtle transition-colors border border-border"
            >
              <h2 className="text-xl font-semibold text-text-primary mb-1">{page.title}</h2>
              <p className="text-text-secondary text-sm">{page.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
