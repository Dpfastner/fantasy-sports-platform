import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "https://f126b8238e955fa69480f25ab96b355c@o4510954773807104.ingest.us.sentry.io/4510954776821760",

  enabled: process.env.NEXT_PUBLIC_ENVIRONMENT !== "development",

  sampleRate: 1.0,

  tracesSampleRate: 0.1,

  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || "development",
})
