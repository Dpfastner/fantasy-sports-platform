import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.log('Missing env vars')
  process.exit(1)
}
const admin = createClient(url, key)

// All NCAA D1 Men's Ice Hockey programs (63 schools)
// Conferences: Hockey East, NCHC, Big Ten, ECAC, CCHA, Atlantic Hockey, Independent
const HOCKEY_SCHOOLS = [
  // Hockey East (11)
  { name: 'Boston College', abbreviation: 'BC', conference: 'Hockey East', primary_color: '#8C2633', secondary_color: '#C4A769' },
  { name: 'Boston University', abbreviation: 'BU', conference: 'Hockey East', primary_color: '#CC0000', secondary_color: '#FFFFFF' },
  { name: 'Connecticut', abbreviation: 'UCONN', conference: 'Hockey East', primary_color: '#000E2F', secondary_color: '#FFFFFF' },
  { name: 'Maine', abbreviation: 'ME', conference: 'Hockey East', primary_color: '#003263', secondary_color: '#B0D7FF' },
  { name: 'Massachusetts', abbreviation: 'UMASS', conference: 'Hockey East', primary_color: '#881C1C', secondary_color: '#FFFFFF' },
  { name: 'UMass Lowell', abbreviation: 'UML', conference: 'Hockey East', primary_color: '#003DA5', secondary_color: '#CC0000' },
  { name: 'Merrimack', abbreviation: 'MERR', conference: 'Hockey East', primary_color: '#003366', secondary_color: '#FFD200' },
  { name: 'New Hampshire', abbreviation: 'UNH', conference: 'Hockey East', primary_color: '#003DA5', secondary_color: '#FFFFFF' },
  { name: 'Northeastern', abbreviation: 'NEU', conference: 'Hockey East', primary_color: '#CC0000', secondary_color: '#000000' },
  { name: 'Providence', abbreviation: 'PROV', conference: 'Hockey East', primary_color: '#000000', secondary_color: '#C0C0C0' },
  { name: 'Vermont', abbreviation: 'UVM', conference: 'Hockey East', primary_color: '#003300', secondary_color: '#FFD200' },

  // NCHC (8)
  { name: 'Colorado College', abbreviation: 'CC', conference: 'NCHC', primary_color: '#000000', secondary_color: '#CFB87C' },
  { name: 'Denver', abbreviation: 'DU', conference: 'NCHC', primary_color: '#8B2332', secondary_color: '#CFB87C' },
  { name: 'Minnesota Duluth', abbreviation: 'UMD', conference: 'NCHC', primary_color: '#7A0019', secondary_color: '#FFD200' },
  { name: 'Miami (Ohio)', abbreviation: 'MIA', conference: 'NCHC', primary_color: '#C3142D', secondary_color: '#FFFFFF' },
  { name: 'North Dakota', abbreviation: 'UND', conference: 'NCHC', primary_color: '#009A44', secondary_color: '#FFFFFF' },
  { name: 'Omaha', abbreviation: 'UNO', conference: 'NCHC', primary_color: '#000000', secondary_color: '#CC0000' },
  { name: 'St. Cloud State', abbreviation: 'SCSU', conference: 'NCHC', primary_color: '#CC0000', secondary_color: '#000000' },
  { name: 'Western Michigan', abbreviation: 'WMU', conference: 'NCHC', primary_color: '#6C4023', secondary_color: '#CFB87C' },

  // Big Ten (7)
  { name: 'Michigan', abbreviation: 'MICH', conference: 'Big Ten', primary_color: '#00274C', secondary_color: '#FFCB05' },
  { name: 'Michigan State', abbreviation: 'MSU', conference: 'Big Ten', primary_color: '#18453B', secondary_color: '#FFFFFF' },
  { name: 'Minnesota', abbreviation: 'MINN', conference: 'Big Ten', primary_color: '#7A0019', secondary_color: '#FFD200' },
  { name: 'Notre Dame', abbreviation: 'ND', conference: 'Big Ten', primary_color: '#0C2340', secondary_color: '#C99700' },
  { name: 'Ohio State', abbreviation: 'OSU', conference: 'Big Ten', primary_color: '#BB0000', secondary_color: '#666666' },
  { name: 'Penn State', abbreviation: 'PSU', conference: 'Big Ten', primary_color: '#041E42', secondary_color: '#FFFFFF' },
  { name: 'Wisconsin', abbreviation: 'WIS', conference: 'Big Ten', primary_color: '#C5050C', secondary_color: '#FFFFFF' },

  // ECAC (12)
  { name: 'Brown', abbreviation: 'BROWN', conference: 'ECAC', primary_color: '#4E3629', secondary_color: '#C00404' },
  { name: 'Clarkson', abbreviation: 'CLARK', conference: 'ECAC', primary_color: '#004F42', secondary_color: '#CFB87C' },
  { name: 'Colgate', abbreviation: 'COLG', conference: 'ECAC', primary_color: '#821019', secondary_color: '#FFFFFF' },
  { name: 'Cornell', abbreviation: 'COR', conference: 'ECAC', primary_color: '#B31B1B', secondary_color: '#FFFFFF' },
  { name: 'Dartmouth', abbreviation: 'DART', conference: 'ECAC', primary_color: '#00693E', secondary_color: '#FFFFFF' },
  { name: 'Harvard', abbreviation: 'HARV', conference: 'ECAC', primary_color: '#A51C30', secondary_color: '#000000' },
  { name: 'Princeton', abbreviation: 'PRIN', conference: 'ECAC', primary_color: '#FF6600', secondary_color: '#000000' },
  { name: 'Quinnipiac', abbreviation: 'QU', conference: 'ECAC', primary_color: '#002B5C', secondary_color: '#CFB87C' },
  { name: 'RPI', abbreviation: 'RPI', conference: 'ECAC', primary_color: '#D6001C', secondary_color: '#FFFFFF' },
  { name: 'St. Lawrence', abbreviation: 'SLU', conference: 'ECAC', primary_color: '#8B0000', secondary_color: '#5C4827' },
  { name: 'Union', abbreviation: 'UNION', conference: 'ECAC', primary_color: '#862633', secondary_color: '#FFFFFF' },
  { name: 'Yale', abbreviation: 'YALE', conference: 'ECAC', primary_color: '#0F4D92', secondary_color: '#FFFFFF' },

  // CCHA (10)
  { name: 'Bemidji State', abbreviation: 'BSU', conference: 'CCHA', primary_color: '#006633', secondary_color: '#FFFFFF' },
  { name: 'Bowling Green', abbreviation: 'BGSU', conference: 'CCHA', primary_color: '#4F2C1D', secondary_color: '#FF7300' },
  { name: 'Ferris State', abbreviation: 'FSU', conference: 'CCHA', primary_color: '#BA0C2F', secondary_color: '#CFB87C' },
  { name: 'Lake Superior State', abbreviation: 'LSSU', conference: 'CCHA', primary_color: '#003DA5', secondary_color: '#FFD200' },
  { name: 'Michigan Tech', abbreviation: 'MTU', conference: 'CCHA', primary_color: '#000000', secondary_color: '#FFD200' },
  { name: 'Minnesota State', abbreviation: 'MNSU', conference: 'CCHA', primary_color: '#400080', secondary_color: '#CFB87C' },
  { name: 'Northern Michigan', abbreviation: 'NMU', conference: 'CCHA', primary_color: '#006633', secondary_color: '#FFD200' },
  { name: 'St. Thomas', abbreviation: 'STTHOM', conference: 'CCHA', primary_color: '#500878', secondary_color: '#FFFFFF' },
  { name: 'Augustana', abbreviation: 'AUGIE', conference: 'CCHA', primary_color: '#003DA5', secondary_color: '#FFD200' },
  { name: 'Lindenwood', abbreviation: 'LIND', conference: 'CCHA', primary_color: '#000000', secondary_color: '#CFB87C' },

  // Atlantic Hockey (11)
  { name: 'AIC', abbreviation: 'AIC', conference: 'Atlantic Hockey', primary_color: '#FFD200', secondary_color: '#000000' },
  { name: 'Air Force', abbreviation: 'AF', conference: 'Atlantic Hockey', primary_color: '#003087', secondary_color: '#C0C0C0' },
  { name: 'Army', abbreviation: 'ARMY', conference: 'Atlantic Hockey', primary_color: '#000000', secondary_color: '#CFB87C' },
  { name: 'Bentley', abbreviation: 'BENT', conference: 'Atlantic Hockey', primary_color: '#003DA5', secondary_color: '#CFB87C' },
  { name: 'Canisius', abbreviation: 'CAN', conference: 'Atlantic Hockey', primary_color: '#003DA5', secondary_color: '#CFB87C' },
  { name: 'Holy Cross', abbreviation: 'HC', conference: 'Atlantic Hockey', primary_color: '#602D89', secondary_color: '#FFFFFF' },
  { name: 'Mercyhurst', abbreviation: 'MERC', conference: 'Atlantic Hockey', primary_color: '#006633', secondary_color: '#FFFFFF' },
  { name: 'Niagara', abbreviation: 'NIAG', conference: 'Atlantic Hockey', primary_color: '#602D89', secondary_color: '#FFFFFF' },
  { name: 'RIT', abbreviation: 'RIT', conference: 'Atlantic Hockey', primary_color: '#F36E21', secondary_color: '#000000' },
  { name: 'Robert Morris', abbreviation: 'RMU', conference: 'Atlantic Hockey', primary_color: '#003DA5', secondary_color: '#CC0000' },
  { name: 'Sacred Heart', abbreviation: 'SHU', conference: 'Atlantic Hockey', primary_color: '#CC0000', secondary_color: '#FFFFFF' },

  // Independent (2)
  { name: 'Alaska', abbreviation: 'UAF', conference: 'Independent', primary_color: '#003DA5', secondary_color: '#FFD200' },
  { name: 'Alaska Anchorage', abbreviation: 'UAA', conference: 'Independent', primary_color: '#006633', secondary_color: '#FFD200' },
  { name: 'Arizona State', abbreviation: 'ASU', conference: 'Big Ten', primary_color: '#8C1D40', secondary_color: '#FFC627' },
  { name: 'Long Island', abbreviation: 'LIU', conference: 'Atlantic Hockey', primary_color: '#003DA5', secondary_color: '#CFB87C' },
  { name: 'Stonehill', abbreviation: 'STONE', conference: 'Atlantic Hockey', primary_color: '#602D89', secondary_color: '#FFFFFF' },
]

