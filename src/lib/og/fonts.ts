/**
 * Load fonts for Satori/OG image rendering.
 * Fetches from Google Fonts CDN — cached automatically by Vercel edge.
 */

let fontCache: { montserratBold: ArrayBuffer; interRegular: ArrayBuffer } | null = null

export async function loadFonts() {
  if (fontCache) return fontCache

  const [montserratBold, interRegular] = await Promise.all([
    fetch(
      'https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM70w-Y3tcoqK5.ttf'
    ).then((res) => res.arrayBuffer()),
    fetch(
      'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2'
    ).then((res) => res.arrayBuffer()),
  ])

  fontCache = { montserratBold, interRegular }
  return fontCache
}
