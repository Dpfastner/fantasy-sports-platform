/**
 * Static Augusta National hole metadata.
 *
 * Names, pars, yardages, and short descriptions. Used by the Course tab
 * to render the per-hole info panel. Position coordinates are hand-placed
 * to match the real course layout in a stylized SVG (not copied from any
 * copyrighted map — approximate geographic relationships only).
 *
 * Source of hole names/descriptions: The Fried Egg, "Masters Augusta National
 * Course Map & History" — factual/historical info summarized, not quoted.
 */

export interface AugustaHole {
  number: number
  name: string
  par: number
  yards: number
  description: string
  /** SVG x/y (percentage of viewBox, 0-100). Hand-placed to mimic real layout. */
  x: number
  y: number
}

// Coordinates are percentages of the Augusta Course Map.jpg image dimensions
// (0-100 on both axes). These values point DIRECTLY at the yellow flag pin
// in the image; the AugustaMap component renders the clickable marker with
// a consistent left offset so the pin itself stays visible.
// Values captured via the dev-mode coordinate overlay.
export const AUGUSTA_HOLES: AugustaHole[] = [
  {
    number: 1, name: 'Tea Olive', par: 4, yards: 445,
    description: "Augusta National's property is defined by a single broad downslope that ends at Rae's Creek, and this par-4 opener is the only hole on the course that sits completely on top of it. Strategically, No. 1 at Augusta National is one of the most compelling opening holes in professional golf.",
    x: 34.5, y: 65.1,
  },
  {
    number: 2, name: 'Pink Dogwood', par: 5, yards: 585,
    description: 'A downhill par 5 that produces more off-the-tee variety than almost any other par 5 in professional golf. The hole rewards strategic decision-making throughout the opening stretch, trading brute distance for angle and judgment.',
    x: 53.0, y: 74.5,
  },
  {
    number: 3, name: 'Flowering Peach', par: 4, yards: 350,
    description: "Arguably the most strategically complex hole on the golf course — a short par 4 offering a long-iron layup near the bunkers, a bash-left into the valley, or a driver straight at the green. The narrow shelf green is a stern examination at the end of whichever route you picked.",
    x: 62.3, y: 70.5,
  },
  {
    number: 4, name: 'Flowering Crab Apple', par: 3, yards: 240,
    description: "Augusta's first and longest par 3, historically demanding a towering long iron, hybrid, or fairway wood. Modern equipment has softened the club selection somewhat, but it still stands as a defining test of precision ball-striking.",
    x: 62.0, y: 87.8,
  },
  {
    number: 5, name: 'Magnolia', par: 4, yards: 495,
    description: 'An honest, lengthy challenge anchored by one of the most artfully shaped greens on the course. The design balances power requirements with the finesse demands of an unforgiving putting surface.',
    x: 83.3, y: 77.7,
  },
  {
    number: 6, name: 'Juniper', par: 3, yards: 180,
    description: "Regarded as Augusta's second-best par 3 — a severely contoured green where each pin position creates a completely different set of challenges and opportunities. Reading the green is as important as striking the tee shot.",
    x: 74.8, y: 75.9,
  },
  {
    number: 7, name: 'Pampas', par: 4, yards: 450,
    description: "Originally a short strategic par 4, it has morphed into a narrow, length-defended hole — a departure from MacKenzie's original intent. The green contours are still fun, but it plays more like a muscle-flex than a thinker now.",
    x: 63.7, y: 57.3,
  },
  {
    number: 8, name: 'Yellow Jasmine', par: 5, yards: 570,
    description: "An uphill three-shotter that consistently yields the highest scoring average among Augusta's par 5s, yet offers a welcome birdie opportunity after the tough 4-through-7 stretch. Some consider it the most underrated hole on the course.",
    x: 46.1, y: 68.1,
  },
  {
    number: 9, name: 'Carolina Cherry', par: 4, yards: 460,
    description: "Plays from a high point down through a valley and back up the hill to the clubhouse — a risk-reward muddle with a severe false-front green that rejects any approach an inch short. Finishing the front nine here is never guaranteed.",
    x: 37.1, y: 55.7,
  },
  {
    number: 10, name: 'Camellia', par: 4, yards: 495,
    description: "Kicks off the back nine by plunging roughly 100 feet into a valley shrouded by tall pines. Perry Maxwell's 1938 redesign of this hole is considered a rare improvement on the original MacKenzie/Jones routing.",
    x: 44.7, y: 41.0,
  },
  {
    number: 11, name: 'White Dogwood', par: 4, yards: 520,
    description: "Start of Amen Corner and often the hardest hole to par at Augusta National. One of the most frequently tinkered-with holes on the course — every length addition raises its difficulty ceiling.",
    x: 70.4, y: 18.6,
  },
  {
    number: 12, name: 'Golden Bell', par: 3, yards: 155,
    description: "The focal point of Amen Corner and the center of gravity of any Masters Sunday — as terrifying as it is beautiful, guarded by Rae's Creek and legendary swirling winds. Pin placement and gusts decide tournaments here more often than any other hole.",
    x: 86.0, y: 27.9,
  },
  {
    number: 13, name: 'Azalea', par: 5, yards: 545,
    description: "Iconic risk-reward par 5 wrapping around a tributary of Rae's Creek — the first of the home-stretch birdie opportunities that have decided countless Masters. The eagle-or-bogey potential is what makes Sunday afternoon electric.",
    x: 81.7, y: 40.8,
  },
  {
    number: 14, name: 'Chinese Fir', par: 4, yards: 440,
    description: 'The only hole on the course without a single bunker; it rewards precise shot-shaping off the tee and into a severely contoured green. Defense comes entirely from slopes and spin — not sand.',
    x: 71.7, y: 33.1,
  },
  {
    number: 15, name: 'Firethorn', par: 5, yards: 550,
    description: "Presents one of the toughest decisions in golf — go for the green in two over the pond, or lay up to one of the most demanding wedge shots the game offers. Gene Sarazen's 1935 double eagle here made the tournament's reputation.",
    x: 67.8, y: 43.4,
  },
  {
    number: 16, name: 'Redbud', par: 3, yards: 170,
    description: "A par 3 played across water at the base of a ridge — the stage for many championship-defining shots and moments of spectacle. The Sunday pin tucked in the back-left shelf is the single most famous hole location in golf.",
    x: 78.7, y: 70.5,
  },
  {
    number: 17, name: 'Nandina', par: 4, yards: 450,
    description: "One of the simplest holes tee-to-green at Augusta and widely regarded as the least-loved hole on the second nine. A birdie opportunity when you need it, but rarely the hole anyone remembers.",
    x: 66.3, y: 50.6,
  },
  {
    number: 18, name: 'Holly', par: 4, yards: 465,
    description: 'A funky but smartly designed uphill finisher that rewards players who bend the tee shot around the trees on the right to bypass natural difficulty on the approach. Every green jacket decision comes down to this walk.',
    x: 50.0, y: 46.1,
  },
]

export const AUGUSTA_META = {
  name: 'Augusta National Golf Club',
  designers: 'Alister MacKenzie & Bobby Jones',
  opened: 1933,
  totalYards: 7555,
  par: 72,
  amenCorner: [11, 12, 13] as const,
}

export function getHoleByNumber(n: number): AugustaHole | undefined {
  return AUGUSTA_HOLES.find(h => h.number === n)
}
