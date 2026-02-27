'use client'

import { useState } from 'react'

export function CopyButton({ text, label = 'Copy Link' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-4 py-2 bg-brand hover:bg-brand-hover text-text-primary font-semibold rounded-lg transition-colors text-sm whitespace-nowrap"
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}
