'use client'

import { useState, useCallback } from 'react'
import { getTrashTalkPrompts } from '@/lib/trash-talk'

interface TrashTalkPickerProps {
  onSelect: (prompt: string) => void
  onClose: () => void
}

export function TrashTalkPicker({ onSelect, onClose }: TrashTalkPickerProps) {
  const [prompts, setPrompts] = useState(() => getTrashTalkPrompts())

  const shuffle = useCallback(() => {
    setPrompts(getTrashTalkPrompts())
  }, [])

  return (
    <div className="absolute bottom-full left-3 right-3 mb-1 bg-surface border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-primary">Trash Talk</span>
        <div className="flex items-center gap-2">
          <button
            onClick={shuffle}
            className="text-[10px] text-text-muted hover:text-text-secondary transition-colors"
          >
            Shuffle
          </button>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {prompts.map((prompt, i) => (
        <button
          key={i}
          onClick={() => onSelect(prompt)}
          className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors border-b border-border last:border-b-0"
        >
          {prompt}
        </button>
      ))}
    </div>
  )
}
