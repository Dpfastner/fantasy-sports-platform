import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "https://f126b8238e955fa69480f25ab96b355c@o4510954773807104.ingest.us.sentry.io/4510954776821760",

  // Only send errors in production/sandbox, not local dev
  enabled: process.env.NEXT_PUBLIC_ENVIRONMENT !== "development",

  // Sample 100% of errors (adjust down if you hit free tier limits)
  sampleRate: 1.0,

  // Performance monitoring — sample 10% of transactions
  tracesSampleRate: 0.1,

  // Tag with environment for filtering in Sentry dashboard
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || "development",
})
