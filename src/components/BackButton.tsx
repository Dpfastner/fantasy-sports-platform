'use client'

import { useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.back()}
      className="text-text-secondary hover:text-text-primary text-sm transition-colors"
    >
      &larr; Back
    </button>
  )
}