async function seed() {
  // Get hockey sport ID
  const { data: sport } = await admin
    .from('sports')
    .select('id')
    .eq('slug', 'hockey')
    .single()

  if (!sport) {
    console.log('Hockey sport not found in sports table')
    process.exit(1)
  }

  // Activate hockey sport if not already
  await admin
    .from('sports')
    .update({ is_active: true })
    .eq('id', sport.id)

  console.log(`Hockey sport ID: ${sport.id}`)
  console.log(`Seeding ${HOCKEY_SCHOOLS.length} D1 hockey schools...\n`)

  let created = 0
  let skipped = 0

  for (const school of HOCKEY_SCHOOLS) {
    const { error } = await admin
      .from('schools')
      .upsert(
        {
          sport_id: sport.id,
          name: school.name,
          abbreviation: school.abbreviation,
          conference: school.conference,
          primary_color: school.primary_color,
          secondary_color: school.secondary_color,
          is_active: true,
        },
        { onConflict: 'sport_id,name' }
      )

    if (error) {
      console.log(`  [error] ${school.name}: ${error.message}`)
    } else {
      created++
      console.log(`  [ok] ${school.name} (${school.conference})`)
    }
  }

  console.log(`\nDone: ${created} schools seeded, ${skipped} skipped`)
}

seed().catch(console.error)
