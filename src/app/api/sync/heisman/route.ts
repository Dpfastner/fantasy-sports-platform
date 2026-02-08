import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(url, key)
}

// Known Heisman winners data (Wikipedia-sourced)
// This provides reliable fallback data when scraping fails
const KNOWN_HEISMAN_WINNERS: Record<number, { playerName: string; school: string; awardedAt: string }> = {
  2025: { playerName: 'Fernando Mendoza', school: 'Indiana', awardedAt: '2025-12-13' },
  2024: { playerName: 'Travis Hunter', school: 'Colorado', awardedAt: '2024-12-14' },
  2023: { playerName: 'Jayden Daniels', school: 'LSU', awardedAt: '2023-12-09' },
  2022: { playerName: 'Caleb Williams', school: 'USC', awardedAt: '2022-12-10' },
  2021: { playerName: 'Bryce Young', school: 'Alabama', awardedAt: '2021-12-11' },
  2020: { playerName: 'DeVonta Smith', school: 'Alabama', awardedAt: '2021-01-05' },
  2019: { playerName: 'Joe Burrow', school: 'LSU', awardedAt: '2019-12-14' },
  2018: { playerName: 'Kyler Murray', school: 'Oklahoma', awardedAt: '2018-12-08' },
  2017: { playerName: 'Baker Mayfield', school: 'Oklahoma', awardedAt: '2017-12-09' },
  2016: { playerName: 'Lamar Jackson', school: 'Louisville', awardedAt: '2016-12-10' },
  2015: { playerName: 'Derrick Henry', school: 'Alabama', awardedAt: '2015-12-12' },
}

interface SyncHeismanRequest {
  year?: number
}

export async function POST(request: Request) {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.SYNC_API_KEY || 'fantasy-sports-sync-2024'

    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SyncHeismanRequest = await request.json().catch(() => ({}))
    const year = body.year || new Date().getFullYear()

    const supabase = getSupabaseAdmin()

    // Get season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('year', year)
      .single()

    if (!season) {
      return NextResponse.json({ error: `Season ${year} not found` }, { status: 404 })
    }

    // Check if we have known data for this year
    const knownWinner = KNOWN_HEISMAN_WINNERS[year]

    if (!knownWinner) {
      return NextResponse.json({
        error: `No Heisman data available for ${year}`,
        availableYears: Object.keys(KNOWN_HEISMAN_WINNERS).map(Number).sort((a, b) => b - a),
        note: 'Add winner data to the KNOWN_HEISMAN_WINNERS object or wait for the ceremony',
      }, { status: 404 })
    }

    // Find the school in our database
    const { data: schools } = await supabase
      .from('schools')
      .select('id, name')
      .or(`name.ilike.%${knownWinner.school}%,abbreviation.ilike.%${knownWinner.school}%`)

    if (!schools || schools.length === 0) {
      return NextResponse.json({
        error: `School "${knownWinner.school}" not found in database`,
        winner: knownWinner,
      }, { status: 404 })
    }

    // Use the first matching school
    const school = schools[0]

    // Check if already exists
    const { data: existing } = await supabase
      .from('heisman_winners')
      .select('id')
      .eq('season_id', season.id)
      .single()

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('heisman_winners')
        .update({
          school_id: school.id,
          player_name: knownWinner.playerName,
          awarded_at: knownWinner.awardedAt,
        })
        .eq('id', existing.id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update', details: updateError }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'updated',
        year,
        winner: {
          playerName: knownWinner.playerName,
          school: school.name,
          awardedAt: knownWinner.awardedAt,
        },
      })
    }

    // Insert new
    const { error: insertError } = await supabase
      .from('heisman_winners')
      .insert({
        season_id: season.id,
        school_id: school.id,
        player_name: knownWinner.playerName,
        awarded_at: knownWinner.awardedAt,
      })

    if (insertError) {
      return NextResponse.json({ error: 'Failed to insert', details: insertError }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      action: 'created',
      year,
      winner: {
        playerName: knownWinner.playerName,
        school: school.name,
        awardedAt: knownWinner.awardedAt,
      },
    })
  } catch (error) {
    console.error('Heisman sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Heisman Trophy sync endpoint',
    usage: 'POST with { year: 2024 } and Authorization: Bearer <SYNC_API_KEY>',
    availableYears: Object.keys(KNOWN_HEISMAN_WINNERS).map(Number).sort((a, b) => b - a),
    data: KNOWN_HEISMAN_WINNERS,
    note: 'Winners are sourced from Wikipedia. Update KNOWN_HEISMAN_WINNERS for new years.',
  })
}
