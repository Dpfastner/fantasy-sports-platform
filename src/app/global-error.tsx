"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body style={{ backgroundColor: "#1A0F28", color: "#FAF5EE", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", maxWidth: 480, padding: 32 }}>
          <h2 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: "#94A3B8", marginBottom: 24 }}>Something went wrong. Our team has been notified.</p>
          <button
            onClick={reset}
            style={{ padding: "10px 24px", backgroundColor: "#F59E0B", color: "#1A0F28", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 16, fontWeight: 600 }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
