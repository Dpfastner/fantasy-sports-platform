/**
 * Load fonts for Satori/OG image rendering.
 * Uses fetch + new URL() pattern so the bundler traces and includes the font files.
 */

let fontCache: { montserratBold: ArrayBuffer; interRegular: ArrayBuffer } | null = null

export async function loadFonts() {
  if (fontCache) return fontCache

  const [montserratBold, interRegular] = await Promise.all([
    fetch(new URL('./fonts/Montserrat-Bold.ttf', import.meta.url)).then((res) => res.arrayBuffer()),
    fetch(new URL('./fonts/Inter-Regular.ttf', import.meta.url)).then((res) => res.arrayBuffer()),
  ])

  fontCache = { montserratBold, interRegular }
  return fontCache
}
