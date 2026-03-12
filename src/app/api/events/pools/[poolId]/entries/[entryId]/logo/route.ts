import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 500 * 1024 // 500KB
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string; entryId: string }> }
) {
  try {
    const { entryId } = await params
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const supabase = createAdminClient()

    // Verify ownership
    const { data: entry } = await supabase
      .from('event_entries')
      .select('id, user_id')
      .eq('id', entryId)
      .single()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }
    if (entry.user_id !== user.id) {
      return NextResponse.json({ error: 'Not your entry' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Accepted: PNG, JPG, GIF, WEBP, SVG' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 500KB.' },
        { status: 400 }
      )
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const filePath = `entries/${entryId}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('team-logos')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: 'Upload failed. Please try again.' },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase.storage
      .from('team-logos')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    await supabase
      .from('event_entries')
      .update({ image_url: publicUrl })
      .eq('id', entryId)

    return NextResponse.json({ url: publicUrl })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
