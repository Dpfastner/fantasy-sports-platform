import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/og/*': ['./src/lib/og/fonts/**/*.ttf'],
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress Sentry CLI logs during build
  silent: true,

  // Source maps upload requires SENTRY_AUTH_TOKEN env var (set in Vercel when ready)
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
