import { SITE_URL } from '@/lib/og/constants'

type ShareSource = 'leaderboard' | 'bracket' | 'recap' | 'invite' | 'referral'

export function buildShareUrl(
  path: string,
  params: {
    source: ShareSource
    medium?: 'social' | 'copy' | 'webshare'
    campaign?: string
  }
): string {
  const url = new URL(path, SITE_URL)
  url.searchParams.set('utm_source', 'rivyls')
  url.searchParams.set('utm_medium', params.medium || 'social')
  url.searchParams.set('utm_campaign', params.source)
  if (params.campaign) {
    url.searchParams.set('utm_content', params.campaign)
  }
  return url.toString()
}
