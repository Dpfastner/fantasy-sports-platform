'use client'

const G = '#1a5c38'
const GM = '#1f6b42'
const GD = '#0d3520'
const GL = '#267a4c'
const GOLD = '#C9A84C'
const GOLDD = '#A8862A'
const GOLDL = '#E8C96A'

function Jacket() {
  return (
    <svg
      viewBox="0 0 180 225"
      width="136"
      height="170"
      style={{ display: 'block', filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.7))' }}
    >
      <defs>
        <linearGradient id="jBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={GD} />
          <stop offset="22%" stopColor={G} />
          <stop offset="50%" stopColor={GM} />
          <stop offset="78%" stopColor={G} />
          <stop offset="100%" stopColor={GD} />
        </linearGradient>
        <linearGradient id="jSleeve" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={GD} />
          <stop offset="60%" stopColor="#165030" />
          <stop offset="100%" stopColor={GD} />
        </linearGradient>
        <linearGradient id="jLapelL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={GL} />
          <stop offset="100%" stopColor={G} />
        </linearGradient>
        <linearGradient id="jLapelR" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GL} />
          <stop offset="100%" stopColor={G} />
        </linearGradient>
        <linearGradient id="jLining" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c2820" />
          <stop offset="40%" stopColor="#141e18" />
          <stop offset="100%" stopColor="#0c1410" />
        </linearGradient>
        <radialGradient id="btnGlow" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor={GOLDL} />
          <stop offset="100%" stopColor={GOLDD} />
        </radialGradient>
      </defs>

      {/* Left sleeve */}
      <path d="M 50,40 L 18,56 L 10,188 L 42,188 L 54,80 Z" fill="url(#jSleeve)" />
      <line x1="18" y1="56" x2="22" y2="175" stroke={GD} strokeWidth="1.2" opacity="0.6" />

      {/* Right sleeve */}
      <path d="M 130,40 L 162,56 L 170,188 L 138,188 L 126,80 Z" fill="url(#jSleeve)" />
      <line x1="162" y1="56" x2="158" y2="175" stroke={GD} strokeWidth="1.2" opacity="0.6" />

      {/* Main body */}
      <path d="M 46,38 L 134,38 L 150,222 L 30,222 Z" fill="url(#jBody)" />

      {/* Dark inner lining */}
      <path d="M 70,38 L 90,118 L 110,38 L 90,50 Z" fill="url(#jLining)" />

      {/* Lining folds */}
      <line x1="83" y1="46" x2="87" y2="115" stroke="#0c1410" strokeWidth="0.6" opacity="0.55" />
      <line x1="90" y1="50" x2="90" y2="118" stroke="#0c1410" strokeWidth="0.6" opacity="0.4" />
      <line x1="97" y1="46" x2="93" y2="115" stroke="#0c1410" strokeWidth="0.6" opacity="0.55" />

      {/* Gold piping */}
      <path d="M 70,38 L 90,118" stroke={GOLD} strokeWidth="0.8" opacity="0.4" fill="none" />
      <path d="M 110,38 L 90,118" stroke={GOLD} strokeWidth="0.8" opacity="0.4" fill="none" />

      {/* Lapels */}
      <path d="M 46,38 L 70,38 L 72,42 L 90,118 L 58,178 L 36,178 L 46,38" fill="url(#jLapelL)" />
      <path d="M 70,38 L 72,42 L 90,118" fill="none" stroke={GD} strokeWidth="1.2" opacity="0.5" />
      <path d="M 134,38 L 110,38 L 108,42 L 90,118 L 122,178 L 144,178 L 134,38" fill="url(#jLapelR)" />
      <path d="M 110,38 L 108,42 L 90,118" fill="none" stroke={GD} strokeWidth="1.2" opacity="0.5" />

      {/* Collar */}
      <path d="M 68,38 L 78,52 L 90,46 L 102,52 L 112,38" fill={G} stroke={GD} strokeWidth="1.2" />

      {/* Breast pocket */}
      <rect x="52" y="94" width="24" height="15" rx="1.5" fill={GD} opacity="0.55" />
      <rect x="52" y="92" width="24" height="3" rx="1" fill={GOLD} opacity="0.55" />

      {/* Buttons */}
      {[130, 152, 173, 193, 212].map((y, i) => (
        <g key={i}>
          <circle cx={90} cy={y} r={4.5} fill={GOLDD} />
          <circle cx={90} cy={y} r={3.5} fill="url(#btnGlow)" />
          <circle cx={89} cy={y - 1} r={1.2} fill={GOLDL} opacity="0.7" />
        </g>
      ))}
      {[130, 152, 173, 193, 212].map((y, i) => (
        <g key={`h${i}`} opacity="0.5">
          <circle cx={88.5} cy={y - 0.5} r={0.6} fill={GD} />
          <circle cx={91.5} cy={y + 0.5} r={0.6} fill={GD} />
        </g>
      ))}

      {/* Pocket square */}
      <path d="M 54,92 L 58,88 L 64,90 L 70,88 L 74,92" fill="none" stroke={GOLD} strokeWidth="1" opacity="0.45" />

      {/* Seams */}
      <line x1="46" y1="38" x2="40" y2="65" stroke={GD} strokeWidth="1.5" opacity="0.45" />
      <line x1="134" y1="38" x2="140" y2="65" stroke={GD} strokeWidth="1.5" opacity="0.45" />
      <line x1="90" y1="118" x2="90" y2="222" stroke={GD} strokeWidth="0.8" opacity="0.3" />
      <path d="M 30,222 L 150,222" stroke={GD} strokeWidth="1.5" opacity="0.4" />
    </svg>
  )
}

