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
    description: 'Uphill opener with a fairway bunker right; demands an accurate approach to an elevated green.',
    x: 34.5, y: 65.1,
  },
  {
    number: 2, name: 'Pink Dogwood', par: 5, yards: 585,
    description: 'Downhill par 5 that produces more off-the-tee variety than almost any other par 5 in pro golf.',
    x: 53.0, y: 74.5,
  },
  {
    number: 3, name: 'Flowering Peach', par: 4, yards: 350,
    description: 'Short, strategically layered par 4; multiple tee-shot options into a narrow shelf green.',
    x: 62.3, y: 70.5,
  },
  {
    number: 4, name: 'Flowering Crab Apple', par: 3, yards: 240,
    description: 'The first and longest par 3; historically demands a towering long iron, hybrid, or fairway wood.',
    x: 62.0, y: 87.8,
  },
  {
    number: 5, name: 'Magnolia', par: 4, yards: 495,
    description: 'Honest, lengthy challenge with one of the most artfully shaped greens on the course.',
    x: 83.3, y: 77.7,
  },
  {
    number: 6, name: 'Juniper', par: 3, yards: 180,
    description: 'Severely contoured green where each pin position yields completely different challenges.',
    x: 74.8, y: 75.9,
  },
  {
    number: 7, name: 'Pampas', par: 4, yards: 450,
    description: 'Evolved from a short strategic par 4 into a narrow, length-defended test with playful green contours.',
    x: 63.7, y: 57.3,
  },
  {
    number: 8, name: 'Yellow Jasmine', par: 5, yards: 570,
    description: 'Uphill three-shotter that consistently yields the highest scoring average among Augusta\u2019s par 5s.',
    x: 46.1, y: 68.1,
  },
  {
    number: 9, name: 'Carolina Cherry', par: 4, yards: 460,
    description: 'High point down into a valley and back up to the clubhouse; severe false-front green.',
    x: 37.1, y: 55.7,
  },
  {
    number: 10, name: 'Camellia', par: 4, yards: 495,
    description: 'Plunges roughly 100 feet into a valley of tall pines; the 1938 Perry Maxwell redesign is a rare improvement on MacKenzie/Jones.',
    x: 44.7, y: 41.0,
  },
  {
    number: 11, name: 'White Dogwood', par: 4, yards: 520,
    description: 'Start of Amen Corner and often the hardest hole to par at Augusta National.',
    x: 70.4, y: 18.6,
  },
  {
    number: 12, name: 'Golden Bell', par: 3, yards: 155,
    description: 'The focal point of Amen Corner — as terrifying as it is beautiful, guarded by Rae\u2019s Creek and swirling winds.',
    x: 86.0, y: 27.9,
  },
  {
    number: 13, name: 'Azalea', par: 5, yards: 545,
    description: 'Iconic risk-reward par 5 wrapping around Rae\u2019s Creek; the first of the home-stretch birdie chances.',
    x: 81.7, y: 40.8,
  },
  {
    number: 14, name: 'Chinese Fir', par: 4, yards: 440,
    description: 'The only hole on the course without a bunker; rewards precise shot-shaping into a contoured green.',
    x: 71.7, y: 33.1,
  },
  {
    number: 15, name: 'Firethorn', par: 5, yards: 550,
    description: 'Go for it over the pond in two, or lay up to one of the most demanding wedge shots in golf.',
    x: 67.8, y: 43.4,
  },
  {
    number: 16, name: 'Redbud', par: 3, yards: 170,
    description: 'Par 3 across water at the base of a ridge; stage for many championship-defining moments.',
    x: 78.7, y: 70.5,
  },
  {
    number: 17, name: 'Nandina', par: 4, yards: 450,
    description: 'Simple tee-to-green by Augusta standards and widely regarded as the least-loved hole on the second nine.',
    x: 66.3, y: 50.6,
  },
  {
    number: 18, name: 'Holly', par: 4, yards: 465,
    description: 'Uphill finisher that rewards bending the tee shot around the right-side trees to bypass natural difficulty.',
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
