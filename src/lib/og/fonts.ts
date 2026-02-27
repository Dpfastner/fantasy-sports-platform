/**
 * Load fonts for Satori/OG image rendering.
 * Reads static TTF files bundled in public/fonts/.
 */

import { readFile } from 'fs/promises'
import { join } from 'path'

let fontCache: { montserratBold: ArrayBuffer; interRegular: ArrayBuffer } | null = null

export async function loadFonts() {
  if (fontCache) return fontCache

  const fontsDir = join(process.cwd(), 'public', 'fonts')

  const [montserratBold, interRegular] = await Promise.all([
    readFile(join(fontsDir, 'Montserrat-Bold.ttf')),
    readFile(join(fontsDir, 'Inter-Regular.ttf')),
  ])

  fontCache = {
    montserratBold: montserratBold.buffer as ArrayBuffer,
    interRegular: interRegular.buffer as ArrayBuffer,
  }
  return fontCache
}
