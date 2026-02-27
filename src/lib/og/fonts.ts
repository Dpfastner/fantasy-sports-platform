/**
 * Load fonts for Satori/OG image rendering.
 * Fonts are embedded as base64 strings — no filesystem or network dependency.
 */

import { MONTSERRAT_BOLD_BASE64, INTER_REGULAR_BASE64 } from './font-data'

let fontCache: { montserratBold: ArrayBuffer; interRegular: ArrayBuffer } | null = null

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer as ArrayBuffer
}

export function loadFonts() {
  if (fontCache) return fontCache

  fontCache = {
    montserratBold: base64ToArrayBuffer(MONTSERRAT_BOLD_BASE64),
    interRegular: base64ToArrayBuffer(INTER_REGULAR_BASE64),
  }
  return fontCache
}
