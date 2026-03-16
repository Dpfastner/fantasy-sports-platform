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
        answer: 'Rivyls is a fantasy college football platform where you draft real schools (not individual players) and earn points based on actual game results throughout the season. Create or join a league, draft your schools, and compete against friends all season long.',
      },
      {
        question: 'How do I create a league?',
        answer: 'Go to your Dashboard and click "Create League." You\'ll set a league name, choose the number of teams (4-16), and configure scoring rules. As the commissioner, you control all league settings. Once created, share the invite code with friends so they can join.',
      },
      {
        question: 'How do I join a league?',
        answer: 'You need an invite code from the league commissioner. Go to your Dashboard, click "Join League," and enter the code. You\'ll be added to the league and can create your fantasy team. If you received a link, just click it and sign up — you\'ll be redirected to the league automatically.',
      },
      {
        question: 'How many schools are available to draft?',
        answer: 'There are 134 FBS (Football Bowl Subdivision) college football programs available to draft. These include all major conference schools (SEC, Big Ten, Big 12, ACC) plus independents like Notre Dame and Army.',
      },
    ],
  },
  {
    title: 'Events & Prediction Games',
    items: [
      {
        question: 'What are Events?',
        answer: 'Events are prediction-based competitions tied to real sports tournaments (like the NCAA Frozen Four or The Masters). Unlike fantasy leagues where you draft teams for a full season, events let you make predictions — fill out a bracket, pick game winners, or play survivor-style elimination games.',
      },
      {
        question: 'What game formats are available?',
        answer: 'Three formats: Bracket (predict the winner of every game in a tournament), Pick\'em (pick game winners each week), and Survivor (pick one team per week — if they lose, you\'re eliminated). Each pool can have its own scoring rules and tiebreakers.',
      },
      {
        question: 'How do I create or join an event pool?',
        answer: 'Browse Events from the dashboard. Pick a tournament, then either create a new pool (you\'ll get an invite code to share) or join an existing one with a code. Pools can be public (anyone can find and join) or private (invite code required).',
      },
      {
        question: 'Can I submit multiple brackets in one pool?',
        answer: 'If the pool creator allows it (via the "Entries Per User" setting), you can add multiple entries. Each entry has its own picks, name, colors, and logo. Switch between your entries using the selector on the My Bracket tab.',
      },
      {
        question: 'How does bracket scoring work?',
        answer: 'You earn points for each correct pick. Points increase in later rounds — for example, 2 points for quarterfinals up to 16 points for the championship. The pool creator can choose from scoring presets (Standard, Upset Heavy, Final Four Focus) or set custom point values for each round.',
      },
      {
        question: 'How do roster pools work?',
        answer: 'In a roster pool, you build a team by selecting participants from different skill tiers (e.g., Tier A: top-ranked, Tier B: mid-ranked, Tier C: lower-ranked). Each tier has a set number of picks. Your best scores count toward your total — for example, best 5 of 7 in a golf roster. This format is used for tournaments like The Masters where individual performance is scored.',
      },
      {
        question: 'How is golf scoring calculated in roster pools?',
        answer: 'Golf roster pools use score-to-par (e.g., -5, E, +3). Your total is the sum of your best counting golfers\' scores-to-par. Lower is better — just like real golf. Scores update live during tournament rounds, and you can see round-by-round breakdowns (R1-R4) for each golfer in your roster.',
      },
      {
        question: 'What are multi-format events?',
        answer: 'Some tournaments offer multiple pool types under one event. For example, The Masters might have both pick\'em pools (predict matchup winners) and roster pools (build a golfer roster). You can join different pool types within the same event and compete separately in each.',
      },
      {
        question: 'What sports are available for events?',
        answer: 'Events are available across multiple sports including college hockey, golf, college football, and more as they\'re added. Each sport has its own tournaments and game formats.',
      },
    ],
  },
  {
    title: 'Drafts',
    items: [
      {
        question: 'How does the draft work?',
        answer: 'The commissioner sets a draft date and time. When the draft starts, teams take turns selecting schools in real-time. Each pick has a timer (set by the commissioner). If the timer runs out, the system auto-picks for you. The draft room includes live chat so you can talk with your league while drafting.',
      },
      {
        question: 'What draft formats are available?',
        answer: 'Two formats: Snake draft (pick order reverses each round — 1-2-3 then 3-2-1) and Linear draft (same order every round — 1-2-3 then 1-2-3). Snake is the most common and gives everyone a fair shot at top schools.',
      },
      {
        question: 'What happens if I miss my draft pick?',
        answer: 'If the pick timer expires, the system auto-picks the highest-ranked available school for you. You can also enable auto-pick manually if you need to step away — the system will draft for you based on rankings.',
      },
      {
        question: 'Can the commissioner pause the draft?',
        answer: 'Yes. The commissioner can pause and resume the draft at any time. This is useful for breaks or if someone is having technical issues. All league members are notified when the draft is paused or resumed.',
      },
      {
        question: 'How is draft order determined?',
        answer: 'Draft order is randomized when the commissioner starts the draft. The commissioner can also manually set the draft order before starting.',
      },
    ],
  },
  {
    title: 'Scoring',
    items: [
      {
        question: 'How are points calculated?',
        answer: 'Points are earned per game based on your drafted schools\' real results. The default scoring is: Win (+1), Conference Game (+1), Score 50+ Points (+1), Shutout Opponent (+1), Beat a Top 10 Team (+2), Beat a #11-25 Team (+1). Commissioners can customize all point values.',
      },
      {
        question: 'When do scores update?',
        answer: 'During gamedays (typically Saturdays), scores update every few minutes using live ESPN data. Final scores are locked after games complete, and points are calculated automatically. A nightly reconciliation job verifies all totals are accurate.',
      },
      {
        question: 'What is Double Points?',
        answer: 'Each week, you can select one school on your roster to earn double points. If that school wins and earns 3 points, you get 6 instead. Choose wisely — you can only pick one school per week, and you must make your selection before games start.',
      },
      {
        question: 'What is Weekly High Points?',
        answer: 'If enabled by the commissioner, the team that scores the most points in a given week wins a weekly prize. The commissioner sets the prize amount. This encourages week-to-week competition even if you\'re behind in the overall standings.',
      },
      {
        question: 'Do bowl games and playoffs count?',
        answer: 'Yes! Bowl games, conference championships, and College Football Playoff games all count for points. Playoff games have escalating multipliers, making them especially valuable. The season spans 23 scoring weeks (Weeks 0-22), covering regular season through the National Championship.',
      },
      {
        question: 'Can the commissioner customize scoring?',
        answer: 'Yes. Commissioners can adjust point values for every scoring category (wins, conference games, ranked upsets, shutouts, 50+ point games) and set multipliers for postseason games. Preset templates are available for quick setup.',
      },
    ],
  },
  {
    title: 'Roster Management',
    items: [
      {
        question: 'How do add/drops work?',
        answer: 'You can drop a school from your roster and pick up an undrafted school. Go to your team page, click "Drop" next to a school, then select an available school to add. The commissioner sets limits on how many add/drops you can make per season.',
      },
      {
        question: 'Are there add/drop limits?',
        answer: 'The commissioner configures the maximum number of add/drop transactions allowed per season. Check your league settings to see your limit and how many you\'ve used. Once you hit the limit, you cannot make more moves until the next season.',
      },
      {
        question: 'How does trading work?',
        answer: 'You can propose a trade to another team — offering one or more of your schools for one or more of theirs. The other team can accept or reject. If accepted, the commissioner (or league vote, depending on settings) can veto unfair trades. Once approved, the schools swap rosters immediately.',
      },
      {
        question: 'Can trades be vetoed?',
        answer: 'Yes. The commissioner can veto any trade they believe is unfair or collusive. When a trade is vetoed, both teams are notified and the trade is cancelled. Schools stay on their original rosters.',
      },
    ],
  },
  {
    title: 'Commissioner Tools',
    items: [
      {
        question: 'What can commissioners do?',
        answer: 'Commissioners have full control over their league: set scoring rules, configure draft settings, manage members (invite, remove), post to the bulletin board, veto trades, appoint co-commissioners, and manage season settings. Commissioners cannot edit scores — only the platform admin can override scores if needed.',
      },
      {
        question: 'What is a co-commissioner?',
        answer: 'Commissioners can promote any member to co-commissioner. Co-commissioners have the same management powers as the commissioner, which is useful for sharing league administration duties.',
      },
      {
        question: 'How does the Bulletin Board work?',
        answer: 'Commissioners can post to the Bulletin Board, which appears at the top of the league page. All members receive a notification when a new post is published. Use it for rule reminders, trade deadline warnings, weekly updates, or schedule posts in advance.',
      },
      {
        question: 'Can I run my league again next season?',
        answer: 'Yes! After the season ends, your league goes dormant automatically. When the next season approaches, you\'ll see a "Start New Season" button on your league page. Reactivating keeps all your members — everyone gets a fresh team and a new draft.',
      },
    ],
  },
  {
    title: 'Account & Settings',
    items: [
      {
        question: 'How do I change my display name?',
        answer: 'Go to Settings from the dropdown menu in the top right. You can update your display name, which appears across all your leagues.',
      },
      {
        question: 'How do I change the color theme?',
        answer: 'Go to Settings and look for the Palette/Theme section. Rivyls offers 4 color palettes — pick the one you like best. Your choice is saved and applies across the whole site.',
      },
      {
        question: 'Can I delete my account?',
        answer: 'Yes. Go to Settings and scroll to the bottom. Account deletion is permanent. Your fantasy teams will be soft-deleted to preserve league history integrity, but your personal data (email, name) will be removed.',
      },
      {
        question: 'How do referral links work?',
        answer: 'Each user has a unique referral link on their Profile page. Share it with friends — when they sign up through your link, it\'s tracked on your profile. Referrals help you earn badges and may unlock future rewards.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    items: [
      {
        question: 'I can\'t join a league with my invite code.',
        answer: 'Make sure the code is entered exactly as provided (codes are case-sensitive). If the league is full (reached max teams), you won\'t be able to join. Ask the commissioner to check the league capacity or send a new code.',
      },
      {
        question: 'The draft timer seems frozen.',
        answer: 'Try refreshing the page. If the issue persists, the commissioner may have paused the draft. Check the draft chat for updates. If you\'re on a slow connection, the real-time updates may be delayed — your picks will still be saved.',
      },
      {
        question: 'My scores don\'t look right.',
        answer: 'Scores update throughout gameday and may take a few minutes to reflect final results. A nightly reconciliation job runs every day to verify and fix any discrepancies. If scores still look wrong after 24 hours, use the "Report Issue" feature in Settings to let us know.',
      },
      {
        question: 'I\'m not receiving notifications.',
        answer: 'Check your notification preferences in Settings. Make sure in-app notifications are enabled for the categories you want (trades, draft reminders, game results). The notification bell in the header shows your unread count.',
      },
      {
        question: 'How do I report a bug?',
        answer: 'Go to Settings and use the "Report an Issue" section at the bottom of the page. Describe what happened, what you expected, and include any relevant details. Our team reviews all reports.',
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
