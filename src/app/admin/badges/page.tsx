import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import type { BadgeDefinition } from '@/types/database'
import { IconUploader } from './IconUploader'

export default async function BadgesAdminPage() {
  const supabase = createAdminClient()

  const { data: badgeDefsData } = await supabase
    .from('badge_definitions')
    .select('*')
    .order('sort_order', { ascending: true })

  const badgeDefinitions = (badgeDefsData || []) as BadgeDefinition[]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Badge Definitions</h1>
        <p className="text-text-secondary mb-8">
          All badge types available on the platform. To grant badges to users, go to{' '}
          <Link href="/admin/users" className="text-brand hover:text-brand-hover underline">
            User Management
          </Link>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {badgeDefinitions.map((def) => {
            const iconChar = def.fallback_icon === 'trophy' ? '\u{1F3C6}' : def.fallback_icon === 'medal' ? '\u{1F3C5}' : def.fallback_icon === 'flag' ? '\u{1F6A9}' : def.fallback_icon === 'crown' ? '\u{1F451}' : '\u2B50'
            return (
              <div key={def.id} className="bg-surface border border-border rounded-lg p-5">
                {/* Badge preview */}
                <div className="flex justify-center mb-4">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center border-2"
                    style={{ borderColor: def.color, backgroundColor: def.bg_color }}
                  >
                    {def.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={def.icon_url} alt="" className="w-12 h-12 object-contain" />
                    ) : (
                      <span className="text-4xl">{iconChar}</span>
                    )}
                  </div>
                </div>
                <h3 className="text-text-primary font-semibold text-center mb-1">{def.label}</h3>
                <p className="text-text-secondary text-sm text-center mb-2">{def.description}</p>
                <div className="flex items-center justify-center gap-2 text-text-muted text-xs mb-3">
                  <span>{def.category}</span>
                  <span>|</span>
                  <span>{def.slug}</span>
                </div>
                {def.requires_metadata && (
                  <div className="text-center mb-3">
                    <span className="text-xs text-warning-text bg-warning/10 px-2 py-0.5 rounded">Requires metadata</span>
                  </div>
                )}
                <IconUploader badgeDefinitionId={def.id} currentIconUrl={def.icon_url} />
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
