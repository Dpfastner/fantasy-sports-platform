// GOOGLE SHEETS REFERENCE CODE
// This file contains the original Google Apps Script code that this fantasy sports platform is based on.
// Saved for reference to understand the original competition logic and settings.
// DO NOT import or execute this code - it's for documentation purposes only.

/*
  Original Plan of Attack:
    Settings - Start up process?
    Calendar - Week 0?
    Library of functions for multiple leagues
    CBS - API
    Gemini integration

  Key Configuration from Original:

  SCORING SETTINGS (from CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS):
    - WIN: "C21"
    - CONFERENCE_GAME: "C22"
    - OVER_50: "C23"
    - SHUTOUT: "C24"
    - RANKED_25: "C25"
    - RANKED_10: "C26"
    - CONFERENCE_WIN: "C30"
    - HEISMAN_WINNER: "C31"
    - BOWL_APPEARANCE: "C32"
    - PLAYOFF_APPEARANCE_FIRST: "C34"
    - PLAYOFF_APPEARANCE_QUARTER: "D34"
    - PLAYOFF_APPEARANCE_SEMI: "E34"
    - LOSS: "D21"
    - CONFERENCE_GAME_LOSS: "D22"
    - OVER_50_LOSS: "D23"
    - SHUTOUT_LOSS: "D24"
    - RANKED_25_LOSS: "D25"
    - RANKED_10_LOSS: "D26"
    - CONFERENCE_LOSS: "D30"
    - CHAMPIONSHIP_WIN: "C35"
    - CHAMPIONSHIP_LOSS: "D35"

  DEFAULT SCORING VALUES (from CONFIG.SETUP.PLACEHOLDERS):
    - WIN: "1"
    - CONFERENCE_GAME: "1"
    - OVER_50: "1"
    - SHUTOUT: "1"
    - RANKED_25: "1"
    - RANKED_10: "2"
    - CONFERENCE_WIN: "10"
    - LOSS: "0"
    - CONFERENCE_GAME_LOSS: "0"
    - OVER_50_LOSS: "0"
    - SHUTOUT_LOSS: "0"
    - RANKED_25_LOSS: "0"
    - RANKED_10_LOSS: "0"
    - CONFERENCE_LOSS: "0"
    - HEISMAN_WINNER: "10"
    - BOWL_APPEARANCE: "5"
    - PLAYOFF_APPEARANCE: "5" (first round)
    - PLAYOFF_QUARTER: "5"
    - PLAYOFF_SEMI: "5"
    - CHAMPIONSHIP_WIN: "20"
    - CHAMPIONSHIP_LOSS: "5"

  DRAFT SETTINGS:
    - DRAFT_DATE: "C8"
    - DRAFT_TYPE: "C9" (Snake or Linear)
    - TEAM_COUNT: "C10"
    - NUMBER_SCHOOLS_PER_TEAM: "C11"
    - MAX_TIMES_SCHOOL_ALLOWED: "C12" (per team)
    - MAX_SCHOOL_SELECTIONS: "C13" (across all teams)
    - TIMER_AMOUNT: "C18"

  TRANSACTION SETTINGS:
    - FINAL_ADD_DROP_DATE: "C16"
    - NUMBER_OF_ADD_DROPS: "C17"

  PRIZE SETTINGS:
    - ENTRY_FEE: "C38"
    - PRIZE_POOL: "C39"
    - HIGH_POINTS_YES_NO: "C40"
    - HP_WEEKLY_AMOUNT: "C41"
    - TIES: "C42" (allow ties for high points)
    - NUMBER_WINNERS: "C43"
    - NUMBER_HP_WEEKS: "D41"
    - HP_PRIZE_POOL: "E41"
    - WINNER: "C44" (percentage)
    - RUNNER_UP: "C45" (percentage)
    - THIRD: "C46" (percentage)

  SETUP NOTES (user-facing help text):
    - DRAFT_DATE: "Double click to select a date for your league's draft"
    - DRAFT_TYPE: "Snake: Order reverses each round\nLinear: Same order each round"
    - TEAM_COUNT: "Number of teams participating in your league (8-20 recommended)"
    - SCHOOLS_PER_TEAM: "How many schools can each team draft (12 recommended)"
    - MAX_TIMES_ALLOWED: "Maximum times a single school can be selected per team (recommended 1)"
    - MAX_SELECTIONS: "Maximum times a school can be selected across all teams (3 recommended)"
    - FINAL_DATE: "Last date teams can make add/drop transactions. Usually Monday before Week 7"
    - NUM_ADD_DROPS: "Total number of add/drops allowed per team for the season. (50 recommended)"
    - TIMER_AMOUNT: "Time in seconds for each draft pick (60 seconds recommended)"

  SCORING NOTES:
    - WIN: "Points awarded for each win. (1 point recommended)"
    - CONFERENCE_GAME: "Bonus points for winning a conference game. (1 point recommended)"
    - OVER_50: "Bonus points for scoring over 50 points. (1 point recommended)"
    - SHUTOUT: "Bonus points for shutting out opponent. (1 point recommended)"
    - RANKED_25: "Bonus points for beating a Top 25 ranked opponent. (1 point recommended)"
    - RANKED_10: "Bonus points for beating a Top 10 ranked opponent. (2 points recommended)"
    - CONFERENCE_WIN: "Points for winning conference championship. (10 points recommended)"
    - HEISMAN_WINNER: "Points if your school has the Heisman winner. (10 points recommended)"
    - BOWL_APPEARANCE: "Points for making a bowl game. (5 points recommended)"
    - PLAYOFF_APPEARANCE: "Points for making the CFP playoffs. (5 points recommended)"
    - PLAYOFF_QUARTER: "Points for making a CFP Quarterfinal playoff game. (5 points recommended)"
    - PLAYOFF_SEMI: "Points for making a CFP Semifinal playoff game. (5 points recommended)"
    - CHAMPIONSHIP_WIN: "Points for winning the National Championship. (20 points recommended)"
    - CHAMPIONSHIP_LOSS: "Points for losing the National Championship. (5 points recommended)"

  TEAM NAME VALIDATION:
    - MAX_LENGTH: 25
    - MIN_LENGTH: 3
    - Profanity filter enabled
    - Reserved names blocked (admin, system, etc.)

  SCHOOLS LIST (134 FBS schools with colors and conferences):
    Air Force, Akron, Alabama, App State, Arizona, Arizona St, Arkansas, Arkansas St,
    Army, Auburn, Ball State, Baylor, Boise St, Boston College, Bowling Green, Buffalo,
    BYU, C Michigan, California, Charlotte, Cincinnati, Clemson, Coastal, Colorado,
    Colorado St, Duke, E Michigan, East Carolina, FAU, FIU, Florida, Florida St,
    Fresno St, GA Southern, Georgia, Georgia St, Georgia Tech, Hawai'i, Houston,
    Illinois, Indiana, Iowa, Iowa State, James Madison, Jax State, Kansas, Kansas St,
    Kennesaw St, Kent State, Kentucky, Liberty, Louisiana, Louisiana Tech, Louisville,
    LSU, Marshall, Maryland, Memphis, Miami, Miami OH, Michigan, Michigan St, Minnesota,
    Mississippi St, Missouri, MTSU, N Illinois, Navy, NC State, Nebraska, Nevada,
    New Mexico, New Mexico St, North Carolina, North Texas, Northwestern, Notre Dame,
    Ohio, Ohio State, Oklahoma, Oklahoma St, Old Dominion, Ole Miss, Oregon, Oregon St,
    Penn State, Pitt, Purdue, Rice, Rutgers, Sam Houston, San Diego St, San José St,
    SMU, South Alabama, South Carolina, South Florida, Southern Miss, Stanford, Syracuse,
    TCU, Temple, Tennessee, Texas, Texas A&M, Texas St, Texas Tech, Toledo, Troy,
    Tulane, Tulsa, UAB, UCF, UCLA, UConn, UL Monroe, UMass, UNLV, USC, Utah, Utah State,
    UTEP, UTSA, Vanderbilt, Virginia, Virginia Tech, W Michigan, Wake Forest, Washington,
    Washington St, West Virginia, Western KY, Wisconsin, Wyoming
*/

// Key differences to note for our implementation:
// 1. Original had 3 separate playoff appearance point values (first round, quarterfinal, semifinal)
//    Our schema has: playoff_first_round, playoff_quarterfinal, playoff_semifinal
// 2. Original tracked conference championship win AND loss separately
// 3. Original had detailed transaction log with team-based filtering
// 4. Timer options were 60 seconds default, user wants 30, 45, 60, 90, 120
