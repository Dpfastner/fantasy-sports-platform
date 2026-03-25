'use client'

import { useState } from 'react'

interface FaqItem {
  question: string
  answer: string
}

interface FaqCategory {
  title: string
  items: FaqItem[]
}

const FAQ_DATA: FaqCategory[] = [
  {
    title: 'Getting Started',
    items: [
      {
        question: 'What is Rivyls?',
        answer: 'Rivyls is fantasy college sports — you draft schools instead of players and earn points when they win. Create a league, invite friends, draft your schools, compete all season.',
      },
      {
        question: 'How do I create a league?',
        answer: 'Go to your Dashboard and tap "Create League." Set a name, choose team count, and configure scoring. Share the invite code with friends so they can join.',
      },
      {
        question: 'How do I join a league?',
        answer: 'Get an invite code from your commissioner, go to Dashboard, tap "Join League," and enter the code. If you got a link, just click it — you\'ll be redirected automatically.',
      },
      {
        question: 'How many schools are available to draft?',
        answer: '134 college programs — every major conference plus independents like Notre Dame.',
      },
    ],
  },
  {
    title: 'Events & Prediction Games',
    items: [
      {
        question: 'What are Events?',
        answer: 'Prediction competitions tied to real tournaments — fill out a bracket, pick game winners, or play survivor. Unlike season-long leagues, events are one-and-done.',
      },
      {
        question: 'What game formats are available?',
        answer: 'Bracket (predict every game winner), Pick\'em (pick winners each week), and Survivor (pick one team per week — lose and you\'re out). Each pool has its own scoring and tiebreakers.',
      },
      {
        question: 'How do I create or join an event pool?',
        answer: 'Browse Events from your dashboard. Pick a tournament, then create a new pool or join one with an invite code. Pools can be public or private.',
      },
      {
        question: 'Can I submit multiple brackets in one pool?',
        answer: 'If the pool host enables it via "Entries Per User," you can add multiple entries — each with its own picks, name, and colors.',
      },
      {
        question: 'How does bracket scoring work?',
        answer: 'Points for each correct pick, increasing in later rounds. The pool host can choose presets (Standard, Upset Heavy, Final Four Focus) or set custom values per round.',
      },
      {
        question: 'How do roster pools work?',
        answer: 'Pick participants from different skill tiers. Your best scores count toward your total — e.g., best 5 of 7 in a golf roster. Used for tournaments like The Masters.',
      },
      {
        question: 'How is golf scoring calculated in roster pools?',
        answer: 'Score-to-par (-5, E, +3). Your total is the sum of your best counting golfers. Lower is better. Scores update live with round-by-round breakdowns.',
      },
      {
        question: 'What are multi-format events?',
        answer: 'Some tournaments offer multiple pool types — e.g., The Masters has both pick\'em and roster pools. Join different types and compete separately in each.',
      },
      {
        question: 'What sports are available for events?',
        answer: 'College hockey, golf, college football, rugby, and more as they\'re added. Each sport has its own tournaments and formats.',
      },
    ],
  },
  {
    title: 'Drafts',
    items: [
      {
        question: 'How does the draft work?',
        answer: 'Teams take turns picking schools in real time. Each pick has a timer — if it runs out, auto-pick selects for you. The draft room has live chat so you can trash talk while you draft.',
      },
      {
        question: 'What draft formats are available?',
        answer: 'Snake (order reverses each round) or Linear (same order every round). Snake is most common and gives everyone a fair shot.',
      },
      {
        question: 'What happens if I miss my draft pick?',
        answer: 'Auto-pick selects the highest-ranked available school. You can also enable auto-pick ahead of time if you need to step away.',
      },
      {
        question: 'Can the commissioner pause the draft?',
        answer: 'Yes — pause and resume anytime. All members are notified.',
      },
      {
        question: 'How is draft order determined?',
        answer: 'Randomized when the draft starts. The commissioner can also set the order manually.',
      },
    ],
  },
  {
    title: 'Scoring',
    items: [
      {
        question: 'How are points calculated?',
        answer: 'Your schools earn points from real game results. Default: Win (+1), Conference Game (+1), 50+ Points (+1), Shutout (+1), Beat Top 10 (+2), Beat Top 25 (+1). Commissioners can customize everything.',
      },
      {
        question: 'When do scores update?',
        answer: 'Every few minutes on gamedays using live ESPN data. Final scores lock after games complete. A nightly job verifies all totals.',
      },
      {
        question: 'What is Double Points?',
        answer: 'Pick one school per week to earn 2x points. Must choose before games start. Use them wisely — your commissioner sets the season limit.',
      },
      {
        question: 'What is Weekly High Points?',
        answer: 'If enabled, the highest-scoring team each week wins a prize. Keeps every week competitive even if you\'re behind in the standings.',
      },
      {
        question: 'Do bowl games and playoffs count?',
        answer: 'Yes. Bowls, conference championships, and CFP games all count — with escalating multipliers that make playoff schools especially valuable.',
      },
      {
        question: 'Can the commissioner customize scoring?',
        answer: 'Yes. Adjust every scoring category and set postseason multipliers. Preset templates are available for quick setup.',
      },
    ],
  },
  {
    title: 'Roster Management',
    items: [
      {
        question: 'How do add/drops work?',
        answer: 'Drop a school from your roster and pick up an available one. Go to your team page, tap Drop, then pick a new school. Your commissioner sets the limit on how many moves you get per season.',
      },
      {
        question: 'Are there add/drop limits?',
        answer: 'Yes — your commissioner sets the max per season. Check league settings to see your limit and how many you\'ve used.',
      },
      {
        question: 'How does trading work?',
        answer: 'Propose a trade offering your schools for theirs. They accept or reject. The commissioner can veto unfair trades. Once approved, schools swap immediately.',
      },
      {
        question: 'Can trades be vetoed?',
        answer: 'Yes. The commissioner can veto any trade they believe is unfair. Both teams are notified and schools stay on their original rosters.',
      },
    ],
  },
  {
    title: 'Commissioner Tools',
    items: [
      {
        question: 'What can commissioners do?',
        answer: 'Full league control: scoring rules, draft settings, member management, bulletin board, trade vetoes, and co-commissioner appointments.',
      },
      {
        question: 'What is a co-commissioner?',
        answer: 'A member promoted to share management powers with the commissioner. Useful for splitting league admin duties.',
      },
      {
        question: 'How does the Bulletin Board work?',
        answer: 'Post updates that appear at the top of your league page. All members get notified. Use it for rule reminders, trade deadlines, or weekly recaps.',
      },
      {
        question: 'Can I run my league again next season?',
        answer: 'Yes. After the season ends, your league goes dormant. Hit "Start New Season" when the next season approaches — all members keep their spots with fresh teams and a new draft.',
      },
    ],
  },
  {
    title: 'Account & Settings',
    items: [
      {
        question: 'How do I change my display name?',
        answer: 'Go to Settings from the top-right menu. Your display name shows across all leagues.',
      },
      {
        question: 'How do I change the color theme?',
        answer: 'Go to Settings and pick from 4 color palettes. Your choice applies across the whole site.',
      },
      {
        question: 'Can I delete my account?',
        answer: 'Yes. Go to Settings and scroll to the bottom. This is permanent. Your teams will be kept in league records so standings and history stay accurate, but your personal info (email, name) will be removed.',
      },
      {
        question: 'How do referral links work?',
        answer: 'Share your unique referral link from your Profile page. When friends sign up through it, it\'s tracked and helps you earn badges.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    items: [
      {
        question: 'I can\'t join a league with my invite code.',
        answer: 'Codes are case-sensitive — enter it exactly. If the league is full, ask the commissioner to check capacity or send a new code.',
      },
      {
        question: 'The draft timer seems frozen.',
        answer: 'Refresh the page. The commissioner may have paused the draft — check the draft chat. On slow connections, updates may be delayed but your picks still save.',
      },
      {
        question: 'My scores don\'t look right.',
        answer: 'Scores update throughout gameday and may take a few minutes. A nightly job verifies everything. If still wrong after 24 hours, use "Report Issue" in Settings.',
      },
      {
        question: 'I\'m not receiving notifications.',
        answer: 'Check notification preferences in Settings. Make sure in-app notifications are enabled for the categories you want.',
      },
      {
        question: 'How do I report a bug?',
        answer: 'Use the "Report an Issue" button in the bottom-left corner of any page. Describe what happened and what you expected.',
      },
    ],
  },
]

export function HelpCenter() {
  const [search, setSearch] = useState('')
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  const query = search.toLowerCase().trim()

  const filteredCategories = FAQ_DATA.map((category) => ({
    ...category,
    items: category.items.filter(
      (item) =>
        !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
    ),
  })).filter((category) => category.items.length > 0)

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search help topics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
        />
      </div>

      {/* Categories */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-muted">No results found for &ldquo;{search}&rdquo;</p>
          <button
            onClick={() => setSearch('')}
            className="mt-2 text-brand-text hover:text-brand-text/80 text-sm"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredCategories.map((category) => (
            <section key={category.title}>
              <h2 className="text-lg font-semibold text-text-primary mb-3">{category.title}</h2>
              <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                {category.items.map((item, idx) => {
                  const key = `${category.title}-${idx}`
                  const isOpen = openItems.has(key)

                  return (
                    <div key={key}>
                      <button
                        onClick={() => toggleItem(key)}
                        className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-surface-subtle transition-colors"
                      >
                        <span className="text-text-primary text-sm font-medium">{item.question}</span>
                        <svg
                          className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1">
                          <p className="text-text-secondary text-sm leading-relaxed">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
