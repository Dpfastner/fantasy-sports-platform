import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAllTeams, matchTeamToSchool, getTeamLogoUrl } from '@/lib/api/espn'

// Create admin client lazily at runtime (not build time)
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }

  return createClient(url, key)
}

export async function POST(request: Request) {
  try {
    // Check for authorization (basic security)
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.SYNC_API_KEY || 'sync-schools-key'

    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch all ESPN teams
    console.log('Fetching ESPN teams...')
    const espnTeams = await fetchAllTeams()
    console.log(`Found ${espnTeams.length} ESPN teams`)

    // Fetch all schools from our database
    const { data: schools, error: schoolsError } = await getSupabaseAdmin()
      .from('schools')
      .select('id, name, external_api_id, logo_url')

    if (schoolsError) {
      console.error('Error fetching schools:', schoolsError)
      return NextResponse.json(
        { error: 'Failed to fetch schools' },
        { status: 500 }
      )
    }

    const updates: { id: string; name: string; external_api_id: string; logo_url: string }[] = []
    const notFound: string[] = []

    // Match each school to an ESPN team
    for (const school of schools || []) {
      const matchedTeam = espnTeams.find(espnTeam =>
        matchTeamToSchool(espnTeam, school.name)
      )

      if (matchedTeam) {
        const logoUrl = getTeamLogoUrl(matchedTeam)
        if (logoUrl) {
          updates.push({
            id: school.id,
            name: school.name,
            external_api_id: matchedTeam.id,
            logo_url: logoUrl,
          })
        }
      } else {
        notFound.push(school.name)
      }
    }

    console.log(`Matched ${updates.length} schools, ${notFound.length} not found`)

    // Update the database
    let successCount = 0
    let errorCount = 0

    for (const update of updates) {
      const { error: updateError } = await getSupabaseAdmin()
        .from('schools')
        .update({
          external_api_id: update.external_api_id,
          logo_url: update.logo_url,
        })
        .eq('id', update.id)

      if (updateError) {
        console.error(`Error updating ${update.name}:`, updateError)
        errorCount++
      } else {
        successCount++
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalSchools: schools?.length || 0,
        matched: updates.length,
        notFound: notFound.length,
        updated: successCount,
        errors: errorCount,
      },
      notFoundSchools: notFound,
      updates: updates.map(u => ({
        name: u.name,
        espnId: u.external_api_id,
        logoUrl: u.logo_url,
      })),
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'School sync endpoint',
    usage: 'POST with Authorization: Bearer <SYNC_API_KEY>',
  })
}
