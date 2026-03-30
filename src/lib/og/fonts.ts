/**
 * Load fonts for Satori/OG image rendering.
 * Fonts are embedded as base64 strings — no filesystem or network dependency.
 */

import { MONTSERRAT_BOLD_BASE64, INTER_REGULAR_BASE64 } from './font-data'

let fontCache: { montserratBold: ArrayBuffer; interRegular: ArrayBuffer; notoEmoji?: ArrayBuffer } | null = null

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

let emojiCache: ArrayBuffer | null = null

/** Load Noto Emoji font for rendering emoji in OG images. Cached after first fetch. */
export async function loadEmojiFont(): Promise<ArrayBuffer | null> {
  if (emojiCache) return emojiCache
  try {
    // Google's Noto Emoji (monochrome) — known to work with Satori
    const res = await fetch('https://raw.githubusercontent.com/googlefonts/noto-emoji/main/fonts/NotoEmoji-Bold.ttf')
    if (!res.ok) return null
    emojiCache = await res.arrayBuffer()
    return emojiCache
  } catch {
    return null
  }
}
