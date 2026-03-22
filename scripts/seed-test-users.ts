import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.log('Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const admin = createClient(url, key)

const BASE_EMAIL = 'danielpfastner@gmail.com'
const PASSWORD = 'RivylsTest2026!'
const COUNT = 10

async function seed() {
  console.log(`Creating ${COUNT} test accounts using ${BASE_EMAIL} aliases...\n`)

  const [localPart, domain] = BASE_EMAIL.split('@')
  let created = 0
  let skipped = 0

  for (let i = 1; i <= COUNT; i++) {
    const email = `${localPart}+tester${i}@${domain}`
    const displayName = `Tester ${i}`

    // Check if user already exists
    const { data: existing } = await admin.auth.admin.listUsers()
    const alreadyExists = existing?.users?.some(u => u.email === email)

    if (alreadyExists) {
      console.log(`  [skip] ${email} — already exists`)
      skipped++
      continue
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    })

    if (error) {
      console.log(`  [error] ${email} — ${error.message}`)
    } else {
      console.log(`  [created] ${email} — ${displayName} (${data.user.id})`)
      created++
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`)
  console.log(`\nAll accounts use password: ${PASSWORD}`)
  console.log('Login at: https://rivyls.com/login')
}

seed().catch(console.error)
