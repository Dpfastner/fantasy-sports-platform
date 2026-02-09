-- ESPN Team ID Mappings for FBS Schools
-- Run this in Supabase SQL Editor to enable AP Rankings sync

-- SEC
UPDATE schools SET external_api_id = '333' WHERE name ILIKE '%Alabama%' AND name NOT ILIKE '%UAB%';
UPDATE schools SET external_api_id = '8' WHERE name ILIKE '%Auburn%';
UPDATE schools SET external_api_id = '245' WHERE name ILIKE '%Arkansas%' AND name NOT ILIKE '%State%';
UPDATE schools SET external_api_id = '57' WHERE name = 'Florida' OR name ILIKE '%Florida Gators%';
UPDATE schools SET external_api_id = '61' WHERE name = 'Georgia' OR name ILIKE '%Georgia Bulldogs%';
UPDATE schools SET external_api_id = '96' WHERE name ILIKE '%Kentucky%';
UPDATE schools SET external_api_id = '99' WHERE name ILIKE '%LSU%';
UPDATE schools SET external_api_id = '145' WHERE name ILIKE '%Ole Miss%';
UPDATE schools SET external_api_id = '344' WHERE name ILIKE '%Mississippi State%';
UPDATE schools SET external_api_id = '142' WHERE name ILIKE '%Missouri%';
UPDATE schools SET external_api_id = '201' WHERE name = 'Oklahoma' OR name ILIKE '%Oklahoma Sooners%';
UPDATE schools SET external_api_id = '2579' WHERE name ILIKE '%South Carolina%' AND name NOT ILIKE '%Coastal%';
UPDATE schools SET external_api_id = '2633' WHERE name = 'Tennessee' OR name ILIKE '%Tennessee Volunteers%';
UPDATE schools SET external_api_id = '251' WHERE name = 'Texas' OR name ILIKE '%Texas Longhorns%';
UPDATE schools SET external_api_id = '245' WHERE name ILIKE '%Texas A&M%';
UPDATE schools SET external_api_id = '238' WHERE name ILIKE '%Vanderbilt%';

-- Big Ten
UPDATE schools SET external_api_id = '356' WHERE name = 'Illinois' OR name ILIKE '%Illinois Fighting Illini%';
UPDATE schools SET external_api_id = '84' WHERE name = 'Indiana' OR name ILIKE '%Indiana Hoosiers%';
UPDATE schools SET external_api_id = '2294' WHERE name = 'Iowa' OR name ILIKE '%Iowa Hawkeyes%';
UPDATE schools SET external_api_id = '275' WHERE name = 'Maryland' OR name ILIKE '%Maryland Terrapins%';
UPDATE schools SET external_api_id = '130' WHERE name = 'Michigan' OR name ILIKE '%Michigan Wolverines%';
UPDATE schools SET external_api_id = '127' WHERE name ILIKE '%Michigan State%';
UPDATE schools SET external_api_id = '135' WHERE name ILIKE '%Minnesota%';
UPDATE schools SET external_api_id = '158' WHERE name ILIKE '%Nebraska%';
UPDATE schools SET external_api_id = '77' WHERE name ILIKE '%Northwestern%';
UPDATE schools SET external_api_id = '194' WHERE name ILIKE '%Ohio State%';
UPDATE schools SET external_api_id = '2509' WHERE name = 'Oregon' OR name ILIKE '%Oregon Ducks%';
UPDATE schools SET external_api_id = '204' WHERE name ILIKE '%Oregon State%';
UPDATE schools SET external_api_id = '213' WHERE name ILIKE '%Penn State%';
UPDATE schools SET external_api_id = '2509' WHERE name ILIKE '%Purdue%';
UPDATE schools SET external_api_id = '164' WHERE name ILIKE '%Rutgers%';
UPDATE schools SET external_api_id = '26' WHERE name ILIKE '%UCLA%';
UPDATE schools SET external_api_id = '30' WHERE name ILIKE '%USC%';
UPDATE schools SET external_api_id = '264' WHERE name = 'Washington' OR name ILIKE '%Washington Huskies%';
UPDATE schools SET external_api_id = '265' WHERE name ILIKE '%Washington State%';
UPDATE schools SET external_api_id = '275' WHERE name ILIKE '%Wisconsin%';

