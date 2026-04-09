'use client'

import { useState } from 'react'

export interface RuleHighlight {
  icon: string
  label: string
  description: string
}

interface RulesHighlightsProps {
  highlights: RuleHighlight[]
  rulesText?: string | null
  tournamentName?: string
}

export function RulesHighlights({ highlights, rulesText, tournamentName }: RulesHighlightsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showFull, setShowFull] = useState(false)

  if (!highlights || highlights.length === 0) return null

  return (
    <div className="mb-6">
      {/* Gold gradient separator flourish */}
      <div className="flex justify-center mb-3">
        <div className="h-px w-32 bg-gradient-to-r from-transparent via-brand to-transparent" />
      </div>

      <div className="bg-surface border border-border rounded-lg">
        {/* Collapsible header */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 hover:bg-surface-inset/30 transition-colors rounded-lg"
          aria-expanded={isOpen}
        >
          <h3 className="brand-h3 text-sm text-brand uppercase tracking-wider">
            How to Play{tournamentName && ` · ${tournamentName}`}
          </h3>
          <svg
            className={`w-4 h-4 text-brand transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Collapsible body */}
        {isOpen && (
          <div className="px-5 pb-5 pt-1">
            {/* Icon tile grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {highlights.map((rule, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="text-2xl leading-none shrink-0 w-8 text-center" aria-hidden>
                    {rule.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-text-primary font-semibold">
                      {rule.label}
                    </div>
                    <p className="text-xs italic text-text-muted leading-snug mt-0.5">
                      {rule.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Full rules expand */}
            {rulesText && (
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <button
                  onClick={() => setShowFull(!showFull)}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors mx-auto"
                >
                  <svg className={`w-3 h-3 transition-transform ${showFull ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {showFull ? 'Hide full rules' : 'View full rules'}
                </button>
                {showFull && (
                  <div className="mt-3 text-sm text-text-secondary [&_h2]:text-text-primary [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-1 [&_h3]:text-text-primary [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1">
                    {parseRulesMarkdown(rulesText)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gold gradient separator flourish */}
      <div className="flex justify-center mt-3">
        <div className="h-px w-32 bg-gradient-to-r from-transparent via-brand to-transparent" />
      </div>
    </div>
  )
}

function parseRulesMarkdown(rulesText: string): React.ReactNode[] {
  const lines = rulesText.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: React.ReactNode[] = []
  let listType: 'ul' | 'ol' | null = null

  const flushList = () => {
    if (listItems.length > 0) {
      const key = `list-${elements.length}`
      if (listType === 'ol') {
        elements.push(<ol key={key} className="list-decimal pl-6 space-y-1">{listItems}</ol>)
      } else {
        elements.push(<ul key={key} className="list-disc pl-6 space-y-1">{listItems}</ul>)
      }
      listItems = []
      listType = null
    }
  }

  lines.forEach((line, i) => {
    if (line.startsWith('## ')) { flushList(); elements.push(<h2 key={i}>{line.replace('## ', '')}</h2>) }
    else if (line.startsWith('### ')) { flushList(); elements.push(<h3 key={i}>{line.replace('### ', '')}</h3>) }
    else if (line.startsWith('- ')) { listType = listType || 'ul'; listItems.push(<li key={i}>{line.replace('- ', '')}</li>) }
    else if (line.match(/^\d+\./)) { listType = listType || 'ol'; listItems.push(<li key={i}>{line.replace(/^\d+\.\s*/, '')}</li>) }
    else if (line.trim() === '') { flushList() }
    else { flushList(); elements.push(<p key={i}>{line}</p>) }
  })
  flushList()
  return elements
}
