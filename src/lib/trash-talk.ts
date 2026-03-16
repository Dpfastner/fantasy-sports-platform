const TRASH_TALK_PROMPTS = {
  general: [
    "Your team is softer than a pillow fight",
    "I've seen better rosters in a dumpster fire",
    "My grandma could draft a better team",
    "You call that a roster? I call it charity",
    "Keep dreaming, that trophy is mine",
    "Your picks are giving participation trophy energy",
    "I'd say good luck but you're gonna need a miracle",
    "Is your team named after a disappointment? Because it should be",
    "You should rename your team 'Almost Good Enough'",
    "I'm not worried about your team. Nobody is.",
  ],
  afterWin: [
    "Another week, another W. You love to see it",
    "That win felt too easy honestly",
    "Scoreboard don't lie",
    "Somebody come get their team, they're lost out here",
    "Call me the commish of winning",
    "Your team took an L so hard it needs a timeout",
    "That wasn't a competition, that was a tutorial",
    "Better luck next week... actually, maybe not",
  ],
  afterLoss: [
    "That's called a fluke. Watch me bounce back",
    "I let you have that one. Don't get used to it",
    "One bad week doesn't make a season",
    "The comeback starts NOW",
    "I was sandbagging. Championship mode loading...",
    "My team was just resting for the playoffs",
  ],
  tradeTaunt: [
    "Thanks for the steal! Enjoy your consolation prize",
    "That trade is gonna haunt you all season",
    "You gave me a first-round pick for a benchwarmer? Thanks!",
    "Best trade I ever made. Can't say the same for you",
    "I'll send flowers when you realize what you gave up",
    "Thanks for making my team championship-ready",
  ],
}

export type TrashTalkCategory = keyof typeof TRASH_TALK_PROMPTS

export function getTrashTalkPrompts(category?: TrashTalkCategory, count = 4): string[] {
  const pool = category
    ? TRASH_TALK_PROMPTS[category]
    : Object.values(TRASH_TALK_PROMPTS).flat()

  // Shuffle and pick `count`
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function getAllCategories(): { key: TrashTalkCategory; label: string }[] {
  return [
    { key: 'general', label: 'General' },
    { key: 'afterWin', label: 'After a Win' },
    { key: 'afterLoss', label: 'After a Loss' },
    { key: 'tradeTaunt', label: 'Trade Taunt' },
  ]
}