-- Big 12
UPDATE schools SET external_api_id = '12' WHERE name = 'Arizona' OR name ILIKE '%Arizona Wildcats%';
UPDATE schools SET external_api_id = '9' WHERE name ILIKE '%Arizona State%';
UPDATE schools SET external_api_id = '239' WHERE name ILIKE '%Baylor%';
UPDATE schools SET external_api_id = '252' WHERE name ILIKE '%BYU%';
UPDATE schools SET external_api_id = '2132' WHERE name ILIKE '%Cincinnati%';
UPDATE schools SET external_api_id = '38' WHERE name = 'Colorado' OR name ILIKE '%Colorado Buffaloes%';
UPDATE schools SET external_api_id = '248' WHERE name = 'Houston' OR name ILIKE '%Houston Cougars%';
UPDATE schools SET external_api_id = '66' WHERE name ILIKE '%Iowa State%';
UPDATE schools SET external_api_id = '2305' WHERE name = 'Kansas' OR name ILIKE '%Kansas Jayhawks%';
UPDATE schools SET external_api_id = '2306' WHERE name ILIKE '%Kansas State%';
UPDATE schools SET external_api_id = '197' WHERE name ILIKE '%Oklahoma State%';
UPDATE schools SET external_api_id = '2628' WHERE name ILIKE '%TCU%';
UPDATE schools SET external_api_id = '2641' WHERE name ILIKE '%Texas Tech%';
UPDATE schools SET external_api_id = '2116' WHERE name ILIKE '%UCF%';
UPDATE schools SET external_api_id = '254' WHERE name = 'Utah' OR name ILIKE '%Utah Utes%';
UPDATE schools SET external_api_id = '277' WHERE name ILIKE '%West Virginia%';

-- ACC
UPDATE schools SET external_api_id = '103' WHERE name ILIKE '%Boston College%';
UPDATE schools SET external_api_id = '25' WHERE name = 'California' OR name ILIKE '%Cal Bears%';
UPDATE schools SET external_api_id = '228' WHERE name ILIKE '%Clemson%';
UPDATE schools SET external_api_id = '150' WHERE name ILIKE '%Duke%';
UPDATE schools SET external_api_id = '52' WHERE name ILIKE '%Florida State%';
UPDATE schools SET external_api_id = '59' WHERE name ILIKE '%Georgia Tech%';
UPDATE schools SET external_api_id = '97' WHERE name ILIKE '%Louisville%';
UPDATE schools SET external_api_id = '2390' WHERE name = 'Miami' OR name ILIKE '%Miami Hurricanes%';
UPDATE schools SET external_api_id = '153' WHERE name ILIKE '%NC State%';
UPDATE schools SET external_api_id = '152' WHERE name ILIKE '%North Carolina%' AND name NOT ILIKE '%State%';
UPDATE schools SET external_api_id = '221' WHERE name ILIKE '%Pittsburgh%';
UPDATE schools SET external_api_id = '2567' WHERE name ILIKE '%SMU%';
UPDATE schools SET external_api_id = '24' WHERE name ILIKE '%Stanford%';
UPDATE schools SET external_api_id = '183' WHERE name ILIKE '%Syracuse%';
UPDATE schools SET external_api_id = '258' WHERE name = 'Virginia' OR name ILIKE '%Virginia Cavaliers%';
UPDATE schools SET external_api_id = '259' WHERE name ILIKE '%Virginia Tech%';
UPDATE schools SET external_api_id = '154' WHERE name ILIKE '%Wake Forest%';

-- Mountain West
UPDATE schools SET external_api_id = '2005' WHERE name ILIKE '%Air Force%';
UPDATE schools SET external_api_id = '68' WHERE name ILIKE '%Boise State%';
UPDATE schools SET external_api_id = '36' WHERE name ILIKE '%Colorado State%';
UPDATE schools SET external_api_id = '278' WHERE name ILIKE '%Fresno State%';
UPDATE schools SET external_api_id = '62' WHERE name ILIKE '%Hawaii%';
UPDATE schools SET external_api_id = '2440' WHERE name = 'Nevada' OR name ILIKE '%Nevada Wolf Pack%';
UPDATE schools SET external_api_id = '167' WHERE name ILIKE '%New Mexico%' AND name NOT ILIKE '%State%';
UPDATE schools SET external_api_id = '21' WHERE name ILIKE '%San Diego State%';
UPDATE schools SET external_api_id = '23' WHERE name ILIKE '%San Jose State%';
UPDATE schools SET external_api_id = '2439' WHERE name ILIKE '%UNLV%';
UPDATE schools SET external_api_id = '328' WHERE name ILIKE '%Utah State%';
UPDATE schools SET external_api_id = '2751' WHERE name ILIKE '%Wyoming%';

-- AAC
UPDATE schools SET external_api_id = '349' WHERE name ILIKE '%Army%';
UPDATE schools SET external_api_id = '2429' WHERE name ILIKE '%Charlotte%';
UPDATE schools SET external_api_id = '151' WHERE name ILIKE '%East Carolina%';
UPDATE schools SET external_api_id = '2226' WHERE name ILIKE '%FAU%' OR name ILIKE '%Florida Atlantic%';
UPDATE schools SET external_api_id = '235' WHERE name ILIKE '%Memphis%';
UPDATE schools SET external_api_id = '2426' WHERE name ILIKE '%Navy%';
UPDATE schools SET external_api_id = '249' WHERE name ILIKE '%North Texas%';
UPDATE schools SET external_api_id = '242' WHERE name ILIKE '%Rice%';
UPDATE schools SET external_api_id = '58' WHERE name ILIKE '%South Florida%' OR name ILIKE '%USF%';
UPDATE schools SET external_api_id = '218' WHERE name ILIKE '%Temple%';
UPDATE schools SET external_api_id = '2655' WHERE name ILIKE '%Tulane%';
UPDATE schools SET external_api_id = '202' WHERE name ILIKE '%Tulsa%';
UPDATE schools SET external_api_id = '5' WHERE name ILIKE '%UAB%';
UPDATE schools SET external_api_id = '2636' WHERE name ILIKE '%UTSA%';

