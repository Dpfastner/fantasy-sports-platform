'use client'

import { useState, useEffect, useRef } from 'react'

interface GifResult {
  id: string
  title: string
  preview: string
  url: string
  width: number
  height: number
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void
  onClose: () => void
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GifResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    // Load trending on mount
    fetchGifs('')
  }, [])

  const fetchGifs = async (q: string) => {
    setLoading(true)
    try {
      const url = q ? `/api/gifs?q=${encodeURIComponent(q)}` : '/api/gifs'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchGifs(value), 300)
  }

  return (
    <div className="absolute bottom-full left-3 right-3 mb-1 bg-surface border border-border rounded-lg shadow-lg z-10 flex flex-col" style={{ maxHeight: '320px' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-text-primary">GIFs</span>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-secondary transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="px-3 py-2 border-b border-border shrink-0">
        <input
          type="text"
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search GIFs..."
          className="w-full px-2 py-1.5 bg-surface-inset border border-border rounded text-text-primary text-xs placeholder:text-text-muted"
          autoFocus
        />
      </div>
      <div className="overflow-y-auto flex-1 p-2">
        {loading ? (
          <p className="text-text-muted text-xs text-center py-4">Loading...</p>
        ) : results.length === 0 ? (
          <p className="text-text-muted text-xs text-center py-4">No GIFs found</p>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {results.map(gif => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif.url)}
                className="rounded overflow-hidden hover:ring-2 hover:ring-brand transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gif.preview}
                  alt={gif.title}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-3 py-1.5 border-t border-border flex justify-end shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/powered-by-giphy.png" alt="Powered by GIPHY" className="h-3 w-auto opacity-70" />
      </div>
    </div>
  )
}
