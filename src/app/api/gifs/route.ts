import { NextRequest, NextResponse } from 'next/server'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 })

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || ''
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs'

interface GiphyImage {
  url: string
  width: string
  height: string
}

interface GiphyResult {
  id: string
  title: string
  images: {
    fixed_width_small?: GiphyImage
    fixed_width?: GiphyImage
    original?: GiphyImage
  }
}

export async function GET(request: NextRequest) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  if (!GIPHY_API_KEY) {
    return NextResponse.json({ error: 'GIF service not configured' }, { status: 503 })
  }

  const q = request.nextUrl.searchParams.get('q')

  try {
    let url: string
    if (q && q.trim()) {
      url = `${GIPHY_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=20&rating=pg-13&lang=en`
    } else {
      url = `${GIPHY_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=pg-13`
    }

    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch GIFs' }, { status: 502 })
    }

    const data = await res.json()
    const results = (data.data || []).map((r: GiphyResult) => ({
      id: r.id,
      title: r.title,
      preview: r.images?.fixed_width_small?.url || r.images?.fixed_width?.url || '',
      url: r.images?.fixed_width?.url || r.images?.original?.url || '',
      width: parseInt(r.images?.fixed_width?.width || '200', 10),
      height: parseInt(r.images?.fixed_width?.height || '150', 10),
    }))

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch GIFs' }, { status: 500 })
  }
}