-- Sun Belt
UPDATE schools SET external_api_id = '2026' WHERE name ILIKE '%Appalachian State%';
UPDATE schools SET external_api_id = '2032' WHERE name ILIKE '%Arkansas State%';
UPDATE schools SET external_api_id = '324' WHERE name ILIKE '%Coastal Carolina%';
UPDATE schools SET external_api_id = '290' WHERE name ILIKE '%Georgia Southern%';
UPDATE schools SET external_api_id = '2247' WHERE name ILIKE '%Georgia State%';
UPDATE schools SET external_api_id = '256' WHERE name ILIKE '%James Madison%';
UPDATE schools SET external_api_id = '309' WHERE name = 'Louisiana' OR name ILIKE '%Louisiana Ragin%';
UPDATE schools SET external_api_id = '2433' WHERE name ILIKE '%UL Monroe%' OR name ILIKE '%Louisiana-Monroe%';
UPDATE schools SET external_api_id = '276' WHERE name ILIKE '%Marshall%';
UPDATE schools SET external_api_id = '295' WHERE name ILIKE '%Old Dominion%';
UPDATE schools SET external_api_id = '6' WHERE name ILIKE '%South Alabama%';
UPDATE schools SET external_api_id = '2572' WHERE name ILIKE '%Southern Miss%';
UPDATE schools SET external_api_id = '326' WHERE name ILIKE '%Texas State%';
UPDATE schools SET external_api_id = '2653' WHERE name ILIKE '%Troy%';

-- MAC
UPDATE schools SET external_api_id = '2006' WHERE name ILIKE '%Akron%';
UPDATE schools SET external_api_id = '2050' WHERE name ILIKE '%Ball State%';
UPDATE schools SET external_api_id = '189' WHERE name ILIKE '%Bowling Green%';
UPDATE schools SET external_api_id = '2084' WHERE name ILIKE '%Buffalo%';
UPDATE schools SET external_api_id = '2117' WHERE name ILIKE '%Central Michigan%';
UPDATE schools SET external_api_id = '2199' WHERE name ILIKE '%Eastern Michigan%';
UPDATE schools SET external_api_id = '2309' WHERE name ILIKE '%Kent State%';
UPDATE schools SET external_api_id = '193' WHERE name ILIKE '%Miami%' AND name ILIKE '%Ohio%';
UPDATE schools SET external_api_id = '2459' WHERE name ILIKE '%Northern Illinois%';
UPDATE schools SET external_api_id = '195' WHERE name = 'Ohio' OR name ILIKE '%Ohio Bobcats%';
UPDATE schools SET external_api_id = '2649' WHERE name ILIKE '%Toledo%';
UPDATE schools SET external_api_id = '2711' WHERE name ILIKE '%Western Michigan%';

-- Conference USA
UPDATE schools SET external_api_id = '2229' WHERE name ILIKE '%FIU%';
UPDATE schools SET external_api_id = '55' WHERE name ILIKE '%Jacksonville State%';
UPDATE schools SET external_api_id = '338' WHERE name ILIKE '%Kennesaw State%';
UPDATE schools SET external_api_id = '2335' WHERE name ILIKE '%Liberty%';
UPDATE schools SET external_api_id = '2348' WHERE name ILIKE '%Louisiana Tech%';
UPDATE schools SET external_api_id = '2393' WHERE name ILIKE '%Middle Tennessee%';
UPDATE schools SET external_api_id = '166' WHERE name ILIKE '%New Mexico State%';
UPDATE schools SET external_api_id = '2534' WHERE name ILIKE '%Sam Houston%';
UPDATE schools SET external_api_id = '2638' WHERE name ILIKE '%UTEP%';
UPDATE schools SET external_api_id = '98' WHERE name ILIKE '%Western Kentucky%';

-- Independents
UPDATE schools SET external_api_id = '87' WHERE name ILIKE '%Notre Dame%';
UPDATE schools SET external_api_id = '41' WHERE name ILIKE '%UConn%' OR name ILIKE '%Connecticut%';
UPDATE schools SET external_api_id = '113' WHERE name ILIKE '%UMass%' OR name ILIKE '%Massachusetts%';

-- Verify
SELECT name, external_api_id, conference
FROM schools
WHERE external_api_id IS NOT NULL
ORDER BY conference, name;
