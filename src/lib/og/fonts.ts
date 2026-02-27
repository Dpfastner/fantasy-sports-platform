/**
 * Load fonts for Satori/OG image rendering.
 * Reads bundled .ttf files via fs.readFile.
 * Requires outputFileTracingIncludes in next.config.ts to bundle on Vercel.
 */

import { readFile } from 'fs/promises'
import { join } from 'path'

let fontCache: { montserratBold: ArrayBuffer; interRegular: ArrayBuffer } | null = null

export async function loadFonts() {
  if (fontCache) return fontCache

  const fontsDir = join(process.cwd(), 'src', 'lib', 'og', 'fonts')

  const [montserratBuffer, interBuffer] = await Promise.all([
    readFile(join(fontsDir, 'Montserrat-Bold.ttf')),
    readFile(join(fontsDir, 'Inter-Regular.ttf')),
  ])

  fontCache = {
    montserratBold: montserratBuffer.buffer.slice(
      montserratBuffer.byteOffset,
      montserratBuffer.byteOffset + montserratBuffer.byteLength
    ) as ArrayBuffer,
    interRegular: interBuffer.buffer.slice(
      interBuffer.byteOffset,
      interBuffer.byteOffset + interBuffer.byteLength
    ) as ArrayBuffer,
  }
  return fontCache
}
