'use client'

import { useState, useRef } from 'react'
import { uploadBadgeIcon } from '@/app/actions/admin'

interface IconUploaderProps {
  badgeDefinitionId: string
  currentIconUrl: string | null
}

export function IconUploader({ badgeDefinitionId, currentIconUrl }: IconUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('file', file)

    const result = await uploadBadgeIcon(badgeDefinitionId, formData)
    setUploading(false)

    if (result.success) {
      setMessage('Uploaded!')
      setTimeout(() => window.location.reload(), 1000)
    } else {
      setMessage(result.error || 'Upload failed')
    }
  }

  return (
    <div className="text-center">
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="text-xs text-text-muted hover:text-brand transition-colors disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : currentIconUrl ? 'Change Icon' : 'Upload Icon'}
      </button>
      {message && <div className="text-xs mt-1 text-success-text">{message}</div>}
    </div>
  )
}
