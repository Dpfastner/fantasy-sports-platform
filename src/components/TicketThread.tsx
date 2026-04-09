'use client'

interface ProfileData { display_name: string | null; email: string }

interface Response {
  id: string
  content: string
  is_admin: boolean
  is_ai_generated: boolean
  created_at: string
  // Supabase FK joins may return object or array depending on the relationship
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles?: ProfileData | ProfileData[] | null
}

interface TicketThreadProps {
  responses: Response[]
  currentUserId: string
}

export default function TicketThread({ responses, currentUserId }: TicketThreadProps) {
  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">
        No responses yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {responses.map(r => {
        // Normalize profiles (Supabase may return array or object)
        const profile: ProfileData | null = Array.isArray(r.profiles)
          ? r.profiles[0] || null
          : r.profiles || null

        return (
          <div
            key={r.id}
            className={`flex ${r.is_admin ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                r.is_admin
                  ? 'bg-surface border border-brand/20'
                  : 'bg-surface border border-border'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium ${r.is_admin ? 'text-brand-text' : 'text-text-secondary'}`}>
                  {r.is_admin ? 'Rivyls Team' : (profile?.display_name || profile?.email || 'You')}
                </span>
                {r.is_ai_generated && (
                  <span className="text-xs text-text-muted flex items-center gap-0.5" title="AI-assisted response">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 4.346a1 1 0 01-.025.846A3.955 3.955 0 0115 15.5a3.955 3.955 0 01-2.927-2.797l-1.738-4.346L10 8.5l-.335-.143-1.738 4.346A3.955 3.955 0 015 15.5a3.955 3.955 0 01-2.927-2.797 1 1 0 01-.025-.846l1.738-4.346-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                    </svg>
                    AI
                  </span>
                )}
              </div>
              <p className="text-text-primary text-sm whitespace-pre-wrap">{r.content}</p>
              <p className="text-text-muted text-xs mt-2">
                {new Date(r.created_at).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
