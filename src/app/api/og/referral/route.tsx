import { ImageResponse } from '@vercel/og'
import { createAdminClient } from '@/lib/supabase/server'
import { CardLayout } from '@/lib/og/card-layout'
import { loadFonts } from '@/lib/og/fonts'
import { OG } from '@/lib/og/constants'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return new Response('Missing userId', { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single()

  const displayName = profile?.display_name || 'A friend'
  const fonts = await loadFonts()

  return new ImageResponse(
    (
      <CardLayout footerText="Be a Founding Commissioner">
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontSize: 28, color: OG.textSecondary, marginBottom: 12 }}>
            {displayName} wants you to
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 44,
              fontFamily: 'Montserrat',
              fontWeight: 700,
              color: OG.gold,
              marginBottom: 40,
            }}
          >
            Start a league on Rivyls
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', fontSize: 24, color: OG.textPrimary }}>
              🏈 Fantasy College Football
            </div>
            <div style={{ display: 'flex', fontSize: 24, color: OG.textPrimary }}>
              🏆 Draft teams. Compete with friends. Win prizes.
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 16,
                fontSize: 22,
                color: OG.gold,
                fontFamily: 'Montserrat',
                fontWeight: 700,
              }}
            >
              Sign up free →
            </div>
          </div>
        </div>
      </CardLayout>
    ),
    {
      width: OG.width,
      height: OG.height,
      fonts: [
        { name: 'Montserrat', data: fonts.montserratBold, weight: 700 as const },
        { name: 'Inter', data: fonts.interRegular, weight: 400 as const },
      ],
    }
  )
}
