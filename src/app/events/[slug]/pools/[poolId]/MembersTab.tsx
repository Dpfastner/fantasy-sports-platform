'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import { EntryAvatar } from '@/components/EntryAvatar'

interface Member {
  id: string
  userId: string | null
  displayName: string
  isActive: boolean
  submittedAt: string | null
  primaryColor?: string | null
  imageUrl?: string | null
}

interface MembersTabProps {
  members: Member[]
  poolId: string
  isCreator: boolean
  userId: string | null
}

export function MembersTab({ members, poolId, isCreator, userId }: MembersTabProps) {
  const { addToast } = useToast()
  const { confirm } = useConfirm()
  const router = useRouter()

  return (
    <div className="space-y-2">
      {members.map((member, i) => (
        <div
          key={member.id}
          className="bg-surface rounded-lg border border-border p-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-text-muted text-sm w-6 text-right">{i + 1}</span>
            <EntryAvatar imageUrl={member.imageUrl} primaryColor={member.primaryColor} showBorder />
            <div>
              {member.userId ? (
                <Link href={`/profile/${member.userId}`} className="text-text-primary text-sm font-medium hover:underline">{member.displayName}</Link>
              ) : (
                <span className="text-sm text-text-muted italic">{member.displayName}</span>
              )}
              {!member.isActive && (
                <span className="ml-2 text-xs text-danger-text">Eliminated</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {member.submittedAt ? (
              <span className="text-xs text-success-text">Picks in</span>
            ) : (
              <span className="text-xs text-text-muted">No picks yet</span>
            )}
            {isCreator && member.userId !== userId && (
              <button
                onClick={async () => {
                  const ok = await confirm({ title: 'Remove member', message: `Remove ${member.displayName} from the pool?`, variant: 'danger', confirmLabel: 'Remove' })
                  if (!ok) return
                  try {
                    const res = await fetch(`/api/events/pools/${poolId}/members/${member.id}`, { method: 'DELETE' })
                    if (res.ok) {
                      addToast('Member removed', 'success')
                      router.refresh()
                    } else {
                      const data = await res.json()
                      addToast(data.error || 'Couldn\'t remove member. Try again.', 'error')
                    }
                  } catch {
                    addToast('Something went wrong', 'error')
                  }
                }}
                className="text-[10px] text-text-muted hover:text-danger-text transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