function Spark({ size = 10 }: { size?: number }) {
  const s = size / 2
  const t = size * 0.18
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <path
        d={`M${s},0 L${s + t},${s - t} L${size},${s} L${s + t},${s + t} L${s},${size} L${s - t},${s + t} L0,${s} L${s - t},${s - t} Z`}
        fill={GOLD}
      />
      <circle cx={s} cy={s} r={t * 0.8} fill={GOLDL} />
    </svg>
  )
}

function Flake({ size = 6 }: { size?: number }) {
  const s = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <path d={`M${s},0 L${size},${s} L${s},${size} L0,${s} Z`} fill={GOLDL} opacity="0.9" />
    </svg>
  )
}

const SPARKS = [
  { a: 0, r: 118, size: 11, delay: 0.0, dur: 1.8 },
  { a: 28, r: 106, size: 7, delay: 0.5, dur: 2.2 },
  { a: 58, r: 122, size: 13, delay: 1.1, dur: 1.6 },
  { a: 90, r: 110, size: 8, delay: 1.7, dur: 2.4 },
  { a: 120, r: 118, size: 11, delay: 0.8, dur: 1.9 },
  { a: 148, r: 104, size: 7, delay: 2.1, dur: 2.1 },
  { a: 178, r: 120, size: 10, delay: 0.3, dur: 1.7 },
  { a: 208, r: 110, size: 12, delay: 1.4, dur: 2.3 },
  { a: 238, r: 118, size: 8, delay: 0.9, dur: 2.0 },
  { a: 268, r: 106, size: 11, delay: 2.3, dur: 1.8 },
  { a: 298, r: 120, size: 7, delay: 0.6, dur: 2.5 },
  { a: 328, r: 108, size: 13, delay: 1.8, dur: 1.6 },
]

const FLAKES = [
  { a: 14, r: 96, size: 5, delay: 0.4, dur: 3.0 },
  { a: 75, r: 100, size: 4, delay: 1.2, dur: 3.4 },
  { a: 135, r: 94, size: 6, delay: 0.7, dur: 2.8 },
  { a: 195, r: 100, size: 4, delay: 1.9, dur: 3.2 },
  { a: 255, r: 96, size: 5, delay: 0.2, dur: 3.1 },
  { a: 315, r: 100, size: 4, delay: 1.5, dur: 2.9 },
]

/**
 * Full Green Jacket spinning badge with gold medallion, sparkles, and flakes.
 * Used in the GreenJacketCeremony overlay.
 */
export function GreenJacketBadge() {
  return (
    <div style={{ position: 'relative', width: 300, height: 300 }}>
      <style>{`
        @keyframes gjSpinY    { from { transform: perspective(480px) rotateY(0deg); } to { transform: perspective(480px) rotateY(360deg); } }
        @keyframes gjCoinSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes gjTwinkle  { 0%,100% { opacity:.25; transform:scale(.65) rotate(0deg); } 50% { opacity:1; transform:scale(1.15) rotate(20deg); } }
        @keyframes gjFlake    { 0%,100% { opacity:.2; transform:scale(.7) rotate(0deg); } 50% { opacity:.9; transform:scale(1.1) rotate(45deg); } }
        @keyframes gjOuter    { 0%,100% { opacity:.35; transform:scale(1); } 50% { opacity:.6; transform:scale(1.05); } }
        @keyframes gjInner    { 0%,100% { opacity:.8; } 50% { opacity:1; } }
        @keyframes gjFloat    { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-6px); } }
      `}</style>

      <div style={{ position: 'relative', width: 300, height: 300, animation: 'gjFloat 4s ease-in-out infinite' }}>
        <div
          style={{
            position: 'absolute',
            inset: -28,
            borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(201,168,76,.14) 0%,transparent 65%)',
            animation: 'gjOuter 3s ease-in-out infinite',
          }}
        />

        {SPARKS.map((s, i) => {
          const rad = (s.a * Math.PI) / 180
          const x = 150 + s.r * Math.cos(rad) - s.size / 2
          const y = 150 + s.r * Math.sin(rad) - s.size / 2
          return (
            <div
              key={`s${i}`}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                animation: `gjTwinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
                zIndex: 4,
              }}
            >
              <Spark size={s.size} />
            </div>
          )
        })}

        {FLAKES.map((f, i) => {
          const rad = (f.a * Math.PI) / 180
          const x = 150 + f.r * Math.cos(rad) - f.size / 2
          const y = 150 + f.r * Math.sin(rad) - f.size / 2
          return (
            <div
              key={`f${i}`}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                animation: `gjFlake ${f.dur}s ease-in-out ${f.delay}s infinite`,
                zIndex: 4,
              }}
            >
              <Flake size={f.size} />
            </div>
          )
        })}

        <div
          style={{
            position: 'absolute',
            inset: 26,
            borderRadius: '50%',
            background: `conic-gradient(${GOLDD} 0deg,${GOLD} 40deg,${GOLDL} 80deg,${GOLD} 120deg,${GOLDD} 160deg,${GOLD} 200deg,${GOLDL} 240deg,${GOLD} 280deg,${GOLDD} 320deg,${GOLD} 360deg)`,
            animation: 'gjCoinSpin 10s linear infinite',
            boxShadow: `0 0 0 3px ${GOLDD},0 0 28px rgba(201,168,76,.55),0 0 60px rgba(201,168,76,.22),inset 0 0 30px rgba(0,0,0,.4)`,
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 32,
            borderRadius: '50%',
            border: `2px solid ${GOLD}`,
            zIndex: 2,
            animation: 'gjInner 2.5s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 36,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 42% 40%,#152a18 0%,#0c1a0d 55%,#080e09 100%)',
            zIndex: 2,
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3,
            animation: 'gjSpinY 7s linear infinite',
          }}
        >
          <Jacket />
        </div>
      </div>
    </div>
  )
}
