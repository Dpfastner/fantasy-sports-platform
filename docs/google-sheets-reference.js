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

// COMBINED - WORKING - Mostly
/* 
  Plan of Attack:     
    Settings - Start up process?
      Validating date before locking?
      Locking is that working?
      
    Calendar - Week 0?
    Library of functions that are being called so that multiple leagues can happen without my code being given away?

    CBS - API
    Gemini - 

    Validations - 
      Tabs - Stop new tab creation? 
      Lock Certain Ranges?
      Settings Page - Admin only?

    Triggers - 
      Insurance Triggers? 
        to make sure that all sheets are accurate and haven't been changed by users. 
          Transaction Log Info is correct? - Without resetting Transaction Log? - How to ensure this hasn't changed?
        Only if not using validations? 

    Additions - 
      Pay outs? Venmo?
      Highest scoring team each week?
      Link for Draft
    
    Testing -
    
    Final Code - 
      Delete Testing Functions, comments?, debugging?
    
    Next Year’s Problem -
      Caching years data
      Homepage?
      Champion Page?

    Code Review -
      Reorganize all the functions into correct categories

    Multipler - 
    1+ vs 1-
    Betting on there teams
    Betting on a player QB - Over under on a player 

*/
// 1. Global Variables
  let SHEETS;
  let sheetsInitialized = false;
  let cachedCalendarData = null;
  let schoolEligibilityManager = null;
  let cachedSchoolsList = null;
  let cachedSelections = null;
  let cachedCurrentWeek = null;
  let cachedWeekTimestamp = null;
  const WEEK_CACHE_DURATION = 60000;
  let cachedTeamSelections = new Map();
// 2. Configuration and Constants
  const CONFIG = {
    GAME: {
      INTERNAL_SETTINGS: {
        MAX_WEEKS: 16,},
      SCORING: {
        FACTORS: {
          WIN: { NAME: "Win", DEFAULT: "B26" },
          CONFERENCE_GAME: { NAME: "Conference Game", DEFAULT: "B27" },
          OVER_50: { NAME: "Over 50", DEFAULT: "B28" },
          SHUTOUT: { NAME: "Shutout", DEFAULT: "B29" },
          RANKED_25: { NAME: "Opp Ranked Top 25", DEFAULT: "B30" },
          RANKED_10: { NAME: "Opp Ranked Top 10", DEFAULT: "B31" }},
        SPECIAL: {
          CONFERENCE_WIN: { NAME: "Conference Championship Win", DEFAULT: "B35" },
          HEISMAN_WINNER: { NAME: "Heisman Winner", DEFAULT: "B36" },
          BOWL_APPEARANCE: { NAME: "Bowl Appearance", DEFAULT: "B37" },
          PLAYOFF_APPEARANCE: { NAME: "Playoff Appearance", DEFAULT: "B39" },
          CHAMPIONSHIP_WIN: { NAME: "Championship Win", DEFAULT: "B40" },
          CHAMPIONSHIP_LOSS: { NAME: "Championship Loss", DEFAULT: "C40" }}}},
    SHEETS: {
      STRUCTURE: {
        COMMON: {
          BUFFER_ROW_1: 1,
          HEADER_ROW: 2,
          BUFFER_ROW_2: 3,
          SUB_HEADER_ROW: 4,
          SUB_HEADER_ROW_2: 6,
          BUFFER_ROW_3: 5,
          DATA_START_ROW: 6,
          BUFFER_ROW_4: 7,
          TIMESTAMP_CELL: "D2",
          COLUMN_WIDTHS: {
            GAME_ID: 100,
            DATE_TIME: 80,
            RANK: 60,
            TEAM_NAME: 150,
            ABBREV: 80,
            QUARTER: 60,
            CLOCK: 80,
            POSSESSION: 150,
            DEFAULT: 100,
            LEADERBOARD_WEEKS: 150}},
        COLUMNS: {
          GAME_ID: 2,           // Column B
          WEEK_NAME: 4,         // Column D
          DATE: 5,              // Column E
          TIME: 6,              // Column F
          BOWL_NAME: 8,         // Column H
          TEAM_1_RANK: 9,       // Column I (Away Rank)
          TEAM_1_NAME: 10,      // Column J (Away Team)
          TEAM_1_ABBREV: 11,    // Column K (Away)
          TEAM_2_RANK: 12,      // Column L (Home Rank)
          TEAM_2_NAME: 13,      // Column M (Home Team)
          TEAM_2_ABBREV: 14,    // Column N (Home)
          STATUS: 16,           // Column P
          SCORE: 17,            // Column Q
          CONFERENCE_GAME: 19,  // Column S
          GAME_TIME: 21,        // Column U
          AWAY_SCORE: 14,       // Column N (replaces buffer in LIVE)
          HOME_SCORE: 15,       // Column O
          QTR: 18,              // Column R
          CLOCK: 19,            // Column S
          POSSESSION: 20,       // Column T
          POSSESSION_IMAGE: 21, // Column U
          POSSESSION_TEAM: 22,  // Column V
          LIVE_SCORE: 23,       // Column W
          COMPLETED: {
            WINNER_RANK: 9,     // Column I
            WINNER_TEAM: 10,    // Column J
            WINNER_ABBREV: 11,  // Column K
            WINNER_SCORE: 12,   // Column L
            LOSER_RANK: 13,     // Column M
            LOSER_TEAM: 14,     // Column N
            LOSER_ABBREV: 15,   // Column O
            LOSER_SCORE: 16,    // Column P
            FINAL_SCORE: 17,    // Column Q
            CONFERENCE_GAME: 19, // Column S
            COMPLETION_TIME: 21},
          RESET_COLUMNS: {
            SEASON: [11, 14],
            LIVE: [11, 14],
            COMPLETED: [11, 15]},
          TRACKER: {
            SCHOOLS: 2,
            SELECTIONS_LEFT: 3,
            ROUNDS: 7,
            TEAM_START: 8},
          POINTS: {
            SCHOOLS: 2,
            TOTAL: 3,
            WEEK_1: 5,
            HEISMAN: 24,
            NATTY: 28},
          LEADERBOARD: {
            PLACE: 2,
            TEAMS: 3,
            TOTALS: 4,
            WEEKS_START: 5,
            NAME: 34,
            WEEK: 35,
            RANK: 36,
            SCHOOL: 37,
            HEISMAN_SCHOOL: 41,
            CONFERENCE_START: 2},
          TRANSACTION: {
            SELECTIONS_LEFT:1,
            SCHOOLS: 2,
            RANK: 3,
            CONFERENCE: 4,
            CONFERENCE_RANK: 5,
            RECORD: 6,
            POINTS: 7,
            TEAM: 9,
            DROP: 10,
            ADD: 11,
            SUBMIT: 12,
            SUMMARY: 13,
            CONFIRM: 14,
            TIMESTAMP: 16,
            TEAM_NAME: 17,
            WEEK: 18,
            DROPPED: 19,
            ADDED: 20,
            PROGRAM_SLOT: 21,
            }},
        DEFAULT_USER_SHEET:{
          BORDER:{
            BORDER_TOP: "A1:AG1",
            HEADER_1: "B2:P2",
            HEADER_2: "Q2:AF2",  
            BORDER_TOP_2: "B3:AF3",          
            BORDER_LEFT: "A2:A1000",
            BORDER_MIDDLE_1: "G4:G1000",
            BORDER_RIGHT: "AG2:AG1000",
            BORDER_IMAGE_AREA: "D4:D10",
            BORDER_SEASON:"B5:C5",
            BORDER_CURRENT_WEEK:"B7:C7",
            BORDER_NATIONAL_CHAMP:"B9:C9",
            BORDER_HEISMAN:"B11:F11",
            BORDER_EDGE:"Q4:AF10"},
          COLOR_STORAGE: {
            BORDER_COLOR: "H5",      // Hidden column H
            HEADER_COLOR: "H6",      
            ACTION_COLOR: "H7",
            FONT_COLOR: "H8"},
          SEASON_INFO:{
            SEASON_HEADER_CELL: "B4",
            SEASON_HEADER: "Year: ",
            INFO: "C4"},
          CURRENT_WEEK:{
            CURRENT_WEEK_HEADER_CELL: "B6",
            CURRENT_WEEK_HEADER: "Current Week: ",
            INFO: "C6"}, 
          NC_GAME:{
            NC_GAME_HEADER_CELL: "B8",
            CURRENT_WEEK_HEADER: "National Championship Game: ",
            INFO: "C8"},
          HEISMAN_WINNER:{
            HEISMAN_HEADER_CELL: "B10",
            HEISMAN_HEADER: "Heisman Winner: ",
            INFO: "C10"},         
          IMAGE_AREA: {
            IMAGE_HEADER_CELL: "E4:F4",
            IMAGE_HEADER: "Team Picture: ",
            LINK:"E5:F5",
            PICTURE: "E6:F9",},
          BACKGROUND_COLOR: "I11",
          TEAM_NAME:{
            HEADER_CELL:"I4:J4",
            HEADER: "Team Name: ",
            INFO: "K4:P4"},
          OWNER_NAME:{
            HEADER_CELL: "I5:J5",
            HEADER: "Owner Name: ",
            INFO: "K5:P5"},
          CURRENT_POINTS:{
            HEADER_CELL: "I6:J6",
            HEADER: "Current Points: ",
            AMOUNT: "K6:L6"},
          CURRENT_PLACE:{
            HEADER_CELL: "I7:J7",
            HEADER: "Current Place: ",
            PLACE: "K7:L7"},
          CURRENT_WINNINGS:{
            HEADER_CELL: "I8:J8",
            HEADER: "Current Prize Winnings: ",
            EARNINGS: "K8:L8"},
          ADD_DROP:{
            COUNTER:{
              COUNTER_HEADER_CELL: "M6:N6",
              HEADER: "Your Add/Drop Counter: ",
              COUNTER: "O6:P6"},
            FINAL:{
              FINAL_DEADLINE_HEADER_CELL: "M7:N7",
              HEADER: "Final Add/Drop Date: ",
              FINAL_DEADLINE: "O7:P7"},
            WEEKLY:{
              WEEKLY_DEADLINE_HEADER_CELL: "M8:N9",
              HEADER: "This Week's Add/Drops must be in before: ",
              WEEKLY_DEADLINE: "O8:P9"}},
          PROGRAM:{
            WEEK:{
              WEEK_CELL:"B12",
              WEEK_HEADER:"Week Name:",
              WEEK_INFO_RANGE:"B13:B"},
            GAME_DATE:{
              GAME_DATE_CELL:"C12",
              GAME_DATE_HEADER:"Game Date/Time:",
              GAME_DATE_INFO_RANGE:"C13:C"},
            RANK:{
              RANK_CELL:"D12",
              RANK_HEADER:"Rank:",
              RANK_INFO_RANGE:"D13:D"},
            OPPONENT:{
              OPPONENT_CELL:"E12",
              OPPONENT_HEADER:"Opponent:",
              OPPONENT_INFO_RANGE:"E13:E"},
            SCORE:{
              SCORE_CELL:"F12",
              SCORE_HEADER:"Score:",
              SCORE_INFO_RANGE:"F13:F"},
            TEAMS:{
              HIDDEN_COLUMN: 8,
              POINTS_COLUMN_START: 12,
              POINTS_COLUMN_END: 32,
              PROGRAMS_SCHOOL_COLUMN: 9,
              TOTAL_COLUMN: 11,
              POINTS_ROW_START:13,
              PROGRAMS_HEADER_RANGE:"I11:AF11",
              PROGRAMS_WEEK_TOTALS_RANGE: "I12:AF12",
              PROGRAMS_SCHOOL_RANGE:"I13:I",
              PROGRAMS_TOTALS_RANGE: "K3:K",
              PROGRAMS_POINTS_RANGE:"L13:AF"}},
          UPDATE_CONTROLS: {
            TEAM_NAME_LABEL: "I9:J9",
            TEAM_NAME_LABEL_TEXT: "Update Team Name:",
            TEAM_NAME_CHECKBOX: "K9",
            COLORS_LABEL: "I10:J10",
            COLORS_LABEL_TEXT: "Update Team Colors:",
            COLORS_CHECKBOX: "K10",
            IMAGE_LABEL: "E10",
            IMAGE_LABEL_TEXT: "Update Image:",
            IMAGE_CHECKBOX: "F10",},
          REQUIRED_COLUMNS: [
            "Schools", "Conference", "Total",	"Week 1",	"Week 2",	"Week 3",	"Week 4",	"Week 5",	"Week 6",	"Week 7",	"Week 8",	"Week 9",	"Week 10",	"Week 11",	"Week 12",	"Week 13", "Week 14",	"Week 15 - Conference Championships",	"Week 16",	"Bowl Appearance",	"Heisman Winner", "Bowl Scores",	"Playoff Appearance",	"National Championship Game",]}},
      SPECIFIC: {
        SEASON: {
          NAME: "Season Schedule",
          HEADER: "Season Schedule",
          REQUIRED_COLUMNS: [
            "Game ID", "", "Week Name", "Date", "Time", "", "Bowl or Game Name","Away Rank", "Away Team", "Away", "Home Rank", "Home Team", "Home", "", "Status", "Score", "", "Conference Game", "","Game Time"]},
        LIVE: {
          NAME: "Live Scoring",
          HEADER: "Live Games",
          REQUIRED_COLUMNS: [
            "Game ID", "", "Week Name", "Date", "Time", "", "Bowl or Game Name","Away Rank", "Away Team", "Away", "Home Rank", "Home Team", "Home", "Away Score", "Home Score", "", "Status", "Qtr", "Clock", "Possession", "Possession Image", "Possession Team", "Score", "", "Conference Game", "", "Game Time"]},
        COMPLETED: {
          NAME: "Completed Games Cache",
          HEADER: "Completed Games Cache",
          REQUIRED_COLUMNS: [
            "Game ID", "", "Week Name", "Date", "Time", "", "Bowl or Game Name","Winner Rank", "Winner Team", "Winner Abbrev", "Winner Score","Loser Rank", "Loser Team", "Loser Abbrev", "Loser Score","Final Score", "", "Conference Game", "", "Completion Time"]},
        POINTS: {
          NAME: "Points Calculator",
          HEADER: "Points Calculator",
          SCHOOLS_RANGE: {
            START: "B6",
            END: "B139"},
          RESULTS_RANGE: {
            START: "C6",
            END: "C139"},
          REQUIRED_COLUMNS: [
            "Schools", "", "Total", "",	"Week 1",	"Week 2",	"Week 3",	"Week 4",	"Week 5",	"Week 6",	"Week 7",	"Week 8",	"Week 9",	"Week 10",	"Week 11",	"Week 12",	"Week 13", "Week 14",	"Week 15 - Conference Championships",	"Week 16",	"Bowl Appearance", "",	"Heisman Winner", "",	"Bowl Scores",	"Playoff Appearance",	"National Championship Game",]},
        TRACKER: {
          NAME: "Draft",
          HEADER: "The FBS Fantasy Draft",
          REQUIRED_COLUMNS: ["Schools:", "# of Selections Left:", "", "", "Timer", "Round"],
          DATA_START_ROW: 8,
          BUFFER_COLUMN: 4,
          CELLS: {
            BUFFER_COLUMN_CELL: "D6",
            TEAM_NAMES_START: "H8",
            TEAM_DROPDOWN: "B4",
            START_DRAFT_LABEL:"O4",
            START_DRAFT: "P4",
            TIMER:"F6"}},
        TRANSACTION: {
          NAME: "Transaction Log",
          REQUIRED_COLUMNS: ["# of Selections Left:","Schools:", "Top 25 Rank", "Conference", "Conference Rank", "Record", "# of Points", "", "Team Name:", "School Dropping:", "School Adding:", "Submit:", "Request Summary:", "Confirm Request:","", "Timestamp:", "Team Name:", "Week:", "Dropped School:", "Added School:", "Program Slot:"],
          CELLS: {
              SELECTIONS_LEFT: "A2",
              SCHOLLS: "B2",
              TEAM: "B4",
              DROP: "C4",
              ADD: "D4",
              SUBMIT: "E4",
              SUMMARY: "F4",
              CONFIRM: "H4",
              MERGE_RANGE_1: "I2:I",  // Updated from H2:H
              MERGE_RANGE_2: "P2:P"},
          COMBINED_UI: {
            FROZEN_ROWS: 5,
            TRANSACTION_HEADER: {
              RANGE: "B2:H2",  // Full width
              TITLE: "➕ ADD/DROP TRANSACTION",
              COLOR: "#925d65"},
            SECTIONS: {
                RESEARCH: {
                    RANGE: "B6:H6",  // Changed from A4:G4
                    TITLE: "🔍 RESEARCH & FILTER SCHOOLS",
                    COLOR: "#925d65"},
                HISTORY: {
                    RANGE: "J2:O3",  // Changed from I4:N4
                    TITLE: "📋 TRANSACTION HISTORY",
                    COLOR: "#ebad49"}},
            CONTROLS: {
                TEAM: {
                    LABEL_CELL: "B3",
                    LABEL_TEXT: "Team Name:",
                    VALUE_CELL: "B4"},
                DROP: {
                    LABEL_CELL: "C3",
                    LABEL_TEXT: "School Dropping:",
                    VALUE_CELL: "C4"},
                ADD: {
                    LABEL_CELL: "D3",
                    LABEL_TEXT: "School Adding:",
                    VALUE_CELL: "D4"},
                SUBMIT: {
                    LABEL_CELL: "E3",
                    LABEL_TEXT: "Submit:",
                    VALUE_CELL: "E4"},
                SUMMARY: {
                    LABEL_CELL: "F3",
                    LABEL_TEXT: "Request Summary:",
                    VALUE_CELL: "F4",
                    MERGE_RANGE: "F4:G4"},
                CONFIRM: {
                    LABEL_CELL: "H3",
                    LABEL_TEXT: "Confirm Request:",
                    VALUE_CELL: "H4"}},
            SUMMARY: {
              RANGE: "I3:K3",
              DEFAULT_TEXT: "Transaction summary will appear here...",
              FONT_STYLE: "italic",
              FONT_COLOR: "#666666"},
            FILTERS: {
                SORT_BY: {
                    LABEL_CELL: "C7",
                    LABEL_TEXT: "Sort By:",
                    VALUE_CELL: "D7",
                    DEFAULT: "School (A→Z)",
                    OPTIONS: ['Points (High→Low)', 'Points (Low→High)', 
                            'School (A→Z)', 'School (Z→A)', 'Record (Best→Worst)', 'Record (Worst→Best)', 'Conference Rank']},
                CONFERENCE: {
                    LABEL_CELL: "E7",  // Changed from A5
                    LABEL_TEXT: "Conference:",
                    VALUE_CELL: "F7",
                    DEFAULT: "All",
                    OPTIONS: ['All', 'SEC', 'Big Ten', 'ACC', 'Big 12', 'Pac-12', 
                              'Mountain West', 'AAC', 'Sun Belt', 'MAC', 'CUSA', 'Independent']},
                MIN_POINTS: {
                    LABEL_CELL: "G7",
                    LABEL_TEXT: "Min Points:",
                    VALUE_CELL: "H7",
                    DEFAULT: 0},
                FILTERS_LABEL: {
                    CELL: "C8",
                    TEXT: "Filter By:"},
                RANKED_ONLY: {
                    LABEL_CELL: "D8",
                    LABEL_TEXT: "Ranked Only:",
                    CHECKBOX_CELL: "E8"},
                AVAILABLE_ONLY: {
                    LABEL_CELL: "F8",
                    LABEL_TEXT: "Available Only:",
                    CHECKBOX_CELL: "G8"}},
            HISTORY_SUB_HEADERS: {
                START_ROW: 4,  // Changed from 5
                START_COL: 10,  // Column J (changed from 9)
                VALUES: ["Timestamp", "Team", "Week", "Dropped", "Added", "Slot"],
                BACKGROUND: "#ebad49"},
            BUFFER_ROW: {
                ROW: 5,
                COLOR: "#154655"},
            RESULTS: {
                HEADER_ROW: 9,  // Changed from 7
                HEADER_RANGE: "B9:H9",  // Changed from A7:G7
                HEADER_TEXT: "Filtered Results:",
                HEADER_BACKGROUND: "#154655",
                QUERY_CELL: "B10",  // Changed from A8
                HELPER_SHEET: "TransactionData",
                NOTE_TEXT: "Use the filters above to find schools. When you find one you want, type or select it in the Add dropdown in the transaction section.",
                ERROR_MESSAGE: "No schools match your filter criteria",
                FIRST_RESULT_ROW: 10,
                RESULT_HEADER_RANGE: "B10:H10",
                CENTER_ALIGN_COLUMNS: [1, 3, 4, 5, 6, 7],
                RESULT_DATA_RANGE: "B11:H"},
            SEPARATORS: {
                COLUMN_1: "A:A",
                COLUMN_2: "I:I",  // Changed from H:H
                COLUMN_3: "P:P",  // Added second separator
                COLOR: "#154655"},
            HISTORY_DATA: {
              START_ROW: 6,  // Data starts at row 7
              COLUMNS: {
                TIMESTAMP: 10,    // Column J
                TEAM_NAME: 11,    // Column K  
                WEEK: 12,         // Column L
                DROPPED: 13,      // Column M
                ADDED: 14,        // Column N
                PROGRAM_SLOT: 15}},
            CONTROL_BACKGROUND: "#E8E8E8"}},
        TEAMS: {
            NAME: "Teams",
            REQUIRED_COLUMNS: ["Team Names:", "Week:"]},
        LEADERBOARD: {
          NAME: "Leaderboard",
          HEADER: "Leaderboard",
          LEADERBOARD_RANGE: {
            RANKED_TEAMS_COUNT: 25},
          RESULTS_RANGE: {
            START: "B2",
            END: "W135"},
          LEADERBOARD_HEISMAN_RESULTS: {
            START_COLUMN: 41,
            NUM_COLUMNS: 1,},
          CONFERENCE_RANKINGS: {
            INDEPEN_CONFERENCE_COL_NUM: 2,
            REG_CONFERENCE_COL_NUM: 4},
          AP_RANKINGS_HEADERS: ["Name", "Week", "Rank", "School"],
          REG_CONFERENCE_HEADERS: ["Place", "School", "Conference Record", "Record"],
          INDEPEN_CONFERENCE_HEADERS:["School", "Record"],
          IDEAL_TEAM_HEADERS: ["# of Schools", "Schools", "", "Current Points"],
          IDEAL_SEASON: ["Ideal Drafted Team"],
          IDEAL_CURRENT_WEEK: ["Current Weeks Maximum Points Team"],
          REQUIRED_COLUMNS: ["Place", "Teams:", "Total",	"Week 1",	"Week 2", "",	"Week 3",	"Week 4",	"Week 5",	"Week 6", "",	"Week 7",	"Week 8",	"Week 9",	"Week 10", "",	"Week 11",	"Week 12",	"Week 13", "Week 14", "",	"Week 15 - Conference Championships",	"Week 16",	"Bowl Appearance",	"Heisman Winner", "",	"Bowl Scores",	"Playoff Appearance",	"National Championship Game", "Season Winners"]},
        DATA: {
          NAME: "TransactionData"},
        SETTINGS: {
          NAME: "Settings",
          CELLS: {
            DRAFT_DATE: "C8",
            DRAFT_TYPE: "C9",
            TEAM_COUNT: "C10",
            NUMBER_SCHOOLS_PER_TEAM: "C11",
            MAX_TIMES_SCHOOL_ALLOWED:  "C12",
            MAX_SCHOOL_SELECTIONS: "C13",            
            START_LEAGUE: "J4",
            START_LEAGUE_CONFIRM: "D1", // needed?
            REPORT_ISSUE: "N6",
            ADMIN_NAME: "J6",
            ADMIN_EMAIL: "J7",
            OWNER_NAMES_START: "I10",
            OWNER_EMAILS_START: "J10",
            ADDITIONAL_OWNER_EMAIL_START: "K10",
            TEAM_NAMES_START: "L10",
            // Team Colors and Font?
            FINAL_ADD_DROP_DATE: "C16",
            NUMBER_OF_ADD_DROPS: "C17",
            TIMER_AMOUNT: "C18",
            WIN:"C21",
            CONFERENCE_GAME:"C22",
            OVER_50:"C23",
            SHUTOUT:"C24",
            RANKED_25:"C25",
            RANKED_10:"C26",
            CONFERENCE_WIN: "C30",
            HEISMAN_WINNER: "C31",
            BOWL_APPEARANCE: "C32",
            PLAYOFF_APPEARANCE_FIRST: "C34",
            PLAYOFF_APPEARANCE_QUARTER: "D34",
            PLAYOFF_APPEARANCE_SEMI: "E34",
            LOSS:"D21",
            CONFERENCE_GAME_LOSS:"D22",
            OVER_50_LOSS:"D23",
            SHUTOUT_LOSS:"D24",
            RANKED_25_LOSS:"D25",
            RANKED_10_LOSS:"D26",
            CONFERENCE_LOSS: "D30",
            CHAMPIONSHIP_WIN: "C35",
            CHAMPIONSHIP_LOSS: "D35",
            ENTRY_FEE: "C38",
            PRIZE_POOL: "C39",
            HIGH_POINTS_YES_NO: "C40",
            HP_WEEKLY_AMOUNT: "C41",
            TIES:"C42",
            NUMBER_WINNERS:"C43",
            NUMBER_HP_WEEKS:"D41",
            HP_PRIZE_POOL: "E41",
            WINNER: "C44",
            RUNNER_UP: "C45",
            THIRD: "C46",
            OWNER_INFO: "I10",
            TEAM_NAME_INFO: "L10"
            }}}},
    UI: {
      STYLES: {
        BASE: {
          FONT_FAMILY: "Overpass",
          FONT_SIZE: 10,
          FONT_COLOR: "#000000",
          FONT_WEIGHT: "bold",
          BACKGROUND: "#f3f3f3",
          ALIGNMENT: "center",
          ALIGNMENT_LEFT: "left",
          ALIGNMENT_RIGHT: "right",
          VERTICAL_ALIGNMENT: "middle",
          WRAP: true,
          SUB_HEADER_FONT_SIZE:12},
        HEADER_STYLES: {
          FONT_SIZE: 56,
          FONT_WEIGHT: "bold"},
        HIDDEN: {
          BACKGROUND: "white",
          FONT_COLOR: "white"}},
      COLORS: {
        HEADER: {
          SEASON: "#925d65",
          LIVE: "#925d65",
          COMPLETED: "#925d65",
          POINTS: "#925d65",
          TRACKER: "#925d65",
          LEADERBOARD:"#925d65"},
        OTHER:{
          LIGHT_RED_2:"#EA9999",
          LIGHT_RED_3:"#F4CCCC",
          LIGHT_GREEN_3:"#C9DAF8",
          LIGHT_CORNFLOWER_3:"#B6D7A8",
          GOLD: "#FFD700",
          SILVER: "#E8E8E8",
          BRONZE: "#CD7F32",
          RED: "#FF0000"}},
      MESSAGES: {
        SUCCESS: {
          DEFAULT: "Operation completed successfully!",
          SETUP: "Competition setup completed successfully!",
          REPORT_ISSUE_SUCCESS: "Techincal Issue Reported. Techincal Support will reach out shortly.",
          DRAFT: "Draft setup completed successfully!",
          TRANSACTION: "Transaction processed successfully!"},
        ERROR: {
          TITLE: "Error",
          TECHNICAL: "Technical Issue Reported. Support will reach out shortly."},
        DRAFT: {
          WELCOME: (year) => `Welcome to the ${year} season. Your Draft has Begun.`,
          WAIT: (year) => `Today is not your Season ${year} Draft Date. Please wait or contact Commissioner.`,
          SELECTION: (team, school, nextTeam) => 
            `${team} has selected ${school}. ${nextTeam} you are on the clock.`,
          COMPLETE: (year) => `Congratulations. Your ${year} Draft is complete. Please confirm results.`,
          INVALID_COUNT: (item, actual, expected) =>
            `${item} has ${actual} items. Expected: ${expected}`,
          DUPLICATE_ITEM: (item, container) =>
            `${item} appears multiple times in ${container}`,
          MAX_EXCEEDED: (item, count, max) =>
            `${item} appears ${count} times. Maximum allowed: ${max}`,
          INVALID_ITEM: (item) =>
            `${item} is not in the approved list`},
        SETUP: {
            INVALID_TEAM_SIZE: (team, count, expected) =>
              CONFIG.UI.MESSAGES.DRAFT.INVALID_COUNT(team, count, expected),
            DUPLICATE_SCHOOL_IN_TEAM: (school, team) =>
              CONFIG.UI.MESSAGES.DRAFT.DUPLICATE_ITEM(school, team),
            NO_TEAMS_FOUND: "No teams found in the initial programs range.",
            INVALID_SCHOOL: (school) =>
              CONFIG.UI.MESSAGES.DRAFT.INVALID_ITEM(school),
            GENERAL_ERROR: "An error occurred during setup: ",
            MAX_SELECTIONS_EXCEEDED: (school, count, max) =>
              CONFIG.UI.MESSAGES.DRAFT.MAX_EXCEEDED(school, count, max)}},
      IMAGE: {
        DIMENSIONS: {
          POSSESSION: {
            WIDTH: 35,
            HEIGHT: 35}},
        RENDERING: 4}},
    SYSTEM: {
      API: {
        BASE_URL: "https://site.api.espn.com/apis/site/v2/sports/football/college-football",
        TEAM_LOGO_URL: "https://a.espncdn.com/i/teamlogos/ncaa/500/",
        HEISMAN_URL: "https://en.wikipedia.org/wiki/List_of_Heisman_Trophy_winners",
        GROUP: "80",
        LIMIT: "150",
        ENDPOINTS: {
          SCOREBOARD: "/scoreboard",
          RANKINGS: "/rankings"},
        BATCH_SIZE: 10,
        RETRY: {
          MAX: 3,
          DELAY: 1000,
          TIMEOUT: 30000}},
      TIME: {
        TIMEZONE: Session.getScriptTimeZone(),
        FORMATS: {
          DATE: "MM/dd/yy",
          TIME: "hh:mm a",
          API: "yyyyMMdd",
          FULL: "MM/dd/yyyy HH:mm:ss",
          TIMESTAMP: "MM/dd/yyyy HH:mm:ss"},
        WINDOW: {
          HOURS_BEFORE: 3,
          HOURS_AFTER: 3}},
      BUFFER: {
        COLUMN: 1,
        ADD_COLUMNS: 35,
        ROW: 1},
      CACHE: {
        UPDATE_INTERVAL: 1},
      HELPERS: {
        validateTeamSize: (team, schools) => {
            const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
            const numSchoolsPerTeam = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM).getValue();
            if (schools.length !== numSchoolsPerTeam) {
                throw new Error(CONFIG.UI.MESSAGES.DRAFT.INVALID_COUNT(
                    team,
                    schools.length,
                    numSchoolsPerTeam));}},
        validateWeek: (week) => {
          if (week < CONFIG.DRAFT.VALIDATION.WEEK.MIN || week > CONFIG.DRAFT.VALIDATION.WEEK.MAX) {
            throw new Error(CONFIG.UI.MESSAGES.DRAFT.INVALID_COUNT(
              "Week",
              week,
              `between ${CONFIG.DRAFT.VALIDATION.WEEK.MIN} and ${CONFIG.DRAFT.VALIDATION.WEEK.MAX}`));}},
        getMaxSchoolsPerTeam: () => {
          try {
            const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
              .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
            if (!settingsSheet) {
              console.warn("Settings sheet not found");
              throw new Error("Settings sheet not found");
            }
            const value = settingsSheet
              .getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM)
              .getValue();
            if (!value) {
              console.warn("No value found in NUMBER_SCHOOLS_PER_TEAM cell");
              throw new Error("NUMBER_SCHOOLS_PER_TEAM value not set");
            }
            return value;
          } catch (error) {
            console.error("Error getting maxSchoolsPerTeam:", error);
            throw error;}},
        toggleConfirmButton: (confirmRange, show) => {
          confirmRange.setFontColor(show ? "black" : CONFIG.UI.STYLES.HIDDEN.FONT_COLOR);},
        resetControls: (submitRange, confirmRange) => {
          submitRange.setValue(false);
          confirmRange
            .setValue(false)
            .setFontColor(CONFIG.UI.STYLES.HIDDEN.FONT_COLOR);},
        showError: (message) => {
          SHEETS.ss.toast(message, CONFIG.UI.MESSAGES.ERROR_TITLE);},
        showSuccess: (message = CONFIG.UI.MESSAGES.SUCCESS) => {
          SHEETS.ss.toast(message, CONFIG.UI.MESSAGES.DEFAULT);}},
      TRIGGERS: {
        MAPPINGS: {
          SETTINGS: {
            'C1': 'handleStartLeague',
            'D1': 'handleStartLeagueConfirm',
            'J4': 'handleSetupStart'},
          TRACKER: {
            'P4': 'handleDraftStart'},
          TRANSACTION: {
              'B4': ['updateDroppingSchoolDropdown', 'updateAddingSchoolDropdown'],  // was I2
              'C4': 'updateAddingSchoolDropdown',  // was J2
              'E4': 'handleTransactionLogEdit',    // was L2
              'H4': 'handleTransactionLogEdit',    // was N2
          }}}},
    DRAFT: {
      SETUP: {
        EXTRA_ROWS: 50,
        TEAM_PADDING: 10,
        TYPE_OPTIONS: ["Linear", "Snake"]},
      VALIDATION: {
        WEEK: {
          MIN: 1,
          get MAX() {
            return CONFIG.GAME.INTERNAL_SETTINGS.MAX_WEEKS;},
          get HELP_TEXT() {
            return `Enter a week number between ${this.MIN} and ${this.MAX}`;}}}},
    SETUP: {
      VISUAL: {
        COLORS: {
          HEADER_BACKGROUND: "#925d65",     // Custom red
          HEADER_FONT: "#f3f3f3",           // Custom White
          QUESTION_FONT: "#154655",        // Custom blue
          SCORING_BACKGROUND: "#B8B8B8",    // Darker grey
          ACTION_GOLD: "#ebad49",          // Custom Gold
          USER_BACKGROUND: "#E8E8E8",      // Light grey
          CHECKMARK_GREEN: "#34A853"}},
      CONTROLS: {
        SUBHEADER: {
          RANGE: "B4:G4",
          INITIAL_TEXT: "Let's set up your league in just a few steps",
          COMPLETE_TEXT: "Thank you for setting up your league!"},
        SETUP_START: {
          LABEL_CELL: "I4",
          CHECKBOX_CELL: "J4",
          INITIAL_LABEL: "Click here to Start →",
          DRAFT_COMPLETE_LABEL: "Draft Complete! Click here to start your league →",
          COMPLETE_LABEL: "Click here when ready to begin draft →"}},
      PLACEHOLDERS: {
        DRAFT_DATE: "mm/dd/yyyy",
        TEAM_COUNT: "8-20",
        SCHOOLS_PER_TEAM: "12",
        MAX_TIMES_ALLOWED: "1",
        MAX_SELECTIONS: "3",
        FINAL_DATE: "mm/dd/yyyy",
        NUM_ADD_DROPS: "50",
        WIN: "1",
        CONFERENCE_GAME: "1",
        OVER_50: "1",
        SHUTOUT: "1",
        RANKED_25: "1",
        RANKED_10: "2",
        CONFERENCE_WIN: "10",
        LOSS: "0",
        CONFERENCE_GAME_LOSS: "0",
        OVER_50_LOSS: "0",
        SHUTOUT_LOSS: "0",
        RANKED_25_LOSS: "0",
        RANKED_10_LOSS: "0",
        CONFERENCE_WIN: "10",
        CONFERENCE_LOSS: "0",
        HEISMAN_WINNER: "10",
        BOWL_APPEARANCE: "5",
        PLAYOFF_APPEARANCE: "5",
        CHAMPIONSHIP_WIN: "20",
        CHAMPIONSHIP_LOSS: "5",
        ENTRY_FEE: "$100",
        WEEKLY_AMOUNT: "$30",
        NUM_HP_WEEKS: "15",
        HP_PRIZE_POOL: "$350",
        OWNER_NAME: "Owner Name ex. Sam",
        OWNER_EMAIL: "email@example.com",
        TEAM_NAME: "Winner Winner Chicken Dinner"},
      CHECKMARK_CELLS: {
        DRAFT_DATE: "F8",
        DRAFT_TYPE: "F9",
        TEAM_COUNT: "F10",
        SCHOOLS_PER_TEAM: "F11",
        MAX_TIMES_ALLOWED: "F12",
        MAX_SELECTIONS: "F13",
        FINAL_DATE: "F16",
        NUM_ADD_DROPS: "F17",
        TIMER: "F18",
        WIN: "F21",
        CONFERENCE_GAME: "F22",
        OVER_50: "F23",
        SHUTOUT: "F24",
        RANKED_25: "F25",
        RANKED_10: "F26",
        CONFERENCE_WIN: "F30",
        HEISMAN_WINNER: "F31",
        BOWL_APPEARANCE: "F32",
        PLAYOFF_APPEARANCE: "F34",
        CHAMPIONSHIP_WIN: "F35",
        ENTRY_FEE: "F38",
        HIGH_POINTS_YN: "F40",
        WEEKLY_AMOUNT: "F41",
        TIES_YN: "F42",
        NUM_WINNERS: "F43"},
      NOTES: {
        DRAFT_DATE: "Double click to select a date for your league's draft",
        DRAFT_TYPE: "Snake: Order reverses each round\nLinear: Same order each round",
        TEAM_COUNT: "Number of teams participating in your league (8-20 recommended)",
        SCHOOLS_PER_TEAM: "How many schools can each team draft (12 recommended)",
        MAX_TIMES_ALLOWED: "Maximum times a single school can be selected per team (recommended 1)",
        MAX_SELECTIONS: "Maximum times a school can be selected across all teams (3 recommended)",
        FINAL_DATE: "Double click to select the last date teams can make add/drop transactions. Usually the Monday before Week 7",
        NUM_ADD_DROPS: "Total number of add/drops allowed per team for the season. (50 recommended)",
        TIMER_AMOUNT: "Time in seconds for each draft pick (60 seconds recommended)",
        WIN: "Points awarded for each win. (1 point recommended)",
        CONFERENCE_GAME: "Bonus points for winning a conference game. (1 point recommended)",
        OVER_50: "Bonus points for scoring over 50 points. (1 point recommended)",
        SHUTOUT: "Bonus points for shutting out opponent. (1 point recommended)",
        RANKED_25: "Bonus points for beating a Top 25 ranked opponent. (1 point recommended)",
        RANKED_10: "Bonus points for beating a Top 10 ranked opponent. (2 points recommended)",
        CONFERENCE_WIN: "Points for winning conference championship. (10 points recommended)",
        LOSS: "Points awarded for each loss. (0 points recommended)",
        CONFERENCE_GAME_LOSS: "Bonus points for Losing a conference game. (0 points recommended)",
        OVER_50_LOSS: "Bonus points for getting beat by over 50 points. (0 points recommended)",
        SHUTOUT_LOSS: "Bonus points for getting shutting out. (0 points recommended)",
        RANKED_25_LOSS: "Bonus points for losing to a Top 25 ranked opponent. (0 points recommended)",
        RANKED_10_LOSS: "Bonus points for losing to a Top 10 ranked opponent. (0 points recommended)",
        CONFERENCE_LOSS: "Points for losing conference championship game. (0 points recommended)",
        HEISMAN_WINNER: "Points if your school has the Heisman winner. (10 points recommended)",
        BOWL_APPEARANCE: "Points for making a bowl game. (5 points recommended)",
        PLAYOFF_APPEARANCE: "Points for making the CFP playoffs. (5 points recommended)",
        PLAYOFF_QUARTER: "Points for making a CFP Quarterfinal playoff game. (5 points recommended)",
        PLAYOFF_SEMI: "Points for making a CFP Semifinal playoff game. (5 points recommended)",
        CHAMPIONSHIP_WIN: "Points for winning the National Championship. (20 points recommended)",
        CHAMPIONSHIP_LOSS: "Points for losing the National Championship. (5 points recommended)",
        ENTRY_FEE: "Entrance Fee for the league",
        HIGH_POINTS_YN: "Enable weekly high points prizes? (Yes/No)",
        WEEKLY_AMOUNT: "Prize amount for Weekly High Points winner",
        TIES_YN: "Split prize money for ties? (Yes/No)",
        NUM_WINNERS: "Number of overall winners to pay (1-3)",
        NUM_HP_WEEKS: "Number of weeks to award high points prizes. (15 Weeks recommended)",
        HP_PRIZE_POOL: "Total Prize Pool for Weekly High Points",
        OWNER_INFO: "Enter owner name and email for each team",
        TEAM_NAME_INFO: "Enter a unique team name (3-25 characters)"}},    
    USER_SESSION: {
      SETTINGS_ROW: 10,  // Hidden row in settings sheet
      EMAIL_COLUMN: "P",
      TIMESTAMP_COLUMN: "Q",
      SESSION_ID_COLUMN: "R",
      SESSION_TIMEOUT: 3600000, // 1 hour
      WARNING_TIME: 300000}}
  const SCHOOLS = [
    ["Air Force","#ffffff","#1d38a0","Mountain West"],
    ["Akron","#c9b279","#012d59","MAC"], 
    ["Alabama","#ffffff","#912528","SEC"],
    ["App State","#ffcc02","#181a1b","Sun Belt"],
    ["Arizona","#c31b17","#013366","Big 12"],
    ["Arizona St","#f2c334","#912528","Big 12"],
    ["Arkansas","#ffffff","#c31b17","SEC"],
    ["Arkansas St","#181a1b","#cc0b2f","Sun Belt"],
    ["Army","#c9b279","#181a1b","AAC"],
    ["Auburn","#e76100","#04234b","SEC"],
    ["Ball State","#000000","#cc0b2f","MAC"],
    ["Baylor","#f6b21b","#144431","Big 12"],
    ["Boise St","#fe4f02","#202f83","Mountain West"],
    ["Boston College","#ab8723","#6f1221","ACC"],
    ["Bowling Green","#4e0101","#fe4f02","MAC"],
    ["Buffalo","#ffffff","#0563c1","MAC"],
    ["BYU","#808080","#003262","Big 12"],
    ["C Michigan","#f6b21b","#6a0032","MAC"],
    ["California","#f6b21b","#003262","ACC"],
    ["Charlotte","#ab8723","#036a38","AAC"],
    ["Cincinnati","#ffffff","#e23a25","Big 12"],
    ["Clemson","#69578f","#fe4f02","ACC"],
    ["Coastal","#a17751","#016f71","Sun Belt"],
    ["Colorado","#c9b279","#181a1b","Big 12"],
    ["Colorado St","#ab8723","#054d3e","Mountain West"],
    ["Duke","#ffffff","#202f83","ACC"],
    ["E Michigan","#000000","#036a38","MAC"],
    ["East Carolina","#f6b21b","#59298a","AAC"],
    ["FAU","#c31b17","#013366","AAC"],
    ["FIU","#ab8723","#002e54","CUSA"],
    ["Florida","#d3602d","#1d38a0","SEC"],
    ["Florida St","#ab8723","#912528","ACC"],
    ["Fresno St","#1d38a0","#e3303b","Mountain West"],
    ["GA Southern","#b7b7b7","#013366","Sun Belt"],
    ["Georgia","#ffffff","#bb0d2f","SEC"],
    ["Georgia St","#c31b17","#1d38a0","Sun Belt"],
    ["Georgia Tech","#002e54","#ab8723","ACC"],
    ["Hawai'i","#b7b7b7","#054d3e","Mountain West"],
    ["Houston","#912528","#e3303b","Big 12"],
    ["Illinois","#13294a","#e76100","Big Ten"],
    ["Indiana","#ffffff","#aa1d19","Big Ten"],
    ["Iowa","#000000","#f2c334","Big Ten"],
    ["Iowa State","#f6b21b","#c31b17","Big 12"],
    ["James Madison","#c9b279","#59298a","Sun Belt"],
    ["Jax State","#008ed6","#002664","CUSA"],
    ["Kansas","#e3303b","#1d38a0","Big 12"],
    ["Kansas St","#ffffff","#69578f","Big 12"],
    ["Kennesaw St","#000000","#f6b21b","CUSA"],
    ["Kent State","#f2c334","#002664","MAC"],
    ["Kentucky","#ffffff","#024086","SEC"],
    ["Liberty","#c31b17","#013366","CUSA"],
    ["Louisiana","#000000","#e3303b","Sun Belt"],
    ["Louisiana Tech","#e3303b","#1d38a0","CUSA"],
    ["Louisville","#ffffff","#cc0100","ACC"],
    ["LSU","#ffcc02","#59298a","SEC"],
    ["Marshall","#b7b7b7","#02b140","Sun Belt"],
    ["Maryland","#f2c334","#e23a25","Big Ten"],
    ["Memphis","#b7b7b7","#1d38a0","AAC"],
    ["Miami","#004102","#d3602d","ACC"],
    ["Miami OH","#000000","#c31b17","MAC"],
    ["Michigan","#f6b21b","#1b3e79","Big Ten"],
    ["Michigan St","#ffffff","#054d3e","Big Ten"],
    ["Minnesota","#f2c334","#912528","Big Ten"],
    ["Mississippi St","#ffffff","#952333","SEC"],
    ["Missouri","#000000","#f6b21b","SEC"],
    ["MTSU","#0563c1","#000000","CUSA"],
    ["N Illinois","#000000","#e3303b","MAC"],
    ["Navy","#ab8723","#002e54","AAC"],
    ["NC State","#ffffff","#db1525","ACC"],
    ["Nebraska","#ffffff","#db1525","Big Ten"],
    ["Nevada","#b7b7b7","#1b3e79","Mountain West"],
    ["New Mexico","#b7b7b7","#bb0d2f","Mountain West"],
    ["New Mexico St","#b7b7b7","#912528","CUSA"],
    ["North Carolina","#ffffff","#a5c3e4","ACC"],
    ["North Texas","#000000","#036a38","AAC"],
    ["Northwestern","#000000","#69578f","Big Ten"],
    ["Notre Dame","#c59300","#024086","Independent"],
    ["Ohio","#cda077","#036a38","MAC"],
    ["Ohio State","#666666","#db1525","Big Ten"],
    ["Oklahoma","#ffffff","#aa1d19","SEC"],
    ["Oklahoma St","#000000","#d3602d","Big 12"],
    ["Old Dominion","#b7b7b7","#1b3e79","Sun Belt"],
    ["Ole Miss","#ffffff","#e3303b","SEC"],
    ["Oregon","#faf119","#004102","Big Ten"],
    ["Oregon St","#000000","#e96b21","Pac-12"],
    ["Penn State","#ffffff","#0a3472","Big Ten"],
    ["Pitt","#f6b21b","#00328e","ACC"],
    ["Purdue","#000000","#ab8723","Big Ten"],
    ["Rice","#b7b7b7","#1b3e79","AAC"],
    ["Rutgers","#9da196","#e23a25","Big Ten"],
    ["Sam Houston","#ffffff","#e96b21","CUSA"],
    ["San Diego St","#000000","#aa1d19","Mountain West"],
    ["San José St","#f2c334","#2d68c4","Mountain West"],
    ["SMU","#e3303b","#1d38a0","ACC"],
    ["South Alabama","#e3303b","#0a3472","Sun Belt"],
    ["South Carolina","#000000","#aa1d19","SEC"],
    ["South Florida","#ab8723","#004102","AAC"],
    ["Southern Miss","#ffcc02","#000000","Sun Belt"],
    ["Stanford","#ffffff","#912528","ACC"],
    ["Syracuse","#ffffff","#d3602d","ACC"],
    ["TCU","#8a8a8a","#59298a","Big 12"],
    ["Temple","#ffcc02","#971b2f","AAC"],
    ["Tennessee","#ffffff","#ff8200","SEC"],
    ["Texas","#ffffff","#ca6705","SEC"],
    ["Texas A&M","#8a8a8a","#4e0101","SEC"],
    ["Texas St","#ab8723","#912528","Sun Belt"],
    ["Texas Tech","#000000","#c70202","Big 12"],
    ["Toledo","#0563c1","#1b3e79","MAC"],
    ["Troy","#8a8a8a","#971b2f","Sun Belt"],
    ["Tulane","#02b140","#004102","AAC"],
    ["Tulsa","#c70202","#1b3e79","AAC"],
    ["UAB","#ab8723","#004102","AAC"],
    ["UCF","#ab8723","#ffcc02","Big 12"],
    ["UCLA","#f2c334","#0563c1","Big Ten"],
    ["UConn","#ffffff","#04234b","Independent"],
    ["UL Monroe","#f6b21b","#912528","Sun Belt"],
    ["UMass","#572932","#971b2f","Independent"],
    ["UNLV","#c1c6c8","#c70202","Mountain West"],
    ["USC","#f6b21b","#912528","Big Ten"],
    ["Utah","#808080","#cc0100","Big 12"],
    ["Utah State","#ffffff","#002e54","Mountain West"],
    ["UTEP","#04234b","#ff8200","CUSA"],
    ["UTSA","#04234b","#f05a22","AAC"],
    ["Vanderbilt","#000000","#ab8723","SEC"],
    ["Virginia","#ea6516","#1b3e79","ACC"],
    ["Virginia Tech","#5e012e","#c84220","ACC"],
    ["W Michigan","#ab8723","#6c4023","MAC"],
    ["Wake Forest","#000000","#ab8723","ACC"],
    ["Washington","#ffffff","#69578f","Big Ten"],
    ["Washington St","#5e6a71","#912528","Pac-12"],
    ["West Virginia","#eaaa02","#202f83","Big 12"],
    ["Western KY","#000000","#c70202","CUSA"],
    ["Wisconsin","#000000","#bb0d2f","Big Ten"],
    ["Wyoming","#f2c334","#472d23","Mountain West"]];
  const TEAM_NAME_CONFIG = {
    MAX_LENGTH: 25,
    MIN_LENGTH: 3,
    PROFANITY_FILTER: {
      ENABLED: true,
      WORDS: [
        'damn', 'dammit', 'hell', 'crap', 'piss', 'pissed', 'bastard', 'ass',
        'shit', 'bitch', 'dick', 'cock', 'pussy', 'asshole', 'bullshit', 'butt',
        'motherfucker', 'fuck', 'fucking', 'fucked', 'fucker',
        'fag', 'faggot', 'dyke', 'tranny', 'nigger', 'nigga', 'chink',
        'spic', 'wetback', 'kike', 'raghead', 'retard', 'retarded',
        'dildo', 'penis', 'vagina', 'tits', 'boobs', 'cum', 'jizz',
        'blowjob', 'handjob', 'anal', 'rape', 'molest',
        'cocaine', 'heroin', 'meth', 'crack', 'KKK'],
      PATTERNS: [
        /\bf+[u*@]+[c*@]?[k*]+/i,          // fuck variations
        /\bs+h+[i!1*@]+[t*]+/i,            // shit variations
        /\bb+[i!1*@]+[t*]+c+h*/i,          // bitch variations
        /\ba+[s$5*@]+[s$5*@]+/i,           // ass variations
        /\bd+[i!1*@]+[c*]?[k*]+/i,         // dick variations
        /\bp+[i!1*@]+[s$5*@]+[s$5*@]*/i,   // piss variations
        /\bc+[o0*@]+[c*]+[k*]+/i,          // cock variations
        /\bp+[u*@]+[s$5*@]+[s$5*@]*[y*]+/i,// pussy variations
        /\bd+[a@*]+m+n*/i,                  // damn variations
        /\bh+[e3*@]+[l1!*@]+[l1!*@]*/i,    // hell variations
        /\bc+r+[a@*]+p+/i,                  // crap variations
        /\b[s5]+h+[i1!]+[t7]+/i,           // 5h1t, sh17, etc.
        /\b[f]+[u4]+[c(]+[k]+/i,           // fu(k, f4ck, etc.
        /\b[a4@]+[s5$]+[s5$]+/i,           // 4ss, @$$, etc.
        /\b[b8]+[i1!]+[t7]+[c(]+[h]+/i,    // b17ch, b!7ch, etc.
        /\b[n]+[i1!]+[g6]+[g6]+[e3a@]*[r]*s*/i,  // n-word variations
        /\b[f]+[a@4]+[g6]+[g6]*[o0]+[t7]*s*/i,   // f-slur variations
        /\b[s5]+[e3]+[x]+/i,                      // s3x variations
        /\b[p]+[o0]+[r]+[n]+/i,                   // p0rn variations
        /f\s*u\s*c\s*k/i,
        /s\s*h\s*i\s*t/i,
        /b\s*i\s*t\s*c\s*h/i,]},
    WHITELIST: [
      'grape apes',
      'scunthorpe',
      'arsenal',
      'therapist',
      'classic',
      'bass',
      'grass',
      'massachusetts',
      'titus',
      'analysis',
      'assassin',
      'basement'],
    RESERVED_NAMES: [
      'admin', 'administrator', 'system', 'default', 'test', 'temp',
      'temporary', 'null', 'undefined', 'true', 'false', 'delete',
      'removed', '[deleted]', 'moderator', 'mod', 'owner', 'commissioner',
      'league', 'all', 'none', 'everyone', 'anonymous', 'guest'],
    SYSTEM_SHEETS: [
      'Settings', 'Draft', 'Teams', 'Season Schedule', 
      'Live Scoring', 'Completed Games Cache', 'Points Calculator',
      'Leaderboard', 'Transaction Log', 'TransactionData']};
// 3. Utility functions
  class Utils {
    static formatDate(date, format) {
      return Utilities.formatDate(new Date(date), CONFIG.SYSTEM.TIME.TIMEZONE, format);}
    static fetchJSON(url) {
      try {
        const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        if (response.getResponseCode() !== 200) {
          console.error(`Failed to fetch data from ${url}. Response Code: ${response.getResponseCode()}`);
          return null;}
        return JSON.parse(response.getContentText());
      } catch (error) {
        console.error(`Error fetching JSON from ${url}:`, error);
        return null;}}
    static getSheet(name) {
      return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);}
    static addTimestamp(sheet, cell) {
      const timestamp = this.formatDate(new Date(), CONFIG.SYSTEM.TIME.FORMATS.TIMESTAMP);
      sheet.getRange(cell).setValue(`Last updated: ${timestamp}`);}
    static letterToColumn(letter) {
      let column = 0;
      const length = letter.length;
      for (let i = 0; i < length; i++) {
        column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);}
      return column;}
    static columnToLetter(column) {
      let temp = column;
      let letter = '';
      while (temp > 0) {
        const remainder = (temp - 1) % 26;
        letter = String.fromCharCode(65 + remainder) + letter;
        temp = Math.floor((temp - 1) / 26);}
      return letter;}
    static getSchoolNames() {
      console.log("Pulling school names directly from SCHOOLS array");
      const names = SCHOOLS.map(school => [school[0]]);
      console.log(`Found ${names.length} schools`);
      return names;}
    static isSchoolName(cellValue) {
      return SCHOOLS.some(([school]) => school === cellValue);}
    static rowIndexBySchool(school) {
      const schools = Utils.getSchoolNames().map(row => row[0]);
      const rowIndex = schools.findIndex(s => s === school);
      return rowIndex + CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW;}
    static getColumnWidth(header) {
      if (header.includes('ID')) return CONFIG.SHEETS.STRUCTURE.COMMON.COLUMN_WIDTHS.GAME_ID;
      if (header.includes('Date') || header.includes('Time')) return CONFIG.SHEETS.STRUCTURE.COMMON.COLUMN_WIDTHS.DATE_TIME;
      if (header.includes('Rank')) return CONFIG.SHEETS.STRUCTURE.COMMON.COLUMN_WIDTHS.RANK;
      if (header.includes('Team')) return CONFIG.SHEETS.STRUCTURE.COMMON.COLUMN_WIDTHS.TEAM_NAME;
      if (header.includes('Abbrev')) return CONFIG.SHEETS.STRUCTURE.COMMON.COLUMN_WIDTHS.ABBREV;
      if (header.includes('Quarter')) return CONFIG.SHEETS.STRUCTURE.COMMON.COLUMN_WIDTHS.QUARTER;
      if (header.includes('Clock')) return CONFIG.SHEETS.STRUCTURE.COMMON.COLUMN_WIDTHS.CLOCK;
      if (header.includes('Possession')) return CONFIG.SHEETS.STRUCTURE.COMMON.COLUMN_WIDTHS.POSSESSION;
      return 100;}
    static getTeamCount() {
      try {
        const settingsSheet = SHEETS.settings;
        if (!settingsSheet) {
          throw new Error("Settings sheet not found");}
        const teamCount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
        if (!teamCount || teamCount < 1) {
          throw new Error(CONFIG.UI.MESSAGES.DRAFT.templates.INVALID_COUNT(
            "Team count",
            teamCount,
            "greater than 0"));}
        return teamCount;
      } catch (error) {
        Logger.log("Error getting team count: " + error.message);
        throw error;}}
    static getSchoolCounts(selections) {
        const schoolCounts = new Map();
        selections.flat().forEach(school => {
            if (school) {
                schoolCounts.set(school, (schoolCounts.get(school) || 0) + 1);}});
        return schoolCounts;}
    static async getCurrentWeek() {
      try {
        // First try to get from WeekManager if it exists
        if (typeof WeekManager !== 'undefined') {
          const weekManager = WeekManager.getInstance();
          return weekManager.getCurrentWeek();
        }
        
        // Otherwise fetch calendar and calculate current week
        const calendar = await GameAPI.getCalendar();
        const now = new Date();
        
        // Find the current week based on date
        for (const entry of calendar.entries) {
          if (now >= entry.startDate && now <= entry.endDate) {
            return entry.label;
          }
        }
        
        // If we're before the season starts
        if (now < calendar.entries[0].startDate) {
          return "Preseason";
        }
        
        // If we're after the season ends
        if (now > calendar.entries[calendar.entries.length - 1].endDate) {
          return "Postseason";
        }
        
        return "Week 1"; // Default fallback
      } catch (error) {
        console.error("Error getting current week:", error);
        return "Week 1"; // Default on error
      }
    }
    static resetAllControls() {
        if (!SHEETS) {
            initializeSheets();}
        try {
            const tracker = SHEETS.tracker;
            if (tracker) {
                const startDraftCell = tracker.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.START_DRAFT);
                if (startDraftCell) {
                    startDraftCell.setValue(false);}}
            const logSheet = SHEETS.log;
            if (logSheet) {
                console.log("Resetting transaction controls...");
                const submit = logSheet.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.SUBMIT);
                const confirm = logSheet.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.CONFIRM);
                if (submit && confirm) {
                    console.log("Found submit and confirm ranges, resetting...");
                    CONFIG.SYSTEM.HELPERS.resetControls(submit, confirm);
                } else {
                    console.log("Could not find submit or confirm ranges");}}
        } catch (error) {
            console.error("Error in resetAllControls:", error);}}}
    function extractCellStyles() {
      return SCHOOLS.reduce((styles, [school, fontColor, backgroundColor]) => {
        styles[school] = { fontColor, backgroundColor, isBold: true };
        return styles;}, {});}
    function isDraftCell(range) {
        const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
        const numSchoolsPerTeam = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM).getValue();
        const startCol = CONFIG.SHEETS.STRUCTURE.COLUMNS.TRACKER.TEAM_START;
        const teamCount = Utils.getTeamCount();
        const endCol = startCol + teamCount - 1;
        const column = range.getColumn();
        const row = range.getRow();
        return column >= startCol &&
              column <= endCol &&
              row >= CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW &&
              row <= CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW + numSchoolsPerTeam - 1;}
    function clearCaches() {
        cachedSchoolsList = null;
        cachedSelections = null;
        cachedTeamSelections.clear();
        if (schoolEligibilityManager) {
            schoolEligibilityManager = new SchoolEligibilityManager();}}
    function getCachedSchoolsList() {
        if (!cachedSchoolsList) {
            cachedSchoolsList = SCHOOLS;}
        return cachedSchoolsList;}
    function getCurrentSelections() {
      if (!cachedSelections) {
        const draftRange = getDraftRange();
        cachedSelections = draftRange.getValues();}
      return cachedSelections;}
    function getTeamSelectionsForColumn(teamCol) {
      if (!cachedTeamSelections.has(teamCol)) {
        const tracker = SHEETS.tracker;
        const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
        const maxTimesAllowed = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_TIMES_SCHOOL_ALLOWED).getValue();
        const maxSchoolsPerTeam = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM).getValue();
        const range = tracker.getRange(
            CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW,
            teamCol,
            maxSchoolsPerTeam,
            1);
        const values = range.getValues().flat().filter(Boolean);
        const schoolCounts = values.reduce((acc, school) => {
            acc[school] = (acc[school] || 0) + 1;
            return acc;}, {});
        cachedTeamSelections.set(
            teamCol, 
            Object.entries(schoolCounts)
                .filter(([school, count]) => count >= maxTimesAllowed)
                .map(([school]) => school));}
      return cachedTeamSelections.get(teamCol);}
    function checkIfLastSelection(range, currentRow, startCol, endCol, isDraftSnake) {
      const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
      const numSchoolsPerTeam = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM).getValue();
      return range.getRow() === (numSchoolsPerTeam + CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW - 1) && 
            ((isDraftSnake && currentRow % 2 === 0 && range.getColumn() === endCol) ||
              (isDraftSnake && currentRow % 2 === 1 && range.getColumn() === startCol) ||
              (!isDraftSnake && range.getColumn() === endCol));}
    function calculateNextPosition(updates, currentRange) {
        const { startCol, endCol, isDraftSnake, currentRow } = updates;
        const currentCol = currentRange.getColumn();
        let nextCol = currentCol;
        let nextRow = currentRow;
        if (isDraftSnake) {
            const isReverseRow = currentRow % 2 === 1;
            if (isReverseRow) {
                nextCol = currentCol > startCol ? currentCol - 1 : startCol;
                if (currentCol === startCol) nextRow++;
            } else {
                nextCol = currentCol < endCol ? currentCol + 1 : endCol;
                if (currentCol === endCol) nextRow++;}
        } else {
            nextCol = currentCol < endCol ? currentCol + 1 : startCol;
            if (currentCol === endCol) nextRow++;}
        const isLastSelection = checkIfLastSelection(currentRange, currentRow, startCol, endCol, isDraftSnake);
        const nextTeam = isLastSelection ? null : SHEETS.tracker.getRange(CONFIG.SHEETS.STRUCTURE.COMMON.SUB_HEADER_ROW_2, nextCol).getValue();
        console.log("calculateNextPosition - nextTeam from row", CONFIG.SHEETS.STRUCTURE.COMMON.SUB_HEADER_ROW_2, "col", nextCol, ":", nextTeam);
        return { nextCol, nextRow, isLastSelection, nextTeam };}
    function updateNextCellAndValidation(nextPosition, currentRange) {
        const tracker = SHEETS.tracker;;
        const nextCell = tracker.getRange(
            nextPosition.nextRow + CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW, 
            nextPosition.nextCol);
        const availableSchools = getAvailableSchools(nextPosition.nextCol);
        const validation = SpreadsheetApp.newDataValidation()
            .requireValueInList(availableSchools)
            .build();
        nextCell.setDataValidation(validation);}
// 4. setupSheets
  function setupSeasonSheet() {
    setupSheetByType('SEASON');}
  function setupCompletedSheet() {
    setupSheetByType('COMPLETED');}
  function setupLiveScoringSheet() {
    setupSheetByType('LIVE');}
  function setupPointsSheet() {
    setupSheetByType('POINTS');}
  function setupLeaderboardSheet() {
    setupSheetByType('LEADERBOARD');}
  function setupTeamsSheet() {
    setupSheetByType('TEAMS');}
  function setupTransactionSheet() {
    setupSheetByType('TRANSACTION');}
// 5. API Module
  const GameAPI = {
    async fetch(endpoint, options = {}) {
      const url = `${CONFIG.SYSTEM.API.BASE_URL}${endpoint}`;
      const retries = options.retries || CONFIG.SYSTEM.API.RETRY.MAX;
      const delay = options.delay || CONFIG.SYSTEM.API.RETRY.DELAY;
      
      for (let i = 0; i < retries; i++) {
        try {
          const response = await UrlFetchApp.fetch(url, {
            muteHttpExceptions: true,
            timeout: CONFIG.SYSTEM.API.RETRY.TIMEOUT,
            ...options
          });
          
          if (response.getResponseCode() === 200) {
            return JSON.parse(response.getContentText());
          }
          
          console.log(`Attempt ${i + 1} failed with code ${response.getResponseCode()} for ${url}`);
          if (i < retries - 1) {
            await Utilities.sleep(delay * Math.pow(2, i));
          }
        } catch (error) {
          const result = getErrorHandler().handleApiError(error, i);
          if (result.shouldRetry && i < retries - 1) {
            await Utilities.sleep(delay * Math.pow(2, i));
            continue;
          }
          throw error;
        }
      }
      throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
    },
    // Updated to fetch live calendar data from API
    async getCalendar() {
      try {
        // Fetch current scoreboard which includes calendar data
        const data = await this.fetch('/scoreboard');
        
        if (!data.leagues?.[0]?.calendar) {
          throw new Error("No calendar data found in API response");
        }
        
        const calendar = data.leagues[0];
        
        return {
          seasonStart: Utils.formatDate(new Date(calendar.calendarStartDate), CONFIG.SYSTEM.TIME.FORMATS.FULL),
          seasonEnd: Utils.formatDate(new Date(calendar.calendarEndDate), CONFIG.SYSTEM.TIME.FORMATS.FULL),
          entries: this._processCalendarEntries(calendar.calendar)
        };
      } catch (error) {
        console.error("Error fetching calendar:", error);
        // Fallback to cached data if API fails
        return this._getFallbackCalendar();
      }
    },
    _processCalendarEntries(calendar) {
      const entries = [];
      
      calendar.forEach(section => {
        section.entries.forEach(entry => {
          let startDate = new Date(entry.startDate);
          let endDate = new Date(entry.endDate);
          
          // FIX FOR WEEK 16: ESPN API sometimes returns wrong year
          if (entry.label === 'Week 16') {
            // Week 16 should be in December of the same year as the start date
            const startYear = startDate.getFullYear();
            const endYear = endDate.getFullYear();
            
            // If end date is in a different year than start date for Week 16, fix it
            if (endYear !== startYear) {
              console.log(`Fixing Week 16 end date from ${endYear} to ${startYear}`);
              endDate = new Date(endDate);
              endDate.setFullYear(startYear);
            }
          }
          
          entries.push({
            label: entry.label,
            startDate: startDate,
            endDate: endDate,
            // Store API format (YYYYMMDD) for easy use
            startDateAPI: this._formatDateForAPI(startDate),
            endDateAPI: this._formatDateForAPI(endDate),
            // Store formatted versions too
            startDateFormatted: Utils.formatDate(startDate, CONFIG.SYSTEM.TIME.FORMATS.FULL),
            endDateFormatted: Utils.formatDate(endDate, CONFIG.SYSTEM.TIME.FORMATS.FULL)
          });
        });
      });
      
      // Sort by start date
      return entries.sort((a, b) => a.startDate - b.startDate);
    },
    _formatDateForAPI(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    },
    // Fallback calendar for current 2025 season if API fails
    _getFallbackCalendar() {
      console.log("Using fallback calendar data for 2025 season");
      const entries = [
        { label: 'Week 1', startDate: new Date('2025-08-23T03:00:00'), endDate: new Date('2025-09-02T02:59:00') },
        { label: 'Week 2', startDate: new Date('2025-09-02T03:00:00'), endDate: new Date('2025-09-08T02:59:00') },
        { label: 'Week 3', startDate: new Date('2025-09-08T03:00:00'), endDate: new Date('2025-09-15T02:59:00') },
        { label: 'Week 4', startDate: new Date('2025-09-15T03:00:00'), endDate: new Date('2025-09-22T02:59:00') },
        { label: 'Week 5', startDate: new Date('2025-09-22T03:00:00'), endDate: new Date('2025-09-29T02:59:00') },
        { label: 'Week 6', startDate: new Date('2025-09-29T03:00:00'), endDate: new Date('2025-10-06T02:59:00') },
        { label: 'Week 7', startDate: new Date('2025-10-06T03:00:00'), endDate: new Date('2025-10-13T02:59:00') },
        { label: 'Week 8', startDate: new Date('2025-10-13T03:00:00'), endDate: new Date('2025-10-20T02:59:00') },
        { label: 'Week 9', startDate: new Date('2025-10-20T03:00:00'), endDate: new Date('2025-10-27T02:59:00') },
        { label: 'Week 10', startDate: new Date('2025-10-27T03:00:00'), endDate: new Date('2025-11-03T02:59:00') },
        { label: 'Week 11', startDate: new Date('2025-11-03T03:00:00'), endDate: new Date('2025-11-10T02:59:00') },
        { label: 'Week 12', startDate: new Date('2025-11-10T03:00:00'), endDate: new Date('2025-11-17T02:59:00') },
        { label: 'Week 13', startDate: new Date('2025-11-17T03:00:00'), endDate: new Date('2025-11-24T02:59:00') },
        { label: 'Week 14', startDate: new Date('2025-11-24T03:00:00'), endDate: new Date('2025-12-01T02:59:00') },
        { label: 'Week 15', startDate: new Date('2025-12-01T03:00:00'), endDate: new Date('2025-12-08T02:59:00') },
        { label: 'Week 16', startDate: new Date('2025-12-08T03:00:00'), endDate: new Date('2025-12-14T02:59:00') },
        { label: 'Bowls', startDate: new Date('2025-12-13T03:00:00'), endDate: new Date('2026-01-22T02:59:00') },
        { label: 'CFP', startDate: new Date('2025-12-19T23:00:00'), endDate: new Date('2026-01-20T02:00:00') }
      ];
      
      return {
        seasonStart: '07/01/2025 03:00:00',
        seasonEnd: '01/22/2026 02:59:00',
        entries: entries.map(entry => ({
          ...entry,
          startDateAPI: this._formatDateForAPI(entry.startDate),
          endDateAPI: this._formatDateForAPI(entry.endDate),
          startDateFormatted: Utils.formatDate(entry.startDate, CONFIG.SYSTEM.TIME.FORMATS.FULL),
          endDateFormatted: Utils.formatDate(entry.endDate, CONFIG.SYSTEM.TIME.FORMATS.FULL)
        }))
      };
    },
    async getGamesForDateRange(startDate, endDate) {
      try {
        // Dates should be in YYYYMMDD format
        // If Date objects are passed, convert them
        if (startDate instanceof Date) {
          startDate = this._formatDateForAPI(startDate);
        }
        if (endDate instanceof Date) {
          endDate = this._formatDateForAPI(endDate);
        }
        
        const data = await this.fetch(`/scoreboard?dates=${startDate}-${endDate}&groups=${CONFIG.SYSTEM.API.GROUP}&limit=${CONFIG.SYSTEM.API.LIMIT}`);
        const events = data.events || [];
        
        // Sort events chronologically since API returns them in "relevance" order
        events.sort((a, b) => {
          const dateA = new Date(a.competitions?.[0]?.date || a.date);
          const dateB = new Date(b.competitions?.[0]?.date || b.date);
          return dateA - dateB;
        });
        
        return events;
      } catch (error) {
        return getErrorHandler().handleApiError(error);
      }
    },
    async getGameUpdates(gameIds) {
      if (!Array.isArray(gameIds) || gameIds.length === 0) {
        throw new Error("No game IDs provided");
      }
      
      try {
        const data = await this.fetch(`/scoreboard?events=${gameIds.join(',')}&groups=${CONFIG.SYSTEM.API.GROUP}`);
        const events = data.events || [];
        
        // Create a map of events by ID for quick lookup
        const eventMap = new Map(events.map(event => [event.id.toString(), event]));
        
        // Return games in the order they were requested, not the order the API returned them
        const orderedEvents = [];
        for (const gameId of gameIds) {
          const event = eventMap.get(gameId.toString());
          if (event) {
            orderedEvents.push(event);
          }
        }
        
        console.log(`API returned ${events.length} games, filtered to ${orderedEvents.length} requested games`);
        
        return orderedEvents;
      } catch (error) {
        return getErrorHandler().handleApiError(error);
      }
    },
    async getBatchGameUpdates(gameIds, batchSize = CONFIG.SYSTEM.API.BATCH_SIZE) {
      const results = [];
      const seenGameIds = new Set();
      const batches = this._createBatches(gameIds, batchSize);
      
      console.log(`Processing ${gameIds.length} game IDs in ${batches.length} batches`);
      
      // Maintain the original order of gameIds
      const gameIdOrder = new Map(gameIds.map((id, index) => [id.toString(), index]));
      
      for (const batch of batches) {
        try {
          const updates = await this.getGameUpdates(batch);
          console.log(`Batch returned ${updates.length} games for ${batch.length} requested IDs`);
          
          // Add to results, avoiding duplicates
          for (const update of updates) {
            if (!seenGameIds.has(update.id.toString())) {
              seenGameIds.add(update.id.toString());
              results.push(update);
            } else {
              console.log(`Duplicate game ${update.id} removed`);
            }
          }
          
          if (batches.length > 1) {
            await Utilities.sleep(CONFIG.SYSTEM.API.RETRY.DELAY);
          }
        } catch (error) {
          getErrorHandler().handleApiError(error);
        }
      }
      
      // Sort results to match the original gameIds order
      results.sort((a, b) => {
        const orderA = gameIdOrder.get(a.id.toString()) ?? Number.MAX_VALUE;
        const orderB = gameIdOrder.get(b.id.toString()) ?? Number.MAX_VALUE;
        return orderA - orderB;
      });
      
      console.log(`Returning ${results.length} unique games in requested order`);
      return results;
    },
    _createBatches(items, size) {
      return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
        items.slice(i * size, (i + 1) * size)
      );
    }
  };
  // Updated standalone function to fetch live calendar data
  function fetchCalendarData() {
    const apiUrl = `${CONFIG.SYSTEM.API.BASE_URL}/scoreboard`;
    let response;
    
    try {
      response = UrlFetchApp.fetch(apiUrl);
    } catch (error) {
      console.error("Failed to fetch API data:", error.message);
      // Return fallback data for 2025 season
      return getFallbackCalendarData();
    }
    
    let jsonData;
    try {
      jsonData = JSON.parse(response.getContentText());
    } catch (error) {
      console.error("Error parsing JSON response:", error.message);
      return getFallbackCalendarData();
    }
    
    if (!jsonData.leagues || !jsonData.leagues[0].calendar || !Array.isArray(jsonData.leagues[0].calendar)) {
      console.error("The calendar data is missing or improperly structured.");
      return getFallbackCalendarData();
    }
    
    const calendarStartDate = Utils.formatDate(new Date(jsonData.leagues[0].calendarStartDate), "MM/dd/yyyy HH:mm:ss");
    const calendarEndDate = Utils.formatDate(new Date(jsonData.leagues[0].calendarEndDate), "MM/dd/yyyy HH:mm:ss");
    
    let entries = [];
    jsonData.leagues[0].calendar.forEach(section => {
      section.entries.forEach(entry => {
        const startDate = new Date(entry.startDate);
        const endDate = new Date(entry.endDate);
        
        entries.push({
          label: entry.label,
          startdate: Utils.formatDate(startDate, "MM/dd/yyyy HH:mm:ss"),
          enddate: Utils.formatDate(endDate, "MM/dd/yyyy HH:mm:ss"),
          // Include API format for convenience
          startdateAPI: formatDateForAPI(startDate),
          enddateAPI: formatDateForAPI(endDate)
        });
      });
    });
    
    const result = {
      calendarStartDate,
      calendarEndDate,
      entries
    };
    
    console.log("Fetched calendar data:", result);
    return result;
  }
  // Helper function to format date for API (YYYYMMDD)
  function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
  // Fallback function for 2025 season
  function getFallbackCalendarData() {
    return {
      calendarStartDate: '07/01/2025 03:00:00',
      calendarEndDate: '01/22/2026 02:59:00',
      entries: [
        { label: 'Week 1', startdate: '08/23/2025 03:00:00', enddate: '09/02/2025 02:59:00', startdateAPI: '20250823', enddateAPI: '20250902' },
        { label: 'Week 2', startdate: '09/02/2025 03:00:00', enddate: '09/08/2025 02:59:00', startdateAPI: '20250902', enddateAPI: '20250908' },
        { label: 'Week 3', startdate: '09/08/2025 03:00:00', enddate: '09/15/2025 02:59:00', startdateAPI: '20250908', enddateAPI: '20250915' },
        { label: 'Week 4', startdate: '09/15/2025 03:00:00', enddate: '09/22/2025 02:59:00', startdateAPI: '20250915', enddateAPI: '20250922' },
        { label: 'Week 5', startdate: '09/22/2025 03:00:00', enddate: '09/29/2025 02:59:00', startdateAPI: '20250922', enddateAPI: '20250929' },
        { label: 'Week 6', startdate: '09/29/2025 03:00:00', enddate: '10/06/2025 02:59:00', startdateAPI: '20250929', enddateAPI: '20251006' },
        { label: 'Week 7', startdate: '10/06/2025 03:00:00', enddate: '10/13/2025 02:59:00', startdateAPI: '20251006', enddateAPI: '20251013' },
        { label: 'Week 8', startdate: '10/13/2025 03:00:00', enddate: '10/20/2025 02:59:00', startdateAPI: '20251013', enddateAPI: '20251020' },
        { label: 'Week 9', startdate: '10/20/2025 03:00:00', enddate: '10/27/2025 02:59:00', startdateAPI: '20251020', enddateAPI: '20251027' },
        { label: 'Week 10', startdate: '10/27/2025 03:00:00', enddate: '11/03/2025 02:59:00', startdateAPI: '20251027', enddateAPI: '20251103' },
        { label: 'Week 11', startdate: '11/03/2025 03:00:00', enddate: '11/10/2025 02:59:00', startdateAPI: '20251103', enddateAPI: '20251110' },
        { label: 'Week 12', startdate: '11/10/2025 03:00:00', enddate: '11/17/2025 02:59:00', startdateAPI: '20251110', enddateAPI: '20251117' },
        { label: 'Week 13', startdate: '11/17/2025 03:00:00', enddate: '11/24/2025 02:59:00', startdateAPI: '20251117', enddateAPI: '20251124' },
        { label: 'Week 14', startdate: '11/24/2025 03:00:00', enddate: '12/01/2025 02:59:00', startdateAPI: '20251124', enddateAPI: '20251201' },
        { label: 'Week 15', startdate: '12/01/2025 03:00:00', enddate: '12/08/2025 02:59:00', startdateAPI: '20251201', enddateAPI: '20251208' },
        { label: 'Week 16', startdate: '12/08/2025 03:00:00', enddate: '12/14/2025 02:59:00', startdateAPI: '20251208', enddateAPI: '20251214' },
        { label: 'Bowls', startdate: '12/13/2025 03:00:00', enddate: '01/22/2026 02:59:00', startdateAPI: '20251213', enddateAPI: '20260122' },
        { label: 'CFP', startdate: '12/19/2025 23:00:00', enddate: '01/20/2026 02:00:00', startdateAPI: '20251219', enddateAPI: '20260120' }
      ]
    };
  }
  function scrapeWikipediaTableInternal() {
    const url = CONFIG.SYSTEM.API.HEISMAN_URL;
    const response = UrlFetchApp.fetch(url);
    const html = response.getContentText();
    const tables = html.match(/<table class="wikitable[^>]*>([\s\S]*?)<\/table>/g);
    if (!tables || tables.length < 3) {
      throw new Error('Could not find the required table.');}
    const targetTable = tables[1];
    const rows = targetTable.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
    if (!rows) {
      throw new Error('No rows found in the table');}
    return rows.slice(1).map(rowHtml => {
      const cells = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
      const selectedIndexes = [0, 2, 3, 4, 7]; // Columns 1, 3, 4, 5, 8
      const result = selectedIndexes.map(index => {
        const cell = cells[index] || '';
        let cleanedCell = cell
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\[\d+\]/g, '') // Remove references like [1]
          .replace(/\s+/g, ' ')
          .trim();
        if (index === 3) {
          cleanedCell = cleanedCell.replace(/\s*\(\d+\)$/, '');}
        return cleanedCell;});
      result.splice(3, 0, '');
      return result;});}
// 6. Sheet Management
  class SheetManager {
    constructor(spreadsheet) {
        if (SheetManager._instance) {
            return SheetManager._instance;}
        this.ss = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
        this.sheets = {};
        this.initialized = {};
        this.initializationOrder = [
            'SETTINGS',
            'TRACKER',
            'SEASON',
            'LIVE',
            'COMPLETED',
            'POINTS',
            'LEADERBOARD',
            'TEAMS',
            'TRANSACTION'];
        SheetManager._instance = this;}
    static getInstance() {
        if (!SheetManager._instance) {
            SheetManager._instance = new SheetManager(SpreadsheetApp.getActiveSpreadsheet());}
        return SheetManager._instance;}
    async initialize() {
        console.log("Starting sheet initialization...");
        try {
            for (const sheetType of this.initializationOrder) {
                console.log(`Initializing ${sheetType} sheet...`);
                await this.initializeSheetByType(sheetType);
                console.log(`${sheetType} sheet initialization complete`);}
            await this.verifyInitialization();
            SHEETS = {
                ss: this.ss,
                tracker: this.sheets.TRACKER,
                log: this.sheets.TRANSACTION,
                teams: this.sheets.TEAMS,
                settings: this.sheets.SETTINGS};
            sheetsInitialized = true;
            return this.sheets;
        } catch (error) {
            console.error("Initialization failed:", error);
            return getErrorHandler().handleSheetError(error);}}
    async initializeSheetByType(sheetType) {
        const sheetConfig = CONFIG.SHEETS.SPECIFIC[sheetType];
        if (!sheetConfig) {
            throw new Error(`Missing configuration for sheet type: ${sheetType}`);}
        console.log(`Initializing sheet type: ${sheetType}, config:`, sheetConfig);
        if (['SETTINGS', 'TRACKER'].includes(sheetType)) {
            const existingSheet = this.ss.getSheetByName(sheetConfig.NAME);
            if (existingSheet) {
                console.log(`Preserving existing ${sheetType} sheet`);
                this.sheets[sheetType] = existingSheet;
                this.sheets[sheetConfig.NAME] = existingSheet;
                this.initialized[sheetType] = true;
                return;}}
        const sheet = await this.initializeSheet(sheetConfig.NAME, sheetType);
        console.log(`Sheet initialized: ${sheetConfig.NAME}`);
        switch(sheetType) {
            case 'TRANSACTION':
                await this.setupTransactionLogSheet(sheet);
                break;
            case 'POINTS':
                await this.setupBasicStructure(sheet, sheetType);
                this.setupPointsCalculatorSheet(sheet);
                colorSchoolCells(sheet);
                break;
            case 'LEADERBOARD':
                await this.setupLeaderboardSheet(sheet);
                break;
            case 'TRACKER':
                await this.setupBasicStructure(sheet, sheetType);
                colorSchoolCells(sheet);
                break;
            case 'SEASON':
                await this.setupBasicStructure(sheet, sheetType);
                await populateSeasonSchedule();
                colorSchoolCells(sheet);
                break;
            case 'COMPLETED':
                await this.setupBasicStructure(sheet, sheetType);
                await migrateHistoricalGames();
                colorSchoolCells(sheet);
                break;
            case 'LIVE':
                await this.setupBasicStructure(sheet, sheetType);
                await setupDailyGames(sheet);
                colorSchoolCells(sheet);
                break;
            case 'TEAMS':
                await this.setupTeamsSheet(sheet);
                break;
            default:
                await this.setupBasicStructure(sheet, sheetType);
                colorSchoolCells(sheet);}
        this.sheets[sheetType] = sheet;
        this.sheets[sheetConfig.NAME] = sheet;
        this.initialized[sheetType] = true;}
    initializeSheet(sheetName, sheetType) {
        console.log(`Initializing ${sheetName}...`);
        let sheet = this.ss.getSheetByName(sheetName);
        if (sheet && ['SETTINGS', 'TRACKER'].includes(sheetType)) {
            console.log(`Preserving existing ${sheetType} sheet`);
            return sheet;}
        if (sheet) {
            console.log(`Deleting existing ${sheetName} sheet`);
            this.ss.deleteSheet(sheet);}
        sheet = this.ss.insertSheet(sheetName);
        console.log(`Created new sheet: ${sheetName}`);
        return sheet;}
    async setupBasicStructure(sheet, type) {
        console.log(`Setting up structure for ${type}`);
        const config = CONFIG.SHEETS.SPECIFIC[type];
        sheet.clear();
        this.setRowCount(sheet, type);
        this.addRequiredColumns(sheet, type);
        this.setRowHeights(sheet, type);
        this.setColumnWidths(sheet, type);
        this.mergeCells(sheet, type);
        this.applyHeaderStyling(sheet, type);
        this.freezeRowsAndColumns(sheet, type);
        this.hideColumns(sheet, type);
        this.applyConditionalFormatting(sheet, type);
        this.applyTypeSpecificSetup(sheet, type);
        console.log(`Structure setup completed for ${type}`);}
    setRowCount(sheet, type) {
        const currentRows = sheet.getMaxRows();
        let targetRows;
        switch(type) {
            case 'SEASON':
            case 'COMPLETED':
                targetRows = 1000;
                break;
            case 'LIVE':
                targetRows = 150;
                break;
            case 'TRACKER':
                targetRows = 150; // Start with a reasonable default
                break;
            case 'POINTS':
                targetRows = 150; // Start with a reasonable default
                break;
            case 'TRANSACTION':
                targetRows = 165;
                break;
            default:
                targetRows = 100;}
        if (currentRows < targetRows) {
            sheet.insertRowsAfter(currentRows, targetRows - currentRows);
        } else if (currentRows > targetRows && type !== 'TRACKER' && type !== 'POINTS') {
            // Only delete excess rows for non-dynamic sheets
            sheet.deleteRows(targetRows + 1, currentRows - targetRows);}}
    addRequiredColumns(sheet, type) {
        const currentColumns = sheet.getMaxColumns();
        let columnsToAdd = 0;
        switch(type) {
            case 'SEASON':
            case 'LIVE':
            case 'COMPLETED':
            case 'POINTS':
                columnsToAdd = 6;
                break;
            case 'LEADERBOARD':
                columnsToAdd = 32;
                break;
            case 'TRACKER':
                columnsToAdd = 2;
                break;}
        if (columnsToAdd > 0) {
            sheet.insertColumnsAfter(currentColumns, columnsToAdd);}}
    setRowCount(sheet, type) {
        const currentRows = sheet.getMaxRows();
        let targetRows;
        switch(type) {
            case 'SEASON':
            case 'COMPLETED':
                targetRows = 1000;
                break;
            case 'LIVE':
                targetRows = 150;
                break;
            case 'TRACKER':
                return;
            case 'POINTS':
                return;
            case 'TRANSACTION':
                targetRows = 165;
                break;
            default:
                return;}
        if (targetRows > currentRows) {
            sheet.insertRowsAfter(currentRows, targetRows - currentRows);
        } else if (targetRows < currentRows) {
            sheet.deleteRows(targetRows + 1, currentRows - targetRows);}}
    setRowHeights(sheet, type) {
        const bufferHeight = 15;
        const headerHeight = 40;
        const subHeaderHeight = 30;
        const standardHeight = 21; // Default Google Sheets row height
        sheet.setRowHeight(CONFIG.SHEETS.STRUCTURE.COMMON.BUFFER_ROW_1, bufferHeight); // Row 1
        sheet.setRowHeight(CONFIG.SHEETS.STRUCTURE.COMMON.HEADER_ROW, headerHeight);   // Row 2
        sheet.setRowHeight(CONFIG.SHEETS.STRUCTURE.COMMON.BUFFER_ROW_2, bufferHeight); // Row 3
        sheet.setRowHeight(CONFIG.SHEETS.STRUCTURE.COMMON.SUB_HEADER_ROW, subHeaderHeight); // Row 4
        sheet.setRowHeight(CONFIG.SHEETS.STRUCTURE.COMMON.BUFFER_ROW_3, bufferHeight); // Row 5
        if (type === 'TRACKER') {
            sheet.setRowHeight(CONFIG.SHEETS.STRUCTURE.COMMON.SUB_HEADER_ROW_2, subHeaderHeight); // Row 6
            sheet.setRowHeight(CONFIG.SHEETS.STRUCTURE.COMMON.BUFFER_ROW_4, bufferHeight);}}
    setColumnWidths(sheet, type) {
        const bufferWidth = 20;
        const standardWidth = 100;
        for (let i = 1; i <= sheet.getMaxColumns(); i++) {
            sheet.setColumnWidth(i, standardWidth);}
        const bufferColumns = this.getBufferColumns(type, sheet);
        const bufferColumnNumbers = bufferColumns.map(col => Utils.letterToColumn(col));
        const headers = CONFIG.SHEETS.SPECIFIC[type]?.REQUIRED_COLUMNS || [];
        headers.forEach((header, index) => {
            const columnNumber = index + 1;
            if (!bufferColumnNumbers.includes(columnNumber)) {
                const width = this.getColumnWidth(header);
                sheet.setColumnWidth(columnNumber, width);}});
        bufferColumns.forEach(col => {
            const colNum = Utils.letterToColumn(col);
            if (colNum <= sheet.getMaxColumns()) {
                sheet.setColumnWidth(colNum, bufferWidth);}});
        if (type === 'SEASON' || type === 'LIVE' || type === 'COMPLETED') {
            const bowlNameColumn = 8; // Column H
            sheet.setColumnWidth(bowlNameColumn, 250);}}
    getBufferColumns(type, sheet = null) {
        switch(type) {
            case 'SEASON': return ['A', 'C', 'G', 'O', 'R', 'T', 'V'];
            case 'LIVE': return ['A', 'C', 'G', 'Q', 'Y', 'AA', 'AC'];
            case 'COMPLETED': return ['A', 'C', 'G', 'R', 'T', 'V'];
            case 'POINTS': return ['A', 'C', 'E', 'W', 'Y', 'AC'];
            case 'LEADERBOARD': return ['A', 'F', 'K', 'P', 'U', 'Z', 'AE', 'AG', 'AK', 'AN', 'AQ', 'AU', 'AZ', 'BC', 'BF'];
            case 'TRACKER': 
                if (!sheet) {
                    console.error('Sheet not provided for TRACKER buffer columns');
                    return ['A', 'D'];}
                const lastCol = Utils.columnToLetter(sheet.getMaxColumns());
                return ['A', 'D', lastCol];
            default: return [];}}
    applyWeekRowColoring(sheet, sheetType) {
        const dataStartRow = CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW;
        const lastRow = sheet.getLastRow();
        if (lastRow < dataStartRow) {
            console.log("Sheet empty or too small, skipping week row coloring");
            return;}
        const bufferColumns = this.getBufferColumns(sheetType, sheet);
        const bufferColNumbers = bufferColumns.map(col => Utils.letterToColumn(col));
        const maxColumns = sheet.getMaxColumns();
        const weekCol = CONFIG.SHEETS.STRUCTURE.COLUMNS.WEEK_NAME; // Column 4 (D)
        const white = "#FFFFFF";
        const lightGrey = CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND; // #E8E8E8
        const questionFont = CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT;
        const weekRange = sheet.getRange(dataStartRow, weekCol, lastRow - dataStartRow + 1, 1);
        const weekValues = weekRange.getValues();
        const numRows = lastRow - dataStartRow + 1;
        const backgrounds = [];
        for (let i = 0; i < numRows; i++) {
            const weekValue = weekValues[i][0];
            const rowColors = [];
            let rowBgColor = null; // Default no color for non-week rows
            if (weekValue && (weekValue.toString().includes("Week") || weekValue === "Bowls")) {
                if (weekValue === "Bowls") {
                    rowBgColor = lightGrey;
                } else {
                    const weekNum = parseInt(weekValue.replace("Week ", ""));
                    rowBgColor = (weekNum % 2 === 0) ? lightGrey : white;}}
            for (let col = 1; col <= maxColumns; col++) {
                if (bufferColNumbers.includes(col)) {
                    rowColors.push(questionFont);
                } else if (rowBgColor) {
                    rowColors.push(rowBgColor);
                } else {
                    rowColors.push(null);}}
            backgrounds.push(rowColors);}
        console.log(`Applying batch colors to ${numRows} rows x ${maxColumns} columns for ${sheetType} sheet`);
        const fullRange = sheet.getRange(dataStartRow, 1, numRows, maxColumns);
        fullRange.setBackgrounds(backgrounds);
        this.addBowlNameConditionalFormatting(sheet, sheetType);
        console.log(`Completed week row coloring for ${sheetType} sheet`);}
    addBowlNameConditionalFormatting(sheet, sheetType) {
        const bowlCol = CONFIG.SHEETS.STRUCTURE.COLUMNS.BOWL_NAME; // Column 8
        const dataStartRow = CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW;
        const lastRow = sheet.getMaxRows(); // Use max rows for the rule to cover future data
        if (sheetType !== 'SEASON' && sheetType !== 'COMPLETED') {
            return;}
        const actionGold = CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD;
        const headerFont = CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT;
        const bowlRange = sheet.getRange(dataStartRow, bowlCol, lastRow - dataStartRow + 1, 1);
        const rule = SpreadsheetApp.newConditionalFormatRule()
            .whenCellNotEmpty()
            .setBackground(actionGold)
            .setFontColor(headerFont)
            .setRanges([bowlRange])
            .setBold(true)
            .build();
        const existingRules = sheet.getConditionalFormatRules();
        existingRules.push(rule);
        sheet.setConditionalFormatRules(existingRules);
        console.log(`Added bowl name conditional formatting to ${sheetType} sheet`);}
    applyHeaderStyling(sheet, type) {
        console.log(`Applying styling and headers for ${type}`);
        const config = CONFIG.SHEETS.SPECIFIC[type];
        const headerBg = CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND;
        const headerFont = CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT;
        const questionFont = CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT;
        const actionGold = CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD;
        const font = CONFIG.UI.STYLES.BASE.FONT_FAMILY;
        sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).setFontFamily(font);
        const headerRows = [2, 4];
        if (type === 'TRACKER') {
            headerRows.push(6);}
        headerRows.forEach(row => {
            const range = sheet.getRange(row, 1, 1, sheet.getMaxColumns());
            range.setBackground(headerBg)
                .setFontColor(headerFont)
                .setFontWeight("bold")
                .setHorizontalAlignment("center")
                .setVerticalAlignment("middle")
                .setWrap(true);});
        if (config.HEADER) {
            let headerLocation;
            if (type === 'TRACKER' || type === 'LEADERBOARD' || type === 'TRANSACTION') {
                headerLocation = 'B2';
            } else if (type === 'SEASON' || type === 'LIVE' || type === 'COMPLETED') {
                headerLocation = 'E2';
            } else if (type === 'POINTS') {
                headerLocation = 'D2';
            } else {
                headerLocation = 'B2';}
            sheet.getRange(headerLocation)
                .setValue(config.HEADER)
                .setFontSize(CONFIG.UI.STYLES.HEADER_STYLES.FONT_SIZE)
                .setFontWeight(CONFIG.UI.STYLES.HEADER_STYLES.FONT_WEIGHT);}
        const subHeaders = config.REQUIRED_COLUMNS;
        if (subHeaders && subHeaders.length > 0) {
            let startColumn = 2; // Column B is the default
            let subHeaderRow = CONFIG.SHEETS.STRUCTURE.COMMON.SUB_HEADER_ROW; // Row 4
            if (type === 'TRACKER') {
                subHeaderRow = CONFIG.SHEETS.STRUCTURE.COMMON.SUB_HEADER_ROW_2;}
            if (type === 'SEASON' || type === 'LIVE' || type === 'COMPLETED' || type === 'POINTS') {
                const headerRange = sheet.getRange(subHeaderRow, startColumn, 1, subHeaders.length);
                const headerValues = subHeaders.map(header => header || ''); // Ensure empty strings stay empty
                headerRange.setValues([headerValues])
                    .setFontSize(CONFIG.UI.STYLES.BASE.SUB_HEADER_FONT_SIZE);
            } else {
                sheet.getRange(subHeaderRow, startColumn, 1, subHeaders.length)
                    .setValues([subHeaders])
                    .setFontSize(CONFIG.UI.STYLES.BASE.SUB_HEADER_FONT_SIZE);}}
        const bufferRows = this.getBufferRows(type, sheet);
        bufferRows.forEach(row => {
            if (row <= sheet.getMaxRows()) {
                sheet.getRange(row, 1, 1, sheet.getMaxColumns()).setBackground(questionFont);}});
        const bufferColumns = this.getBufferColumns(type, sheet);
        bufferColumns.forEach(col => {
            const colNum = Utils.letterToColumn(col);
            if (colNum <= sheet.getMaxColumns()) {
                sheet.getRange(1, colNum, sheet.getMaxRows(), 1).setBackground(questionFont);}});
        this.applySheetSpecificStyling(sheet, type);}
    applySheetSpecificStyling(sheet, type) {
        const headerBg = CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND;
        const headerFont = CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT;
        const questionFont = CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT;
        const actionGold = CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD;
        const lightGrey = CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND;
        switch(type) {
            case 'SEASON':
            case 'LIVE':
            case 'COMPLETED':
                const lastRow = sheet.getLastRow();
                if (lastRow > 5) {  // Only apply if there are rows beyond row 5
                    sheet.getRange(6, 8, lastRow - 5, 1)
                        .setBackground(actionGold)
                        .setFontColor(headerFont)
                        .setFontWeight("bold");}
                const bufferCols = this.getBufferColumns(type, sheet);
                bufferCols.forEach(col => {
                    const colNum = Utils.letterToColumn(col);
                    if (colNum <= sheet.getMaxColumns()) {
                        sheet.getRange(4, colNum).setBackground(questionFont);}});
                break;
            case 'POINTS':
                sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns())
                    .setHorizontalAlignment("center")
                    .setVerticalAlignment("middle");
                sheet.getRange(1, 4, sheet.getMaxRows(), 1).setFontWeight("bold");
                const dataStart = CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW;
                for (let row = dataStart; row <= sheet.getLastRow(); row += 2) {
                    if (!this.getBufferRows(type).includes(row)) {
                        sheet.getRange(row, 1, 1, sheet.getMaxColumns()).setBackground(lightGrey);}}
                const pointsBufferCols = this.getBufferColumns(type);
                pointsBufferCols.forEach(col => {
                    const colNum = Utils.letterToColumn(col);
                    if (colNum <= sheet.getMaxColumns()) {
                        sheet.getRange(4, colNum).setBackground(questionFont);}});
                break;
            case 'TRACKER':
                sheet.getRange("B3:O3").setHorizontalAlignment("right");
                sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.START_DRAFT).setFontColor(actionGold);
                sheet.getRange(1, 7, sheet.getMaxRows(), 1).setFontWeight("bold");
                sheet.getRange(1, 3, sheet.getMaxRows(), 1).setHorizontalAlignment("center");
                sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.TIMER)
                    .setBackground(lightGrey)
                    .setFontColor("#000000");
                sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.BUFFER_COLUMN_CELL).setBackground(questionFont);
                break;}}
    mergeCells(sheet, type) {
        const mergeConfigs = this.getMergeConfiguration(type);
        let lastRow = sheet.getLastRow();
        const maxRows = sheet.getMaxRows(); // Use max rows as fallback
        const lastCol = sheet.getMaxColumns();
        const secondToLastCol = lastCol - 1;
        if (lastRow === 0) {
            lastRow = maxRows;
            console.log(`Using maxRows (${maxRows}) for merging since sheet is empty`);}
        mergeConfigs.forEach(config => {
            try {
                let range;
                const columnRangePattern = /^([A-Z]+)(\d+):([A-Z]+)$/;
                const match = config.match(columnRangePattern);
                if (match && match[1] === match[3]) {
                    const column = match[1];
                    const startRow = parseInt(match[2]);
                    const endRow = Math.min(maxRows, Math.max(lastRow, startRow + 1));
                    range = sheet.getRange(`${column}${startRow}:${column}${endRow}`);
                } else {
                    switch(config) {
                        case 'A:A':
                            range = sheet.getRange(1, 1, maxRows, 1);
                            break;
                        case 'Last column:Last column':
                            range = sheet.getRange(1, lastCol, maxRows, 1);
                            break;
                        case 'last row B:D':
                        case 'last row E:U':
                        case 'last row E:AB':
                            console.log(`Skipping ${config} during initial setup`);
                            return;
                        case 'B1:second to last column':
                            range = sheet.getRange(`B1:${Utils.columnToLetter(secondToLastCol)}1`);
                            break;
                        case 'B2:second to last column':
                            range = sheet.getRange(`B2:${Utils.columnToLetter(secondToLastCol)}2`);
                            break;
                        case 'Q3:second to last column':
                            range = sheet.getRange(`Q3:${Utils.columnToLetter(secondToLastCol)}3`);
                            break;
                        case 'B4:second to last column':
                            range = sheet.getRange(`B4:${Utils.columnToLetter(secondToLastCol)}4`);
                            break;
                        case 'B5:second to last column':
                            range = sheet.getRange(`B5:${Utils.columnToLetter(secondToLastCol)}5`);
                            break;
                        case 'B7:second to last column':
                            range = sheet.getRange(`B7:${Utils.columnToLetter(secondToLastCol)}7`);
                            break;
                        default:
                            range = sheet.getRange(config);}}
                if (range) {
                    try {
                        range.breakApart();
                    } catch (e) {}
                    if (range.getNumRows() > 1 || range.getNumColumns() > 1) {
                        range.merge();}}
            } catch (error) {
                console.log(`Could not merge ${config}: ${error.message}`);}});}
    getMergeConfiguration(type) {
        switch(type) {
            case 'TRACKER':
                return [
                    'B1:second to last column', 'B2:second to last column', 
                    'B4:O4', 'Q4:second to last column', 'B3:second to last column',
                    'B5:second to last column', 'B7:second to last column' ];
            case 'SEASON':
            case 'COMPLETED':
                return [
                    'B1:D1', 'E1:U1', 'E2:U2', 'E3:U3',
                    'B5:D5', 'E5:U5', 'last row B:D', 'last row E:U',
                    'A1:A5', 'A6:A', 'C2:C4', 'C6:C', 'G6:G', 
                    type === 'SEASON' ? 'O6:O' : 'R6:R',
                    type === 'SEASON' ? 'R6:R' : 'T6:T',
                    type === 'SEASON' ? 'T6:T' : 'V6:V',
                    'V1:V5', 'V6:V'];
            case 'LIVE':
                return [
                    'B1:D1', 'E1:U1', 'E2:AB2', 'E3:AB3',
                    'B5:D5', 'E5:AB5', 'last row B:D', 'last row E:AB',
                    'A1:A5', 'A6:A', 'C2:C4', 'C6:C', 'G6:G', 'Q6:Q', 'Y6:Y', 
                    'AA6:AA', 'AC1:AC5', 'AC6:AC'];
            case 'POINTS':
                return [
                    'B1:C1', 'D1:AB1', 'B2:C2', 'D2:AB2', 'B3:C3', 'D3:AB3',
                    'B5:C5', 'D5:AB5',
                    'A1:A5', 'A6:A', 'C6:C', 'E6:E', 'W6:W', 'Y6:Y',
                    'AC1:AC5', 'AC6:AC'];
            default:
                return [];}}
    freezeRowsAndColumns(sheet, type) {
        if (type === 'TRACKER' || type === 'LEADERBOARD') {
            return;}
        sheet.setFrozenRows(CONFIG.SHEETS.STRUCTURE.COMMON.BUFFER_ROW_3);
        switch(type) {
            case 'SEASON':
            case 'LIVE':
            case 'COMPLETED':
                sheet.setFrozenColumns(4); // Column D
                break;
            case 'POINTS':
                sheet.setFrozenColumns(3); // Column C
                break;}}
    hideColumns(sheet, type) {
        if (type === 'SEASON' || type === 'LIVE' || type === 'COMPLETED') {
            sheet.hideColumns(1, 2);}}
    applyConditionalFormatting(sheet, type) {
        if (type === 'POINTS') {
            const actionGold = CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD;
            const headerFont = CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT;
            const ranges = [
                sheet.getRange(`X${CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW}:X`),
                sheet.getRange(`AB${CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW}:AB`)];
            const winnerRule = SpreadsheetApp.newConditionalFormatRule()
                .whenNumberGreaterThan(9)
                .setBackground(actionGold)
                .setFontColor(headerFont)
                .setRanges(ranges)
                .setBold(true)
                .build();
            const loserRule = SpreadsheetApp.newConditionalFormatRule()
                .whenNumberGreaterThan(0)
                .setFontColor('#FF0000')  // Red color
                .setRanges(ranges)
                .build();
            sheet.setConditionalFormatRules([winnerRule, loserRule]);}}
    getBufferRows(type, sheet) {
        switch(type) {
            case 'TRACKER':
                return [1, 5, 7]; // Removed lastRow
            case 'TRANSACTION':
                return [1, 5]; // Removed lastRow
            case 'TEAMS':
            case 'TRANSACTIONDATA':
                return [];
            default: // Season, Live, Complete, Points, Leaderboard
                return [1, 3, 5];}}
    applyTypeSpecificSetup(sheet, type) {
        switch(type) {
            case 'TRACKER':
                this.setupTrackerValidations(sheet);
                this.setupTrackerInitialData(sheet);
                break;
            case 'TRANSACTION':
                this.setupTransactionLogValidations(sheet);
                break;
            case 'LIVE':
                this.updateTimestamp(sheet);
                break;}}
    async setupTeamsSheet(sheet) {
        console.log("Setting up Teams sheet");
        try {
            const maxSchools = CONFIG.SYSTEM.HELPERS.getMaxSchoolsPerTeam();
            console.log("Max schools value:", maxSchools);
            const headers = [
                "Team Names:",
                "Week:",
                ...Array(maxSchools)
                    .fill(0)
                    .map((_, i) => `Program Slot ${i + 1}`)];
            const headerRow = CONFIG.SHEETS.STRUCTURE.COMMON.HEADER_ROW;
            const headerRange = sheet.getRange(1, 1, 1, headers.length);
            headerRange.setValues([headers]);
            headerRange
                .setFontFamily(CONFIG.UI.STYLES.BASE.FONT_FAMILY)
                .setFontSize(CONFIG.UI.STYLES.BASE.FONT_SIZE)
                .setFontColor(CONFIG.UI.STYLES.BASE.FONT_COLOR)
                .setFontWeight(CONFIG.UI.STYLES.BASE.FONT_WEIGHT)
                .setBackground(CONFIG.UI.STYLES.BASE.BACKGROUND)
                .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT)
                .setWrap(CONFIG.UI.STYLES.BASE.WRAP);
            headers.forEach((header, index) => {
                const width = this.getColumnWidth(header);
                sheet.setColumnWidth(index + 1, width);});
            sheet.setFrozenRows(1);
            console.log("TEAMS sheet setup completed successfully");
        } catch (error) {
            console.error("Error in setupTeamsSheet:", error);
            throw error;}}    
    async setupPointsSheet(sheet) {
        console.log("Setting up Points Calculator sheet");
        this.setupPointsCalculatorSheet(sheet);
        colorSchoolCells(sheet);}
    setupPointsCalculatorSheet(sheet) {
        console.log("Setting up Points Calculator sheet data...");
        try {
            if (!CONFIG.GAME.SCORING.FACTORS || !CONFIG.GAME.SCORING.SPECIAL) {
                throw new Error("SCORING.FACTORS or SCORING.SPECIAL not properly defined in CONFIG");}
            const dataStartRow = CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW;
            const schoolsList = Utils.getSchoolNames();
            if (!Array.isArray(schoolsList) || schoolsList.length === 0) {
                throw new Error("School names not properly returned from getSchoolNames");}
            const schoolsColumn = 2; // Column B
            const schoolsRange = sheet.getRange(
                dataStartRow,
                schoolsColumn,
                schoolsList.length,
                1);
            schoolsRange.setValues(schoolsList);
            const totalColumn = 4; // Column D
            const totalZeros = Array(schoolsList.length).fill([0]);
            sheet.getRange(dataStartRow, totalColumn, schoolsList.length, 1)
                .setValues(totalZeros);
            const week1to14StartCol = 6; // Column F
            const week1to14NumCols = 14; // F through S
            const week1to14Zeros = Array(schoolsList.length).fill()
                .map(() => Array(week1to14NumCols).fill(0));
            sheet.getRange(dataStartRow, week1to14StartCol, schoolsList.length, week1to14NumCols)
                .setValues(week1to14Zeros);
            const week15to16StartCol = 20; // Column T
            const week15to16NumCols = 2; // T and U
            const week15to16Zeros = Array(schoolsList.length).fill()
                .map(() => Array(week15to16NumCols).fill(0));
            sheet.getRange(dataStartRow, week15to16StartCol, schoolsList.length, week15to16NumCols)
                .setValues(week15to16Zeros);
            const bowlAppearanceCol = 22; // Column V
            sheet.getRange(dataStartRow, bowlAppearanceCol, schoolsList.length, 1)
                .setValues(Array(schoolsList.length).fill([0]));
            const heismanCol = 24; // Column X
            sheet.getRange(dataStartRow, heismanCol, schoolsList.length, 1)
                .setValues(Array(schoolsList.length).fill([0]));
            const specialStartCol = 26; // Column Z
            const specialNumCols = 3; // Z, AA, AB
            const specialZeros = Array(schoolsList.length).fill()
                .map(() => Array(specialNumCols).fill(0));
            sheet.getRange(dataStartRow, specialStartCol, schoolsList.length, specialNumCols)
                .setValues(specialZeros);
            const bufferWidth = 20; // Standard buffer column width
            const bufferColumns = ['A', 'C', 'E', 'W', 'Y', 'AC'];
            bufferColumns.forEach(col => {
                const colNum = Utils.letterToColumn(col);
                if (colNum <= sheet.getMaxColumns()) {
                    sheet.setColumnWidth(colNum, bufferWidth);}});
            sheet.setColumnWidth(3, bufferWidth); // Column C
            console.log("Points Calculator data populated successfully");
        } catch (error) {
            console.error("Error in setupPointsCalculatorSheet:", error);
            throw error;}}
    async setupLeaderboardSheet(sheet) {
      // === STEP 0: Pre-information ===
        console.log("Setting up Leaderboard sheet...");
        const settingsSheet = this.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
        const teamCount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
        const numSchoolsPerTeam = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM).getValue();
        const highPointsEnabled = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HIGH_POINTS_YES_NO).getValue() === "Yes";
        const headers = CONFIG.SHEETS.SPECIFIC.LEADERBOARD.REQUIRED_COLUMNS;
        const QUESTION_FONT = CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT;
        const HEADER_BACKGROUND = CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND;
        const HEADER_FONT = CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT;
        const SCORING_BACKGROUND = CONFIG.SETUP.VISUAL.COLORS.SCORING_BACKGROUND;
        const USER_BACKGROUND = CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND;
        sheet.clear();
      // === STEP 1: SET ROW AND COLUMN DIMENSIONS ===
        const requiredColumns = 58; // Up to column BF
        const currentColumns = sheet.getMaxColumns();
        if (currentColumns < requiredColumns) {
            sheet.insertColumnsAfter(currentColumns, requiredColumns - currentColumns);}
        let minRowsNeeded = 31; 
        let currentRow = 6; 
        currentRow += teamCount; 
        currentRow += 2; 
        if (highPointsEnabled) {
            currentRow += 2; 
            currentRow += 1; 
            currentRow += 1; 
            currentRow += teamCount; 
            currentRow += 5; 
            currentRow += 2; }
        if (currentRow < minRowsNeeded) {
            currentRow = minRowsNeeded;}
        const conferenceStartRow = currentRow + 1;
        currentRow += 1; 
        currentRow += 1; 
        currentRow += 1; 
        currentRow += 1; 
        currentRow += 1; 
        currentRow += 1; 
        currentRow += 19; 
        currentRow += 1; 
        const totalRows = Math.max(currentRow, 100);
        const existingRows = sheet.getMaxRows();
        if (existingRows < totalRows) {
            sheet.insertRowsAfter(existingRows, totalRows - existingRows);
        } else if (existingRows > totalRows) {
            sheet.deleteRows(totalRows + 1, existingRows - totalRows);}
        console.log("Leaderboard step 1 complete.");
      // === STEP 2: COLOR BUFFER COLUMNS FIRST ===
        sheet.getRange(1, 1, sheet.getMaxRows(), 1).setBackground(QUESTION_FONT);
        sheet.getRange(1, 58, sheet.getMaxRows(), 1).setBackground(QUESTION_FONT);
        const earlyBufferColumns = ['AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX', 'AY', 'AZ', 'BA', 'BB', 'BC', 'BD', 'BE'];
        earlyBufferColumns.forEach(colLetter => {
            const colNum = Utils.letterToColumn(colLetter);
            if (colNum <= requiredColumns) {
                sheet.getRange(1, colNum, sheet.getMaxRows(), 1).setBackground(QUESTION_FONT);}});
        console.log("Leaderboard step 2 complete.");
      // === STEP 3: SET COLUMN WIDTHS ===
        const skinnyColumns = ['A', 'F', 'K', 'P', 'U', 'Z', 'AE', 'AG', 'AK', 'AN', 'AQ', 'AU', 'AW', 'AZ', 'BC', 'BF'];
        const skinnyWidth = 20;
        const normalWidth = 135;
        for (let col = 1; col <= requiredColumns; col++) {
            sheet.setColumnWidth(col, normalWidth);}
        skinnyColumns.forEach(colLetter => {
            const colNum = Utils.letterToColumn(colLetter);
            if (colNum <= requiredColumns) {
                sheet.setColumnWidth(colNum, skinnyWidth);}});
        console.log("Leaderboard step 3 complete.");
      // === STEP 4: SET ROW HEIGHTS ===
        const skinnyHeight = 15;
        const normalHeight = 21;
        const headerHeight = 40;
        sheet.setRowHeight(1, skinnyHeight); 
        sheet.setRowHeight(2, headerHeight); 
        sheet.setRowHeight(3, skinnyHeight); 
        sheet.setRowHeight(4, 30); 
        sheet.setRowHeight(5, skinnyHeight); 
        console.log("Leaderboard step 4 complete.");
      // === STEP 5: MAIN LEADERBOARD SECTION ===
        sheet.getRange(1, 1, 1, requiredColumns).setBackground(QUESTION_FONT);
        sheet.getRange('B2').setValue('Leaderboard')
            .setFontSize(56)
            .setFontWeight('bold')
            .setBackground(HEADER_BACKGROUND)
            .setFontColor(HEADER_FONT)
            .setHorizontalAlignment('center')
            .setVerticalAlignment('middle');
        sheet.getRange(3, 1, 1, requiredColumns).setBackground(QUESTION_FONT);
        sheet.getRange(4, 2, 1, headers.length)
            .setValues([headers])
            .setFontSize(12)
            .setFontWeight('bold')
            .setBackground(HEADER_BACKGROUND)
            .setFontColor(HEADER_FONT)
            .setHorizontalAlignment('center')
            .setVerticalAlignment('middle')
            .setWrap(true);
        sheet.getRange(5, 1, 1, requiredColumns).setBackground(QUESTION_FONT);
        const teamNamesStartCell = CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START;
        const teamNames = settingsSheet.getRange(teamNamesStartCell)
            .offset(0, 0, teamCount)
            .getValues()
            .filter(row => row[0]);
        sheet.getRange(6, 3, teamNames.length, 1).setValues(teamNames);
        for (let team = 0; team < teamNames.length; team++) {
            const teamRow = team + 6;
            const placeFormula = `=IF(D${teamRow}="", "", RANK(D${teamRow}, D$6:D$${5 + teamNames.length}, 0))`;
            sheet.getRange(teamRow, 2).setFormula(placeFormula)
                .setBackground(SCORING_BACKGROUND);}
        sheet.getRange(6, 3, teamNames.length, headers.length - 1)
            .setBackground(USER_BACKGROUND);
        for (let team = 0; team < teamNames.length; team++) {
            const teamRow = team + 6;
            const teamName = teamNames[team][0];
            const totalFormula = `=IFERROR(SUM(E${teamRow}:${Utils.columnToLetter(headers.length)}${teamRow}), 0)`;
            sheet.getRange(teamRow, 4).setFormula(totalFormula);           
            for (let weekCol = 0; weekCol < headers.length - 3; weekCol++) {
                const col = weekCol + 5; 
                const weekName = headers[weekCol + 3];
                if (weekName === "Season Winners") {
                    sheet.getRange(teamRow, col).setValue("")
                        .setNumberFormat("$#,##0.00");
                    continue;}
                const formula = `=IFERROR(INDEX(INDIRECT("'${teamName}'!I12:AE12"), 1, MATCH("${weekName}", INDIRECT("'${teamName}'!I11:AE11"), 0)), "")`;
                sheet.getRange(teamRow, col).setFormula(formula);}}
        let nextSectionRow = 6 + teamNames.length + 1; 
        sheet.getRange(nextSectionRow - 1, 1, 1, requiredColumns).setBackground(QUESTION_FONT);
        sheet.setRowHeight(nextSectionRow - 1, skinnyHeight);
        console.log("Leaderboard step 5 complete.");
      // === STEP 6: HIGH POINTS SECTION (if enabled) ===
        if (highPointsEnabled) {
            const numWeeks = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_HP_WEEKS).getValue();
            let highPointsFormulaRow = 6 + teamNames.length; // Start directly after main leaderboard
            let columnOffset = 0;
            if (numWeeks > 14) columnOffset = 4;
            else if (numWeeks > 10) columnOffset = 3;
            else if (numWeeks > 6) columnOffset = 2;
            else if (numWeeks > 2) columnOffset = 1;
            for (let weekCol = 0; weekCol < numWeeks; weekCol++) {
                let actualCol = 5; // Start at column E
                if (weekCol >= 14) actualCol = weekCol + 5 + 4; // After week 14, account for all 4 buffer columns
                else if (weekCol >= 10) actualCol = weekCol + 5 + 3; // After week 10, account for 3 buffer columns
                else if (weekCol >= 6) actualCol = weekCol + 5 + 2; // After week 6, account for 2 buffer columns
                else if (weekCol >= 2) actualCol = weekCol + 5 + 1; // After week 2, account for 1 buffer column
                else actualCol = weekCol + 5; // First 2 weeks, no buffer adjustment                
                const columnLetter = Utils.columnToLetter(actualCol);
                const teamsCol = Utils.columnToLetter(3); // Column C for team names
                const dataRange = `${columnLetter}6:${columnLetter}${5 + teamNames.length}`;                
                const highPointsFormula = `=IFERROR("High Points: " & IF(SUM(${dataRange})>0, MAX(${dataRange}), ""), "")`;
                sheet.getRange(highPointsFormulaRow, actualCol).setFormula(highPointsFormula);
                const winnerCountFormula = `=IFERROR("# of Winners: " & IF(SUM(${dataRange})>0, COUNTIF(${dataRange}, MAX(${dataRange})), ""), "")`;
                sheet.getRange(highPointsFormulaRow + 1, actualCol).setFormula(winnerCountFormula);
                const winnersFormula = `=IFERROR(IF(SUM($${dataRange})=0, "",
                    IF(COUNTIF($${dataRange}, MAX(${dataRange}))>3, 
                        "Winner(s): More than 3",
                        "Winner(s): " & INDEX(${teamsCol}$6:${teamsCol}$${5 + teamNames.length}, 
                        SMALL(IF($${dataRange}=MAX($${dataRange}), ROW(${dataRange})-ROW(${columnLetter}$6)+1), 1)))), "")`;
                sheet.getRange(highPointsFormulaRow + 2, actualCol).setFormula(winnersFormula);
                const winner2Formula = `=IFERROR(IF(AND(SUM(${dataRange})>0, COUNTIF(${dataRange}, MAX(${dataRange}))>1, COUNTIF(${dataRange}, MAX(${dataRange}))<=3),
                    INDEX($${teamsCol}$6:$${teamsCol}$${5 + teamNames.length}, 
                        SMALL(IF($${dataRange}=MAX($${dataRange}), ROW(${dataRange})-ROW(${columnLetter}$6)+1), 2)), ""), "")`;
                sheet.getRange(highPointsFormulaRow + 3, actualCol).setFormula(winner2Formula);
                const winner3Formula = `=IFERROR(IF(AND(SUM(${dataRange})>0, COUNTIF(${dataRange}, MAX(${dataRange}))>2, COUNTIF(${dataRange}, MAX(${dataRange}))<=3),
                    INDEX($${teamsCol}$6:$${teamsCol}$${5 + teamNames.length}, 
                        SMALL(IF($${dataRange}=MAX($${dataRange}), ROW(${dataRange})-ROW(${columnLetter}$6)+1), 3)), ""), "")`;
                sheet.getRange(highPointsFormulaRow + 4, actualCol).setFormula(winner3Formula);}
            sheet.getRange(highPointsFormulaRow, 2, 5, 30).setBackground(USER_BACKGROUND); // B to AF (columns 2-31)
            nextSectionRow = highPointsFormulaRow + 5; // Move past the 5 formula rows
            sheet.getRange(nextSectionRow, 1, 1, requiredColumns).setBackground(QUESTION_FONT);
            sheet.setRowHeight(nextSectionRow, skinnyHeight);
            nextSectionRow++;
            sheet.getRange(nextSectionRow, 2, 1, headers.length)
                .setValues([headers])
                .setFontSize(12)
                .setFontWeight('bold')
                .setBackground(HEADER_BACKGROUND)
                .setFontColor(HEADER_FONT)
                .setHorizontalAlignment('center')
                .setVerticalAlignment('middle')
                .setWrap(true);
            nextSectionRow++;
            sheet.getRange(nextSectionRow, 1, 1, requiredColumns).setBackground(QUESTION_FONT);
            sheet.setRowHeight(nextSectionRow, skinnyHeight);
            nextSectionRow++;
            const hpStartRow = nextSectionRow;
            sheet.getRange(hpStartRow, 3, teamNames.length, 1).setValues(teamNames);
            for (let team = 0; team < teamNames.length; team++) {
                const teamRow = hpStartRow + team;
                const placeFormula = `=IF(D${teamRow}="", "", RANK(D${teamRow}, D$${hpStartRow}:D$${hpStartRow + teamNames.length - 1}, 0))`;
                sheet.getRange(teamRow, 2).setFormula(placeFormula)
                    .setBackground(SCORING_BACKGROUND).setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');}            
            sheet.getRange(hpStartRow, 3, teamNames.length, headers.length - 1)
                .setBackground(USER_BACKGROUND);            
            const weeklyAmount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HP_WEEKLY_AMOUNT).getValue();
            for (let team = 0; team < teamNames.length; team++) {
                const teamRow = hpStartRow + team;
                const teamName = teamNames[team][0];
                const totalFormula = `=IFERROR(SUM(E${teamRow}:${Utils.columnToLetter(headers.length + 1)}${teamRow}), 0)`;
                sheet.getRange(teamRow, 4).setFormula(totalFormula);
                for (let weekCol = 0; weekCol < numWeeks; weekCol++) {
                    let actualCol = 5; // Start at column E
                    if (weekCol >= 14) actualCol = weekCol + 5 + 4;
                    else if (weekCol >= 10) actualCol = weekCol + 5 + 3;
                    else if (weekCol >= 6) actualCol = weekCol + 5 + 2;
                    else if (weekCol >= 2) actualCol = weekCol + 5 + 1;
                    else actualCol = weekCol + 5;                    
                    const columnLetter = Utils.columnToLetter(actualCol);
                    const mainLeaderboardRange = `${columnLetter}$6:${columnLetter}$${5 + teamNames.length}`;                    
                    const formula = `=IFERROR(
                        IF(SUM(${mainLeaderboardRange})=0, "",
                        IF(AND(INDIRECT("'Settings'!$C$42")="Yes", 
                            INDEX(${mainLeaderboardRange}, MATCH(C${teamRow}, C$6:C$${5 + teamNames.length}, 0))=MAX(${mainLeaderboardRange})), 
                            ${weeklyAmount}/COUNTIF(${mainLeaderboardRange}, MAX(${mainLeaderboardRange})), 
                            IF(AND(INDIRECT("'Settings'!$C$42")="No", 
                                COUNTIF(${mainLeaderboardRange}, MAX(${mainLeaderboardRange}))=1, 
                                INDEX(${mainLeaderboardRange}, MATCH(C${teamRow}, C$6:C$${5 + teamNames.length}, 0))=MAX(${mainLeaderboardRange})), 
                                ${weeklyAmount}, 
                                ""))), "")`;
                    sheet.getRange(teamRow, actualCol).setFormula(formula);}
                const seasonWinnersCol = headers.indexOf("Season Winners") + 2; // +2 because headers start at column B
                const seasonWinnersFormula = `=IFERROR(INDEX(Leaderboard!${Utils.columnToLetter(seasonWinnersCol)}$6:${Utils.columnToLetter(seasonWinnersCol)}$${5 + teamNames.length}, MATCH(C${teamRow}, Leaderboard!C$6:C$${5 + teamNames.length}, 0)), 0)`;
                sheet.getRange(teamRow, headers.length + 1).setFormula(seasonWinnersFormula)
                    .setNumberFormat("$#,##0.00");}            
            sheet.getRange(hpStartRow, 4, teamNames.length, headers.length - 2)
                .setNumberFormat("$#,##0.00");            
            const totalsRow = hpStartRow + teamNames.length;
            sheet.getRange(totalsRow, 1, 1, requiredColumns).setBackground(QUESTION_FONT);
            sheet.setRowHeight(totalsRow, skinnyHeight);
            const hpPrizePool = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HP_PRIZE_POOL).getValue();
            const prizePool = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PRIZE_POOL).getValue();
            const entryFee = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ENTRY_FEE).getValue();
            const totalsCol = Utils.columnToLetter(4); // Column D for totals
            const gameIdCol = Utils.columnToLetter(2); // Column B for game IDs
            const totalPrizePoolFormula = `=IF(
                INDEX(INDIRECT("'${CONFIG.SHEETS.SPECIFIC.COMPLETED.NAME}'!${gameIdCol}:${gameIdCol}"), 
                    MATCH(1.E+308, INDIRECT("'${CONFIG.SHEETS.SPECIFIC.COMPLETED.NAME}'!${gameIdCol}:${gameIdCol}"))) = 
                INDEX(INDIRECT("'${CONFIG.SHEETS.SPECIFIC.SEASON.NAME}'!${gameIdCol}:${gameIdCol}"), 
                    MATCH(1.E+308, INDIRECT("'${CONFIG.SHEETS.SPECIFIC.SEASON.NAME}'!${gameIdCol}:${gameIdCol}"))),
                "$" & TEXT(IFERROR(SUM(${totalsCol}$${hpStartRow}:${totalsCol}$${hpStartRow + teamNames.length - 1}), 0), "#,##0") & 
                " of $" & TEXT(${prizePool}, "#,##0"),
                "$" & TEXT(IFERROR(SUM(${totalsCol}$${hpStartRow}:${totalsCol}$${hpStartRow + teamNames.length - 1}), 0), "#,##0") & 
                " of $" & TEXT(${hpPrizePool}, "#,##0"))`;          
            nextSectionRow = totalsRow + 2; // Move past the totals row
            sheet.getRange(nextSectionRow - 1, 1, 1, requiredColumns).setBackground(QUESTION_FONT);
            sheet.setRowHeight(nextSectionRow - 1, skinnyHeight);
            sheet.getRange(totalsRow + 1, 4).setFormula(totalPrizePoolFormula).setFontWeight('bold').setBackground(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND);}
        console.log("Leaderboard step 6 complete.");
      // === STEP 7: ADD BUFFER ROWS TO REACH ROW 31 ===
        while (nextSectionRow < 31) {
            sheet.getRange(nextSectionRow, 1, 1, requiredColumns).setBackground(QUESTION_FONT);
            sheet.setRowHeight(nextSectionRow, skinnyHeight);
            nextSectionRow++;}
        console.log("Leaderboard step 7 complete.");
      // === STEP 8: MERGE CELLS BEFORE CONFERENCE STANDINGS ===
        sheet.getRange('A1:BF1').merge();
        sheet.getRange('B2:AF2').merge();
        sheet.getRange('B3:BF3').merge();
        sheet.getRange('B5:AF5').merge();
        sheet.getRange('AH2:AM2').merge();
        sheet.getRange('AH5:AM5').merge();
        sheet.getRange('AK4:AL4').merge();
        sheet.getRange('AO2:AT2').merge();
        sheet.getRange('AV2:AY2').merge();
        sheet.getRange('BA2:BD2').merge();
        for (let row = 6; row <= 30; row++) {
            sheet.getRange(`AK${row}:AL${row}`).merge();}
        sheet.getRange('AQ4:AR4').merge();
        sheet.getRange('AW4:AX4').merge();
        sheet.getRange('BB4:BC4').merge();
        for (let row = 5; row <= 7; row++) {
            sheet.getRange(`AW${row}:AX${row}`).merge();
            sheet.getRange(`BB${row}:BC${row}`).merge();}
        const bufferColumnsToMerge = [
            {start: 'F', end: 'G'},
            {start: 'K', end: 'L'},
            {start: 'P', end: 'Q'},
            {start: 'U', end: 'V'},
            {start: 'Z', end: 'AA'},
            {start: 'AE', end: 'AF'}];
        const endRowForColumnMerge = nextSectionRow - 2;
        for (let row = 4; row <= endRowForColumnMerge; row++) {
            if (row === 5) continue; 
            bufferColumnsToMerge.forEach(col => {
                sheet.getRange(`${col.start}${row}:${col.end}${row}`).merge();});}
        console.log("Leaderboard step 8 complete.");
      // === STEP 9: CONFERENCE STANDINGS SECTION ===
        const confStartRow = nextSectionRow;
        sheet.getRange(confStartRow, 1, 1, requiredColumns).setBackground(QUESTION_FONT);
        sheet.setRowHeight(confStartRow, skinnyHeight);
        sheet.getRange(confStartRow + 1, 2).setValue('Conference Standings')
            .setFontSize(56)
            .setFontWeight('bold')
            .setBackground(HEADER_BACKGROUND)
            .setFontColor(HEADER_FONT)
            .setHorizontalAlignment('center')
            .setWrap(true);
        sheet.getRange(`B${confStartRow + 1}:BE${confStartRow + 1}`).merge();
        sheet.getRange(confStartRow + 2, 1, 1, requiredColumns).setBackground(QUESTION_FONT);
        sheet.setRowHeight(confStartRow + 2, skinnyHeight);
        const confNamesRow = confStartRow + 3;
        const conferences = ['AAC', 'ACC', 'Big 12', 'Big Ten', 'CUSA', 'MAC', 'Mountain West', 'Pac-12', 'SEC', 'Sun Belt', 'Independent'];
        sheet.getRange(confStartRow + 4, 1, 1, requiredColumns).setBackground(QUESTION_FONT);
        sheet.setRowHeight(confStartRow + 4, skinnyHeight);
        const confSubHeaderRow = confStartRow + 5;
        const confDataStartRow = confStartRow + 6;
        const confDataEndRow = confSubHeaderRow + 19;
        sheet.getRange(confDataStartRow, 2, confDataEndRow - confDataStartRow + 1, 56)
            .setBackground(USER_BACKGROUND);
        const conferenceLayout = [
            { name: 'AAC', startCol: 2, dataColumns: 4, bufferColumns: 1 },           // B-E + F buffer
            { name: 'ACC', startCol: 7, dataColumns: 4, bufferColumns: 1 },           // G-J + K buffer
            { name: 'Big 12', startCol: 12, dataColumns: 4, bufferColumns: 1 },       // L-O + P buffer
            { name: 'Big Ten', startCol: 17, dataColumns: 4, bufferColumns: 1 },      // Q-T + U buffer
            { name: 'CUSA', startCol: 22, dataColumns: 4, bufferColumns: 1 },         // V-Y + Z buffer
            { name: 'MAC', startCol: 27, dataColumns: 4, bufferColumns: 1 },          // AA-AD + AE buffer
            { name: 'Mountain West', startCol: 32, dataColumns: 5, bufferColumns: 1 }, // AF-AJ + AK buffer
            { name: 'Pac-12', startCol: 38, dataColumns: 5, bufferColumns: 1 },       // AL-AP + AQ buffer
            { name: 'SEC', startCol: 44, dataColumns: 5, bufferColumns: 1 },          // AR-AV + AW buffer
            { name: 'Sun Belt', startCol: 50, dataColumns: 5, bufferColumns: 1 },     // AX-BB + BC buffer
            { name: 'Independent', startCol: 56, dataColumns: 2, bufferColumns: 0 }];
        conferenceLayout.forEach((conf, index) => {
            sheet.getRange(confNamesRow, conf.startCol).setValue(conf.name)
                .setFontSize(16)
                .setFontWeight('bold')
                .setBackground(HEADER_BACKGROUND)
                .setFontColor(HEADER_FONT)
                .setHorizontalAlignment('center')
                .setWrap(true);            
            if (conf.dataColumns > 1) {
                sheet.getRange(confNamesRow, conf.startCol, 1, conf.dataColumns).merge();}});
        conferenceLayout.forEach((conf, index) => {
            const isIndependent = (conf.name === 'Independent');
            const isSEC = (conf.name === 'SEC');            
            if (isIndependent) {
                const headers = CONFIG.SHEETS.SPECIFIC.LEADERBOARD.INDEPEN_CONFERENCE_HEADERS;
                sheet.getRange(confSubHeaderRow, conf.startCol, 1, headers.length)
                    .setValues([headers])
                    .setBackground(HEADER_BACKGROUND)
                    .setFontColor(HEADER_FONT)
                    .setFontWeight('bold')
                    .setHorizontalAlignment('center')
                    .setVerticalAlignment('middle')
                    .setWrap(true);
            } else if (conf.dataColumns === 5) {
                const headers = CONFIG.SHEETS.SPECIFIC.LEADERBOARD.REG_CONFERENCE_HEADERS;                
                if (isSEC) {
                    sheet.getRange(confSubHeaderRow, conf.startCol).setValue(headers[0])
                        .setBackground(HEADER_BACKGROUND)
                        .setFontColor(HEADER_FONT)
                        .setFontWeight('bold')
                        .setHorizontalAlignment('center')
                        .setVerticalAlignment('middle')
                        .setWrap(true);                   
                    sheet.getRange(confSubHeaderRow, conf.startCol + 1).setValue(headers[1])
                        .setBackground(HEADER_BACKGROUND)
                        .setFontColor(HEADER_FONT)
                        .setFontWeight('bold')
                        .setHorizontalAlignment('center')
                        .setVerticalAlignment('middle')
                        .setWrap(true);                    
                    sheet.getRange(confSubHeaderRow, conf.startCol + 2).setValue(headers[2])
                        .setBackground(HEADER_BACKGROUND)
                        .setFontColor(HEADER_FONT)
                        .setFontWeight('bold')
                        .setHorizontalAlignment('center')
                        .setVerticalAlignment('middle')
                        .setWrap(true);
                    sheet.getRange(confSubHeaderRow, conf.startCol + 2, 1, 2).merge();                    
                    sheet.getRange(confSubHeaderRow, conf.startCol + 4).setValue(headers[3])
                        .setBackground(HEADER_BACKGROUND)
                        .setFontColor(HEADER_FONT)
                        .setFontWeight('bold')
                        .setHorizontalAlignment('center')
                        .setVerticalAlignment('middle')
                        .setWrap(true);
                } else {
                    sheet.getRange(confSubHeaderRow, conf.startCol).setValue(headers[0])
                        .setBackground(HEADER_BACKGROUND)
                        .setFontColor(HEADER_FONT)
                        .setFontWeight('bold')
                        .setHorizontalAlignment('center')
                        .setVerticalAlignment('middle')
                        .setWrap(true);                    
                    sheet.getRange(confSubHeaderRow, conf.startCol + 1).setValue(headers[1])
                        .setBackground(HEADER_BACKGROUND)
                        .setFontColor(HEADER_FONT)
                        .setFontWeight('bold')
                        .setHorizontalAlignment('center')
                        .setVerticalAlignment('middle')
                        .setWrap(true);
                    sheet.getRange(confSubHeaderRow, conf.startCol + 1, 1, 2).merge();                   
                    sheet.getRange(confSubHeaderRow, conf.startCol + 3).setValue(headers[2])
                        .setBackground(HEADER_BACKGROUND)
                        .setFontColor(HEADER_FONT)
                        .setFontWeight('bold')
                        .setHorizontalAlignment('center')
                        .setVerticalAlignment('middle')
                        .setWrap(true);                    
                    sheet.getRange(confSubHeaderRow, conf.startCol + 4).setValue(headers[3])
                        .setBackground(HEADER_BACKGROUND)
                        .setFontColor(HEADER_FONT)
                        .setFontWeight('bold')
                        .setHorizontalAlignment('center')
                        .setVerticalAlignment('middle')
                        .setWrap(true);}
            } else {
                const headers = CONFIG.SHEETS.SPECIFIC.LEADERBOARD.REG_CONFERENCE_HEADERS;
                sheet.getRange(confSubHeaderRow, conf.startCol, 1, headers.length)
                    .setValues([headers])
                    .setBackground(HEADER_BACKGROUND)
                    .setFontColor(HEADER_FONT)
                    .setFontWeight('bold')
                    .setHorizontalAlignment('center')
                    .setVerticalAlignment('middle')
                    .setWrap(true);}});
        conferenceLayout.forEach(conf => {
            if (conf.bufferColumns > 0) {
                const bufferCol = conf.startCol + conf.dataColumns;
                sheet.getRange(confNamesRow, bufferCol, confDataEndRow - confNamesRow + 1, 1)
                    .setBackground(QUESTION_FONT);}});
        PropertiesService.getScriptProperties().setProperty('CONFERENCE_RANKINGS_CONFIG', 
            JSON.stringify({
                startRow: confDataStartRow,
                conferences: conferences,
                conferenceLayout: conferenceLayout}));
        setupConferenceRankings(sheet, confNamesRow);
        updateConferenceRankings();
        sheet.getRange(`B${confStartRow}:BE${confStartRow}`).merge();
        sheet.getRange(`B${confStartRow + 2}:BE${confStartRow + 2}`).merge();
        sheet.getRange(`B${confStartRow + 4}:BE${confStartRow + 4}`).merge();
        sheet.getRange(`B${confDataEndRow + 1}:BE${confDataEndRow + 1}`)
            .setBackground(QUESTION_FONT)
            .merge();
        const lastNeededRow = confDataEndRow + 1;
        if (totalRows > lastNeededRow) {
            sheet.deleteRows(lastNeededRow + 1, totalRows - lastNeededRow);}
        console.log("Leaderboard step 9 complete.");
      // === STEP 10: Top 25 RANKINGS (Column AH) ===
        sheet.getRange('AH2').setValue('Top 25 Rankings')
            .setFontSize(40)
            .setFontWeight('bold')
            .setBackground(HEADER_BACKGROUND)
            .setFontColor(HEADER_FONT)
            .setHorizontalAlignment('center')
            .setVerticalAlignment('middle')
            .setWrap(true);
        const apHeaders = ['Name', 'Week', 'Rank', 'School'];
        sheet.getRange(4, Utils.letterToColumn('AH'), 1, apHeaders.length)
            .setValues([apHeaders])
            .setFontSize(12)
            .setFontWeight('bold')
            .setBackground(HEADER_BACKGROUND)
            .setFontColor(HEADER_FONT)
            .setHorizontalAlignment('center')
            .setVerticalAlignment('middle')
            .setWrap(true);
        sheet.getRange('AK4:AM4')
            .setBackground(HEADER_BACKGROUND)
            .setFontColor(HEADER_FONT)
            .setHorizontalAlignment('center')
            .setVerticalAlignment('middle')
            .setWrap(true);
        sheet.getRange(6, Utils.letterToColumn('AH'), 25, 6)  // 25 rows, 6 columns (AH to AM)
            .setBackground(USER_BACKGROUND);
        PropertiesService.getScriptProperties().setProperty('AP_RANKINGS_START_ROW', '6');
        console.log("Leaderboard step 10 complete.");
      // === STEP 11: HEISMAN (Column AO) ===
        sheet.getRange('AO2').setValue('Heisman Winner')
            .setFontSize(26)  // Changed from 56 to 26
            .setFontWeight('bold')
            .setBackground(HEADER_BACKGROUND)
            .setFontColor(HEADER_FONT)
            .setVerticalAlignment('middle')
            .setHorizontalAlignment('center'); 
        sheet.getRange('AO4').setBackground(HEADER_BACKGROUND).setFontColor(HEADER_FONT);
        sheet.getRange('AP4:AT4').setBackground(HEADER_FONT).setFontColor('#000000');        
        const heismanRow = CONFIG.SHEETS.STRUCTURE.COMMON.SUB_HEADER_ROW; 
        PropertiesService.getScriptProperties().setProperty('HEISMAN_ROW', heismanRow.toString());
        console.log("Leaderboard step 11 complete.");        
      // === STEP 12: IDEAL TEAMS ===
        sheet.getRange('AV2')
            .setValue('Ideal Drafted Team')
            .setFontSize(26)
            .setFontWeight('bold')
            .setBackground(HEADER_BACKGROUND)
            .setFontColor(HEADER_FONT)
            .setHorizontalAlignment('center')
            .setVerticalAlignment('middle')
            .setWrap(true);
        sheet.getRange('BA2')
            .setValue('Current Week - Maximum Points')
            .setFontSize(26)
            .setFontWeight('bold')
            .setBackground(HEADER_BACKGROUND)
            .setFontColor(HEADER_FONT)
            .setHorizontalAlignment('center')
            .setVerticalAlignment('middle')
            .setWrap(true);
        sheet.getRange(4, Utils.letterToColumn('AV'), 1, 4)  // Changed from 3 to 4
            .setValues([CONFIG.SHEETS.SPECIFIC.LEADERBOARD.IDEAL_TEAM_HEADERS])
            .setFontSize(12)
            .setFontWeight('bold')
            .setBackground(HEADER_BACKGROUND)
            .setFontColor(HEADER_FONT)
            .setHorizontalAlignment('center')
            .setVerticalAlignment('middle')
            .setWrap(true);
        sheet.getRange(4, Utils.letterToColumn('BA'), 1, 4)  // Changed from 3 to 4
            .setValues([CONFIG.SHEETS.SPECIFIC.LEADERBOARD.IDEAL_TEAM_HEADERS])
            .setFontSize(12)
            .setFontWeight('bold')
            .setBackground(HEADER_BACKGROUND)
            .setFontColor(HEADER_FONT)
            .setHorizontalAlignment('center')
            .setVerticalAlignment('middle')
            .setWrap(true);
        setupLeaderboardConditionalFormatting();            
        applyPlaceStyling(sheet, 6, 5 + teamNames.length, 2);
        if (highPointsEnabled) {
            const hpDataStart = nextSectionRow - teamNames.length - 1;
            applyPlaceStyling(sheet, hpDataStart - 1, hpDataStart + teamNames.length - 1, 2);}
        console.log("Leaderboard step 12 complete.");
      // === STEP 13: POPULATE INITIAL DATA ===        
        updateRankings();
        console.log("updateRankings completed");
        scrapeWikipediaTableAndCheckCalendar(heismanRow);
        console.log("heisman setup completed");
        updateConferenceRankings(sheet);
        console.log("updateConferenceRankings setup completed");
        updateLeaderboardTeamOrder();
        console.log("updateLeaderboardTeamOrder setup completed");
        updateIdealTeam();       
        console.log("updateIdealTeam setup completed");
        return true;
    }
    async setupTransactionLogSheet(sheet) {
        console.log("Setting up Combined Transaction Log UI...");
        const config = CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI;
        sheet.getRange(config.SEPARATORS.COLUMN_1).setBackground(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT); // A:A
        sheet.getRange(config.SEPARATORS.COLUMN_2).setBackground(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT); // I:I
        sheet.getRange(config.SEPARATORS.COLUMN_3).setBackground(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT); // P:P
        sheet.getRange(config.TRANSACTION_HEADER.RANGE).merge()
            .setValue(config.TRANSACTION_HEADER.TITLE)
            .setBackground(CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND)
            .setFontColor(CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT)
            .setFontWeight("bold")
            .setFontSize(22)
            .setHorizontalAlignment("center");
        sheet.getRange("B1:O1").setBackground(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT);
        Object.values(config.CONTROLS).forEach(control => {
            sheet.getRange(control.LABEL_CELL)
                .setValue(control.LABEL_TEXT)
                .setBackground(CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND)
                .setFontColor(CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT)
                .setFontSize(12)
                .setFontWeight("bold")
                .setHorizontalAlignment("left");});
        sheet.getRange(config.CONTROLS.TEAM.VALUE_CELL).setBackground("#ffffff").setFontSize(12);
        sheet.getRange(config.CONTROLS.DROP.VALUE_CELL).setBackground("#ffffff").setFontSize(12);
        sheet.getRange(config.CONTROLS.ADD.VALUE_CELL).setBackground("#ffffff").setFontSize(12);
        const checkboxValidation = SpreadsheetApp.newDataValidation()
            .requireCheckbox()
            .build();
        sheet.getRange(config.CONTROLS.SUBMIT.VALUE_CELL)
            .setDataValidation(checkboxValidation)
            .setBackground("#ffffff")
            .setFontSize(12)
            .setFontColor(CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD);
        sheet.getRange(config.CONTROLS.SUMMARY.MERGE_RANGE).merge()
            .setValue("")
            .setBackground("#ffffff")
            .setFontStyle("italic")
            .setFontSize(12)
            .setHorizontalAlignment("left");
        sheet.getRange(config.CONTROLS.CONFIRM.VALUE_CELL)
            .setDataValidation(checkboxValidation)
            .setBackground("#ffffff")
            .setFontSize(12)
            .setFontColor(CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD);
        sheet.getRange(`${config.BUFFER_ROW.ROW}:${config.BUFFER_ROW.ROW}`)
            .setBackground(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT);
        sheet.setFrozenRows(config.FROZEN_ROWS);
        sheet.getRange(config.SECTIONS.RESEARCH.RANGE).merge()
            .setValue(config.SECTIONS.RESEARCH.TITLE)
            .setBackground(CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND)
            .setFontColor(CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT)
            .setFontWeight("bold")
            .setFontSize(16)
            .setHorizontalAlignment("center");
        sheet.getRange(config.SECTIONS.HISTORY.RANGE).merge()
            .setValue(config.SECTIONS.HISTORY.TITLE)
            .setBackground(CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD)
            .setFontColor(CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT)
            .setFontWeight("bold")
            .setFontSize(22)
            .setHorizontalAlignment("center")
            .setVerticalAlignment("middle");
        this.setupQueryFilters(sheet, config);
        this.setupTransactionHistory(sheet);
        await this.createTransactionDataHelper();
        this.setupMasterQuery(sheet, config);
        sheet.setColumnWidth(1, 30);    // Column A - separator
        sheet.setColumnWidth(2, 150);   // Column B - Team Name
        sheet.setColumnWidth(3, 150);   // Column C - Dropping School
        sheet.setColumnWidth(4, 150);   // Column D - Adding School
        sheet.setColumnWidth(5, 200);   // Column E - Submit
        sheet.setColumnWidth(6, 180);   // Column F - Summary (part 1)
        sheet.setColumnWidth(7, 150);   // Column G - Summary (part 2)
        sheet.setColumnWidth(8, 180);   // Column H - Confirm
        sheet.setColumnWidth(9, 30);   // Column I - Grey separator
        sheet.setColumnWidth(10, 150);  // Column J - Timestamp
        sheet.setColumnWidth(11, 150);  // Column K - Team Name in history
        sheet.setColumnWidth(12, 100);  // Column L - Week
        sheet.setColumnWidth(13, 150);  // Column M - Dropped
        sheet.setColumnWidth(14, 150);  // Column N - Added
        sheet.setColumnWidth(15, 100);  // Column O - Slot
        sheet.setColumnWidth(16, 30);   // Column P - Grey separator
        console.log("Applying cell merges...");
        sheet.getRange("A1:A5").merge();
        sheet.getRange("A6:A1000").merge();
        sheet.getRange("B1:O1").merge();
        sheet.getRange("B5:O5").merge();
        sheet.getRange("F3:G3").merge();
        sheet.getRange("I2:I4").merge();
        sheet.getRange("I6:I999").merge();
        sheet.getRange("P2:P4").merge();
        sheet.getRange("P6:P999").merge();
        colorSchoolCells(sheet);
        setupTransactionLogConditionalFormatting(sheet);
        console.log("Combined Transaction Log UI setup completed");}
    setupTransactionSectionHeaders(sheet, config) {
      const styles = CONFIG.UI.STYLES;
      sheet.getRange(config.SECTIONS.RESEARCH.RANGE).merge()
        .setValue(config.SECTIONS.RESEARCH.TITLE)
        .setBackground(config.SECTIONS.RESEARCH.COLOR)
        .setFontWeight(styles.HEADER_STYLES.FONT_WEIGHT)
        .setFontSize(styles.HEADER_STYLES.FONT_SIZE)
        .setHorizontalAlignment(styles.BASE.ALIGNMENT);
      sheet.getRange(config.SECTIONS.TRANSACTION.RANGE).merge()
        .setValue(config.SECTIONS.TRANSACTION.TITLE)
        .setBackground(config.SECTIONS.TRANSACTION.COLOR)
        .setFontWeight(styles.HEADER_STYLES.FONT_WEIGHT)
        .setFontSize(styles.HEADER_STYLES.FONT_SIZE)
        .setHorizontalAlignment(styles.BASE.ALIGNMENT);
      sheet.getRange(config.SECTIONS.HISTORY.RANGE).merge()
        .setValue(config.SECTIONS.HISTORY.TITLE)
        .setBackground(config.SECTIONS.HISTORY.COLOR)
        .setFontWeight(styles.HEADER_STYLES.FONT_WEIGHT)
        .setFontSize(styles.HEADER_STYLES.FONT_SIZE)
        .setHorizontalAlignment(styles.BASE.ALIGNMENT);}
    setupTransactionControls(sheet) {
      const cells = CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS;
      const controls = CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.CONTROLS;
      const styles = CONFIG.UI.STYLES.BASE;
      sheet.getRange(controls.TEAM.LABEL_CELL).setValue(controls.TEAM.LABEL_TEXT);
      sheet.getRange(controls.TEAM.VALUE_CELL)
        .setBackground(CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.CONTROL_BACKGROUND);
      sheet.getRange(controls.DROP.LABEL_CELL).setValue(controls.DROP.LABEL_TEXT);
      sheet.getRange(controls.DROP.VALUE_CELL)
        .setBackground(CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.CONTROL_BACKGROUND);
      sheet.getRange(controls.ADD.LABEL_CELL).setValue(controls.ADD.LABEL_TEXT);
      sheet.getRange(controls.ADD.VALUE_CELL)
        .setBackground(CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.CONTROL_BACKGROUND);
      sheet.getRange(controls.SUBMIT.RANGE).merge()
        .setValue(controls.SUBMIT.TEXT)
        .setBackground(controls.SUBMIT.BACKGROUND)
        .setFontColor(controls.SUBMIT.FONT_COLOR)
        .setHorizontalAlignment(styles.ALIGNMENT);
      sheet.getRange(controls.CONFIRM.RANGE).merge()
        .setValue(controls.CONFIRM.TEXT)
        .setBackground(controls.CONFIRM.BACKGROUND)
        .setFontColor(controls.CONFIRM.FONT_COLOR)
        .setHorizontalAlignment(styles.ALIGNMENT);
      const checkboxValidation = SpreadsheetApp.newDataValidation()
        .requireCheckbox()
        .build();
      sheet.getRange(cells.SUBMIT).setDataValidation(checkboxValidation);
      sheet.getRange(cells.CONFIRM).setDataValidation(checkboxValidation);}
    setupTransactionSummary(sheet) {
      const summary = CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.SUMMARY;
      sheet.getRange(summary.RANGE).merge()
        .setValue(summary.DEFAULT_TEXT)
        .setFontStyle(summary.FONT_STYLE)
        .setFontColor(summary.FONT_COLOR);}
    setupQueryFilters(sheet, config) {
        const filters = config.FILTERS;
        const styles = CONFIG.UI.STYLES.BASE;
        sheet.getRange(filters.SORT_BY.LABEL_CELL)
            .setValue(filters.SORT_BY.LABEL_TEXT)
            .setBackground("#ffffff")
            .setFontColor("#000000")
            .setFontWeight("bold")
            .setFontSize(12)
            .setHorizontalAlignment("left");
        sheet.getRange(filters.SORT_BY.VALUE_CELL)
            .setDataValidation(
                SpreadsheetApp.newDataValidation()
                    .requireValueInList(filters.SORT_BY.OPTIONS)
                    .build())
            .setValue(filters.SORT_BY.DEFAULT)
            .setBackground("#ffffff")
            .setFontColor(CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD)
            .setFontWeight("bold")
            .setFontSize(12)
            .setHorizontalAlignment("left");
        sheet.getRange(filters.CONFERENCE.LABEL_CELL)
            .setValue(filters.CONFERENCE.LABEL_TEXT)
            .setBackground("#ffffff")
            .setFontColor("#000000")
            .setFontWeight("bold")
            .setFontSize(12)
            .setHorizontalAlignment("left");
        sheet.getRange(filters.CONFERENCE.VALUE_CELL)
            .setDataValidation(
                SpreadsheetApp.newDataValidation()
                    .requireValueInList(filters.CONFERENCE.OPTIONS)
                    .build())
            .setValue(filters.CONFERENCE.DEFAULT)
            .setBackground("#ffffff")
            .setFontColor(CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD)
            .setFontWeight("bold")
            .setFontSize(12)
            .setHorizontalAlignment("left");
        sheet.getRange(filters.MIN_POINTS.LABEL_CELL)
            .setValue(filters.MIN_POINTS.LABEL_TEXT)
            .setBackground("#ffffff")
            .setFontColor("#000000")
            .setFontWeight("bold")
            .setFontSize(12)
            .setHorizontalAlignment("left");
        sheet.getRange(filters.MIN_POINTS.VALUE_CELL)
            .setValue(filters.MIN_POINTS.DEFAULT)
            .setBackground("#ffffff")
            .setFontColor(CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD)
            .setFontWeight("bold")
            .setFontSize(12)
            .setHorizontalAlignment("left");
        sheet.getRange(filters.FILTERS_LABEL.CELL)
            .setValue(filters.FILTERS_LABEL.TEXT)
            .setBackground("#ffffff")
            .setFontColor("#000000")
            .setFontWeight("bold")
            .setFontSize(12)
            .setHorizontalAlignment("left");
        const checkboxValidation = SpreadsheetApp.newDataValidation()
            .requireCheckbox()
            .build();
        sheet.getRange(filters.RANKED_ONLY.LABEL_CELL)
            .setValue(filters.RANKED_ONLY.LABEL_TEXT)
            .setBackground("#ffffff")
            .setFontColor("#000000")
            .setFontWeight("bold")
            .setFontSize(12)
            .setHorizontalAlignment("left");
        sheet.getRange(filters.RANKED_ONLY.CHECKBOX_CELL)
            .setDataValidation(checkboxValidation)
            .setValue(false)
            .setBackground("#ffffff")
            .setFontSize(12)
            .setFontColor(CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD);
        sheet.getRange(filters.AVAILABLE_ONLY.LABEL_CELL)
            .setValue(filters.AVAILABLE_ONLY.LABEL_TEXT)
            .setBackground("#ffffff")
            .setFontColor("#000000")
            .setFontWeight("bold")
            .setFontSize(12)
            .setHorizontalAlignment("left");
        sheet.getRange(filters.AVAILABLE_ONLY.CHECKBOX_CELL)
            .setDataValidation(checkboxValidation)
            .setValue(false)
            .setBackground("#ffffff")
            .setFontSize(12)
            .setFontColor(CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD);}
    setupTransactionHistory(sheet) {
        const history = CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.HISTORY_SUB_HEADERS;
        const styles = CONFIG.UI.STYLES.BASE;
        sheet.getRange(
            history.START_ROW, 
            history.START_COL, 
            1, 
            history.VALUES.length)
            .setValues([history.VALUES])
            .setBackground(CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD)
            .setFontColor(CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT)
            .setFontWeight("bold")
            .setFontSize(12)
            .setHorizontalAlignment(styles.ALIGNMENT);
        const lastRow = sheet.getMaxRows();
        if (lastRow > 3) {
            const historyDataArea = sheet.getRange(
                6,  // Start at row 4 (after headers)
                10, // Column J (history starts here)
                lastRow - 3, // All rows after headers
                6);
            historyDataArea
                .setBackground(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND)
                .setFontColor("#000000")
                .setFontWeight("bold");}}
    setupVisualSeparators(sheet, config) {
      sheet.getRange(config.SEPARATORS.COLUMN_1)
        .setBackground(config.SEPARATORS.COLOR);
      sheet.getRange(config.SEPARATORS.COLUMN_2)
        .setBackground(config.SEPARATORS.COLOR);
      sheet.getRange(config.SEPARATORS.COLUMN_3)
        .setBackground(config.SEPARATORS.COLOR);}
    async createTransactionDataHelper() {
      const ss = this.ss;
      const helperName = CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.RESULTS.HELPER_SHEET;
      let dataSheet = ss.getSheetByName(helperName);
      if (!dataSheet) {
        dataSheet = ss.insertSheet(helperName);
        dataSheet.hideSheet();}
      const headers = [
        "Selections Left", "School", "Rank", "Conference", 
        "Conf Rank", "Record", "Points", "Wins", "Losses"];
      dataSheet.getRange(1, 1, 1, headers.length).setValues([headers]);}
    setupMasterQuery(sheet, config) {
        const results = config.RESULTS;
        const filters = config.FILTERS;
        const styles = CONFIG.UI.STYLES.BASE;
        sheet.getRange(results.HEADER_RANGE).merge()
            .setValue(results.HEADER_TEXT)
            .setFontSize(12)
            .setFontColor(CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT)
            .setBackground(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT)
            .setFontWeight("bold");
        const queryFormula = this.buildQueryFormula(filters, results);
        sheet.getRange(results.QUERY_CELL).setFormula(queryFormula);
        sheet.getRange("C9:C").setNumberFormat('#;-#;""');
        sheet.getRange(results.RESULT_HEADER_RANGE)
            .setFontSize(12)
            .setBackground(CONFIG.SETUP.VISUAL.COLORS.USER)
            .setFontWeight("bold");
        results.CENTER_ALIGN_COLUMNS.forEach(col => {
            const columnLetter = Utils.columnToLetter(col);
            sheet.getRange(`${columnLetter}9:${columnLetter}`)
                .setHorizontalAlignment("center");});
        sheet.getRange(results.HEADER_RANGE).setNote(results.NOTE_TEXT);}
    buildQueryFormula(filters, results) {
        return `=IFERROR(
            QUERY(
                {TransactionData!A:E, ARRAYFORMULA(TransactionData!H:H&"-"&TransactionData!I:I), TransactionData!G:G, TransactionData!H:H},
                "SELECT Col1, Col2, Col3, Col4, Col5, Col6, Col7 WHERE Col2 IS NOT NULL" &
                IF(${filters.CONFERENCE.VALUE_CELL}="${filters.CONFERENCE.DEFAULT}", "", " AND Col4 = '"&${filters.CONFERENCE.VALUE_CELL}&"'") &
                IF(${filters.MIN_POINTS.VALUE_CELL}=${filters.MIN_POINTS.DEFAULT}, "", " AND Col7 >= "&${filters.MIN_POINTS.VALUE_CELL}) &
                IF(${filters.RANKED_ONLY.CHECKBOX_CELL}=FALSE, "", " AND Col3 > 0") &
                IF(${filters.AVAILABLE_ONLY.CHECKBOX_CELL}=FALSE, "", " AND Col1 > 0") &
                " ORDER BY " &
                SWITCH(${filters.SORT_BY.VALUE_CELL},
                    "` + filters.SORT_BY.OPTIONS[0] + `", "Col7 DESC",
                    "` + filters.SORT_BY.OPTIONS[1] + `", "Col7 ASC",
                    "` + filters.SORT_BY.OPTIONS[2] + `", "Col2 ASC",
                    "` + filters.SORT_BY.OPTIONS[3] + `", "Col2 DESC",
                    "` + filters.SORT_BY.OPTIONS[4] + `", "Col8 DESC, Col7 DESC",
                    "` + filters.SORT_BY.OPTIONS[5] + `", "Col8 ASC, Col7 ASC",
                    "` + filters.SORT_BY.OPTIONS[6] + `", "Col4 ASC, Col5 ASC",
                    "Col7 DESC"),
                1),
            "${results.ERROR_MESSAGE}")`;}
    async populateInitialTransactionData(sheet) {
      await updateTransactionLogInfo();
      await this.updateTransactionDataHelper();}
    async updateTransactionDataHelper() {
      const ss = this.ss;
      const helperSheet = ss.getSheetByName(
        CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.RESULTS.HELPER_SHEET);
      const transactionSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME);
      if (!helperSheet || !transactionSheet) {
        console.log("Helper or Transaction sheet not found, skipping update");
        return;}
      const lastRow = transactionSheet.getLastRow();
      if (lastRow < 2) {
        console.log("No data in transaction sheet to copy");
        return;}
      const sourceRange = transactionSheet.getRange(2, 1, lastRow - 1, 7);
      const targetRange = helperSheet.getRange(2, 1, lastRow - 1, 7);
      const existingLastRow = helperSheet.getLastRow();
      if (existingLastRow > 1) {
        helperSheet.getRange(2, 1, existingLastRow - 1, 7).clearContent();}
      targetRange.setValues(sourceRange.getValues());}
    setupTransactionLogValidations(sheet) {
        const checkboxValidation = SpreadsheetApp.newDataValidation()
            .requireCheckbox()
            .build();
        sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.SUBMIT)
            .setDataValidation(checkboxValidation);
        sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.CONFIRM)
            .setDataValidation(checkboxValidation);}
    setupTrackerValidations(sheet) {
        console.log("Setting up tracker validations...");
        try {
            const teamCount = Utils.getTeamCount();
            console.log("Retrieved team count from settings:", teamCount);
            const checkboxValidation = SpreadsheetApp.newDataValidation()
                .requireCheckbox()
                .build();
            console.log("Setting up Start Draft validation...");
            sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.START_DRAFT)
                .setDataValidation(checkboxValidation)
                .setValue(false);
            if (teamCount > 0) {
                const schoolsList = Utils.getSchoolNames().map(row => row[0]);
                const validation = SpreadsheetApp.newDataValidation()
                    .requireValueInList(schoolsList)
                    .build();
                const startCol = CONFIG.SHEETS.STRUCTURE.COLUMNS.TRACKER.TEAM_START;
                const firstCell = sheet.getRange(
                    CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW,
                    startCol);
                firstCell.setDataValidation(validation);}
            console.log("Tracker validations setup completed");
            return teamCount;
        } catch (error) {
            console.error("Error in setupTrackerValidations:", error);
            throw error;}}
    setupTrackerInitialData(sheet) {
        console.log("Setting up tracker initial data...");
        try {
            const columnsConfig = CONFIG.SHEETS.STRUCTURE.COLUMNS.TRACKER;
            const settingsSheet = this.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
            const maxSchoolsValue = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_SCHOOL_SELECTIONS).getValue();
            const teamCount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
            const maxColumns = sheet.getMaxColumns();
            console.log("Retrieved max schools value:", maxSchoolsValue);
            console.log("Sheet has max columns:", maxColumns);
            const lastContentColumn = maxColumns - 1;
            const timerCell = sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.TIMER);
            timerCell
                .setBackground(CONFIG.UI.STYLES.BASE.BACKGROUND)  // This is the light grey (#f3f3f3)
                .setFontColor(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT)
                .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT)
                .setVerticalAlignment(CONFIG.UI.STYLES.BASE.VERTICAL_ALIGNMENT);
            sheet.getRange(4, 2, 1, 14).merge()
                .setValue(CONFIG.SETUP.CONTROLS.SETUP_START.INITIAL_LABEL)
                .setFontFamily(CONFIG.UI.STYLES.BASE.FONT_FAMILY)
                .setFontSize(16)
                .setFontColor(CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT)
                .setBackground(CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND)
                .setFontWeight(CONFIG.UI.STYLES.BASE.FONT_WEIGHT)
                .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT_RIGHT);
            sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.START_DRAFT)
                .setFontColor(CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD)
                .setBackground(CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND);
            if (lastContentColumn > 17) {
                sheet.getRange(4, 17, 1, lastContentColumn - 16).merge()
                    .setBackground(CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND)
                    .setValue("");}
            sheet.getRange(3, 2, 1, lastContentColumn - 1).merge()
                .setBackground(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT)
                .setValue("");
            const bufferColumns = this.getBufferColumns('TRACKER', sheet);
            const allBufferColumns = bufferColumns;
            allBufferColumns.forEach(col => {
                const colNum = Utils.letterToColumn(col);
                if (colNum <= sheet.getMaxColumns()) {
                    sheet.setColumnWidth(colNum, 30);}});
            sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.BUFFER_COLUMN_CELL)
                .setBackground(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT);
            const bufferColumnLetter = Utils.columnToLetter(CONFIG.SHEETS.SPECIFIC.TRACKER.BUFFER_COLUMN);
            sheet.getRange(`${bufferColumnLetter}8:${bufferColumnLetter}`)
                .setBackground(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT);
            const schoolsList = Utils.getSchoolNames();
            console.log("Retrieved school names:", schoolsList.length);
            if (schoolsList && schoolsList.length > 0) {
                const schoolsWithEligibility = schoolsList.map(([school]) => [
                    school,
                    maxSchoolsValue]);
                const dataRange = sheet.getRange(
                    CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW,
                    columnsConfig.SCHOOLS,
                    schoolsList.length,
                    2);
                dataRange.setValues(schoolsWithEligibility);
                const bufferRow = CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW + schoolsList.length;
                sheet.getRange(bufferRow, 2, 1, lastContentColumn - 1).merge()
                    .setBackground(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT)
                    .setValue("");
                sheet.setRowHeight(bufferRow, 20);
                const totalRows = sheet.getMaxRows();
                const rowsToDelete = totalRows - bufferRow;
                if (rowsToDelete > 0) {
                    sheet.deleteRows(bufferRow + 1, rowsToDelete);}}
            console.log("Tracker initial data setup completed");
            setupDraftSheetConditionalFormatting();
            console.log("Applied conditional formatting to tracker sheet");
        } catch (error) {
            console.error("Error in setupTrackerInitialData:", error);
            throw error;}}
    updateTimestamp(sheet) {
        sheet.getRange(CONFIG.SHEETS.STRUCTURE.COMMON.TIMESTAMP_CELL)
            .setValue('Last Updated: ' + Utils.formatDate(new Date(), CONFIG.SYSTEM.TIME.FORMATS.TIMESTAMP));}
    getColumnWidth(header) {
        return CONFIG.SHEETS.STRUCTURE.COMMON.COLUMN_WIDTHS[
            Object.keys(CONFIG.SHEETS.STRUCTURE.COMMON.COLUMN_WIDTHS).find(key => 
                header.toUpperCase().includes(key.toUpperCase()))
        ] || CONFIG.SHEETS.STRUCTURE.COMMON.COLUMN_WIDTHS.DEFAULT;}
    async verifySheetSetup(sheet, type) {
        if (!sheet || !type) {
            throw new Error("Invalid sheet or type for verification");}
        if (type === 'TRANSACTION') {
            console.log("Verifying Transaction sheet with combined UI layout");
            const config = CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI;
            const researchHeader = sheet.getRange(config.SECTIONS.RESEARCH.RANGE).getValue();
            const transactionHeader = sheet.getRange(config.TRANSACTION_HEADER.RANGE).getValue();
            const historyHeader = sheet.getRange(config.SECTIONS.HISTORY.RANGE).getValue();
            if (researchHeader !== config.SECTIONS.RESEARCH.TITLE ||
                transactionHeader !== config.TRANSACTION_HEADER.TITLE ||
                historyHeader !== config.SECTIONS.HISTORY.TITLE) {
                throw new Error("Combined UI headers not properly set up in Transaction sheet");}
            console.log("Transaction sheet combined UI verified successfully");
            return true;}
        if (type === 'LEADERBOARD') {
            const headers = CONFIG.SHEETS.SPECIFIC.LEADERBOARD.REQUIRED_COLUMNS;
            const actualHeaders = [];
            for (let i = 0; i < headers.length; i++) {
                actualHeaders.push(sheet.getRange(1, i + 1).getValue());}
            const headerMatch = headers.every((header, index) => actualHeaders[index] === header);
            if (!headerMatch) {
                console.error(`Header mismatch in ${type} sheet. Got:`, actualHeaders);
                console.error('Expected:', headers);}
            return true;}
        const headers = CONFIG.SHEETS.SPECIFIC[type]?.REQUIRED_COLUMNS;
        if (!headers) {
            return true;}
        const headerRow = type === 'LIVE' 
            ? CONFIG.SHEETS.SPECIFIC.LIVE.HEADER_ROW 
            : CONFIG.SHEETS.STRUCTURE.COMMON.HEADER_ROW;
        const actualHeaders = [];
        for (let i = 0; i < headers.length; i++) {
            actualHeaders.push(sheet.getRange(headerRow, i + 1).getValue());}
        const headerMatch = headers.every((header, index) => actualHeaders[index] === header);
        if (!headerMatch) {
            console.error(`Header mismatch in ${type} sheet. Expected:`, headers, "Got:", actualHeaders);
            throw new Error(`Header mismatch in ${type} sheet`);}
        switch(type) {
            case 'LIVE':
            case 'TEAMS':
                return this.verifyEmptySheet(sheet, type);
            default:
                return true;}}
    verifyEmptySheet(sheet, type) {
        const config = CONFIG.SHEETS.SPECIFIC[type];
        const headers = config.REQUIRED_COLUMNS;
        const headerRow = type === 'LIVE' ? config.HEADER_ROW : CONFIG.SHEETS.STRUCTURE.COMMON.HEADER_ROW;
        const actualHeaders = sheet.getRange(headerRow, 1, 1, headers.length).getValues()[0];
        return headers.every((header, index) => actualHeaders[index] === header);}
    async verifyInitialization() {
        for (const sheetType of this.initializationOrder) {
            if (!this.initialized[sheetType]) {
                throw new Error(`${sheetType} sheet failed to initialize`);}
            const sheet = this.sheets[sheetType];
            if (!sheet) {
                throw new Error(`${sheetType} sheet not found after initialization`);}}
        return true;}
    getSheet(sheetType) {
        return this.sheets[sheetType];}
    isSheetInitialized(sheetType) {
        return this.initialized[sheetType] === true;}
    validatePointsCalculatorSetup() {
        const sheet = this.getPointsCalculatorSheet();
        if (!sheet) {
            console.error("Points Calculator sheet not found");
            return false;}
        try {
            const schoolsRange = `${CONFIG.SHEETS.SPECIFIC.POINTS.SCHOOLS_RANGE.START}:${CONFIG.SHEETS.SPECIFIC.POINTS.SCHOOLS_RANGE.END}`;
            const schoolsCount = sheet.getRange(schoolsRange).getValues().filter(row => row[0] !== "").length;
            if (schoolsCount !== Utils.getSchoolNames().length) {
                console.error("Schools list is incomplete or invalid");
                return false;}
            return true;
        } catch (error) {
            console.error("Error validating Points Calculator setup:", error);
            return false;}}
    getPointsCalculatorSheet() {
        return this.getSheet('POINTS_CALCULATOR');}
    resetPointsCalculator() {
        try {
            const sheet = this.getPointsCalculatorSheet();
            if (!sheet) {
                throw new Error("Points Calculator sheet not found");}
            const resultsRange = `${CONFIG.SHEETS.SPECIFIC.POINTS.RESULTS_RANGE.START}:${CONFIG.SHEETS.SPECIFIC.POINTS.RESULTS_RANGE.END}`;
            sheet.getRange(resultsRange).clearContent();
            console.log("Points Calculator reset successfully");
        } catch (error) {
            console.error("Error resetting Points Calculator:", error);
            throw error;}}}
  function applyPlaceStyling(sheet, startRow, endRow, placeColumn) {
      const placeRange = sheet.getRange(startRow, placeColumn, endRow - startRow + 1, 1);
      placeRange
          .setVerticalAlignment(CONFIG.UI.STYLES.BASE.VERTICAL_ALIGNMENT)
          .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT)
          .setFontWeight(CONFIG.UI.STYLES.BASE.FONT_WEIGHT);
      const firstPlaceRule = SpreadsheetApp.newConditionalFormatRule()
          .whenNumberEqualTo(1)
          .setBackground(CONFIG.UI.COLORS.OTHER.GOLD)
          .setFontColor(CONFIG.UI.STYLES.BASE.FONT_COLOR)
          .setRanges([placeRange])
          .build();
      const secondPlaceRule = SpreadsheetApp.newConditionalFormatRule()
          .whenNumberEqualTo(2)
          .setBackground(CONFIG.UI.COLORS.OTHER.SILVER)
          .setFontColor(CONFIG.UI.STYLES.BASE.FONT_COLOR)
          .setRanges([placeRange])
          .build();
      const thirdPlaceRule = SpreadsheetApp.newConditionalFormatRule()
          .whenNumberEqualTo(3)
          .setBackground(CONFIG.UI.COLORS.OTHER.BRONZE)
          .setFontColor(CONFIG.UI.STYLES.BASE.FONT_COLOR)
          .setRanges([placeRange])
          .build();
      const lastPlaceRule = SpreadsheetApp.newConditionalFormatRule()
          .whenNumberEqualTo(endRow - startRow + 1)
          .setBackground(CONFIG.UI.COLORS.OTHER.RED)
          .setFontColor('white')  // White font for last place
          .setRanges([placeRange])
          .build();
      const rules = sheet.getConditionalFormatRules();
      rules.push(firstPlaceRule, secondPlaceRule, thirdPlaceRule, lastPlaceRule);
      sheet.setConditionalFormatRules(rules);}
  function initializeSheets() {
    if (sheetsInitialized && SHEETS && SHEETS.tracker) {
      Logger.log("Sheets already initialized, returning existing SHEETS object");
      return SHEETS;}
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const existingTracker = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TRACKER.NAME);
    const existingLog = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME);
    const existingTeams = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TEAMS.NAME);
    if (existingTracker && existingLog && existingTeams) {
      Logger.log("Found existing sheets, connecting without reinitializing");
      SHEETS = {
        ss: ss,
        tracker: existingTracker,
        log: existingLog,
        teams: existingTeams};
      sheetsInitialized = true;
      return SHEETS;}
    try {
      const sheetManager = SheetManager.getInstance();
      const sheets = sheetManager.initialize();
      SHEETS = {
        ss: ss,
        tracker: sheets[CONFIG.SHEETS.SPECIFIC.TRACKER.NAME],
        log: sheets[CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME],
        teams: sheets[CONFIG.SHEETS.SPECIFIC.TEAMS.NAME]};
      sheetsInitialized = true;
      Logger.log("Sheets initialization completed successfully");
      return SHEETS;
    } catch (error) {
      console.error("Error during sheets initialization:", error);
      sheetsInitialized = false;
      SHEETS = null;
      throw error;}}
  function clearDraftArea() {
      const tracker = SHEETS.tracker;
      const settingsSheet = SHEETS.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
      const teamCount = Utils.getTeamCount();
      const startCol = CONFIG.SHEETS.STRUCTURE.COLUMNS.TRACKER.TEAM_START;
      const numSchoolsPerTeam = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM).getValue();
      const headerRange = tracker.getRange(
          CONFIG.SHEETS.STRUCTURE.COMMON.SUB_HEADER_ROW_2,  // Updated to SUB_HEADER_ROW_2
          startCol,
          1,
          teamCount + (CONFIG.DRAFT.SETUP.TEAM_PADDING - teamCount));
      headerRange.clearContent();  // Only clears content, keeps formatting
      const draftRange = tracker.getRange(
          CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW,
          startCol,
          numSchoolsPerTeam + CONFIG.DRAFT.SETUP.EXTRA_ROWS,
          teamCount + (CONFIG.DRAFT.SETUP.TEAM_PADDING - teamCount));
      draftRange.clearContent();  // Only clears content, keeps formatting
      draftRange.clearDataValidations();}
  async function setupSheetByType(sheetType) {
    const sheetManager = SheetManager.getInstance();
    const sheetName = CONFIG.SHEETS.SPECIFIC[sheetType].NAME;
    let sheet = sheetManager.ss.getSheetByName(sheetName);
    if (!sheet) {
      console.warn(`Sheet not found for name: ${sheetName}. Creating a new sheet...`);
      sheet = sheetManager.ss.insertSheet(sheetName);}
    switch (sheetType) {
      case 'SEASON':
        await sheetManager.setupSeasonSheet(sheet);
        break;
      case 'COMPLETED':
        await sheetManager.setupCompletedSheet(sheet);
        break;
      case 'POINTS':
        await sheetManager.setupPointsSheet(sheet);
        break;
      case 'LIVE':
        await sheetManager.setupLiveScoringSheet(sheet);
        break;
      case 'TRANSACTION':
        await sheetManager.setupTransactionLogSheet(sheet);
        break;
      case 'LEADERBOARD':
        await sheetManager.setupLeaderboardSheet(sheet);
        break;
      case 'TEAMS':
        await sheetManager.setupTeamsSheet(sheet);
        break;
      default:
        console.error(`Invalid sheet type: ${sheetType}`);
        break;}}
  class UserSheetManager {
    constructor(spreadsheet) {
      this.ss = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
      this.defaultConfig = CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET;
      this.baseStyle = CONFIG.UI.STYLES.BASE;}
    setupUserSheets() {
      const defaultTemplate = this.createDefaultTemplate();
      this.createUserSheets(defaultTemplate);
      SpreadsheetApp.getActiveSpreadsheet().deleteSheet(defaultTemplate);}  
    createDefaultTemplate() {
        console.log("Creating default user template...");
        const existingSheet = this.ss.getSheetByName('Default User');
        if (existingSheet) {
            this.ss.deleteSheet(existingSheet);}
        const sheet = this.ss.insertSheet('Default User');
        this.setupSheetLayout(sheet);
        console.log("Step 1 done.");
        this.applyInitialColors(sheet);
        console.log("Step 2 done.");
        this.setStaticContent(sheet);
        console.log("Step 3 done.");
        this.mergeAllRanges(sheet);
        console.log("Step 4 done.")
        return sheet;}
    mergeAllRanges(sheet) {
        const config = this.defaultConfig;
        const allMergeRanges = [
            ...Object.values(config.BORDER),
            config.IMAGE_AREA.IMAGE_HEADER_CELL,
            config.IMAGE_AREA.LINK,
            config.IMAGE_AREA.PICTURE,
            config.TEAM_NAME.HEADER_CELL,
            config.TEAM_NAME.INFO,
            config.OWNER_NAME.HEADER_CELL,
            config.OWNER_NAME.INFO,
            config.CURRENT_POINTS.HEADER_CELL,
            config.CURRENT_POINTS.AMOUNT,
            config.CURRENT_PLACE.HEADER_CELL,
            config.CURRENT_PLACE.PLACE,
            config.CURRENT_WINNINGS.HEADER_CELL,
            config.CURRENT_WINNINGS.EARNINGS,
            config.ADD_DROP.COUNTER.COUNTER_HEADER_CELL,
            config.ADD_DROP.COUNTER.COUNTER,
            config.ADD_DROP.FINAL.FINAL_DEADLINE_HEADER_CELL,
            config.ADD_DROP.FINAL.FINAL_DEADLINE,
            config.ADD_DROP.WEEKLY.WEEKLY_DEADLINE_HEADER_CELL,
            config.ADD_DROP.WEEKLY.WEEKLY_DEADLINE];
        allMergeRanges.forEach(range => {
            if (range && range.includes(':')) {
                try {
                    sheet.getRange(range).merge();
                } catch (error) {
                    console.error(`Error merging range ${range}:`, error);}}});}
    applyInitialColors(sheet) {
        const colors = {
            borderColor: CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT,        // #154655
            headerBackground: CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND, // #925d65
            programArea: CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND,       // #E8E8E8
            actionItem: CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD,           // #ebad49
            headerFont: CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT,};
        sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.COLOR_STORAGE.BORDER_COLOR).setValue(colors.borderColor);
        sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.COLOR_STORAGE.HEADER_COLOR).setValue(colors.headerBackground);
        sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.COLOR_STORAGE.ACTION_COLOR).setValue(colors.actionItem);
        sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.COLOR_STORAGE.FONT_COLOR).setValue(colors.headerFont);
        const borderRanges = [
            'A1:AF1', 'Q2:AE2', 'B3:AE3', 'B5:C5', 'B7:C7', 'B9:C9',
            'Q4:AE10', 'B11:F11', 'I11:AE12', 'A2:A1000', 'D4:D10',
            'G4:G1000', 'AG2:AG1000'];
        const headerRanges = [
            'B2:P2', 'B4', 'E4:F4', 'I4:J4', 'E5:F5', 'I5:J5',
            'B6', 'I6:J6', 'M6:N6', 'I7:J7', 'M7:N7', 'B8',
            'I8:J8', 'B10', 'I9:J9', 'E10', 'I10:J10'];
        const actionItemRanges = ['M8:N9'];
        const specialCells = {
            'B12': { bg: colors.actionItem, font: '#000000' },        // Action background, black font
            'C12:F12': { bg: colors.programArea, font: '#000000' },   // Program area background, black font
            'K9': { bg: '#FFFFFF', font: colors.actionItem },         // White background, action font
            'F10': { bg: '#FFFFFF', font: colors.actionItem },        // White background, action font
            'K10': { bg: '#FFFFFF', font: colors.actionItem }};
        borderRanges.forEach(range => {
            try {
                sheet.getRange(range)
                    .setBackground(colors.borderColor)
                    .setFontColor(colors.headerFont);
            } catch (error) {
                console.error(`Error coloring border range ${range}:`, error);}});
        headerRanges.forEach(range => {
            try {
                sheet.getRange(range)
                    .setBackground(colors.headerBackground)
                    .setFontColor(colors.headerFont);
            } catch (error) {
                console.error(`Error coloring header range ${range}:`, error);}});
        actionItemRanges.forEach(range => {
            try {
                sheet.getRange(range)
                    .setBackground(colors.actionItem)
                    .setFontColor(colors.headerFont);
            } catch (error) {
                console.error(`Error coloring action item range ${range}:`, error);}});
        Object.entries(specialCells).forEach(([range, colors]) => {
            try {
                sheet.getRange(range)
                    .setBackground(colors.bg)
                    .setFontColor(colors.font);
            } catch (error) {
                console.error(`Error coloring special range ${range}:`, error);}});}
    setupSheetLayout(sheet) {
        const firstRowHeight = sheet.getRowHeight(1);
        sheet.insertColumns(26,7);
        sheet.setColumnWidth(1, firstRowHeight); 
        sheet.setColumnWidth(2, sheet.getColumnWidth(5) * 2);
        sheet.setColumnWidth(3, sheet.getColumnWidth(5) * 2);
        sheet.setColumnWidth(4, sheet.getColumnWidth(1) * 3);
        sheet.setColumnWidth(6, sheet.getColumnWidth(5) * 1.5);
        sheet.setColumnWidth(7, firstRowHeight);
        sheet.setColumnWidth(33, firstRowHeight);
        sheet.hideColumns(8);
        sheet.setColumnWidth(10,120);
        const lastRow = sheet.getMaxRows();
        sheet.getRange(1, 8, lastRow, 1).setBackground("white");}
    setStaticContent(sheet) {
      sheet.getRange(this.defaultConfig.SEASON_INFO.SEASON_HEADER_CELL)
          .setValue(this.defaultConfig.SEASON_INFO.SEASON_HEADER)
          .setFontWeight(this.baseStyle.FONT_WEIGHT)
          .setHorizontalAlignment(this.baseStyle.ALIGNMENT_LEFT)
          .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT);
      sheet.getRange(this.defaultConfig.CURRENT_WEEK.CURRENT_WEEK_HEADER_CELL)
          .setValue(this.defaultConfig.CURRENT_WEEK.CURRENT_WEEK_HEADER)
          .setFontWeight(this.baseStyle.FONT_WEIGHT)
          .setHorizontalAlignment(this.baseStyle.ALIGNMENT_LEFT)
          .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT);
      sheet.getRange(this.defaultConfig.NC_GAME.NC_GAME_HEADER_CELL)
          .setValue(this.defaultConfig.NC_GAME.CURRENT_WEEK_HEADER)
          .setFontWeight(this.baseStyle.FONT_WEIGHT)
          .setHorizontalAlignment(this.baseStyle.ALIGNMENT_LEFT)
          .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT);
      sheet.getRange(this.defaultConfig.HEISMAN_WINNER.HEISMAN_HEADER_CELL)
          .setValue(this.defaultConfig.HEISMAN_WINNER.HEISMAN_HEADER)
          .setFontWeight(this.baseStyle.FONT_WEIGHT)
          .setHorizontalAlignment(this.baseStyle.ALIGNMENT_LEFT)
          .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT);
      sheet.getRange(this.defaultConfig.IMAGE_AREA.IMAGE_HEADER_CELL)
          .setValue(this.defaultConfig.IMAGE_AREA.IMAGE_HEADER)
          .setFontWeight(this.baseStyle.FONT_WEIGHT)
          .setHorizontalAlignment(this.baseStyle.ALIGNMENT_LEFT)
          .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT);
      this.setTeamInfoHeaders(sheet);
      this.setProgramHeaders(sheet);
      this.setAddDropSection(sheet);
      this.setupUpdateControls(sheet);
      }
    setTeamInfoHeaders(sheet) {
      const sections = [
        this.defaultConfig.TEAM_NAME,
        this.defaultConfig.OWNER_NAME,
        this.defaultConfig.CURRENT_POINTS,
        this.defaultConfig.CURRENT_PLACE,
        this.defaultConfig.CURRENT_WINNINGS];
      sections.forEach(section => {
        sheet.getRange(section.HEADER_CELL)
            .setValue(section.HEADER)
            .setFontWeight(this.baseStyle.FONT_WEIGHT)
            .setHorizontalAlignment(this.baseStyle.ALIGNMENT_LEFT)
            .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT);});}
    setProgramHeaders(sheet) {
      const program = this.defaultConfig.PROGRAM;
      sheet.getRange(program.WEEK.WEEK_CELL).setValue(program.WEEK.WEEK_HEADER);
      sheet.getRange(program.GAME_DATE.GAME_DATE_CELL).setValue(program.GAME_DATE.GAME_DATE_HEADER);
      sheet.getRange(program.RANK.RANK_CELL).setValue(program.RANK.RANK_HEADER);
      sheet.getRange(program.OPPONENT.OPPONENT_CELL).setValue(program.OPPONENT.OPPONENT_HEADER);
      sheet.getRange(program.SCORE.SCORE_CELL).setValue(program.SCORE.SCORE_HEADER);
      const pointsHeaders = CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.REQUIRED_COLUMNS;
      const headerRange = sheet.getRange(program.TEAMS.PROGRAMS_HEADER_RANGE);
      headerRange.setValues([pointsHeaders]);
      headerRange
        .setFontFamily(this.baseStyle.FONT_FAMILY)
        .setFontSize(this.baseStyle.FONT_SIZE)
        .setFontColor(this.baseStyle.FONT_COLOR)
        .setFontWeight(this.baseStyle.FONT_WEIGHT)
        .setBackground(CONFIG.UI.COLORS.HEADER.SEASON)
        .setHorizontalAlignment(this.baseStyle.ALIGNMENT)
        .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT)
        .setWrap(this.baseStyle.WRAP);
      const totalsRange = sheet.getRange(program.TEAMS.PROGRAMS_WEEK_TOTALS_RANGE);
      totalsRange
        .setFontFamily(this.baseStyle.FONT_FAMILY)
        .setFontSize(this.baseStyle.FONT_SIZE)
        .setFontColor(this.baseStyle.FONT_COLOR)
        .setFontWeight(this.baseStyle.FONT_WEIGHT)
        .setBackground(CONFIG.UI.COLORS.HEADER.SEASON)
        .setHorizontalAlignment(this.baseStyle.ALIGNMENT)
        .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT)
        .setWrap(this.baseStyle.WRAP);}
    setAddDropSection(sheet) {
      const addDrop = this.defaultConfig.ADD_DROP;
      sheet.getRange(addDrop.COUNTER.COUNTER_HEADER_CELL)
          .setValue(addDrop.COUNTER.HEADER)
          .setBackground(CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND)
          .setFontColor(CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT)
          .setFontWeight(this.baseStyle.FONT_WEIGHT)
          .setHorizontalAlignment(this.baseStyle.ALIGNMENT_LEFT)
          .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT);
      sheet.getRange(addDrop.FINAL.FINAL_DEADLINE_HEADER_CELL)
          .setValue(addDrop.FINAL.HEADER)
          .setFontColor(CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT)
          .setBackground(CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND)
          .setFontWeight(this.baseStyle.FONT_WEIGHT)
          .setHorizontalAlignment(this.baseStyle.ALIGNMENT_LEFT)
          .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT);
      sheet.getRange(addDrop.WEEKLY.WEEKLY_DEADLINE_HEADER_CELL)
          .setValue(addDrop.WEEKLY.HEADER)
          .setBackground(CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD)
          .setFontColor(CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT)
          .setFontWeight(this.baseStyle.FONT_WEIGHT)
          .setWrap(this.baseStyle.WRAP)
          .setHorizontalAlignment(this.baseStyle.ALIGNMENT_LEFT)
          .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT);
      sheet.getRange(addDrop.COUNTER.COUNTER)
          .setHorizontalAlignment(this.baseStyle.ALIGNMENT)
          .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT);
      sheet.getRange(addDrop.FINAL.FINAL_DEADLINE)
          .setHorizontalAlignment(this.baseStyle.ALIGNMENT)
          .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT);
      sheet.getRange(addDrop.WEEKLY.WEEKLY_DEADLINE)
          .setWrap(this.baseStyle.WRAP)
          .setHorizontalAlignment(this.baseStyle.ALIGNMENT)
          .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT);}
    setDynamicContent(sheet, teamName) {
        const colorConfig = CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.COLOR_STORAGE;
        const storedColors = {
          border: sheet.getRange(colorConfig.BORDER_COLOR).getValue(),
          header: sheet.getRange(colorConfig.HEADER_COLOR).getValue(),
          action: sheet.getRange(colorConfig.ACTION_COLOR).getValue(),
          font: sheet.getRange(colorConfig.FONT_COLOR).getValue()};
        if (storedColors.border || storedColors.header || storedColors.action || storedColors.font) {
          applyUserSheetColors(sheet, storedColors);}
        const getFirstCell = (range) => {
            if (range && range.includes(':')) {
                return range.split(':')[0];}
            return range;};
        sheet.getRange('B2').setFormula('=K4').setFontSize(56).setFontColor(CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT).setWrap(true).setHorizontalAlignment('center').setVerticalAlignment('middle').setFontWeight('bold');
        const calendar = fetchCalendarData();
        const startYear = new Date(calendar.calendarStartDate).getFullYear();
        const endYear = new Date(calendar.calendarEndDate).getFullYear();
        sheet.getRange(getFirstCell(this.defaultConfig.SEASON_INFO.INFO))
            .setValue(`${startYear}-${endYear}`)
            .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT_LEFT);
        const weekManager = WeekManager.getInstance();
        sheet.getRange(this.defaultConfig.CURRENT_WEEK.INFO)
            .setValue(weekManager.getCurrentWeek())
            .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT_LEFT);
        const seasonSheet = this.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SEASON.NAME);
        const lastRow = seasonSheet.getLastRow();
        if (lastRow >= CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW) {
            const numColumns = Math.max(CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME, 21);
            const gameDataRange = seasonSheet.getRange(
                CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW,
                1,  // Start at column A
                lastRow - CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW + 1,
                numColumns);
            const gameData = gameDataRange.getValues();
            const GAME_TIME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME - 1; // Column 21 -> index 20
            const BOWL_NAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.BOWL_NAME - 1;  // Column 8 -> index 7
            const sortedGames = gameData
                .filter(row => row[GAME_TIME_INDEX]) // Make sure game has a time
                .sort((a, b) => {
                    const dateA = new Date(a[GAME_TIME_INDEX]);
                    const dateB = new Date(b[GAME_TIME_INDEX]);
                    return dateB.getTime() - dateA.getTime();});
            if (sortedGames.length > 0) {
                const championshipGame = sortedGames[0];
                const gameTime = new Date(championshipGame[GAME_TIME_INDEX]);
                if (!isNaN(gameTime.getTime()) && gameTime.getFullYear() >= 2024) {
                    const formattedDate = Utils.formatDate(gameTime, CONFIG.SYSTEM.TIME.FORMATS.FULL);
                    sheet.getRange(this.defaultConfig.NC_GAME.INFO)
                        .setValue(formattedDate)
                        .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT_LEFT);
                    console.log(`Set championship game date: ${formattedDate}`);
                } else {
                    sheet.getRange(this.defaultConfig.NC_GAME.INFO)
                        .setValue("Championship date TBD")
                        .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT_LEFT);}
            } else {
                sheet.getRange(this.defaultConfig.NC_GAME.INFO)
                    .setValue("Championship date TBD")
                    .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT_LEFT);}}
        const heismanRow = PropertiesService.getScriptProperties().getProperty('HEISMAN_ROW');
        sheet.getRange(this.defaultConfig.HEISMAN_WINNER.INFO)
            .setFormula(`=INDIRECT("Leaderboard!AQ${heismanRow}")`)
            .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT_LEFT);
        const settingsSheet = this.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
        const teamCount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
        const leaderboardDataStartRow = 6;
        const leaderboardDataEndRow = leaderboardDataStartRow + teamCount - 1;
        sheet.getRange(this.defaultConfig.CURRENT_PLACE.PLACE)
            .setFormula(`=IFERROR(INDEX(${CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME}!B${leaderboardDataStartRow}:B${leaderboardDataEndRow}, MATCH("${teamName}", ${CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME}!C${leaderboardDataStartRow}:C${leaderboardDataEndRow}, 0)), "")`)
            .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT_LEFT);
        const highPointsEnabled = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HIGH_POINTS_YES_NO).getValue() === "Yes";
        if (highPointsEnabled) {
            const moneyStart = teamCount + 8;
            sheet.getRange(this.defaultConfig.CURRENT_WINNINGS.EARNINGS)
                .setFormula(`=IFERROR(INDEX(${CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME}!${Utils.columnToLetter(CONFIG.SHEETS.STRUCTURE.COLUMNS.LEADERBOARD.TOTALS)}:${Utils.columnToLetter(CONFIG.SHEETS.STRUCTURE.COLUMNS.LEADERBOARD.TOTALS)}, MATCH("${teamName}", OFFSET(${CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME}!${Utils.columnToLetter(CONFIG.SHEETS.STRUCTURE.COLUMNS.LEADERBOARD.TEAMS)}:${Utils.columnToLetter(CONFIG.SHEETS.STRUCTURE.COLUMNS.LEADERBOARD.TEAMS)}, ${moneyStart}, 0), 0) + ${moneyStart}), 0)`)
                .setNumberFormat("$#,##0.00")
                .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT_LEFT);
        } else {
            sheet.getRange(this.defaultConfig.CURRENT_WINNINGS.EARNINGS)
                .setValue(0)
                .setNumberFormat("$#,##0.00")
                .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT_LEFT);}
        this.setAddDropDeadlines(sheet);
        this.setupWeekDropdown(sheet);
        this.setupDynamicProgramFormulas(sheet, teamName);
        const pointsCalculator = new PointsCalculator(sheet, teamName);
        pointsCalculator.calculatePoints();
        const currentPointsRange = sheet.getRange(this.defaultConfig.CURRENT_POINTS.AMOUNT);
        const currentPointsValue = currentPointsRange.getValue();
        if (typeof currentPointsValue === 'string' && currentPointsValue.includes('Points')) {
            console.error(`Current Points has invalid value: ${currentPointsValue}`);
            const totalRange = sheet.getRange(
                this.defaultConfig.PROGRAM.TEAMS.POINTS_ROW_START,
                this.defaultConfig.PROGRAM.TEAMS.TOTAL_COLUMN,
                50);
            const totalValues = totalRange.getValues();
            const teamTotalPoints = totalValues.reduce((sum, row) => {
                const value = row[0];
                return sum + (typeof value === 'number' ? value : 0);}, 0);
            currentPointsRange.setValue(teamTotalPoints);
            console.log(`Corrected Current Points to: ${teamTotalPoints}`);}        
        const addDropManager = new AddDropManager(sheet, teamName);
        addDropManager.setupAddDropInfo();}
    setAddDropDeadlines(sheet) {
      const addDrop = this.defaultConfig.ADD_DROP;
      const settingsSheet = CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME;
      if (addDrop.FINAL.FINAL_DEADLINE && addDrop.FINAL.FINAL_DEADLINE.length > 0) {
        sheet.getRange(addDrop.FINAL.FINAL_DEADLINE)
            .setFormula(`=INDIRECT("${settingsSheet}!${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.FINAL_ADD_DROP_DATE}")`);}
      if (addDrop.WEEKLY.WEEKLY_DEADLINE && addDrop.WEEKLY.WEEKLY_DEADLINE.length > 0) {
        sheet.getRange(addDrop.WEEKLY.WEEKLY_DEADLINE)
            .setValue("Weekly deadline will be calculated");}}
    setupWeekDropdown(sheet) {
      const weekOptions = [
        'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 
        'Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11', 'Week 12', 
        'Week 13', 'Week 14', 'Week 15', 'Week 16', 'Bowls'];
      const validation = SpreadsheetApp.newDataValidation()
        .requireValueInList(weekOptions)
        .build();
      const currentWeek = sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.CURRENT_WEEK.INFO).getValue();
      sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.PROGRAM.WEEK.WEEK_CELL)
        .setDataValidation(validation)
        .setValue(currentWeek)  // Default to current week, but user can change
        .setFontWeight(CONFIG.UI.STYLES.BASE.FONT_WEIGHT)
        .setBackground(CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD)
        .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT);}
    setupDynamicProgramFormulas(sheet, teamName) {
        const schoolsRange = sheet.getRange(this.defaultConfig.PROGRAM.TEAMS.PROGRAMS_SCHOOL_RANGE);
        const schools = schoolsRange.getValues().filter(row => row[0]);        
        if (schools.length === 0) return;
        const weekFormulas = [];
        const dateFormulas = [];
        const rankFormulas = [];
        const opponentFormulas = [];
        const scoreFormulas = [];
        const seasonSheet = CONFIG.SHEETS.SPECIFIC.SEASON.NAME;
        const liveSheet = CONFIG.SHEETS.SPECIFIC.LIVE.NAME;
        const completedSheet = CONFIG.SHEETS.SPECIFIC.COMPLETED.NAME;
        const weekCol = 'D';
        const dateCol = 'E';
        const timeCol = 'F';
        const bowlCol = 'H';
        const awayRankCol = 'I';
        const awayTeamCol = 'J';
        const homeRankCol = 'L';
        const homeTeamCol = 'M';
        const gameIdCol = 'B';
        const liveScoreCol = 'X';
        const completedScoreCol = 'Q';       
        schools.forEach((school, index) => {
            const row = this.defaultConfig.PROGRAM.TEAMS.POINTS_ROW_START + index;
            const schoolName = school[0];          
            if (!schoolName) {
                weekFormulas.push(['']);
                dateFormulas.push(['']);
                rankFormulas.push(['']);
                opponentFormulas.push(['']);
                scoreFormulas.push(['']);
                return;}
            weekFormulas.push([
                `=IF($${Utils.columnToLetter(this.defaultConfig.PROGRAM.TEAMS.PROGRAMS_SCHOOL_COLUMN)}${row}="","",` +
                `IF($${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL}="","No week selected",` +
                `IF(SUMPRODUCT((Teams!A:A="${teamName}")*(Teams!B:B=IF($${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL}="Bowls",16,VALUE(SUBSTITUTE($${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL},"Week ",""))))*(Teams!C:V="${schoolName}"))>0,` +
                `$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL},"Not on team")))`]);
            dateFormulas.push([
                `=IF($B${row}="Not on team","",` +
                `IF($${Utils.columnToLetter(this.defaultConfig.PROGRAM.TEAMS.PROGRAMS_SCHOOL_COLUMN)}${row}="","",` +
                `IF($${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL}="Bowls",` +
                    `IFERROR(` +
                        `LET(` +
                            `bowlDates, FILTER('${seasonSheet}'!${dateCol}:${dateCol}, ` +
                                `('${seasonSheet}'!${weekCol}:${weekCol}="Bowls")*` +
                                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"))),` +
                            `bowlTimes, FILTER('${seasonSheet}'!${timeCol}:${timeCol}, ` +
                                `('${seasonSheet}'!${weekCol}:${weekCol}="Bowls")*` +
                                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"))),` +
                            `TEXT(CHOOSEROWS(bowlDates,-1), "MM/dd/yy") & " " & ` +
                            `TEXT(CHOOSEROWS(bowlTimes,-1), "h:mm AM/PM")` +
                        `),` +
                        `"No bowl game"` +
                    `),` +
                    `IFERROR(` +
                        `TEXT(INDEX('${seasonSheet}'!${dateCol}:${dateCol},` +
                            `MATCH(1,` +
                                `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}")),` +
                                `0)` +
                        `), "MM/dd/yy") & " " & ` +
                        `TEXT(INDEX('${seasonSheet}'!${timeCol}:${timeCol},` +
                            `MATCH(1,` +
                                `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}")),` +
                                `0)` +
                        `), "h:mm AM/PM"),` +
                        `"No game this week"` +
                    `)` +
                `)))`]);
            rankFormulas.push([
                `=IF($B${row}="Not on team","",` +
                `IF($${Utils.columnToLetter(this.defaultConfig.PROGRAM.TEAMS.PROGRAMS_SCHOOL_COLUMN)}${row}="","",` +
                `IF($${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL}="Bowls",` +
                    `IFERROR(` +
                        `LET(` +
                            `awayTeams, FILTER('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}, ` +
                                `('${seasonSheet}'!${weekCol}:${weekCol}="Bowls")*` +
                                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"))),` +
                            `awayRanks, FILTER('${seasonSheet}'!${awayRankCol}:${awayRankCol}, ` +
                                `('${seasonSheet}'!${weekCol}:${weekCol}="Bowls")*` +
                                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"))),` +
                            `homeRanks, FILTER('${seasonSheet}'!${homeRankCol}:${homeRankCol}, ` +
                                `('${seasonSheet}'!${weekCol}:${weekCol}="Bowls")*` +
                                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"))),` +
                            `IF(CHOOSEROWS(awayTeams,-1)="${schoolName}", ` +
                                `CHOOSEROWS(homeRanks,-1), ` +
                                `CHOOSEROWS(awayRanks,-1))` +
                        `),` +
                        `""` +
                    `),` +
                    `IFERROR(` +
                        `IF(` +
                            `INDEX('${seasonSheet}'!${awayTeamCol}:${awayTeamCol},` +
                                `MATCH(1,` +
                                    `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                                    `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                                    `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}")),` +
                                    `0)` +
                            `)="${schoolName}",` +
                            `INDEX('${seasonSheet}'!${homeRankCol}:${homeRankCol},` +
                                `MATCH(1,` +
                                    `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                                    `('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}"),` +
                                    `0)` +
                            `),` +
                            `INDEX('${seasonSheet}'!${awayRankCol}:${awayRankCol},` +
                                `MATCH(1,` +
                                    `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                                    `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"),` +
                                    `0)` +
                            `)` +
                        `),` +
                        `""` +
                    `)` +
                `)))`]);
            opponentFormulas.push([
                `=IF($B${row}="Not on team","",` +
                `IF($${Utils.columnToLetter(this.defaultConfig.PROGRAM.TEAMS.PROGRAMS_SCHOOL_COLUMN)}${row}="","",` +
                `IF($${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL}="Bowls",` +
                    `IFERROR(` +
                        `LET(` +
                            `awayTeams, FILTER('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}, ` +
                                `('${seasonSheet}'!${weekCol}:${weekCol}="Bowls")*` +
                                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"))),` +
                            `homeTeams, FILTER('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}, ` +
                                `('${seasonSheet}'!${weekCol}:${weekCol}="Bowls")*` +
                                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"))),` +
                            `IF(CHOOSEROWS(awayTeams,-1)="${schoolName}", ` +
                                `CHOOSEROWS(homeTeams,-1), ` +
                                `CHOOSEROWS(awayTeams,-1))` +
                        `),` +
                        `""` +
                    `),` +
                    `IFERROR(` +
                        `IF(` +
                            `INDEX('${seasonSheet}'!${awayTeamCol}:${awayTeamCol},` +
                                `MATCH(1,` +
                                    `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                                    `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                                    `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}")),` +
                                    `0)` +
                                `)="${schoolName}",` +
                            `INDEX('${seasonSheet}'!${homeTeamCol}:${homeTeamCol},` +
                                `MATCH(1,` +
                                    `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                                    `('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}"),` +
                                    `0)` +
                                `),` +
                            `INDEX('${seasonSheet}'!${awayTeamCol}:${awayTeamCol},` +
                                `MATCH(1,` +
                                    `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                                    `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"),` +
                                    `0)` +
                                `)` +
                        `),` +
                        `""` +
                    `)` +
                `)))`]);
            scoreFormulas.push([
                `=IF($B${row}="Not on team","",` +
                `IF($${Utils.columnToLetter(this.defaultConfig.PROGRAM.TEAMS.PROGRAMS_SCHOOL_COLUMN)}${row}="","",` +
                `IF($${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL}="Bowls",` +
                    `IFERROR(` +
                        `LET(` +
                            `gameIds, FILTER('${seasonSheet}'!${gameIdCol}:${gameIdCol}, ` +
                                `('${seasonSheet}'!${weekCol}:${weekCol}="Bowls")*` +
                                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"))),` +
                            `gameId, CHOOSEROWS(gameIds,-1),` +
                            `IF(gameId="","",` +
                                `IF(COUNTIF('${completedSheet}'!${gameIdCol}:${gameIdCol},gameId)>0,` +
                                    `INDEX('${completedSheet}'!${completedScoreCol}:${completedScoreCol},` +
                                        `MATCH(gameId,'${completedSheet}'!${gameIdCol}:${gameIdCol},0)),` +
                                    `IF(COUNTIF('${liveSheet}'!${gameIdCol}:${gameIdCol},gameId)>0,` +
                                        `INDEX('${liveSheet}'!${liveScoreCol}:${liveScoreCol},` +
                                            `MATCH(gameId,'${liveSheet}'!${gameIdCol}:${gameIdCol},0)),` +
                                        `""` +
                                    `)` +
                                `)` +
                            `)` +
                        `),` +
                        `""` +
                    `),` +
                    `IFERROR(` +
                        `LET(gameId,` +
                            `INDEX('${seasonSheet}'!${gameIdCol}:${gameIdCol},` +
                                `MATCH(1,` +
                                    `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                                    `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                                    `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}")),` +
                                    `0)` +
                            `),` +
                            `IF(gameId="","",` +
                                `IF(COUNTIF('${completedSheet}'!${gameIdCol}:${gameIdCol},gameId)>0,` +
                                    `INDEX('${completedSheet}'!${completedScoreCol}:${completedScoreCol},` +
                                        `MATCH(gameId,'${completedSheet}'!${gameIdCol}:${gameIdCol},0)),` +
                                    `IF(COUNTIF('${liveSheet}'!${gameIdCol}:${gameIdCol},gameId)>0,` +
                                        `INDEX('${liveSheet}'!${liveScoreCol}:${liveScoreCol},` +
                                            `MATCH(gameId,'${liveSheet}'!${gameIdCol}:${gameIdCol},0)),` +
                                        `""` +
                                    `)` +
                                `)` +
                            `)` +
                        `),` +
                        `""` +
                    `)` +
                `)))`]);});
        const startRow = this.defaultConfig.PROGRAM.TEAMS.POINTS_ROW_START;
        const numRows = schools.length;
        if (numRows > 0) {
            sheet.getRange(startRow, 2, numRows, 1).setFormulas(weekFormulas);
            sheet.getRange(startRow, 3, numRows, 1).setFormulas(dateFormulas);
            sheet.getRange(startRow, 4, numRows, 1).setFormulas(rankFormulas);
            sheet.getRange(startRow, 5, numRows, 1).setFormulas(opponentFormulas);
            sheet.getRange(startRow, 6, numRows, 1).setFormulas(scoreFormulas);}
        console.log(`Batch set ${numRows * 5} formulas for ${teamName}`);}
    setupSingleSchoolFormulas(sheet, teamName, schoolName, row) {
      sheet.getRange(row, 2).setFormula(
        `=IF($${Utils.columnToLetter(this.defaultConfig.PROGRAM.TEAMS.PROGRAMS_SCHOOL_COLUMN)}${row}="","",` +
        `IF($${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL}="","No week selected",` +
        `IF(SUMPRODUCT((Teams!A:A="${teamName}")*(Teams!B:B=IF($${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL}="Bowls",16,VALUE(SUBSTITUTE($${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL},"Week ",""))))*(Teams!C:V="${schoolName}"))>0,` +
        `$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL},"Not on team")))`);

      const seasonSheet = CONFIG.SHEETS.SPECIFIC.SEASON.NAME;
      // Use hardcoded column letters matching setupDynamicProgramFormulas
      const weekCol = 'D';
      const dateCol = 'E';
      const timeCol = 'F';
      const awayTeamCol = 'J';
      const homeTeamCol = 'M';
      const awayRankCol = 'I';
      const homeRankCol = 'L';
      const gameIdCol = 'B';
      const liveScoreCol = 'X';
      const completedScoreCol = 'Q';

      // Date formula
      sheet.getRange(row, 3).setFormula(
        `=IF($B${row}="Not on team","",` +
        `IF($${Utils.columnToLetter(this.defaultConfig.PROGRAM.TEAMS.PROGRAMS_SCHOOL_COLUMN)}${row}="","",` +
        `IF($${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL}="Bowls",` +
          `IFERROR(` +
            `LET(` +
              `bowlDates, FILTER('${seasonSheet}'!${dateCol}:${dateCol}, ` +
                `('${seasonSheet}'!${weekCol}:${weekCol}="Bowls")*` +
                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"))),` +
              `bowlTimes, FILTER('${seasonSheet}'!${timeCol}:${timeCol}, ` +
                `('${seasonSheet}'!${weekCol}:${weekCol}="Bowls")*` +
                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"))),` +
              `TEXT(CHOOSEROWS(bowlDates,-1), "MM/dd/yy") & " " & ` +
              `TEXT(CHOOSEROWS(bowlTimes,-1), "h:mm AM/PM")` +
            `),` +
            `"No bowl game"` +
          `),` +
          `IFERROR(` +
            `TEXT(INDEX('${seasonSheet}'!${dateCol}:${dateCol},` +
              `MATCH(1,` +
                `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}")),` +
                `0)` +
            `), "MM/dd/yy") & " " & ` +
            `TEXT(INDEX('${seasonSheet}'!${timeCol}:${timeCol},` +
              `MATCH(1,` +
                `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}")),` +
                `0)` +
            `), "h:mm AM/PM"),` +
            `"No game this week"` +
          `)` +
        `)))`);

      // Rank formula
      sheet.getRange(row, 4).setFormula(
        `=IF($B${row}="Not on team","",` +
        `IF($${Utils.columnToLetter(this.defaultConfig.PROGRAM.TEAMS.PROGRAMS_SCHOOL_COLUMN)}${row}="","",` +
        `IF($${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL}="Bowls",` +
          `IFERROR(` +
            `LET(` +
              `awayTeams, FILTER('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}, ` +
                `('${seasonSheet}'!${weekCol}:${weekCol}="Bowls")*` +
                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"))),` +
              `awayRanks, FILTER('${seasonSheet}'!${awayRankCol}:${awayRankCol}, ` +
                `('${seasonSheet}'!${weekCol}:${weekCol}="Bowls")*` +
                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"))),` +
              `homeRanks, FILTER('${seasonSheet}'!${homeRankCol}:${homeRankCol}, ` +
                `('${seasonSheet}'!${weekCol}:${weekCol}="Bowls")*` +
                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"))),` +
              `IF(CHOOSEROWS(awayTeams,-1)="${schoolName}", ` +
                `CHOOSEROWS(homeRanks,-1), ` +
                `CHOOSEROWS(awayRanks,-1))` +
            `),` +
            `""` +
          `),` +
          `IFERROR(` +
            `IF(` +
              `INDEX('${seasonSheet}'!${awayTeamCol}:${awayTeamCol},` +
                `MATCH(1,` +
                  `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                  `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                  `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}")),` +
                  `0)` +
              `)="${schoolName}",` +
              `INDEX('${seasonSheet}'!${homeRankCol}:${homeRankCol},` +
                `MATCH(1,` +
                  `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                  `('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}"),` +
                  `0)` +
              `),` +
              `INDEX('${seasonSheet}'!${awayRankCol}:${awayRankCol},` +
                `MATCH(1,` +
                  `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                  `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"),` +
                  `0)` +
              `)` +
            `),` +
            `""` +
          `)` +
        `)))`);

      // Opponent formula
      sheet.getRange(row, 5).setFormula(
        `=IF($B${row}="Not on team","",` +
        `IF($${Utils.columnToLetter(this.defaultConfig.PROGRAM.TEAMS.PROGRAMS_SCHOOL_COLUMN)}${row}="","",` +
        `IF($${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL}="Bowls",` +
          `IFERROR(` +
            `LET(` +
              `awayTeams, FILTER('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}, ` +
                `('${seasonSheet}'!${weekCol}:${weekCol}="Bowls")*` +
                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"))),` +
              `homeTeams, FILTER('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}, ` +
                `('${seasonSheet}'!${weekCol}:${weekCol}="Bowls")*` +
                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"))),` +
              `IF(CHOOSEROWS(awayTeams,-1)="${schoolName}", ` +
                `CHOOSEROWS(homeTeams,-1), ` +
                `CHOOSEROWS(awayTeams,-1))` +
            `),` +
            `""` +
          `),` +
          `IFERROR(` +
            `IF(` +
              `INDEX('${seasonSheet}'!${awayTeamCol}:${awayTeamCol},` +
                `MATCH(1,` +
                  `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                  `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                  `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}")),` +
                  `0)` +
                `)="${schoolName}",` +
              `INDEX('${seasonSheet}'!${homeTeamCol}:${homeTeamCol},` +
                `MATCH(1,` +
                  `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                  `('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}"),` +
                  `0)` +
              `),` +
              `INDEX('${seasonSheet}'!${awayTeamCol}:${awayTeamCol},` +
                `MATCH(1,` +
                  `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                  `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"),` +
                  `0)` +
              `)` +
            `),` +
            `""` +
          `)` +
        `)))`);

      // Score formula
      const liveSheet = CONFIG.SHEETS.SPECIFIC.LIVE.NAME;
      const completedSheet = CONFIG.SHEETS.SPECIFIC.COMPLETED.NAME;
      
      const scoreFormula = 
        `=IF($B${row}="Not on team","",` +
        `IF($${Utils.columnToLetter(this.defaultConfig.PROGRAM.TEAMS.PROGRAMS_SCHOOL_COLUMN)}${row}="","",` +
        `IF($${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL}="Bowls",` +
          `IFERROR(` +
            `LET(` +
              `gameIds, FILTER('${seasonSheet}'!${gameIdCol}:${gameIdCol}, ` +
                `('${seasonSheet}'!${weekCol}:${weekCol}="Bowls")*` +
                `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}"))),` +
              `gameId, CHOOSEROWS(gameIds,-1),` +
              `IF(gameId="","",` +
                `IF(COUNTIF('${completedSheet}'!${gameIdCol}:${gameIdCol},gameId)>0,` +
                  `INDEX('${completedSheet}'!${completedScoreCol}:${completedScoreCol},` +
                    `MATCH(gameId,'${completedSheet}'!${gameIdCol}:${gameIdCol},0)),` +
                  `IF(COUNTIF('${liveSheet}'!${gameIdCol}:${gameIdCol},gameId)>0,` +
                    `INDEX('${liveSheet}'!${liveScoreCol}:${liveScoreCol},` +
                      `MATCH(gameId,'${liveSheet}'!${gameIdCol}:${gameIdCol},0)),` +
                    `""` +
                  `)` +
                `)` +
              `)` +
            `),` +
            `""` +
          `),` +
          `IFERROR(` +
            `LET(gameId,` +
              `INDEX('${seasonSheet}'!${gameIdCol}:${gameIdCol},` +
                `MATCH(1,` +
                  `('${seasonSheet}'!${weekCol}:${weekCol}=$${this.defaultConfig.PROGRAM.WEEK.WEEK_CELL})*` +
                  `(('${seasonSheet}'!${awayTeamCol}:${awayTeamCol}="${schoolName}")+` +
                  `('${seasonSheet}'!${homeTeamCol}:${homeTeamCol}="${schoolName}")),` +
                  `0)` +
              `),` +
              `IF(gameId="","",` +
                `IF(COUNTIF('${completedSheet}'!${gameIdCol}:${gameIdCol},gameId)>0,` +
                  `INDEX('${completedSheet}'!${completedScoreCol}:${completedScoreCol},` +
                    `MATCH(gameId,'${completedSheet}'!${gameIdCol}:${gameIdCol},0)),` +
                  `IF(COUNTIF('${liveSheet}'!${gameIdCol}:${gameIdCol},gameId)>0,` +
                    `INDEX('${liveSheet}'!${liveScoreCol}:${liveScoreCol},` +
                      `MATCH(gameId,'${liveSheet}'!${gameIdCol}:${gameIdCol},0)),` +
                    `""` +
                  `)` +
                `)` +
              `)` +
            `),` +
            `""` +
          `)` +
        `)))`;
      
      sheet.getRange(row, 6).setFormula(scoreFormula);
    }
    setupUpdateControls(sheet) {
      const config = this.defaultConfig.UPDATE_CONTROLS;
      sheet.getRange(config.TEAM_NAME_LABEL).merge()
        .setValue(config.TEAM_NAME_LABEL_TEXT)
        .setFontWeight(this.baseStyle.FONT_WEIGHT)
        .setHorizontalAlignment(this.baseStyle.ALIGNMENT_RIGHT)
        .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT);
      sheet.getRange(config.TEAM_NAME_CHECKBOX)
        .insertCheckboxes()
        .setValue(false);
      sheet.getRange(config.COLORS_LABEL).merge()
        .setValue(config.COLORS_LABEL_TEXT)
        .setFontWeight(this.baseStyle.FONT_WEIGHT)
        .setHorizontalAlignment(this.baseStyle.ALIGNMENT_RIGHT)
        .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT);
      sheet.getRange(config.COLORS_CHECKBOX)
        .insertCheckboxes()
        .setValue(false);
      sheet.getRange(config.IMAGE_LABEL)
        .setValue(config.IMAGE_LABEL_TEXT)
        .setFontWeight(this.baseStyle.FONT_WEIGHT)
        .setHorizontalAlignment(this.baseStyle.ALIGNMENT_RIGHT)
        .setVerticalAlignment(this.baseStyle.VERTICAL_ALIGNMENT);
      sheet.getRange(config.IMAGE_CHECKBOX)
        .insertCheckboxes()
        .setValue(false);
    }
    createUserSheets(template) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
        if (!settingsSheet) {
            throw new Error(`Settings sheet '${CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME}' not found`);}
        const teamCount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
        if (!teamCount || teamCount < 1) {
            throw new Error("Invalid team count");}
        const teamNamesRange = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START)
            .offset(0, 0, teamCount, 1);
        const teamNames = teamNamesRange.getValues()
            .map(row => row[0])
            .filter(Boolean);
        console.log(`Found ${teamNames.length} teams to process`);
        teamNames.forEach(teamName => {
            console.log(`Processing team: ${teamName}`);
            const existingSheet = this.ss.getSheetByName(teamName);
            if (existingSheet) {
                try {
                    this.ss.deleteSheet(existingSheet);
                } catch (error) {
                    console.error(`Error deleting existing sheet ${teamName}:`, error);}}
            const userSheet = template.copyTo(this.ss);
            try {
                userSheet.setName(teamName);
            } catch (error) {
                console.error(`Error naming sheet ${teamName}:`, error);
                // If we can't name it, delete it and skip
                this.ss.deleteSheet(userSheet);
                return;}
            try {
                this.populateUserSpecificDataSafe(userSheet, teamName);
            } catch (error) {
                console.error(`Error populating data for ${teamName}:`, error);}});}
    getTeamNames(settingsSheet, teamCount) {
      const startCell = CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START;
      const [startColumn, startRow] = startCell.match(/([A-Z]+)(\d+)/).slice(1);
      return settingsSheet
        .getRange(`${startColumn}${startRow}:${startColumn}${parseInt(startRow) + teamCount - 1}`)
        .getValues()
        .map(row => row[0])
        .filter(Boolean);}
    populateUserSpecificDataSafe(sheet, teamName) {
        const settingsSheet = this.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
        const teamCount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
        const teamNamesStartCell = CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START;
        const ownerNamesStartCell = CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OWNER_NAMES_START;
        const teamNames = settingsSheet.getRange(`${teamNamesStartCell}:${teamNamesStartCell}`).offset(0, 0, teamCount, 1).getValues();
        const ownerNames = settingsSheet.getRange(`${ownerNamesStartCell}:${ownerNamesStartCell}`).offset(0, 0, teamCount, 1).getValues();
        const teamIndex = teamNames.findIndex(row => row[0] === teamName);
        if (teamIndex !== -1) {
            const getFirstCell = (range) => {
                if (range.includes(':')) {
                    return range.split(':')[0];}
                return range;};
            try {
                const teamNameCell = getFirstCell(this.defaultConfig.TEAM_NAME.INFO);
                sheet.getRange(teamNameCell)
                    .setValue(teamName)
                    .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT_LEFT);
            } catch (error) {
                console.error(`Error setting team name for ${teamName}:`, error);}
            try {
                const ownerNameCell = getFirstCell(this.defaultConfig.OWNER_NAME.INFO);
                sheet.getRange(ownerNameCell)
                    .setValue(ownerNames[teamIndex][0])
                    .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT_LEFT);
            } catch (error) {
                console.error(`Error setting owner name for ${teamName}:`, error);}}
        const teamsSheet = this.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TEAMS.NAME);
        if (teamsSheet) {
            const teamData = teamsSheet.getDataRange().getValues();
            const allTeamRows = teamData.filter(row => row[0] === teamName);
            const uniqueSchools = [];
            const schoolSet = new Set();
            
            // Collect all unique schools across all weeks, preserving order
            allTeamRows.forEach(row => {
                const schools = row.slice(2).filter(Boolean);
                schools.forEach(school => {
                    if (!schoolSet.has(school)) {
                        schoolSet.add(school);
                        uniqueSchools.push(school);
                    }
                });
            });
            
            // Now use uniqueSchools instead of teamData
            if (uniqueSchools.length > 0) {
                const schools = uniqueSchools; // Use our collected unique schools
                const startRow = this.defaultConfig.PROGRAM.TEAMS.POINTS_ROW_START;
                const schoolColumn = this.defaultConfig.PROGRAM.TEAMS.PROGRAMS_SCHOOL_COLUMN;
                const conferenceColumn = 10; // Column J - NEW CONFERENCE COLUMN
                const slotColumn = this.defaultConfig.PROGRAM.TEAMS.HIDDEN_COLUMN;
                schools.forEach((school, index) => {
                    if (school) {
                        const row = startRow + index;
                        try {
                            sheet.getRange(row, schoolColumn).setValue(school);
                            
                            // ADD THIS: Set the conference for this school
                            const conference = SCHOOLS.find(s => s[0] === school)?.[3] || '';
                            sheet.getRange(row, conferenceColumn).setValue(conference);
                            
                            sheet.getRange(row, slotColumn).setValue(index + 1);
                        } catch (error) {
                            console.error(`Error setting school ${school} at row ${row}:`, error);}}});}}
        try {
            const programManager = new ProgramManager(sheet, teamName);
            programManager.sortProgramArea();
            console.log(`Sorted program area for ${teamName}`);
        } catch (error) {
            console.error(`Error sorting program area for ${teamName}:`, error);
        }        
        try {
            this.setDynamicContent(sheet, teamName);
        } catch (error) {
            console.error(`Error in setDynamicContent for ${teamName}:`, error);}
        try {
            setupUserSheetConditionalFormatting(sheet);
        } catch (error) {
            console.error(`Error applying conditional formatting for ${teamName}:`, error);}
    }
  }
  class PointsCalculator {
      constructor(userSheet, teamName) {
          this.sheet = userSheet;
          this.teamName = teamName;
          this.config = CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.PROGRAM.TEAMS;
          this.weekManager = new WeekManager();}
      calculatePoints() {
          console.time(`calculatePoints for ${this.teamName}`);
          const schoolRange = this.sheet.getRange(this.config.PROGRAMS_SCHOOL_RANGE);
          const schools = schoolRange.getValues().filter(row => row[0]);
          
          if (schools.length === 0) return;
          
          const currentWeek = this.weekManager.getCurrentWeek();
          // FIX: Use consistent week numbering
          // During Bowls, we're past week 16 but still scoring bowl games
          // The points columns go: Week 1-16 (cols 1-16), then Bowl Appearance (17), 
          // Heisman (18), Bowl Scores (19), Playoff (20), Championship (21)
          // During Bowls phase, we should show all 16 regular weeks plus bowl-related columns
          const currentWeekNum = currentWeek === 'Bowls' || currentWeek === 'CFP' ? 
                                21 : parseInt(currentWeek.replace('Week ', ''));
          
          console.log(`calculatePoints: currentWeek=${currentWeek}, currentWeekNum=${currentWeekNum}`);
          
          const pointsSheet = SpreadsheetApp.getActiveSpreadsheet()
              .getSheetByName(CONFIG.SHEETS.SPECIFIC.POINTS.NAME);
          const pointsData = this.prefetchPointsData(pointsSheet);
          const activePeriodsMap = this.prefetchAllActivePeriods(schools.map(s => s[0]));
          
          const numSchools = schools.length;
          const numWeeks = 21;
          const allPointsValues = [];
          const allTotalValues = [];
          const blackBackgroundRanges = [];
          
          schools.forEach((school, index) => {
              const schoolName = school[0];
              const row = this.config.POINTS_ROW_START + index;
              const weekPoints = new Array(numWeeks).fill('');
              let totalPoints = 0;
              
              const activeInfo = activePeriodsMap[schoolName] || { activePeriods: [] };
              const schoolPointsData = pointsData[schoolName];
              
              if (schoolPointsData) {
                  for (let i = 0; i < numWeeks; i++) {
                      const week = i + 1;
                      if (week > currentWeekNum) {
                          weekPoints[i] = '';
                          continue;
                      }
                      
                      let isActiveWeek = false;
                      for (const period of activeInfo.activePeriods) {
                          // FIX: During Bowls phase (weeks 17-21), check if school was active in week 16
                          // Bowl-related scoring (weeks 17-21) should apply to schools that were on the roster in week 16
                          const effectiveWeek = week > 16 ? 16 : week;
                          if (effectiveWeek >= period.startWeek && effectiveWeek <= period.endWeek) {
                              isActiveWeek = true;
                              break;
                          }
                      }
                      
                      if (!isActiveWeek) {
                          weekPoints[i] = '';
                          blackBackgroundRanges.push({
                              row: row,
                              column: this.config.POINTS_COLUMN_START + i
                          });
                          continue;
                      }
                      
                      const points = schoolPointsData[week] || 0;
                      weekPoints[i] = points;
                      totalPoints += points;
                  }
              }
              
              allPointsValues.push(weekPoints);
              allTotalValues.push([totalPoints]);
          });
          
          if (allPointsValues.length > 0) {
              const pointsRange = this.sheet.getRange(
                  this.config.POINTS_ROW_START,
                  this.config.POINTS_COLUMN_START,
                  numSchools,
                  numWeeks
              );
              pointsRange.setValues(allPointsValues);
              
              const totalRange = this.sheet.getRange(
                  this.config.POINTS_ROW_START,
                  this.config.TOTAL_COLUMN,
                  numSchools,
                  1
              );
              totalRange.setValues(allTotalValues);
          }
          
          if (blackBackgroundRanges.length > 0) {
              this.batchApplyBlackBackgrounds(blackBackgroundRanges);
          }
          
          const teamTotalPoints = allTotalValues.reduce((sum, row) => sum + (row[0] || 0), 0);
          const headerPointsRange = this.sheet.getRange(
              CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.CURRENT_POINTS.AMOUNT
          );
          headerPointsRange
              .setValue(teamTotalPoints)
              .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT_LEFT);
          
          this.calculateColumnTotalsBatched(allPointsValues, teamTotalPoints, currentWeekNum);
          console.timeEnd(`calculatePoints for ${this.teamName}`);
      }
      prefetchPointsData(pointsSheet) {
          const schoolsRange = pointsSheet.getRange(
              CONFIG.SHEETS.SPECIFIC.POINTS.SCHOOLS_RANGE.START + ":" + 
              CONFIG.SHEETS.SPECIFIC.POINTS.SCHOOLS_RANGE.END);
          const schools = schoolsRange.getValues();
          const dataStartRow = CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW;
          const lastRow = pointsSheet.getLastRow();          
          if (lastRow < dataStartRow) return {};         
          const allPointsRange = pointsSheet.getRange(
              dataStartRow,
              6, // Start at column F
              lastRow - dataStartRow + 1,
              24);
          const allPointsData = allPointsRange.getValues();
          const pointsMap = {};
          schools.forEach((schoolRow, index) => {
              const schoolName = schoolRow[0];
              if (!schoolName) return;             
              pointsMap[schoolName] = {};             
              if (index < allPointsData.length) {
                  const schoolPoints = allPointsData[index];
                  for (let week = 1; week <= 14; week++) {
                      pointsMap[schoolName][week] = schoolPoints[week - 1] || 0;}
                  pointsMap[schoolName][15] = schoolPoints[14] || 0; // Conference championships
                  pointsMap[schoolName][16] = schoolPoints[15] || 0; // Week 16
                  pointsMap[schoolName][17] = schoolPoints[16] || 0; // Column 22
                  pointsMap[schoolName][18] = schoolPoints[18] || 0; // Column 24
                  pointsMap[schoolName][19] = schoolPoints[20] || 0; // Column 26
                  pointsMap[schoolName][20] = schoolPoints[21] || 0; // Column 27
                  pointsMap[schoolName][21] = schoolPoints[22] || 0;}});          
          return pointsMap;}   
      prefetchAllActivePeriods(schools) {
          const teamsSheet = SpreadsheetApp.getActiveSpreadsheet()
              .getSheetByName(CONFIG.SHEETS.SPECIFIC.TEAMS.NAME);
          const teamsData = teamsSheet.getDataRange().getValues();
          const activePeriodsMap = {};
          
          schools.forEach(school => {
              const activePeriods = [];
              let currentPeriod = null;
              
              // Check each week (1-21) to see if this school was on the team
              for (let week = 1; week <= 21; week++) {
                  let hasSchool = false;
                  
                  // Find the row for this team and week
                  for (let i = 1; i < teamsData.length; i++) {
                      if (teamsData[i][0] === this.teamName && teamsData[i][1] === week) {
                          const weekSchools = teamsData[i].slice(2).filter(Boolean);
                          if (weekSchools.includes(school)) {
                              hasSchool = true;
                          }
                          break; // Found the row for this week, no need to continue
                      }
                  }
                  
                  // Track periods when school is on team
                  if (hasSchool && !currentPeriod) {
                      // Start of a new active period
                      currentPeriod = { startWeek: week };
                  } else if (!hasSchool && currentPeriod) {
                      // End of an active period
                      currentPeriod.endWeek = week - 1;
                      activePeriods.push(currentPeriod);
                      currentPeriod = null;
                  }
              }
              
              // Close any open period at the end
              if (currentPeriod) {
                  currentPeriod.endWeek = 21;
                  activePeriods.push(currentPeriod);
              }
              
              // Store all periods for this school
              activePeriodsMap[school] = {
                  startWeek: activePeriods.length > 0 ? activePeriods[0].startWeek : 999,
                  endWeek: activePeriods.length > 0 ? activePeriods[activePeriods.length - 1].endWeek : 0,
                  activePeriods: activePeriods  // This array contains ALL periods
              };
          });
          
          return activePeriodsMap;
      }
      batchApplyBlackBackgrounds(ranges) {
          const rowGroups = {};
          ranges.forEach(range => {
              if (!rowGroups[range.row]) {
                  rowGroups[range.row] = [];
              }
              rowGroups[range.row].push(range.column);
          });
          
          Object.entries(rowGroups).forEach(([row, columns]) => {
              columns.sort((a, b) => a - b);
              let start = columns[0];
              let end = columns[0];
              
              for (let i = 1; i <= columns.length; i++) {
                  if (i < columns.length && columns[i] === end + 1) {
                      end = columns[i];
                  } else {
                      this.sheet.getRange(
                          parseInt(row),
                          start,
                          1,
                          end - start + 1
                      ).setBackground('#000000');
                      
                      if (i < columns.length) {
                          start = columns[i];
                          end = columns[i];
                      }
                  }
              }
          });
      }
      calculateColumnTotalsBatched(allPointsValues, teamTotalPoints, currentWeekNum) {
          const columnTotals = ['','', teamTotalPoints];         
          for (let col = 0; col < 21; col++) {
              const columnWeek = col + 1;              
              if (columnWeek <= currentWeekNum) {
                  let columnSum = 0;
                  for (let row = 0; row < allPointsValues.length; row++) {
                      const value = allPointsValues[row][col];
                      if (typeof value === 'number') {
                          columnSum += value;}}
                  columnTotals.push(columnSum);
              } else {
                  columnTotals.push('');}}
          const totalsRange = this.sheet.getRange(this.config.PROGRAMS_WEEK_TOTALS_RANGE);
          totalsRange.setValues([columnTotals]);
          let customBackground = CONFIG.UI.COLORS.HEADER.SEASON; // Default fallback
          let customFontColor = CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT; // Default fallback
          try {
              const bgValue = this.sheet.getRange('H6').getValue();
              if (bgValue && bgValue.toString().trim() !== '') {
                  customBackground = bgValue.toString().trim();}
              const fontValue = this.sheet.getRange('H8').getValue();
              if (fontValue && fontValue.toString().trim() !== '') {
                  customFontColor = fontValue.toString().trim();}
          } catch (error) {
              console.log('Error reading custom colors, using defaults:', error);}
          totalsRange
              .setFontWeight('bold')
              .setHorizontalAlignment('center')
              .setBackground(customBackground)
              .setFontColor(customFontColor);}
      updateTotalPoints(row) {
          const totalRange = this.sheet.getRange(row, this.config.TOTAL_COLUMN);
          const pointsRange = this.sheet.getRange(
              row,
              this.config.POINTS_COLUMN_START,
              1,
              CONFIG.GAME.INTERNAL_SETTINGS.MAX_WEEKS);
          const points = pointsRange.getValues()[0];
          const total = points.reduce((sum, point) => {
              const value = point || 0;
              return sum + (typeof value === 'number' ? value : 0);
          }, 0);
          totalRange.setValue(total);} 
      getTransactions() {
          const transactionLog = SpreadsheetApp.getActiveSpreadsheet()
              .getSheetByName(CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME);
          const lastRow = transactionLog.getLastRow();          
          if (lastRow <= 1) return [];          
          const transactions = transactionLog.getRange(2, 1, lastRow - 1, 6).getValues();
          return transactions.map(row => ({
              timestamp: row[0],
              team: row[1],
              week: row[2],
              dropped: row[3],
              added: row[4],
              slot: row[5]}));}}
  class WeekManager {
      constructor() {
          if (WeekManager._instance) {
              return WeekManager._instance;}
          this.calendar = null;
          this.cachedWeek = null;
          this.cacheTimestamp = null;
          this.CACHE_DURATION = 60000; // 1 minute cache
          WeekManager._instance = this;}
      static getInstance() {
          if (!WeekManager._instance) {
              WeekManager._instance = new WeekManager();}
          return WeekManager._instance;}
      static clearInstance() {
          WeekManager._instance = null;}
      getCurrentWeek() {
          try {
              const now = new Date().getTime();
              if (this.cachedWeek && this.cacheTimestamp && (now - this.cacheTimestamp < this.CACHE_DURATION)) {
                  return this.cachedWeek;}
              let currentDate;
              const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
                  .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
              const manualDate = settingsSheet.getRange("C69").getValue();
              if (manualDate) {
                  console.log("Using manual test date:", manualDate);
                  currentDate = new Date(manualDate);
              } else {
                  currentDate = new Date();}
              if (!this.calendar) {
                  this.calendar = fetchCalendarData();}
              const entries = this.calendar.entries;
              for (let i = 0; i < entries.length; i++) {
                  const entry = entries[i];
                  const startDate = new Date(entry.startdate);
                  const endDate = new Date(entry.enddate);
                  if (currentDate >= startDate && currentDate < endDate) {
                      this.cachedWeek = entry.label;
                      this.cacheTimestamp = now;
                      return entry.label;}}
              const lastEntry = entries[entries.length - 1];
              if (currentDate >= new Date(lastEntry.enddate)) {
                  this.cachedWeek = 'Bowls';
                  this.cacheTimestamp = now;
                  return 'Bowls';}
              this.cachedWeek = 'Week 1';
              this.cacheTimestamp = now;
              return 'Week 1';
          } catch (error) {
              console.error("Error in getCurrentWeek:", error);
              return 'Week 1';}}
      getWeekNumber(weekLabel) {
          if (weekLabel === 'Bowls') return CONFIG.GAME.INTERNAL_SETTINGS.MAX_WEEKS;
          return parseInt(weekLabel.replace('Week ', ''));}
      isWeekActive(weekToCheck) {
          const currentWeek = this.getCurrentWeek();
          const currentNum = this.getWeekNumber(currentWeek);
          const checkNum = this.getWeekNumber(weekToCheck);
          return checkNum <= currentNum;}
      getSeasonDates() {
          if (!this.calendar) {
              this.calendar = fetchCalendarData();}
          return {
              start: new Date(this.calendar.calendarStartDate),
              end: new Date(this.calendar.calendarEndDate)};}
      getChampionshipDate() {
          const seasonSheet = SpreadsheetApp.getActiveSpreadsheet()
              .getSheetByName(CONFIG.SHEETS.SPECIFIC.SEASON.NAME);
          const lastRow = seasonSheet.getLastRow();
          const gameData = seasonSheet.getRange(1, 1, lastRow, 15).getValues();
          const sortedGames = gameData.slice(1)
              .sort((a, b) => new Date(b[14]) - new Date(a[14])); // Column O (14) is GAME_TIME
          return Utils.formatDate(
              new Date(sortedGames[0][14]), 
              CONFIG.SYSTEM.TIME.FORMATS.FULL);}
      clearCache() {
          this.cachedWeek = null;
          this.cacheTimestamp = null;}}
  WeekManager._instance = null;
  class ProgramManager {
    constructor(userSheet, teamName) {
        this.sheet = userSheet;
        this.teamName = teamName;
        this.config = CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.PROGRAM;
        this.weekManager = new WeekManager();
        this.pointsCalculator = new PointsCalculator(userSheet, teamName);}
    setupProgram() {
      const schools = this.getInitialSchools();
      this.populateSchools(schools);
      this.updateGameInfo();}
    getInitialSchools() {
        const teamsSheet = SpreadsheetApp.getActiveSpreadsheet()
            .getSheetByName(CONFIG.SHEETS.SPECIFIC.TEAMS.NAME);
        const data = teamsSheet.getDataRange().getValues();
        const week1Schools = data
            .filter(row => row[0] === this.teamName && row[1] === 1)
            .map(row => row.slice(2))
            .flat()
            .filter(Boolean);
        return week1Schools;}
    getLastTransaction() {
        const transactionLog = SpreadsheetApp.getActiveSpreadsheet()
            .getSheetByName(CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME);
        const columns = CONFIG.SHEETS.STRUCTURE.COLUMNS.TRANSACTION;
        const timestampColumn = Utils.columnToLetter(columns.TIMESTAMP);
        const range = transactionLog.getRange(`${timestampColumn}:${timestampColumn}`);
        const values = range.getValues();
        let lastRow = 1;
        for (let i = values.length - 1; i >= 0; i--) {
            if (values[i][0]) {
                lastRow = i + 1;
                break;}}
        if (lastRow <= 1) return null;
        const transactions = transactionLog.getRange(
            lastRow, 
            columns.TIMESTAMP, 
            1, 
            columns.PROGRAM_SLOT - columns.TIMESTAMP + 1
        ).getValues()[0];
        return {
            timestamp: transactions[0],
            team: transactions[columns.TEAM_NAME - columns.TIMESTAMP],
            week: transactions[columns.WEEK - columns.TIMESTAMP],
            dropped: transactions[columns.DROPPED - columns.TIMESTAMP],
            added: transactions[columns.ADDED - columns.TIMESTAMP],
            slot: transactions[columns.PROGRAM_SLOT - columns.TIMESTAMP]};}
    updateProgramAfterTransaction() {
        console.log("Starting updateProgramAfterTransaction");
        const startRow = this.config.TEAMS.POINTS_ROW_START; // Row 13
        const schoolColumn = this.config.TEAMS.PROGRAMS_SCHOOL_COLUMN; // Column I
        const slotColumn = this.config.TEAMS.HIDDEN_COLUMN; // Column H
        const conferenceColumn = 10; // Column J
        
        const currentWeek = this.weekManager.getCurrentWeek();
        const weekNum = currentWeek === "Bowls" || currentWeek === "CFP" ? 
                      16 : parseInt(currentWeek.replace('Week ', ''));
        
        console.log(`Looking for week ${weekNum} data for team ${this.teamName}`);
        
        // Get data from Teams sheet
        const teamsSheet = SpreadsheetApp.getActiveSpreadsheet()
            .getSheetByName(CONFIG.SHEETS.SPECIFIC.TEAMS.NAME);
        const teamsData = teamsSheet.getDataRange().getValues();
        
        // Find ALL schools that have ever been on this team
        const allSchoolsEver = new Set();
        const currentWeekSchools = new Map(); // Maps school to slot for current week only
        
        teamsData.forEach(row => {
            if (row[0] === this.teamName) {
                const rowWeek = row[1];
                const schools = row.slice(2, 12).filter(Boolean); // Get up to 10 schools (columns C-L)
                
                schools.forEach((school, index) => {
                    allSchoolsEver.add(school);
                    // Check if this is the current week
                    if (rowWeek == weekNum) { // Use == instead of === for type coercion
                        currentWeekSchools.set(school, index + 1);
                        console.log(`Current week school: ${school} at slot ${index + 1}`);
                    }
                });
            }
        });
        
        console.log(`Found ${allSchoolsEver.size} total unique schools`);
        console.log(`Found ${currentWeekSchools.size} active schools for week ${weekNum}`);
        
        // Build a map of existing schools on the sheet
        const existingSchoolRows = new Map();
        let lastFilledRow = startRow - 1;
        
        for (let row = startRow; row <= startRow + 30; row++) {
            const school = this.sheet.getRange(row, schoolColumn).getValue();
            if (school) {
                existingSchoolRows.set(school, row);
                lastFilledRow = row;
            }
        }
        
        // FIRST: Clear ALL slot numbers (Column H)
        if (lastFilledRow >= startRow) {
            this.sheet.getRange(startRow, slotColumn, lastFilledRow - startRow + 1, 1).clearContent();
            console.log("Cleared all slot numbers");
        }
        
        // SECOND: Add any new schools that aren't on the sheet yet
        allSchoolsEver.forEach(school => {
            if (!existingSchoolRows.has(school)) {
                lastFilledRow++;
                console.log(`Adding new school ${school} at row ${lastFilledRow}`);
                
                // Add school name
                this.sheet.getRange(lastFilledRow, schoolColumn).setValue(school);
                
                // Add conference
                const schoolData = SCHOOLS.find(s => s[0] === school);
                if (schoolData) {
                    this.sheet.getRange(lastFilledRow, conferenceColumn).setValue(schoolData[3]);
                }
                
                // Setup formulas
                const userSheetManager = new UserSheetManager();
                userSheetManager.setupSingleSchoolFormulas(this.sheet, this.teamName, school, lastFilledRow);
                
                existingSchoolRows.set(school, lastFilledRow);
            }
        });
        
        // THIRD: Set slot numbers ONLY for currently active schools
        currentWeekSchools.forEach((slot, school) => {
            const row = existingSchoolRows.get(school);
            if (row) {
                this.sheet.getRange(row, slotColumn).setValue(slot);
                console.log(`Set slot ${slot} for ${school} at row ${row}`);
            }
        });
        this.sortProgramArea();
        // FOURTH: Update points and colors
        console.log("Updating points and colors");
        this.pointsCalculator.calculatePoints();
    }
    sortProgramArea() {
        console.log("Sorting program area");
        
        try {
            const startRow = 13;
            const schoolColumn = 9;  // Column I
            const slotColumn = 8;    // Column H
            const userSheet = this.sheet;
            const teamName = this.teamName;
            
            // Get current week
            const currentWeek = this.weekManager.getCurrentWeek();
            // FIX: During Bowls/CFP, use week 16 for roster lookup since that's the last regular season week
            // The Teams sheet has entries for weeks 1-16, not 17+
            const currentWeekNum = currentWeek === "Bowls" || currentWeek === "CFP" ? 
                                  16 : parseInt(currentWeek.replace('Week ', ''));
            
            console.log(`sortProgramArea: currentWeek=${currentWeek}, using weekNum=${currentWeekNum} for roster lookup`);
            
            // Get current roster from Teams sheet
            const teamsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Teams');
            const teamsData = teamsSheet.getDataRange().getValues();
            
            let currentRoster = [];
            for (let i = 1; i < teamsData.length; i++) {
                if (teamsData[i][0] === teamName && teamsData[i][1] === currentWeekNum) {
                    currentRoster = teamsData[i].slice(2).filter(school => school);
                    break;
                }
            }
            
            console.log(`Found ${currentRoster.length} schools in roster for ${teamName} week ${currentWeekNum}`);
            
            // Collect ALL data for each school (entire rows)
            const schoolRows = [];
            for (let row = startRow; row <= startRow + 30; row++) {
                const schoolName = userSheet.getRange(row, schoolColumn).getValue();
                if (!schoolName || schoolName === '') break;
                
                // Get the ENTIRE row (all 32 columns from B to AG)
                const entireRowData = userSheet.getRange(row, 2, 1, 32).getValues()[0];
                const slotValue = userSheet.getRange(row, slotColumn).getValue();
                const isActive = currentRoster.includes(schoolName);
                
                schoolRows.push({
                    school: schoolName,
                    entireRowData: entireRowData,
                    slot: isActive ? (currentRoster.indexOf(schoolName) + 1) : 999,
                    isActive: isActive,
                    originalRow: row
                });
            }
            
            if (schoolRows.length === 0) return;
            
            // Sort: active schools by slot first, then dropped schools
            schoolRows.sort((a, b) => {
                if (a.isActive && !b.isActive) return -1;
                if (!a.isActive && b.isActive) return 1;
                return a.slot - b.slot;
            });
            
            // Write back ALL the sorted data (preserving everything)
            schoolRows.forEach((item, index) => {
                const targetRow = startRow + index;
                
                // Write the entire row back
                userSheet.getRange(targetRow, 2, 1, 32).setValues([item.entireRowData]);
                
                // Update slot value in column H based on active status
                if (item.isActive) {
                    userSheet.getRange(targetRow, slotColumn).setValue(item.slot);
                } else {
                    userSheet.getRange(targetRow, slotColumn).setValue('');
                }
                const userSheetManager = new UserSheetManager();
                userSheetManager.setupSingleSchoolFormulas(userSheet, teamName, item.school, targetRow);
                // Apply school name formatting
                const schoolCell = userSheet.getRange(targetRow, schoolColumn);
                if (item.isActive) {
                    const schoolInfo = SCHOOLS.find(s => s[0] === item.school);
                    if (schoolInfo) {
                        schoolCell.setBackground(schoolInfo[2])
                                  .setFontColor(schoolInfo[1])
                                  .setFontWeight("bold");
                    }
                } else {
                    schoolCell.setBackground("#d3d3d3")
                            .setFontColor("#000000")
                            .setFontWeight("normal");
                }
            });
            
            console.log(`Sorted ${schoolRows.length} schools: ${schoolRows.filter(s => s.isActive).length} active, ${schoolRows.filter(s => !s.isActive).length} dropped`);
            
        } catch (error) {
            console.error("Error in sortProgramArea:", error);
        }
    }
    populateSchools(schools) {
      const range = this.sheet.getRange(this.config.TEAMS.PROGRAMS_SCHOOL_RANGE);
      range.clearContent();
      if (schools.length > 0) {
        const values = schools.map(school => [school]);
        range.offset(0, 0, values.length, 1).setValues(values);}}
    findActiveGame(school, currentWeek) {
      const seasonSheet = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(CONFIG.SHEETS.SPECIFIC.SEASON.NAME);
      const gameData = seasonSheet.getDataRange().getValues();
      return gameData.find(row => 
        row[CONFIG.SHEETS.STRUCTURE.COLUMNS.WEEK_NAME] === currentWeek && 
        (row[CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_1_NAME] === school || 
        row[CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_2_NAME] === school));}
    updateGameInfo() {
      const currentWeek = this.weekManager.getCurrentWeek();
      const schoolsRange = this.sheet.getRange(this.config.TEAMS.PROGRAMS_SCHOOL_RANGE);
      const schools = schoolsRange.getValues();
      const validSchools = schools
        .map((row, index) => ({school: row[0], index}))
        .filter(item => item.school !== "");
      validSchools.forEach(({school, index}) => {
        const rowIndex = index + 11; // Based on config starting at row 11
        const game = this.findActiveGame(school, currentWeek);
        this.updateSingleGameRow(rowIndex, game, school);});}
    updateSingleGameRow(row, game, school) {
      const schoolCell = this.sheet.getRange(row, this.config.TEAMS.PROGRAMS_SCHOOL_COLUMN);
      if (schoolCell.getValue() === school) {
        if (game) {
          this.sheet.getRange(row, 2).setValue(game[CONFIG.SHEETS.STRUCTURE.COLUMNS.WEEK_NAME]);
          const gameTime = new Date(game[CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME]);
          this.sheet.getRange(row, 3).setValue(Utils.formatDate(gameTime, CONFIG.SYSTEM.TIME.FORMATS.FULL));
          const isHomeTeam = game[CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_1_NAME] === school;
          const oppName = isHomeTeam ? 
            game[CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_2_NAME] : 
            game[CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_1_NAME];
          const oppRank = isHomeTeam ? 
            game[CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_2_RANK] : 
            game[CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_1_RANK];
          this.sheet.getRange(row, 4).setValue(oppRank || '');
          this.sheet.getRange(row, 5).setValue(oppName);
          this.sheet.getRange(row, 6).setValue(game[CONFIG.SHEETS.STRUCTURE.COLUMNS.SCORE] || '');
        } else {
          this.sheet.getRange(row, 2).setValue(this.weekManager.getCurrentWeek());
          this.sheet.getRange(row, 3).setValue("Not playing this week");
          this.sheet.getRange(row, 4).setValue("");
          this.sheet.getRange(row, 5).setValue("");
          this.sheet.getRange(row, 6).setValue("");}}}}
  class AddDropManager {
    constructor(userSheet, teamName) {
      this.sheet = userSheet;
      this.teamName = teamName;
      this.config = CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.ADD_DROP;}
    setupAddDropInfo() {
      try {
        this.updateCounter();
        this.updateDeadlines();
      } catch (error) {
        console.error('Error in setupAddDropInfo:', error);}}
    updateCounter() {
      try {
        const maxAddDrops = this.getMaxAddDrops();
        const usedAddDrops = this.countUsedAddDrops();
        const counterCell = this.sheet.getRange(this.config.COUNTER.COUNTER);
        counterCell.setValue(`${usedAddDrops} of ${maxAddDrops}`);
      } catch (error) {
        console.error('Error updating counter:', error);
        throw error;}}
    getMaxAddDrops() {
      const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
      return settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_OF_ADD_DROPS).getValue();}
    countUsedAddDrops() {
      const transactionLog = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME);
      const config = CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.HISTORY_DATA;
      const lastRow = transactionLog.getLastRow();
      if (lastRow < config.START_ROW) return 0;  // No transactions yet
      const transactions = transactionLog.getRange(
        config.START_ROW,
        config.COLUMNS.TIMESTAMP,
        lastRow - config.START_ROW + 1,
        config.COLUMNS.PROGRAM_SLOT - config.COLUMNS.TIMESTAMP + 1
      ).getValues();
      return transactions.filter(row => 
        row[config.COLUMNS.TEAM_NAME - config.COLUMNS.TIMESTAMP] === this.teamName
      ).length;}
    updateDeadlines() {
      const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
      const finalDeadline = settingsSheet
        .getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.FINAL_ADD_DROP_DATE)
        .getValue();
      this.sheet.getRange(this.config.FINAL.FINAL_DEADLINE)
        .setValue(Utils.formatDate(finalDeadline, CONFIG.SYSTEM.TIME.FORMATS.FULL));
      this.updateWeeklyDeadline(finalDeadline);}
    updateWeeklyDeadline(finalDeadline) {
        console.log("=== AddDropManager.updateWeeklyDeadline START ===");
        console.log("Method called from AddDropManager instance");
        console.log("Final deadline received:", finalDeadline);
        
        const deadlineCell = this.sheet.getRange(this.config.WEEKLY.WEEKLY_DEADLINE);
        const now = new Date();
        const deadline = new Date(finalDeadline);
        
        console.log("Current time:", now);
        console.log("Final deadline date:", deadline);
        
        // Check if final add/drop date has passed
        if (now > deadline) {
            console.log("FINAL DEADLINE HAS PASSED - Setting expired message");
            deadlineCell
                .setValue(`Add/Drop availability ended. Final Add Drop Date has passed: ${Utils.formatDate(deadline, CONFIG.SYSTEM.TIME.FORMATS.FULL)}`)
                .setBackground(CONFIG.UI.COLORS.OTHER.LIGHT_RED_2);
            console.log("=== AddDropManager.updateWeeklyDeadline END (final deadline passed) ===");
            return;
        }
        
        console.log("Final deadline has NOT passed - calculating weekly deadline");
        
        try {
            const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
            
            // Check C69 for manual test date override (for debugging only)
            const c69Value = settingsSheet.getRange("C69").getValue();
            console.log("DEBUG: Cell C69 (manual test date) value:", c69Value, "Type:", typeof c69Value);
            if (c69Value && c69Value !== "" && c69Value.toString().trim() !== "") {
                console.log("WARNING: C69 has a manual test date that may affect week calculation!");
            }
            
            // Get current week - with better handling for empty objects
            let currentWeek;
            try {
                currentWeek = Utils.getCurrentWeek();
                console.log("getCurrentWeek raw result:", currentWeek, "Type:", typeof currentWeek);
                
                // Check if it's an empty object or invalid result
                if (!currentWeek || 
                    (typeof currentWeek === 'object' && Object.keys(currentWeek).length === 0) ||
                    currentWeek === "") {
                    
                    console.log("getCurrentWeek returned invalid result, using WeekManager directly");
                    const weekManager = WeekManager.getInstance();
                    currentWeek = weekManager.getCurrentWeek();
                    console.log("WeekManager.getCurrentWeek result:", currentWeek);
                }
                
                // If it's still an object, try to extract the week
                if (typeof currentWeek === 'object' && currentWeek !== null) {
                    console.log("getCurrentWeek returned object:", JSON.stringify(currentWeek));
                    currentWeek = currentWeek.label || currentWeek.name || currentWeek.week || null;
                }
                
                // Final fallback - calculate based on current date
                if (!currentWeek || currentWeek === "") {
                    console.log("All week methods failed, calculating from date");
                    const calendar = fetchCalendarData();
                    const entries = calendar.entries;
                    for (let i = 0; i < entries.length; i++) {
                        const entry = entries[i];
                        const startDate = new Date(entry.startdate);
                        const endDate = new Date(entry.enddate);
                        if (now >= startDate && now < endDate) {
                            currentWeek = entry.label;
                            console.log("Calculated week from calendar:", currentWeek);
                            break;
                        }
                    }
                    // Ultimate fallback
                    if (!currentWeek) {
                        currentWeek = "Week 3"; // Based on your log showing it's September 8, 2025
                        console.log("Using hardcoded fallback: Week 3");
                    }
                }
            } catch (weekError) {
                console.error("Error getting current week:", weekError);
                currentWeek = "Week 3"; // Fallback for September
            }
            
            console.log("Current week value being used:", currentWeek);
            
            // Get games from Season Schedule
            const seasonSheet = SpreadsheetApp.getActiveSpreadsheet()
                .getSheetByName(CONFIG.SHEETS.SPECIFIC.SEASON.NAME);
            const gamesData = seasonSheet.getDataRange().getValues();
            
            console.log("Total rows in Season sheet:", gamesData.length);
            console.log("Starting filter from row 6 (index 5)");
            
            // Debug: Check first few rows to see what weeks are present
            console.log("Sample week values from Season sheet:");
            for (let i = 5; i < Math.min(10, gamesData.length); i++) {
                console.log(`Row ${i+1}: Week='${gamesData[i][CONFIG.SHEETS.STRUCTURE.COLUMNS.WEEK_NAME - 1]}'`);
            }
            
            // Filter for current week games (starting from row 6, index 5)
            const currentWeekGames = gamesData.slice(5)
                .filter(row => {
                    const weekInRow = row[CONFIG.SHEETS.STRUCTURE.COLUMNS.WEEK_NAME - 1];
                    const matches = weekInRow === currentWeek;
                    return matches;
                })
                .sort((a, b) => new Date(a[CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME - 1]) - 
                              new Date(b[CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME - 1]));
            
            console.log("Found " + currentWeekGames.length + " games for " + currentWeek);
            
            if (currentWeekGames.length === 0) {
                console.log("NO GAMES FOUND - Setting no games message");
                deadlineCell.setValue("No games scheduled for this week")
                    .setBackground(CONFIG.UI.COLORS.OTHER.LIGHT_RED_2);
                console.log("=== AddDropManager.updateWeeklyDeadline END (no games) ===");
                return;
            }
            
            // Weekly deadline is the first game of the week
            const weeklyDeadline = new Date(currentWeekGames[0][CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME - 1]);
            console.log("Weekly deadline calculated:", weeklyDeadline);
            console.log("First game details:", 
                        "Week:", currentWeekGames[0][CONFIG.SHEETS.STRUCTURE.COLUMNS.WEEK_NAME - 1], 
                        "Time:", currentWeekGames[0][CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME - 1]);
            
            if (now > weeklyDeadline) {
                console.log("WEEKLY DEADLINE HAS PASSED - Setting closed message");
                const message = `Add/Drop window closed. Deadline was: ${Utils.formatDate(weeklyDeadline, CONFIG.SYSTEM.TIME.FORMATS.FULL)}`;
                console.log("Setting message:", message);
                deadlineCell
                    .setValue(message)
                    .setBackground(CONFIG.UI.COLORS.OTHER.LIGHT_RED_2);
            } else {
                console.log("WEEKLY DEADLINE IS ACTIVE - Setting active message");
                const message = `Add/Drops must be completed before: ${Utils.formatDate(weeklyDeadline, CONFIG.SYSTEM.TIME.FORMATS.FULL)}`;
                console.log("Setting message:", message);
                deadlineCell
                    .setValue(message)
                    .setBackground(CONFIG.UI.COLORS.OTHER.LIGHT_GREEN_3);
            }
            
            console.log("=== AddDropManager.updateWeeklyDeadline END (success) ===");
            return weeklyDeadline;
        } catch (error) {
            console.error("ERROR in updateWeeklyDeadline:", error);
            console.error("Error stack:", error.stack);
            deadlineCell.setValue("Error calculating weekly deadline")
                .setBackground(CONFIG.UI.COLORS.OTHER.LIGHT_RED_2);
            console.log("=== AddDropManager.updateWeeklyDeadline END (error) ===");
            throw error;
        }
    }
    validateAddDrop(adding, dropping) {
        const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
            .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
        const maxAddDrops = settingsSheet
            .getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_OF_ADD_DROPS)
            .getValue();
        const usedAddDrops = this.countUsedAddDrops();
        if (usedAddDrops >= maxAddDrops) {
            throw new Error(`Maximum number of add/drops (${maxAddDrops}) has been reached`);}
        const now = new Date();
        const finalDeadline = new Date(settingsSheet
            .getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.FINAL_ADD_DROP_DATE)
            .getValue());
        if (now > finalDeadline) {
            throw new Error("Final add/drop deadline has passed");}
        const weeklyDeadline = this.updateWeeklyDeadline(finalDeadline);
        if (weeklyDeadline && now > weeklyDeadline) {
            throw new Error("Weekly add/drop deadline has passed");}
        if (adding) {
            if (!schoolEligibilityManager) {
                initializeEligibilityManager();}
            if (!schoolEligibilityManager.isSchoolAvailable(adding)) {
                throw new Error(`${adding} has reached maximum allowed selections`);}
            this.validateAddSchool(adding);}
        if (dropping) {
            this.validateDropSchool(dropping);}
        return true;}
    validateAddSchool(school) {
      const teams = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(CONFIG.SHEETS.SPECIFIC.TEAMS.NAME);
      const teamData = teams.getDataRange().getValues();
      const currentWeek = this.weekManager.getCurrentWeek();
      const hasSchool = teamData.some(row => 
        row[0] === this.teamName && 
        row[1] === this.weekManager.getWeekNumber(currentWeek) &&
        row.slice(2).includes(school));
      if (hasSchool) {
        throw new Error("School is already on your team");}}
    validateDropSchool(school) {
      const teams = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(CONFIG.SHEETS.SPECIFIC.TEAMS.NAME);
      const teamData = teams.getDataRange().getValues();
      const currentWeek = this.weekManager.getCurrentWeek();
      const hasSchool = teamData.some(row => 
        row[0] === this.teamName && 
        row[1] === this.weekManager.getWeekNumber(currentWeek) &&
        row.slice(2).includes(school));
      if (!hasSchool) {
        throw new Error("School is not on your team");}}}
  function createUserSheetsFromTeams() {
    if (!sheetsInitialized) {
      initializeSheets();}
    const manager = new UserSheetManager();
    manager.setupUserSheets();}
// 7. Error Handling
  class ErrorHandler {
    constructor() {
      if (ErrorHandler._instance) {
        return ErrorHandler._instance;}
      ErrorHandler._instance = this;}
    static getInstance() {
      if (!ErrorHandler._instance) {
        ErrorHandler._instance = new ErrorHandler();}
      return ErrorHandler._instance;}
    handleError(error, cleanup = null) {
      const message = error.message || CONFIG.UI.MESSAGES.SETUP.GENERAL_ERROR;
      console.error("Error occurred:", message);
      if (cleanup && typeof cleanup === 'function') {
        try {
          cleanup();
        } catch (cleanupError) {
          console.error("Error during cleanup:", cleanupError.message);}}
      SpreadsheetApp.getActiveSpreadsheet().toast(
        message, 
        CONFIG.UI.MESSAGES.ERROR.TITLE);
      return {
        success: false,
        error: message};}
    handleSheetError(error, sheet = null) {
      console.error(`Sheet operation error: ${error.message}`);
      if (sheet) {
        try {
          this.resetSheetControls(sheet);
        } catch (resetError) {
          console.error("Error resetting sheet controls:", resetError.message);}}
      return this.handleError(error);}
    handleApiError(error, retryCount = 0) {
      console.error(`API operation error (attempt ${retryCount + 1}): ${error.message}`);
      if (retryCount < CONFIG.SYSTEM.API.RETRY.MAX) {
        return {
          success: false,
          shouldRetry: true,
          error: error.message,
          retryCount: retryCount + 1};}
      return this.handleError(error);}
    resetSheetControls(sheet) {
      if (!sheet) return;
      const sheetName = sheet.getName();
      if (sheetName === CONFIG.SHEETS.SPECIFIC.TRACKER.NAME) {
        const submitRange = sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.DRAFT_COMPLETE);
        const confirmRange = sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.CONFIRM_SEASON);
        CONFIG.SYSTEM.HELPERS.resetControls(submitRange, confirmRange);} 
      else if (sheetName === CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME) {
        const submitRange = sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.SUBMIT);
        const confirmRange = sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.CONFIRM);
        CONFIG.SYSTEM.HELPERS.resetControls(submitRange, confirmRange);}}}
  ErrorHandler._instance = null;
  function getErrorHandler() {
    return ErrorHandler.getInstance();}
  function processForm(email, subject, message) {
    if (email.trim() === '') {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'Please provide an email address.',
        'Error',
        5);
      return;}
    if (subject.trim() === '') {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'Please provide a subject for the issue.',
        'Error',
        5);
      return;}
    try {
      sendEmail(email, subject, message);
      SpreadsheetApp.getActiveSpreadsheet().toast(
        CONFIG.UI.MESSAGES.SUCCESS.REPORT_ISSUE_SUCCESS,
        CONFIG.UI.MESSAGES.SUCCESS.DEFAULT);
    } catch (error) {
      getErrorHandler().handleError(error);}}
  function sendEmail(recipient, subject, message) {
    var body = message;
    try {
      MailApp.sendEmail({
        to: recipient,
        subject: subject,
        body: body});
    } catch (error) {
      throw new Error(`Error sending email: ${error.message}`);}}
// 8. System Management
  class SystemManager {
    constructor(spreadsheet) {
        if (SystemManager._instance) {
            return SystemManager._instance;}
        this.ss = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
        SystemManager._instance = this;}
    static getInstance() {
        if (!this.instance) {
            this.instance = new SystemManager();}
        return this.instance;}
    async validateTeamCount() {
        console.log("Validating team count...");
        const settingsSheet = SHEETS.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
        const teamCountCell = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT);
        const teamCountValue = teamCountCell.getValue();
        console.log("Team Count value retrieved from Settings sheet:", teamCountValue);
        const validation = SpreadsheetApp.newDataValidation()
            .requireNumberGreaterThan(0)
            .setHelpText("Enter the number of teams participating in the competition")
            .build();
        teamCountCell.setDataValidation(validation);
        console.log("Applying data validation to the team count cell");
        if (!teamCountValue || teamCountValue < 1) {
            console.error("Invalid team count value:", teamCountValue);
            throw new Error(CONFIG.UI.MESSAGES.DRAFT.INVALID_COUNT(
                "Team count",
                teamCount,
                "greater than 0"));}
        console.log(`Team count validated: ${teamCountValue} teams`);
        return teamCountValue;}
    async cleanupExistingSystem() {
        const sheets = this.ss.getSheets();
        sheets.forEach(sheet => {
            const sheetName = sheet.getName();
            if (sheetName !== CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME) {
                this.ss.deleteSheet(sheet);}});
        const triggers = ScriptApp.getProjectTriggers();
        triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
        SheetManager._instance = null;
        SystemManager._instance = null;
        SHEETS = null;
        sheetsInitialized = false;
        cachedCalendarData = null;
        console.log("System cleanup completed");}
    async resetSystem() {
        console.log("Starting complete system reset...");
        try {
            await this.cleanupExistingSystem();
            SystemManager._instance = new SystemManager(this.ss);
            const initManager = new InitializationManager();
            await initManager.initializeSystem({ fromDraft: false });
            console.log("System reset and reinitialization completed successfully");
        } catch (error) {
            return getErrorHandler().handleError(error);}}
    async validateSetup() {
      console.log("Validating system setup...");
      try {
          const settingsSheet = this.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
          const draftDate = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_DATE).getValue();
          const draftType = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_TYPE).getValue();
          if (!draftDate) {
              throw new Error("Draft date must be set in Settings sheet");}
          if (!CONFIG.DRAFT.SETUP.TYPE_OPTIONS.includes(draftType)) {
              throw new Error("Invalid draft type in Settings sheet");}
          const teamCount = Utils.getTeamCount();
          const startCell = CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START;
          const [startColumn, startRow] = startCell.match(/([A-Z]+)(\d+)/).slice(1);
          const endRow = parseInt(startRow) + teamCount - 1;
          const teamNames = settingsSheet.getRange(`${startColumn}${startRow}:${startColumn}${endRow}`)
              .getValues()
              .map(row => row[0])
              .filter(name => name);
          if (teamNames.length !== teamCount) {
              throw new Error(`Number of team names (${teamNames.length}) does not match team count (${teamCount})`);}
          console.log("Setup validation completed successfully");
          return { success: true };
      } catch (error) {
          console.error("Setup validation failed:", error);
          return { success: false, error: error.message };}}}
  async function initializeTrackerOnly() {
      console.log("Starting initializeTrackerOnly with CONFIG:", CONFIG);
      console.log("CONFIG.UI.COLORS:", CONFIG.UI.COLORS);
      console.log("Starting Tracker-only initialization...");
      try {
          const ss = SpreadsheetApp.getActiveSpreadsheet();
          const sheetManager = SheetManager.getInstance();
          const trackerSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TRACKER.NAME);
          if (trackerSheet) {
              ss.deleteSheet(trackerSheet);}
          await sheetManager.initializeSheetByType('TRACKER');
          const newTracker = sheetManager.getSheet('TRACKER');
          SHEETS = {
              ss: ss,
              tracker: newTracker};
          sheetsInitialized = true;
          console.log("Tracker sheet initialization completed successfully");
          return { success: true };
      } catch (error) {
          console.error("Error in initializeTrackerOnly:", error);
          return getErrorHandler().handleError(error);}}
  function handleStartLeague(range, sheet) {
    console.log("Handling start league trigger");
    if (range.getValue() === true) {
      const confirmCell = sheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.START_LEAGUE_CONFIRM);
      confirmCell
        .setBackground(CONFIG.UI.STYLES.BASE.BACKGROUND)
        .setFontColor('black');
    } else {
      sheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.START_LEAGUE_CONFIRM)
        .setBackground(CONFIG.UI.STYLES.HIDDEN.BACKGROUND)
        .setFontColor(CONFIG.UI.STYLES.HIDDEN.FONT_COLOR);}}
  function handleStartLeagueConfirm(range, sheet) {
    console.log("Handling start league confirmation");
    if (range.getValue() === true) {
      const startLeagueChecked = sheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.START_LEAGUE).getValue();
      if (startLeagueChecked) {
        initializeTrackerOnly()
          .then(() => {
            CONFIG.SYSTEM.HELPERS.showSuccess(CONFIG.UI.MESSAGES.SUCCESS.DRAFT);})
          .catch(error => {
            getErrorHandler().handleError(error);
          });
        sheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.START_LEAGUE).setValue(false);
        range
          .setValue(false)
          .setBackground(CONFIG.UI.STYLES.HIDDEN.BACKGROUND)
          .setFontColor(CONFIG.UI.STYLES.HIDDEN.FONT_COLOR);}}}
  function resetEntireSystem() {
    return SystemManager.getInstance().resetSystem();}
  class InitializationManager {
      constructor() {
          this.phases = {
              1: { name: 'Essential Setup', maxTime: 180000, status: 'pending' },
              2: { name: 'Data Population', maxTime: 240000, status: 'pending' },
              3: { name: 'Advanced Features (Part 1)', maxTime: 120000, status: 'pending' },
              4: { name: 'User Sheets & Final Updates', maxTime: 120000, status: 'pending' }};
          this.currentPhase = null;
          this.startTime = null;}
      async initializeSystem(options = { fromDraft: false }) {
          console.log("🚀 Starting Multi-Phase Initialization System");
          try {
              this.resetInitializationState();
              this.startTime = new Date();
              PropertiesService.getScriptProperties().setProperties({
                  'initialization_status': 'phase_1_starting',
                  'initialization_start_time': this.startTime.getTime().toString(),
                  'initialization_current_phase': '1',
                  'initialization_from_draft': options.fromDraft.toString()});
              await this.executePhase1(options);              
              if (this.phases[1].status === 'complete') {
                  await this.executePhase2();
              } else {
                  console.log("⛔ Phase 1 failed - stopping initialization");
                  return;}              
              if (this.phases[2].status === 'complete') {
                  await this.executePhase3();
              } else {
                  console.log("⛔ Phase 2 failed - stopping initialization");
                  return;}
              if (this.phases[3].status === 'complete') {
                  this.schedulePhase4();                  
                  SpreadsheetApp.getActiveSpreadsheet().toast(
                      'Phases 1-3 complete! User sheets will be created in 1 minute...',
                      'Initialization Progress',
                      10);
              } else {
                  console.log("⛔ Phase 3 failed - stopping initialization");}              
          } catch (error) {
              this.handleInitializationFailure(error);
              throw error;}}
      async executePhase1(options) {
          this.currentPhase = 1;
          this.updatePhaseStatus(1, 'running');
          console.log("📋 Phase 1: Essential Setup - Starting");
          const phaseStartTime = new Date();         
          try {
              await this.validateTeamCount();
              const sheetManager = SheetManager.getInstance();
              await sheetManager.initializeSheetByType('TEAMS');
              console.log("✓ Teams sheet created");
              if (!SHEETS) {
                  SHEETS = {
                      ss: SpreadsheetApp.getActiveSpreadsheet()};}
              SHEETS.teams = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Teams');
              console.log("✓ Updated SHEETS.teams reference");
              if (options.fromDraft) {
                  const manager = new CompetitionManager();
                  manager.initializeFromSheet();
                  manager.syncToSheet();
                  if (!schoolEligibilityManager) {
                      initializeEligibilityManager();}
                  schoolEligibilityManager.saveState();
                  const teamsSheet = SHEETS.ss.getSheetByName('Teams');
                  teamsSheet.hideSheet();
                  console.log("✓ Draft processed (draft data preserved for reference)");}
              const phaseTime = new Date() - phaseStartTime;
              console.log(`✅ Phase 1 completed in ${phaseTime}ms`);
              this.updatePhaseStatus(1, 'complete');
          } catch (error) {
              this.updatePhaseStatus(1, 'failed');
              throw new Error(`Phase 1 failed: ${error.message}`);}}
      async executePhase2() {
          this.currentPhase = 2;
          this.updatePhaseStatus(2, 'running');
          console.log("🌍 Phase 2: Data Population - Starting");
          const phaseStartTime = new Date();
          try {
              const sheetManager = SheetManager.getInstance();
              await sheetManager.initializeSheetByType('SEASON');
              console.log("✓ Season schedule populated");
              await sheetManager.initializeSheetByType('LIVE');
              await setupDailyGames();
              console.log("✓ Live scoring setup");
              await sheetManager.initializeSheetByType('COMPLETED');
              console.log("✓ Historical games migrated");
              await sheetManager.initializeSheetByType('POINTS');
              console.log("✓ Points calculator ready");
              try {
                  await updateLiveScoresOptimized();
                  console.log("✓ Initial live scores updated");
              } catch (error) {
                  console.warn("⚠️ Live scores update failed (non-critical):", error.message);}
              const phaseTime = new Date() - phaseStartTime;
              console.log(`✅ Phase 2 completed in ${phaseTime}ms`);
              this.updatePhaseStatus(2, 'complete');
          } catch (error) {
              this.updatePhaseStatus(2, 'failed');
              throw new Error(`Phase 2 failed: ${error.message}`);}}
      async executePhase3() {
          this.currentPhase = 3;
          this.updatePhaseStatus(3, 'running');
          console.log("⭐ Phase 3: Advanced Features Part 1 - Starting");
          const phaseStartTime = new Date();
          try {
              const sheetManager = SheetManager.getInstance();
              await sheetManager.initializeSheetByType('TRANSACTION');
              console.log("✓ Transaction Log sheet created");
              await sheetManager.initializeSheetByType('LEADERBOARD');
              console.log("✓ Leaderboard created");
              SHEETS.log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Transaction Log');
              SHEETS.tracker = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Draft');
              SHEETS.settings = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
              sheetsInitialized = true;
              console.log("✓ SHEETS global fully initialized");
              await this.setupBasicTransactionSystem();
              console.log("✓ Basic transaction system ready");
              try {
                  await updateTransactionLogInfo();
                  console.log("✓ Transaction log info updated");
                  if (!schoolEligibilityManager) {
                      initializeEligibilityManager();}
                  console.log("✓ Transaction Log query setup complete");
              } catch (error) {
                  console.warn("⚠️ Transaction info update failed:", error.message);}
              const phaseTime = new Date() - phaseStartTime;
              console.log(`✅ Phase 3 completed in ${phaseTime}ms`);
              this.updatePhaseStatus(3, 'complete');
          } catch (error) {
              this.updatePhaseStatus(3, 'failed');
              throw new Error(`Phase 3 failed: ${error.message}`);}}
      async executePhase4() {
          this.currentPhase = 4;
          this.updatePhaseStatus(4, 'running');
          console.log("🏁 Phase 4: User Sheets & Final Updates - Starting");
          const phaseStartTime = new Date();
          try {
              try {
                  createUserSheetsFromTeams();
                  console.log("✓ User sheets created");
              } catch (error) {
                  console.warn("⚠️ User sheets creation failed:", error.message);}
              try {
                  updateRankings();
                  updateIdealTeam();
                  updatePoints();
                  updateAllUserSheetPoints();
                  console.log("✓ Rankings, Ideal Team, Points updated");
              } catch (error) {
                  console.warn("⚠️ Rankings update failed (non-critical):", error.message);}
              try {
                  const triggerManager = new TriggerManager();
                  triggerManager.setupTriggers();
                  console.log("✓ System triggers configured");
              } catch (error) {
                  console.warn("⚠️ Trigger setup failed:", error.message);}
              const phaseTime = new Date() - phaseStartTime;
              console.log(`✅ Phase 4 completed in ${phaseTime}ms`);
              this.updatePhaseStatus(4, 'complete');
          } catch (error) {
              this.updatePhaseStatus(4, 'failed');
              throw new Error(`Phase 4 failed: ${error.message}`);}}

      schedulePhase4() {
          PropertiesService.getScriptProperties().setProperty('next_phase_to_run', '4');
          ScriptApp.newTrigger('executeNextPhase')
              .timeBased()
              .after(1) // 1 minute minimum
              .create();
          console.log("Scheduled Phase 4 (User Sheets) to run in 1 minute");}
      async executePhase4Standalone() {
          console.log("🏁 Phase 4: Standalone execution starting");
          try {
              await this.executePhase4();             
              if (this.phases[4].status === 'complete') {
                  this.markComplete();
                  console.log("✅ All phases completed successfully!");                
                  SpreadsheetApp.getActiveSpreadsheet().toast(
                      'System initialization completed successfully! All features are now active.',
                      'Initialization Complete',
                      10);}
          } catch (error) {
              this.handleInitializationFailure(error);}}
      async setupBasicTransactionSystem() {
          updateTeamDropdown();
          updateDroppingSchoolDropdown();
          updateAddingSchoolDropdown();
          if (schoolEligibilityManager) {
              schoolEligibilityManager.updateTransactionLogDisplay();}}
      async validateTeamCount() {
          console.log("Validating team count...");
          const settingsSheet = SHEETS.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
          const teamCountCell = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT);
          const teamCountValue = teamCountCell.getValue();
          console.log("Team Count value retrieved from Settings sheet:", teamCountValue);         
          const validation = SpreadsheetApp.newDataValidation()
              .requireNumberGreaterThan(0)
              .setHelpText("Enter the number of teams participating in the competition")
              .build();
          teamCountCell.setDataValidation(validation);
          console.log("Applying data validation to the team count cell");       
          if (!teamCountValue || teamCountValue < 1) {
              console.error("Invalid team count value:", teamCountValue);
              throw new Error(`Invalid team count: ${teamCountValue}. Must be greater than 0`);}
          console.log(`Team count validated: ${teamCountValue} teams`);
          return teamCountValue;}
      async completeTransactionSystem() {
          updateTransactionLogInfo();
          verifyEligibility();
          colorSchoolCells(SHEETS.log);}
      handleInitializationFailure(error) {
          const totalTime = new Date() - this.startTime;
          const errorDetails = {
              phase: this.currentPhase,
              phaseName: this.phases[this.currentPhase]?.name || 'Unknown',
              error: error.message,
              totalTime: totalTime,
              timestamp: new Date().toISOString()};
          console.error("❌ INITIALIZATION FAILED:", errorDetails);
          PropertiesService.getScriptProperties().setProperties({
              'initialization_status': 'failed',
              'initialization_error': JSON.stringify(errorDetails),
              'initialization_failure_time': new Date().getTime().toString()});
          SpreadsheetApp.getActiveSpreadsheet().toast(
              `Initialization failed in ${errorDetails.phaseName} (Phase ${this.currentPhase}): ${error.message}`,
              'Initialization Error',
              15);
          this.cleanupPartialState();
          console.log("🛑 STOPPING - No further phases will execute");}
      updatePhaseStatus(phaseNumber, status) {
          this.phases[phaseNumber].status = status;
          PropertiesService.getScriptProperties().setProperties({
              'initialization_current_phase': phaseNumber.toString(),
              'initialization_phase_status': status,
              'initialization_phase_time': new Date().getTime().toString()});
          if (status === 'running') {
              SpreadsheetApp.getActiveSpreadsheet().toast(
                  `Phase ${phaseNumber}: ${this.phases[phaseNumber].name} - Starting...`,
                  'Initialization Progress',
                  3);}}
      async processDraftEssentials() {
        const manager = new CompetitionManager();
        manager.initializeFromSheet();
        manager.syncToSheet();
        if (!schoolEligibilityManager) {
          initializeEligibilityManager();}
        schoolEligibilityManager.saveState();
        const teamsSheet = SHEETS.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TEAMS.NAME);
        teamsSheet.hideSheet();
        clearDraftArea();
        Utils.resetAllControls();}
      async setupBasicTransactionSystem() {
        updateTeamDropdown();
        updateDroppingSchoolDropdown();
        updateAddingSchoolDropdown();}
      async completeTransactionSystem() {
        updateTransactionLogInfo();}
      async createBasicLeaderboard() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME);
        if (!sheet) {
          sheet = ss.insertSheet(CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME);
          const headers = CONFIG.SHEETS.SPECIFIC.LEADERBOARD.REQUIRED_COLUMNS;
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);}}
      async verifySystemIntegrity() {
        const requiredSheets = ['Teams', 'Transaction Log', 'Season Schedule', 'Live Scoring', 'Completed Games Cache', 'Points Calculator'];
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        for (const sheetName of requiredSheets) {
          const sheet = ss.getSheetByName(sheetName);
          if (!sheet) {
            throw new Error(`Critical sheet missing: ${sheetName}`);}}
        if (!SHEETS || !SHEETS.teams || !SHEETS.log) {
          throw new Error("SHEETS global object not properly initialized");}}
      markComplete() {
          const totalTime = new Date() - this.startTime;
          PropertiesService.getScriptProperties().setProperties({
              'initialization_status': 'completed',
              'initialization_completion_time': new Date().getTime().toString(),
              'initialization_total_time': totalTime.toString()});
          this.cleanupInitializationTriggers();}
      cleanupPartialState() {
          try {
              this.cleanupInitializationTriggers();
              PropertiesService.getScriptProperties().deleteProperty('gameState');
              cachedCalendarData = null;
              cachedSchoolsList = null;
              cachedSelections = null;
              console.log("✓ Partial state cleaned up");
          } catch (error) {
              console.error("Error during cleanup:", error);}}
      resetInitializationState() {
          const props = PropertiesService.getScriptProperties();
          props.deleteProperty('initialization_status');
          props.deleteProperty('initialization_error');
          props.deleteProperty('initialization_current_phase');
          props.deleteProperty('initialization_phase_status');
          this.cleanupInitializationTriggers();
          Object.keys(this.phases).forEach(phase => {
              this.phases[phase].status = 'pending';});}
      cleanupInitializationTriggers() {
          const triggers = ScriptApp.getProjectTriggers();
          const initTriggers = [
              'executionPhase2', 'executionPhase3', 'executionPhase4',
              'initializationPhase2', 'initializationPhase3', 'initializationPhase4'];
          triggers.forEach(trigger => {
              if (initTriggers.includes(trigger.getHandlerFunction())) {
                  ScriptApp.deleteTrigger(trigger);
                  console.log(`Cleaned up trigger: ${trigger.getHandlerFunction()}`);}});}
      static checkInitializationStatus() {
          const props = PropertiesService.getScriptProperties();
          const status = props.getProperty('initialization_status');
          const currentPhase = props.getProperty('initialization_current_phase');
          const error = props.getProperty('initialization_error');
          console.log(`Initialization Status: Phase ${currentPhase}, Status: ${status}`);
          if (error) {
              const errorDetails = JSON.parse(error);
              console.error('Initialization Error Details:', errorDetails);}
          let message;
          if (status === 'completed') {
              message = 'System initialization completed successfully!';
          } else if (status === 'failed') {
              const errorDetails = JSON.parse(error || '{}');
              message = `Initialization failed in ${errorDetails.phaseName || 'Unknown Phase'}: ${errorDetails.error || 'Unknown error'}`;
          } else if (status && status.includes('phase_')) {
              message = `Currently running phase ${currentPhase}...`;
          } else {
              message = 'No initialization in progress';}
          SpreadsheetApp.getActiveSpreadsheet().toast(message, 'Initialization Status', 5);
          return { status, currentPhase, error };}
      static resetInitialization() {
          console.log("🔄 Resetting initialization state...");
          const manager = new InitializationManager();
          manager.resetInitializationState();
          console.log("Initialization state reset complete");
          SpreadsheetApp.getActiveSpreadsheet().toast(
              'Initialization state has been reset. You can now start fresh.',
              'Reset Complete',
              5);}}
  function executeNextPhase() {
      console.log('Phase 4 trigger executed');
      ScriptApp.getProjectTriggers().forEach(trigger => {
          if (trigger.getHandlerFunction() === 'executeNextPhase') {
              ScriptApp.deleteTrigger(trigger);}});
      const manager = new InitializationManager();
      manager.executePhase4Standalone();
      PropertiesService.getScriptProperties().deleteProperty('next_phase_to_run');}
  function runPhase4Only() {
      console.log('🏁 Running Phase 4 - User Sheet Recreation...');
      console.log(`Execution started at: ${new Date().toISOString()}`);
      
      try {
          // Initialize SHEETS if not already done
          if (!SHEETS || !sheetsInitialized) {
              SHEETS = {
                  ss: SpreadsheetApp.getActiveSpreadsheet(),
                  teams: SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Teams'),
                  log: SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Transaction Log'),
                  tracker: SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Draft'),
                  settings: SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings')
              };
              sheetsInitialized = true;
              console.log("✓ SHEETS references initialized");
          }
          
          // Initialize eligibility manager if needed
          if (!schoolEligibilityManager) {
              initializeEligibilityManager();
              console.log("✓ Eligibility manager initialized");
          }
          
          // Set phase status (optional - for tracking)
          PropertiesService.getScriptProperties().setProperties({
              'initialization_current_phase': '4',
              'initialization_status': 'phase_4_running'
          });
          
          // Main work - recreate user sheets
          try {
              createUserSheetsFromTeams();
              console.log("✓ User sheets created/recreated");
          } catch (error) {
              console.error("User sheets creation failed:", error.message);
              throw error;
          }
          
          // Update all calculations
          try {
              updateRankings();
              console.log("✓ Rankings updated");
              
              updateIdealTeam();
              console.log("✓ Ideal team updated");
              
              updatePoints();
              console.log("✓ Points calculator updated");
              
              updateAllUserSheetPoints();
              console.log("✓ All user sheet points updated");
              
          } catch (error) {
              console.warn("Rankings/Points update failed (non-critical):", error.message);
              // Don't throw - let the sheet recreation succeed even if points fail
          }
          
          // Mark completion
          PropertiesService.getScriptProperties().setProperty(
              'initialization_status', 
              'phase_4_complete'
          );
          
          PropertiesService.getScriptProperties().setProperty(
              'last_user_sheet_recreation',
              new Date().toISOString()
          );
          
          console.log("✅ Phase 4 completed successfully!");
          
          
      } catch (error) {
          console.error('Error running Phase 4:', error);
          
          PropertiesService.getScriptProperties().setProperty(
              'initialization_status', 
              'phase_4_failed'
          );
          
          SpreadsheetApp.getActiveSpreadsheet().toast(
              `Phase 4 failed: ${error.message}`,
              'Phase 4 Error',
              10
          );
          
          throw error;
      }
  }
  function breakChainVisible() {
      console.log('Chain breaker executed');
      ScriptApp.getProjectTriggers().forEach(trigger => {
          if (trigger.getHandlerFunction() === 'breakChainVisible') {
              ScriptApp.deleteTrigger(trigger);}});
  }  
  class SchoolEligibilityManager {
      constructor() {
          if (!SHEETS) {
              initializeSheets();}
          this.eligibilityState = new Map();
          this.loadSavedState() || this.initialize();}
      initialize() {
          console.log("Initializing new eligibility state");
          const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
              .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
          const maxSelections = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_SCHOOL_SELECTIONS)
              .getValue();
          SCHOOLS.forEach(([school]) => {
              this.eligibilityState.set(school, {
                  maxSelections: maxSelections,
                  currentSelections: 0});});}
      loadSavedState() {
          try {
              const savedState = PropertiesService.getScriptProperties().getProperty('eligibilityState');
              if (savedState) {
                  const state = JSON.parse(savedState);
                  this.eligibilityState = new Map(Object.entries(state.eligibilityState));
                  console.log("Loaded saved eligibility state");
                  return true;}
          } catch (error) {
              console.error("Error loading saved state:", error);}
          return false;}
      processTransaction(droppedSchool, addedSchool) {
          console.log("Processing eligibility transaction...");
          if (droppedSchool) {
              const droppedState = this.eligibilityState.get(droppedSchool);
              if (droppedState) {
                  droppedState.currentSelections--;
                  console.log(`Decreased selections for ${droppedSchool} to ${droppedState.currentSelections}`);}}
          if (addedSchool) {
              const addedState = this.eligibilityState.get(addedSchool);
              if (addedState) {
                  addedState.currentSelections++;
                  console.log(`Increased selections for ${addedSchool} to ${addedState.currentSelections}`);}}
          this.saveState();
          this.updateTransactionLogDisplay();}
      saveState() {
          try {
              const state = {
                  eligibilityState: Object.fromEntries(this.eligibilityState)};
              PropertiesService.getScriptProperties().setProperty('eligibilityState', JSON.stringify(state));
              console.log("Eligibility state saved successfully");
          } catch (error) {
              console.error("Error saving eligibility state:", error);}}
      updateTransactionLogDisplay() {
          console.log("Updating eligibility in transaction helper sheet...");
          const helperSheet = SpreadsheetApp.getActiveSpreadsheet()
              .getSheetByName(CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.RESULTS.HELPER_SHEET);
          if (!helperSheet) {
              console.error("TransactionData helper sheet not found!");
              return;}
          const startRow = 2;
          const schools = Utils.getSchoolNames();
          const eligibilityData = schools.map(([school]) => {
              const state = this.eligibilityState.get(school);
              const selectionsLeft = state ? state.maxSelections - state.currentSelections : 0;
              return [selectionsLeft];});
          helperSheet.getRange(startRow, 1, eligibilityData.length, 1).setValues(eligibilityData);
          console.log("Updated eligibility data in helper sheet");}
      updateDisplays() {
          if (SHEETS.tracker) {
              this.updateTrackerEligibility();}
          if (SHEETS.log) {
              this.updateTransactionLogDisplay();}}
      isSchoolAvailable(school) {
          const state = this.eligibilityState.get(school);
          return state ? state.currentSelections < state.maxSelections : false;}
      initializeFromDraft() {
          console.log("Initializing eligibility from draft state");
          this.initialize(); // Reset to clean state
          const tracker = SHEETS.tracker;
          const draftRange = getDraftRange();
          const selections = draftRange.getValues();
          selections.forEach(row => {
              row.forEach(school => {
                  if (school) {
                      const state = this.eligibilityState.get(school);
                      if (state) {
                          state.currentSelections++;
                          console.log(`Initialized ${school} with ${state.currentSelections} selection(s)`);}}});});
          this.saveState();
          this.updateDisplays();}
      updateTrackerEligibility() {
          const tracker = SHEETS.tracker;
          const schoolsCol = CONFIG.SHEETS.STRUCTURE.COLUMNS.TRACKER.SCHOOLS;
          const selectionsCol = CONFIG.SHEETS.STRUCTURE.COLUMNS.TRACKER.SELECTIONS_LEFT;
          const eligibilityData = Array.from(this.eligibilityState.entries()).map(([school, state]) => [
              school,
              state.maxSelections - state.currentSelections]);
          const range = tracker.getRange(
              8,
              schoolsCol,
              eligibilityData.length,
              2);
          range.setValues(eligibilityData);}}
  function initializeEligibilityManager() {
      schoolEligibilityManager = new SchoolEligibilityManager();}
  function verifyEligibility() {
      if (!SHEETS) {
          initializeSheets();}
      const teamsSheet = SHEETS.teams;
      const data = teamsSheet.getDataRange().getValues();
      const weekManager = WeekManager.getInstance();
      const currentWeek = weekManager.getCurrentWeek();
      const weekNum = currentWeek.includes('Bowls') ? 16 : 
                      parseInt(currentWeek.replace('Week ', ''));
      const actualCounts = new Map();
      data.slice(1)
          .filter(row => row[1] === weekNum)
          .forEach(row => {
              row.slice(2).forEach(school => {
                  if (school) {
                      actualCounts.set(school, (actualCounts.get(school) || 0) + 1);}});});
      if (!schoolEligibilityManager) {
          initializeEligibilityManager();
          schoolEligibilityManager.loadSavedState();}
      let needsUpdate = false;
      actualCounts.forEach((count, school) => {
          const state = schoolEligibilityManager.eligibilityState.get(school);
          if (state && state.currentSelections !== count) {
              console.log(`Mismatch found for ${school}: stored=${state.currentSelections}, actual=${count}`);
              state.currentSelections = count;
              needsUpdate = true;}});
      if (needsUpdate) {
          schoolEligibilityManager.saveState();
          schoolEligibilityManager.updateDisplays();}
      return needsUpdate;}
  function resetUserSheetWeekSelectors() {
      console.log("Resetting user sheet week selectors and weekly deadlines to current week...");
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
      const teamCount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
      
      // Get the final deadline date
      const finalDeadline = settingsSheet
          .getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.FINAL_ADD_DROP_DATE)
          .getValue();
      
      const weekManager = WeekManager.getInstance();
      const currentWeek = weekManager.getCurrentWeek();
      
      const teamNames = settingsSheet
          .getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START)
          .offset(0, 0, teamCount)
          .getValues()
          .map(row => row[0])
          .filter(name => name);
      
      // Check if final add/drop date has passed
      const now = new Date();
      if (now > new Date(finalDeadline)) {
          // Final deadline has passed - update all team sheets to show this
          teamNames.forEach(teamName => {
              try {
                  const sheet = ss.getSheetByName(teamName);
                  if (sheet) {
                      // Reset the week selector dropdown (C6)
                      sheet.getRange("C6").setValue(currentWeek);
                      
                      // Reset the week display cell (B12) to match
                      sheet.getRange("B12").setValue(currentWeek);
                      
                      // Update deadline cell to show final deadline has passed
                      const deadlineCell = sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.ADD_DROP.WEEKLY.WEEKLY_DEADLINE);
                      deadlineCell
                          .setValue(`Add/Drop availability ended. Final Add Drop Date has passed: ${Utils.formatDate(finalDeadline, CONFIG.SYSTEM.TIME.FORMATS.FULL)}`)
                          .setBackground(CONFIG.UI.COLORS.OTHER.LIGHT_RED_2);
                      
                      console.log(`Updated ${teamName} - final deadline has passed`);
                  }
              } catch (error) {
                  console.error(`Error updating for ${teamName}:`, error);
              }
          });
          
          console.log("Final add/drop deadline has passed - updated all sheets");
          return; // Exit early since no more add/drops are allowed
      }
      
      // Final deadline has not passed - calculate weekly deadlines
      // Get games from Season Schedule for current week
      const seasonSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SEASON.NAME);
      const gamesData = seasonSheet.getDataRange().getValues();
      
      const currentWeekGames = gamesData.slice(5) // Start from row 6
          .filter(row => row[CONFIG.SHEETS.STRUCTURE.COLUMNS.WEEK_NAME - 1] === currentWeek)
          .sort((a, b) => new Date(a[CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME - 1]) - 
                        new Date(b[CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME - 1]));
      
      let weeklyDeadline = null;
      let deadlineMessage = "";
      let deadlineColor = CONFIG.UI.COLORS.OTHER.LIGHT_RED_2;
      
      if (currentWeekGames.length > 0) {
          weeklyDeadline = new Date(currentWeekGames[0][CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME - 1]);
          
          if (now > weeklyDeadline) {
              deadlineMessage = `Add/Drop window closed. Deadline was: ${Utils.formatDate(weeklyDeadline, CONFIG.SYSTEM.TIME.FORMATS.FULL)}`;
              deadlineColor = CONFIG.UI.COLORS.OTHER.LIGHT_RED_2;
          } else {
              deadlineMessage = `Add/Drops must be completed before: ${Utils.formatDate(weeklyDeadline, CONFIG.SYSTEM.TIME.FORMATS.FULL)}`;
              deadlineColor = CONFIG.UI.COLORS.OTHER.LIGHT_GREEN_3;
          }
      } else {
          deadlineMessage = "No games scheduled for this week";
          deadlineColor = CONFIG.UI.COLORS.OTHER.LIGHT_RED_2;
      }
      
      // Update all team sheets
      teamNames.forEach(teamName => {
          try {
              const sheet = ss.getSheetByName(teamName);
              if (sheet) {
                  // Reset the week selector dropdown (C6)
                  sheet.getRange("C6").setValue(currentWeek);
                  
                  // Reset the week display cell (B12) to match
                  sheet.getRange("B12").setValue(currentWeek);
                  
                  // Update the weekly deadline
                  const deadlineCell = sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.ADD_DROP.WEEKLY.WEEKLY_DEADLINE);
                  deadlineCell
                      .setValue(deadlineMessage)
                      .setBackground(deadlineColor);
                  
                  console.log(`Reset week selector and deadline for ${teamName}`);
              }
          } catch (error) {
              console.error(`Error resetting for ${teamName}:`, error);
          }
      });
      
      console.log("Week selectors and deadlines reset completed");
  }
  class TriggerManager {
    constructor() {
      this.existingTriggers = ScriptApp.getProjectTriggers();}
    setupTriggers() {
      console.log("Setting up triggers...");
      try {
        this.cleanupTriggers();
        ScriptApp.newTrigger('handleMyEdit')
          .forSpreadsheet(SpreadsheetApp.getActive())
          .onEdit()
          .create();
        console.log("Created installable onEdit trigger for handleMyEdit");
        this.createDailyTrigger('setupDailyGames', 5);
        this.createDailyTrigger('populateSeasonSchedule', 4);
        this.createDailyTrigger('resetUserSheetWeekSelectors',5)
        this.createDailyTrigger('performSimplifiedNightlyReset', 6);
        this.createDailyTrigger('runPhase4WithPreservedCustomizations', 6);
        console.log("Trigger setup completed successfully");
      } catch (error) {
        console.error("Error setting up triggers:", error);
        throw error;}}
    cleanupTriggers() {
      this.existingTriggers.forEach(trigger => {
        ScriptApp.deleteTrigger(trigger);});
      console.log("Cleaned up existing triggers");}
    createDailyTrigger(functionName, hour) {
      ScriptApp.newTrigger(functionName)
        .timeBased()
        .everyDays(1)
        .atHour(hour)
        .create();
      console.log(`Created daily trigger for ${functionName} at hour ${hour}`);}
    createMinuteTrigger(functionName, interval) {
      ScriptApp.newTrigger(functionName)
        .timeBased()
        .everyMinutes(interval)
        .create();
      console.log(`Created ${interval}-minute interval trigger for ${functionName}`);}
    createWeeklyTrigger(functionName, dayOfWeek) {
      ScriptApp.newTrigger(functionName)
        .timeBased()
        .onWeekDay(ScriptApp.WeekDay[['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][dayOfWeek]])
        .atHour(1)  // Run at 1 AM
        .create();
      console.log(`Created weekly trigger for ${functionName} on day ${dayOfWeek}`);}
    listActiveTriggers() {
      const triggers = ScriptApp.getProjectTriggers();
      console.log("Active triggers:");
      triggers.forEach(trigger => {
        console.log(`- ${trigger.getHandlerFunction()} (${trigger.getEventType()})`);});}}
  class TransactionService {
    constructor(userEmail) {
      this.userEmail = userEmail;
      this.ss = SpreadsheetApp.getActiveSpreadsheet();
      this.logSheet = this.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME);
      this.teamsSheet = this.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TEAMS.NAME);
      this.settingsSheet = this.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
      this.weekManager = new WeekManager();
      
      // FIX: Handle getCurrentWeek returning an object
      let currentWeek = this.weekManager.getCurrentWeek();
      if (typeof currentWeek === 'object' && currentWeek !== null) {
        currentWeek = currentWeek.label || currentWeek.name || currentWeek.week || "Week 1";
      }
      this.currentWeek = currentWeek;
      
      this.weekNum = this.currentWeek === "Bowls" || this.currentWeek === "CFP" ? 16 : 
                    parseInt(this.currentWeek.replace("Week ", ""));
      
      if (!schoolEligibilityManager) {
        console.log("Initializing eligibility manager in TransactionService constructor");
        initializeEligibilityManager();
        verifyEligibility();
      }
      this.adminAlertShown = false;
    }
    async processTransaction(teamName, droppingSchool, addingSchool) {
      console.log(`Processing transaction: Team=${teamName}, Drop=${droppingSchool}, Add=${addingSchool}`);
      try {
        const currentTeamName = this.getCurrentTeamName(teamName);
        const validation = this.validateTransaction(
          currentTeamName, 
          droppingSchool, 
          addingSchool,
          { silent: true });
        if (!validation.isValid) {
          throw new Error(validation.error);}
        const manager = new CompetitionManager();
        manager.loadState();
        const slot = manager.updateProgram(currentTeamName, this.weekNum, droppingSchool, addingSchool);
        if (!schoolEligibilityManager) {
          initializeEligibilityManager();}
        schoolEligibilityManager.processTransaction(droppingSchool, addingSchool);
        this.logTransaction(currentTeamName, droppingSchool, addingSchool, slot);
        await this.updateUserSheetAfterTransaction(currentTeamName);
        this.clearTransactionForm();
        this.refreshDropdowns();
        updateTransactionLogInfo();
        colorSchoolCells(this.logSheet);
        console.log("Transaction completed successfully");
        SpreadsheetApp.getActiveSpreadsheet().toast('Transaction completed successfully', 'Success');
        return { success: true };
      } catch (error) {
        console.error("Transaction failed:", error);
        SpreadsheetApp.getActiveSpreadsheet().toast(error.message, 'Error');
        return { success: false, error: error.message };}}
    validateUserPermission(teamName, silent = false) {
      console.log('Validating user permission for:', teamName);
      console.log('Current user email:', this.userEmail);
      if (!this.userEmail) {
          console.error('No email provided for validation');
          if (!silent) {
              SpreadsheetApp.getUi().alert(
                  'Authentication Error',
                  'Unable to detect your email address. Please ensure you are logged in.',
                  SpreadsheetApp.getUi().ButtonSet.OK);}
          return { isValid: false, error: 'Unable to detect user email' };}
      const teamCount = this.settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
      const teamNamesRange = this.settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START)
        .offset(0, 0, teamCount, 1);
      const ownerEmailsRange = this.settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OWNER_EMAILS_START)
        .offset(0, 0, teamCount, 2); // Get 2 columns for primary and secondary emails
      const teamNames = teamNamesRange.getValues();
      const ownerEmails = ownerEmailsRange.getValues();
      let teamIndex = -1;
      for (let i = 0; i < teamNames.length; i++) {
        if (teamNames[i][0].toLowerCase().trim() === teamName.toLowerCase().trim()) {
          teamIndex = i;
          break;}}
      if (teamIndex === -1) {
        console.error('Team not found:', teamName);
        return { 
          isValid: false, 
          error: 'Team not found in settings' };}
      const primaryEmail = ownerEmails[teamIndex][0]?.toString().toLowerCase().trim() || '';
      const secondaryEmailRaw = ownerEmails[teamIndex][1];
      const secondaryEmail = (secondaryEmailRaw && 
                            typeof secondaryEmailRaw === 'string' && 
                            secondaryEmailRaw !== '1' &&
                            secondaryEmailRaw.includes('@')) 
                            ? secondaryEmailRaw.toString().toLowerCase().trim() 
                            : '';
      const userEmail = this.userEmail.toLowerCase().trim();
      console.log('Team owner primary email:', primaryEmail);
      console.log('Team owner secondary email:', secondaryEmail);
      console.log('Checking if user is team owner...');
      if (userEmail === primaryEmail || (secondaryEmail && userEmail === secondaryEmail)) {
        console.log('✓ User is team owner');
        return { isValid: true, isTeamOwner: true };}
      const adminEmailRaw = this.settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ADMIN_EMAIL).getValue();
      const adminEmail = adminEmailRaw?.toString().toLowerCase().trim() || '';
      console.log('Checking if user is admin...');
      console.log('User email:', userEmail);
      if (isUserAdmin(userEmail)) {
          console.log('✓ User is admin');
        if (!silent && !this.adminAlertShown) {
          this.adminAlertShown = true; // Set flag
          SpreadsheetApp.getUi().alert(
            'Admin Access', 
            'You have ADMIN access. You can edit all teams.\n' +
            'Currently editing: ' + teamName, 
            SpreadsheetApp.getUi().ButtonSet.OK);}
        return { isValid: true, isAdmin: true };}
      console.log('✗ User is not authorized');
      console.log('User email:', this.userEmail);
      console.log('Does not match team owner or admin');
      if (!silent) {
        const displayPrimaryEmail = ownerEmails[teamIndex][0]?.toString().trim() || '';
        const displaySecondaryEmail = (ownerEmails[teamIndex][1] && 
                                      ownerEmails[teamIndex][1] !== '1' &&
                                      ownerEmails[teamIndex][1].toString().includes('@'))
                                      ? ownerEmails[teamIndex][1].toString().trim() 
                                      : '';
        SpreadsheetApp.getUi().alert(
          'Unauthorized Access', 
          `You are not authorized to edit ${teamName}.\n` +
          `Only the Team Owner(s) or Admin can make changes.\n\n` +
          `Your Email: ${this.userEmail}\n` +
          `Team Owner Email: ${displayPrimaryEmail}` + 
          (displaySecondaryEmail ? ` or ${displaySecondaryEmail}` : '') + '\n' +
          `Admin Email: ${adminEmailRaw}`, 
          SpreadsheetApp.getUi().ButtonSet.OK);}
      return { 
        isValid: false, 
        error: `You are not authorized to make transactions for ${teamName}. Only the team owner(s) or admin can make changes.` };}  
    validateTransaction(teamName, droppingSchool, addingSchool, options = {}) {
      console.log("Validating transaction...");
      
      if (!teamName || teamName === "") {
        return { isValid: false, error: "No team selected" };
      }
      
      const dropIsEmpty = !droppingSchool || droppingSchool === "" || droppingSchool.toString().trim() === "";
      const addIsEmpty = !addingSchool || addingSchool === "" || addingSchool.toString().trim() === "";
      
      // FIXED: Changed from && to || to require BOTH drop AND add
      if (dropIsEmpty || addIsEmpty) {
        return { isValid: false, error: "You must select BOTH a school to drop AND a school to add to maintain roster size" };
      }
      
      const permissionCheck = this.validateUserPermission(teamName, options.silent || false);
      if (!permissionCheck.isValid) {
        return permissionCheck;
      }
      
      const deadlineCheck = this.validateDeadlines();
      if (!deadlineCheck.isValid) {
        return deadlineCheck;
      }
      
      const counterCheck = this.validateAddDropCounter(teamName);
      if (!counterCheck.isValid) {
        return counterCheck;
      }
      
      if (droppingSchool && !dropIsEmpty) {
        const dropCheck = this.validateDropping(teamName, droppingSchool);
        if (!dropCheck.isValid) {
          return dropCheck;
        }
      }
      
      if (addingSchool && !addIsEmpty) {
        const addCheck = this.validateAdding(teamName, addingSchool, droppingSchool);
        if (!addCheck.isValid) {
          return addCheck;
        }
      }
      
      return { isValid: true };
    }
    validateDeadlines() {
      const now = new Date();
      const finalDeadline = new Date(this.settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.FINAL_ADD_DROP_DATE).getValue());
      if (now > finalDeadline) {
        return { 
          isValid: false, 
          error: `Final add/drop deadline has passed (${Utils.formatDate(finalDeadline, CONFIG.SYSTEM.TIME.FORMATS.FULL)})` };}
      const weeklyDeadline = this.getWeeklyDeadline();
      if (weeklyDeadline && now > weeklyDeadline) {
        return { 
          isValid: false, 
          error: `This week's add/drop deadline has passed (${Utils.formatDate(weeklyDeadline, CONFIG.SYSTEM.TIME.FORMATS.FULL)})` };}
      return { isValid: true };}
    validateAddDropCounter(teamName) {
      const maxAddDrops = this.settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_OF_ADD_DROPS).getValue();
      const usedAddDrops = this.getUsedAddDrops(teamName);
      if (usedAddDrops >= maxAddDrops) {
        return { 
          isValid: false, 
          error: `You have used all ${maxAddDrops} add/drops for the season` };}
      return { isValid: true };}
    validateDropping(teamName, school) {
      const currentSchools = this.getTeamSchools(teamName);
      if (!currentSchools.includes(school)) {
        return { 
          isValid: false, 
          error: `${school} is not currently on your team` };}
      return { isValid: true };}
    validateAdding(teamName, school, droppingSchool) {
      if (!schoolEligibilityManager || !schoolEligibilityManager.isSchoolAvailable(school)) {
        return { 
          isValid: false, 
          error: `${school} has reached maximum allowed selections across all teams` };}
      const maxTimesAllowed = this.settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_TIMES_SCHOOL_ALLOWED).getValue();
      const currentSchools = this.getTeamSchools(teamName);
      const schoolCount = currentSchools.filter(s => s === school).length;
      if (schoolCount >= maxTimesAllowed) {
        return { 
          isValid: false, 
          error: `${school} has already been selected ${maxTimesAllowed} times by your team` };}
      const maxSchoolsPerTeam = this.settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM).getValue();
      if (!droppingSchool && currentSchools.filter(Boolean).length >= maxSchoolsPerTeam) {
        return { 
          isValid: false, 
          error: `Your team already has the maximum ${maxSchoolsPerTeam} schools` };}
      return { isValid: true };}
    getCurrentTeamName(originalTeamName) {
      const teamsData = this.teamsSheet.getDataRange().getValues();
      const directMatch = teamsData.find(row => 
        row[0] === originalTeamName && row[1] === this.weekNum);
      if (directMatch) {
        return originalTeamName;}
      for (let i = teamsData.length - 1; i >= 0; i--) {
        if (teamsData[i][0] && teamsData[i][1] === this.weekNum) {
          const settingsName = this.getSettingsTeamName(originalTeamName);
          if (teamsData[i][0] === settingsName) {
            return teamsData[i][0];}}}
      console.warn(`Team name '${originalTeamName}' not found for week ${this.weekNum}`);
      return originalTeamName;}
    getSettingsTeamName(teamName) {
      const teamCount = this.settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
      const teamNamesRange = this.settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START)
        .offset(0, 0, teamCount, 1);
      const teamNames = teamNamesRange.getValues().flat();
      return teamNames.find(name => name === teamName) || teamName;}
    getTeamSchools(teamName) {
      const teamsData = this.teamsSheet.getDataRange().getValues();
      const teamRow = teamsData.find(row => row[0] === teamName && row[1] === this.weekNum);
      if (!teamRow) {
        return [];}
      return teamRow.slice(2).filter(Boolean);}
    getEligibleSchools(teamName, droppingSchool = null) {
      const maxTimesAllowed = this.settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_TIMES_SCHOOL_ALLOWED).getValue();
      const currentSchools = this.getTeamSchools(teamName);
      const currentTeamCounts = new Map();
      currentSchools.forEach(school => {
        if (school !== droppingSchool) {
          currentTeamCounts.set(school, (currentTeamCounts.get(school) || 0) + 1);}});
      return Utils.getSchoolNames()
        .map(([school]) => school)
        .filter(school => {
          const teamCount = currentTeamCounts.get(school) || 0;
          const withinTeamLimit = teamCount < maxTimesAllowed;
          const availableOverall = schoolEligibilityManager ? 
            schoolEligibilityManager.isSchoolAvailable(school) : true;
          return availableOverall && withinTeamLimit;});}
    getUsedAddDrops(teamName) {
      const config = CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.HISTORY_DATA;
      const lastRow = this.logSheet.getLastRow();
      if (lastRow < config.START_ROW) return 0;  // No transactions yet
      const transactions = this.logSheet.getRange(
        config.START_ROW,
        config.COLUMNS.TIMESTAMP,
        lastRow - config.START_ROW + 1,
        config.COLUMNS.PROGRAM_SLOT - config.COLUMNS.TIMESTAMP + 1
      ).getValues();
      return transactions.filter(row => 
        row[config.COLUMNS.TEAM_NAME - config.COLUMNS.TIMESTAMP] === teamName
      ).length;}
    getWeeklyDeadline() {
      const manualDeadline = this.settingsSheet.getRange("B73").getValue();
      if (manualDeadline) {
        return new Date(manualDeadline);
      }
      
      const seasonSheet = this.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SEASON.NAME);
      const gamesData = seasonSheet.getDataRange().getValues();
      
      // FIX: Change from slice(1) to slice(5) for row 6 start
      const currentWeekGames = gamesData.slice(5)
        .filter(row => row[CONFIG.SHEETS.STRUCTURE.COLUMNS.WEEK_NAME - 1] === this.currentWeek)
        .sort((a, b) => new Date(a[CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME - 1]) - 
                        new Date(b[CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME - 1]));
      
      if (currentWeekGames.length === 0) {
        return null;
      }
      
      return new Date(currentWeekGames[0][CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME - 1]);
    }
    logTransaction(teamName, droppingSchool, addingSchool, slot) {
      const timestamp = new Date();
      const config = CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.HISTORY_DATA;
      const lastRow = this.getNextTransactionRow();
      const transactionData = [
        timestamp,
        teamName,
        this.weekNum,
        droppingSchool || '',
        addingSchool || '',
        slot
      ];
      const range = this.logSheet.getRange(
        lastRow,
        config.COLUMNS.TIMESTAMP,  // Column J (10)
        1,
        transactionData.length);
      range.setValues([transactionData]);
      range.setFontSize(10)
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");
      this.logSheet.getRange(lastRow, config.COLUMNS.TIMESTAMP, 1, 1)
        .setNumberFormat("MM/dd/yyyy HH:mm:ss");}
    getNextTransactionRow() {
      const config = CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.HISTORY_DATA;
      const startCol = Utils.columnToLetter(config.COLUMNS.TIMESTAMP);     // J
      const endCol = Utils.columnToLetter(config.COLUMNS.PROGRAM_SLOT);   // O
      const transactionRange = this.logSheet.getRange(`${startCol}:${endCol}`);
      const transactionValues = transactionRange.getValues();
      let lastRow = config.START_ROW - 1;  // Start at 6
      for (let i = config.START_ROW - 1; i < transactionValues.length; i++) {
        if (transactionValues[i].some(cell => cell !== "")) {
          lastRow = i + 1;}}
      return lastRow + 1;}
    async updateUserSheetAfterTransaction(teamName) {
      const userSheet = this.ss.getSheetByName(teamName);
      if (!userSheet) {
        console.error(`User sheet not found for team: ${teamName}`);
        return;}
      const programManager = new ProgramManager(userSheet, teamName);
      const pointsCalculator = new PointsCalculator(userSheet, teamName);
      const addDropManager = new AddDropManager(userSheet, teamName);
      programManager.updateProgramAfterTransaction();
      pointsCalculator.calculatePoints();
      addDropManager.updateCounter();
      addDropManager.updateDeadlines();} 
    clearTransactionForm() {
      this.logSheet.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.TEAM).clearContent();
      this.logSheet.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.DROP).clearContent();
      this.logSheet.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.ADD).clearContent();
      this.logSheet.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.SUMMARY).clearContent();
      this.adminAlertShown = false; // Reset flag
      Utils.resetAllControls();}
    refreshDropdowns() {
      updateTeamDropdown();
      updateDroppingSchoolDropdown(this.userEmail);
      updateAddingSchoolDropdown(this.userEmail);}
    handleSubmit() {
      const cells = CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS;
      try {
        const team = this.logSheet.getRange(cells.TEAM).getValue();
        const dropping = this.logSheet.getRange(cells.DROP).getValue();
        const adding = this.logSheet.getRange(cells.ADD).getValue();
        const isSubmitted = this.logSheet.getRange(cells.SUBMIT).getValue();
        
        if (!isSubmitted) {
          this.logSheet.getRange(cells.SUMMARY).clearContent();
          this.logSheet.getRange(cells.CONFIRM)
            .setValue(false)
            .setFontColor(CONFIG.UI.STYLES.HIDDEN.FONT_COLOR);
          return false;
        }
        
        if (!team) {
          throw new Error("Please select a team");
        }
        
        // FIXED: Changed from && to || to require BOTH drop AND add
        if (!dropping || !adding) {
          throw new Error("Please select BOTH a school to drop AND a school to add");
        }
        
        const currentTeamName = this.getCurrentTeamName(team);
        const validation = this.validateTransaction(currentTeamName, dropping, adding);
        
        if (!validation.isValid) {
          throw new Error(validation.error);
        }
        
        const summary = `${currentTeamName} - Dropping ${dropping || 'none'} - Adding ${adding || 'none'}`;
        const summaryCell = this.logSheet.getRange(cells.SUMMARY);
        summaryCell.setValue(summary);
        SpreadsheetApp.flush();
        
        const writtenSummary = summaryCell.getValue();
        if (writtenSummary === summary) {
          const confirmCell = this.logSheet.getRange(cells.CONFIRM);
          CONFIG.SYSTEM.HELPERS.toggleConfirmButton(confirmCell, true);
        } else {
          Utilities.sleep(1000);
          SpreadsheetApp.flush();
          const confirmCell = this.logSheet.getRange(cells.CONFIRM);
          CONFIG.SYSTEM.HELPERS.toggleConfirmButton(confirmCell, true);
        }
        
        return true;
      } catch (error) {
        CONFIG.SYSTEM.HELPERS.showError(error.message);
        this.logSheet.getRange(cells.SUBMIT).setValue(false);
        return false;
      }
    }
    handleConfirmation() {
      const cells = CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS;
      try {
        const team = this.logSheet.getRange(cells.TEAM).getValue();
        const dropping = this.logSheet.getRange(cells.DROP).getValue();
        const adding = this.logSheet.getRange(cells.ADD).getValue();
        const summary = this.logSheet.getRange(cells.SUMMARY).getValue();
        
        if (!team || team === "") {
          throw new Error("No team selected");
        }
        
        const dropIsEmpty = !dropping || dropping === "" || dropping.toString().trim() === "";
        const addIsEmpty = !adding || adding === "" || adding.toString().trim() === "";
        
        // FIXED: Changed from && to || to require BOTH drop AND add
        if (dropIsEmpty || addIsEmpty) {
          throw new Error("You must select BOTH a school to drop AND a school to add to maintain roster size");
        }
        
        const currentSummary = `${team} - Dropping ${dropping || 'none'} - Adding ${adding || 'none'}`;
        if (summary && currentSummary !== summary) {
          throw new Error("Transaction details have changed. Please click Submit again to re-validate.");
        }
        
        const currentTeamName = this.getCurrentTeamName(team);
        const validation = this.validateTransaction(
          currentTeamName, 
          dropping || null, 
          adding || null,
          { silent: true }
        );
        
        if (!validation.isValid) {
          throw new Error(validation.error);
        }
        
        return this.processTransaction(
          currentTeamName, 
          dropIsEmpty ? null : dropping, 
          addIsEmpty ? null : adding
        );
      } catch (error) {
        // Reset both checkboxes on error
        this.logSheet.getRange(cells.SUBMIT).setValue(false);
        this.logSheet.getRange(cells.CONFIRM).setValue(false);
        this.logSheet.getRange(cells.SUMMARY).clearContent();
        getErrorHandler().handleError(error);
        return { success: false, error: error.message };
      }
    }
  }
  
  let transactionService = null;
  function getTransactionService(userEmail) {
      return new TransactionService(userEmail);}
// 9. Competition Manager
  function CompetitionManager() {
    this.programs = new Map();
    this.eligibility = new Map();
    this.transactions = [];
    this.MAX_WEEKS = CONFIG.GAME.INTERNAL_SETTINGS.MAX_WEEKS;
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
    this.MAX_SCHOOLS_PER_TEAM = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM).getValue();}
  // State Management Methods
  CompetitionManager.prototype.saveState = function() {
    try {
      const state = {
        programs: Object.fromEntries(
          Array.from(this.programs.entries()).map(([team, weekPrograms]) => [
            team,
            Object.fromEntries(weekPrograms)])),
        eligibility: Object.fromEntries(this.eligibility),
        transactions: this.transactions};
      PropertiesService.getScriptProperties().setProperty('gameState', JSON.stringify(state));
      Logger.log('State saved successfully');
    } catch (e) {
      Logger.log('Error saving state: ' + e.message);
      throw e;}};
  CompetitionManager.prototype.loadState = function() {
    try {
      const stateJson = PropertiesService.getScriptProperties().getProperty('gameState');
      if (stateJson) {
        const state = JSON.parse(stateJson);
        this.programs = new Map();
        Object.entries(state.programs).forEach(([team, weekPrograms]) => {
          const weekMap = new Map();
          Object.entries(weekPrograms).forEach(([week, schools]) => {
            weekMap.set(parseInt(week), schools);});
          this.programs.set(team, weekMap);});
        this.eligibility = new Map(Object.entries(state.eligibility));
        this.transactions = state.transactions;
        Logger.log('State loaded successfully');}
    } catch (e) {
      Logger.log('Error loading state: ' + e.message);
      throw e;}};
  // Program Methods
  CompetitionManager.prototype.initializeProgram = function(teamName, initialSchools) {
      CONFIG.SYSTEM.HELPERS.validateTeamSize(teamName, initialSchools);
      const weekPrograms = new Map();
      for (let week = 1; week <= this.MAX_WEEKS; week++) {
          weekPrograms.set(week, initialSchools);}
      this.programs.set(teamName, weekPrograms);
      initialSchools.forEach(school => {
          this.updateEligibility(school, 1);
          if (!schoolEligibilityManager) {
              initializeEligibilityManager();}
          schoolEligibilityManager.processTransaction(null, school);});
      schoolEligibilityManager.saveState();};
  CompetitionManager.prototype.getTeamProgram = function(team, week) {
    Logger.log(`Getting program for ${team}, week ${week}`);
    const teamPrograms = this.programs.get(team);
    if (!teamPrograms) {
      Logger.log(`No programs found for team ${team}`);
      return [];}
    const weekNumber = parseInt(week);
    const weekProgram = teamPrograms.get(weekNumber);
    if (!weekProgram) {
      Logger.log(`No program found for week ${week}`);
      return [];}
    return weekProgram;};
  CompetitionManager.prototype.updateProgram = function(team, week, droppingSchool, addingSchool) {
      try {
          const currentProgram = this.getTeamProgram(team, week);
          CONFIG.SYSTEM.HELPERS.validateWeek(week);
          if (droppingSchool && !currentProgram.includes(droppingSchool)) {
              throw new Error(CONFIG.UI.MESSAGES.DRAFT.INVALID_ITEM(droppingSchool));}
          const teamsSheet = SHEETS.teams;
          const teamsData = teamsSheet.getDataRange().getValues();
          const currentWeekRow = teamsData.find(row => row[0] === team && row[1] === week);
          let slot = -1;
          if (currentWeekRow && droppingSchool) {
              for (let i = 2; i < currentWeekRow.length; i++) {
                  if (currentWeekRow[i] === droppingSchool) {
                      slot = i - 2;
                      break;}}}
          if (slot === -1) {
              throw new Error(`Could not find ${droppingSchool} in program slots for ${team} week ${week}`);}
          for (let w = week; w <= this.MAX_WEEKS; w++) {
              let weekSchools = [...(this.programs.get(team).get(w) || [])];
              if (droppingSchool && addingSchool) {
                  weekSchools[slot] = addingSchool;
              } else if (droppingSchool) {
                  weekSchools[slot] = null;}
              this.programs.get(team).set(w, weekSchools);}
          this.saveState();
          this.syncToSheet();
          return slot + 1;
      } catch (error) {
          console.error("Error in updateProgram:", error);
          throw error;}};
  CompetitionManager.prototype.updateEligibility = function(school, delta) {
      const currentCount = this.eligibility.get(school) || 0;
      this.eligibility.set(school, currentCount + delta);
      if (schoolEligibilityManager) {
          if (delta > 0) {
              schoolEligibilityManager.processTransaction(null, school);
          } else {
              schoolEligibilityManager.processTransaction(school, null);}
          schoolEligibilityManager.saveState();}};
  // Sync and Initialization Methods
  CompetitionManager.prototype.syncToSheet = function() {
      const teamsData = [];
      const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
      const maxSchools = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM).getValue();
      this.programs.forEach((weekPrograms, team) => {
          for (let week = 1; week <= this.MAX_WEEKS; week++) {
              const schools = weekPrograms.get(week);
              if (schools) {
                  teamsData.push([team, week, ...schools]);}}});
      try {
          const teamsSheet = SHEETS.teams;
          if (!teamsSheet) {
              console.error("Teams sheet not found during sync");
              throw new Error("Teams sheet not found");}
          if (teamsSheet.getLastRow() >= 2) {
              const existingDataRange = teamsSheet.getRange(
                  2,
                  1,
                  teamsSheet.getLastRow() - 1,
                  maxSchools + 2);
              existingDataRange.clearContent();}
          if (teamsData.length > 0) {
              const range = teamsSheet.getRange(2, 1, teamsData.length, maxSchools + 2);
              range.setValues(teamsData);}
          colorSchoolCells(teamsSheet);
          console.log("Successfully synced data to teams sheet");
      } catch (e) {
          console.error("Error syncing data to teams sheet:", e);
          throw e;}};
  CompetitionManager.prototype.initializeFromSheet = function() {
      const allSchools = SCHOOLS.map(school => school[0]);
      Logger.log('Total schools found: ' + allSchools.length);
      allSchools.forEach(school => {
          this.eligibility.set(school, 0);});
      if (!schoolEligibilityManager) {
          initializeEligibilityManager();}
      schoolEligibilityManager.initializeFromDraft();  // This resets and loads from draft
      const settingsSheet = SHEETS.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
      const teamCount = Utils.getTeamCount();
      const teamNamesCell = CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START;
      const teamNames = settingsSheet
          .getRange(teamNamesCell)
          .offset(0, 0, teamCount)
          .getValues()
          .map(row => row[0])
          .filter(name => name);
      Logger.log('Team names found:', teamNames);
      const tracker = SHEETS.tracker;
      const startCol = CONFIG.SHEETS.STRUCTURE.COLUMNS.TRACKER.TEAM_START;
      const maxSchoolsPerTeam = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM).getValue();
      teamNames.forEach((team, index) => {
          Logger.log(`Initializing ${team} with schools:`);
          if (!team) return;
          const schoolRange = tracker.getRange(
              CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW,
              startCol + index,
              maxSchoolsPerTeam,
              1);
          const initialSchools = schoolRange.getValues()
              .map(row => row[0])
              .filter(school => school);
          Logger.log(initialSchools);  // Debug: Log the initialSchools array
          if (initialSchools.length > 0) {
              const weekPrograms = new Map();
              for (let week = 1; week <= this.MAX_WEEKS; week++) {
                  weekPrograms.set(week, initialSchools);}
              this.programs.set(team, weekPrograms);}});
      this.saveState();
      this.syncToSheet();};
// 10. Game Processing Core
  function processGameData(game, weekName, type = 'SEASON', existingData = null) {
      let gameDate;
      if (game.competitions && game.competitions[0] && game.competitions[0].date) {
          if (game.competitions[0].date instanceof Date) {
              gameDate = game.competitions[0].date;
          } else {
              gameDate = new Date(game.competitions[0].date);}
          if (isNaN(gameDate.getTime())) {
              console.error(`Invalid date in game.competitions[0].date: ${game.competitions[0].date}`);
              gameDate = new Date();}
      } else {
          console.error(`No competition date found for game ${game.id}`);
          gameDate = new Date();}
      const competition = game.competitions[0];
      const homeTeam = competition.competitors.find(team => team.homeAway === "home");
      const awayTeam = competition.competitors.find(team => team.homeAway === "away");
      const homeScore = parseInt(homeTeam.score) || 0;
      const awayScore = parseInt(awayTeam.score) || 0;
      const winner = homeScore > awayScore ? homeTeam : awayTeam;
      const loser = homeScore > awayScore ? awayTeam : homeTeam;
      
      // FIX: Only classify as Bowls if it's truly a bowl game, not Week 16 games like Army-Navy
      // Check if the game is post-season AND not already classified as a regular week
      if (game.season?.slug === "post-season") {
          // If weekName is already a regular week (Week 1-16), keep it as that week
          // This handles Army-Navy which ESPN marks as post-season but is really Week 16
          if (!weekName.startsWith("Week ")) {
              weekName = "Bowls";
          }
          // Additional check: if the game name contains known non-bowl games, keep original week
          const gameName = competition.notes?.[0]?.headline || "";
          if (gameName.toLowerCase().includes("army") && gameName.toLowerCase().includes("navy")) {
              // Army-Navy game should stay as Week 16, not Bowls
              // Only override if weekName isn't already set correctly
              if (weekName === "Bowls") {
                  weekName = "Week 16";
              }
          }
      }
      
      let processedData = {
          "Game ID": game.id,
          "Week Name": weekName,
          "Date": Utils.formatDate(gameDate, CONFIG.SYSTEM.TIME.FORMATS.DATE),
          "Time": Utils.formatDate(gameDate, CONFIG.SYSTEM.TIME.FORMATS.TIME),
          "Bowl or Game Name": competition.notes?.[0]?.headline || ""};
      if (weekName === "Week 15" || weekName === "Week 16") {
          processedData["Conference Game"] = "Yes";
      } else {
          processedData["Conference Game"] = competition.conferenceCompetition ? "Yes" : "No";}
      switch(type) {
          case 'SEASON':
              processedData = {
                  ...processedData,
                  "Away Rank": awayTeam.curatedRank?.current <= 25 ? awayTeam.curatedRank.current : "",
                  "Away Team": awayTeam.team.shortDisplayName,
                  "Away": awayTeam.team.abbreviation,
                  "Home Rank": homeTeam.curatedRank?.current <= 25 ? homeTeam.curatedRank.current : "",
                  "Home Team": homeTeam.team.shortDisplayName,
                  "Home": homeTeam.team.abbreviation,
                  "Status": game.status?.type?.state || "pre",
                  "Score": `${awayTeam.team.abbreviation} ${awayTeam.score || 0} - ${homeTeam.team.abbreviation} ${homeTeam.score || 0}`,
                  "Game Time": gameDate.toISOString()};
              break;
          case 'LIVE':
              processedData = {
                  ...processedData,
                  "Away Rank": awayTeam.curatedRank?.current <= 25 ? awayTeam.curatedRank.current : "",
                  "Away Team": awayTeam.team.shortDisplayName,
                  "Away": awayTeam.team.abbreviation,
                  "Home Rank": homeTeam.curatedRank?.current <= 25 ? homeTeam.curatedRank.current : "",
                  "Home Team": homeTeam.team.shortDisplayName,
                  "Home": homeTeam.team.abbreviation,
                  "Away Score": awayTeam.score || "",
                  "Home Score": homeTeam.score || "",
                  "Status": game.status?.type?.state || "pre",
                  "Qtr": game.status?.period || "",
                  "Clock": (game.status?.type?.state === "in" && game.status?.period === 2 && game.status?.displayClock === "0:00") ? "Halftime" : (game.status?.displayClock || ""),
                  "Possession": competition.situation?.downDistanceText || "",
                  "Possession Image": competition.situation?.possession ? `=IMAGE("${CONFIG.SYSTEM.API.TEAM_LOGO_URL}${competition.situation.possession}.png", ${CONFIG.UI.IMAGE.RENDERING}, ${CONFIG.UI.IMAGE.DIMENSIONS.POSSESSION.WIDTH}, ${CONFIG.UI.IMAGE.DIMENSIONS.POSSESSION.HEIGHT})` : "",
                  "Possession Team": competition.situation?.possession === homeTeam.team.id ? homeTeam.team.shortDisplayName : awayTeam.team.shortDisplayName,
                  "Score": `${awayTeam.team.abbreviation} ${awayTeam.score || 0} - ${homeTeam.team.abbreviation} ${homeTeam.score || 0}`,
                  "Game Time": gameDate.toISOString()};
              break;
          case 'COMPLETED':
              processedData = {
                  ...processedData,
                  "Winner Rank": winner.curatedRank?.current <= 25 ? winner.curatedRank.current : "",
                  "Winner Team": winner.team.shortDisplayName,
                  "Winner Abbrev": winner.team.abbreviation,
                  "Winner Score": winner.score || "0",
                  "Loser Rank": loser.curatedRank?.current <= 25 ? loser.curatedRank.current : "",
                  "Loser Team": loser.team.shortDisplayName,
                  "Loser Abbrev": loser.team.abbreviation,
                  "Loser Score": loser.score || "0",
                  "Final Score": `${winner.team.abbreviation} ${winner.score} - ${loser.team.abbreviation} ${loser.score} (Final)`,
                  "Completion Time": new Date().toISOString()};
              break;}
      const headers = CONFIG.SHEETS.SPECIFIC[type]?.REQUIRED_COLUMNS;
      const resultArray = headers.map(header => processedData[header] || "");
      return {
          status: game.status?.type?.state || "pre",
          data: resultArray};}
  function getPossessionTeam(competition, homeTeam, awayTeam) {
    if (!competition.situation?.possession) return "";
    return competition.situation.possession === homeTeam.team.id ? 
      homeTeam.team.shortDisplayName : awayTeam.team.shortDisplayName;}
  function getPossessionImage(competition, config) {
    if (!competition.situation?.possession) return "";
    return `=IMAGE("${CONFIG.SYSTEM.API.TEAM_LOGO_URL}${competition.situation.possession}.png", ${CONFIG.UI.IMAGE.RENDERING}, ${CONFIG.UI.IMAGE.DIMENSIONS.POSSESSION.WIDTH}, ${CONFIG.UI.IMAGE.DIMENSIONS.POSSESSION.HEIGHT})`;}
  function getTeamImage(competition, config) {
    if (!competition.situation?.possession) return "";
    return `=IMAGE("${CONFIG.SYSTEM.API.TEAM_LOGO_URL}${competition.situation.possession}.png", ${CONFIG.UI.IMAGE.RENDERING}, ${CONFIG.UI.IMAGE.DIMENSIONS.POSSESSION.WIDTH}, ${CONFIG.UI.IMAGE.DIMENSIONS.POSSESSION.HEIGHT})`;}
  async function batchProcessCompletedGames(completedGames, liveSheet, completedSheet) {
      if (completedGames.length === 0) return;
      
      const processedGameIds = []; // Track what we actually process
      
      try {
          console.log(`Processing ${completedGames.length} completed games...`);
          
          // CRITICAL FIX 1: Get all existing game IDs from completed sheet FIRST
          const existingGameIds = new Set();
          const lastRow = completedSheet.getLastRow();
          const dataStartRow = CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW;
          
          if (lastRow >= dataStartRow) {
              // Get ALL game IDs currently in the completed sheet
              const GAME_ID_COL = CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_ID; // Column 1
              const existingData = completedSheet.getRange(
                  dataStartRow,
                  GAME_ID_COL,
                  lastRow - dataStartRow + 1,
                  1
              ).getValues();
              
              existingData.forEach(row => {
                  const gameId = row[0];
                  if (gameId && gameId !== '') {
                      existingGameIds.add(gameId.toString());
                  }
              });
              
              console.log(`Found ${existingGameIds.size} existing games in Completed sheet`);
          }
          
          // CRITICAL FIX 2: Filter out any games that already exist
          const newGames = completedGames.filter(game => {
              const gameId = game.gameData[0]; // Game ID is first element
              const isDuplicate = existingGameIds.has(gameId.toString());
              
              if (isDuplicate) {
                  console.log(`⚠️ DUPLICATE DETECTED: Game ${gameId} already exists in Completed sheet - SKIPPING`);
              } else {
                  processedGameIds.push(gameId); // Track games we'll actually add
              }
              
              return !isDuplicate;
          });
          
          console.log(`After duplicate check: ${newGames.length} new games to add (filtered ${completedGames.length - newGames.length} duplicates)`);
          
          if (newGames.length === 0) {
              console.log("All games were duplicates - nothing to add");
              
              // Still need to remove them from Live sheet
              const rowsToDelete = completedGames
                  .map(game => game.rowIndex)
                  .sort((a, b) => b - a);
              
              rowsToDelete.forEach(row => {
                  try {
                      liveSheet.deleteRow(row);
                      console.log(`Deleted duplicate game from Live sheet row ${row}`);
                  } catch (error) {
                      console.error(`Error deleting row ${row}:`, error.toString());
                  }
              });
              
              return;
          }
          
          // CRITICAL FIX 3: Use SpreadsheetApp.flush() to ensure fresh data
          SpreadsheetApp.flush();
          
          // Re-check the last row after flush to ensure accuracy
          const actualLastRow = completedSheet.getLastRow();
          let writeRow = actualLastRow + 1;
          
          // Ensure we don't write before the data start row
          if (writeRow < dataStartRow) {
              writeRow = dataStartRow;
          }
          
          console.log(`Writing ${newGames.length} new games starting at row ${writeRow}`);
          
          // Extract the gameData arrays for new games only
          const processedGames = newGames.map(game => game.gameData);
          
          // CRITICAL FIX 4: Lock-like mechanism using Properties Service
          const lockKey = 'completed_games_write_lock';
          const lockTimeout = 30000; // 30 seconds
          const startTime = new Date().getTime();
          
          // Try to acquire lock
          let lockAcquired = false;
          while (!lockAcquired && (new Date().getTime() - startTime) < lockTimeout) {
              const currentLock = PropertiesService.getScriptProperties().getProperty(lockKey);
              
              if (!currentLock || (new Date().getTime() - parseInt(currentLock)) > lockTimeout) {
                  // Lock is available or expired
                  PropertiesService.getScriptProperties().setProperty(lockKey, new Date().getTime().toString());
                  lockAcquired = true;
              } else {
                  // Wait a bit and try again
                  Utilities.sleep(100);
              }
          }
          
          if (!lockAcquired) {
              throw new Error("Could not acquire lock for writing completed games");
          }
          
          try {
              // Write all games at once within the lock
              if (processedGames.length > 0) {
                  const targetRange = completedSheet.getRange(
                      writeRow,
                      2,  // Start at column B
                      processedGames.length,
                      processedGames[0].length
                  );
                  
                  targetRange.setValues(processedGames);
                  
                  // Force immediate write
                  SpreadsheetApp.flush();
                  
                  console.log(`✅ Successfully wrote ${processedGames.length} new completed games`);
                  console.log(`   Game IDs: ${processedGameIds.join(', ')}`);
                  const sheetManager = SheetManager.getInstance();
                  sheetManager.applyWeekRowColoring(completedSheet, 'COMPLETED');
                  
                  // Run post-processing
                  colorSchoolCells(completedSheet);
                  updateSeasonWinners();
                  updatePoints();
                  updateAffectedUserSheets(processedGames);
                  updateConferenceRankings();
              }
          } finally {
              // Release the lock
              PropertiesService.getScriptProperties().deleteProperty(lockKey);
          }
          
          // CRITICAL FIX 5: Delete from Live sheet ONLY after successful write
          // Group deletions by game ID to avoid deleting the same row twice
          const gameIdToRows = new Map();
          completedGames.forEach(game => {
              const gameId = game.gameData[0].toString();
              if (!gameIdToRows.has(gameId)) {
                  gameIdToRows.set(gameId, []);
              }
              gameIdToRows.get(gameId).push(game.rowIndex);
          });
          
          // Delete rows for successfully processed games only
          const rowsToDelete = [];
          processedGameIds.forEach(gameId => {
              const rows = gameIdToRows.get(gameId.toString());
              if (rows) {
                  rowsToDelete.push(...rows);
              }
          });
          
          // Sort descending to delete from bottom up
          rowsToDelete.sort((a, b) => b - a);
          
          console.log(`\n=== DELETING ${rowsToDelete.length} ROWS FROM LIVE SCORING ===`);
          
          // Remove duplicates from rowsToDelete
          const uniqueRowsToDelete = [...new Set(rowsToDelete)];
          
          uniqueRowsToDelete.forEach((row, index) => {
              try {
                  // Verify the row still exists and has the expected game ID
                  const currentLastRow = liveSheet.getLastRow();
                  if (row <= currentLastRow) {
                      liveSheet.deleteRow(row);
                      console.log(`[${index + 1}/${uniqueRowsToDelete.length}] Deleted row ${row}`);
                  } else {
                      console.log(`Row ${row} no longer exists (sheet has ${currentLastRow} rows)`);
                  }
              } catch (error) {
                  console.error(`Error deleting row ${row}:`, error.toString());
              }
          });
          
          console.log(`=== DELETION COMPLETE ===\n`);
          
      } catch (error) {
          console.error("Error in batchProcessCompletedGames:", error);
          
          // Log which games failed for debugging
          console.error("Failed while processing games:", completedGames.map(g => g.gameData[0]).join(', '));
          
          throw error;
      }
  }
  function updateSeasonWinners() {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const leaderboardSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME);
      const settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
      const completedSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.COMPLETED.NAME);
      const seasonSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SEASON.NAME);
      if (!leaderboardSheet || !settingsSheet || !completedSheet || !seasonSheet) {
          return;}
      const completedLastRow = completedSheet.getLastRow();
      const seasonLastRow = seasonSheet.getLastRow();      
      if (completedLastRow < 2 || seasonLastRow < 2) {
          return;}
      if (completedSheet.getRange(completedLastRow, 2).getValue() !== 
          seasonSheet.getRange(seasonLastRow, 2).getValue()) {
          return;}
      const BOWL_NAME_INDEX = 8;
      const bowlName = seasonSheet.getRange(seasonLastRow, BOWL_NAME_INDEX).getValue();
      const isChampionship = bowlName && (
          bowlName.toString().startsWith("College Football Playoff National Championship") ||
          bowlName.toString().toLowerCase().includes("cfp national championship") ||
          bowlName.toString().toLowerCase().includes("national championship"));      
      if (!isChampionship) {
          return;}      
      let numWinners = settingsSheet.getRange("C43").getValue();
      if (typeof numWinners === 'string') {
          numWinners = parseInt(numWinners);}
      let firstPrize = 0, secondPrize = 0, thirdPrize = 0;
      if (numWinners >= 1) {
          firstPrize = settingsSheet.getRange("E44").getValue() || 0;
          if (typeof firstPrize === 'string') {
              firstPrize = parseFloat(firstPrize.replace(/[$,]/g, '')) || 0;}}
      if (numWinners >= 2) {
          secondPrize = settingsSheet.getRange("E45").getValue() || 0;
          if (typeof secondPrize === 'string') {
              secondPrize = parseFloat(secondPrize.replace(/[$,]/g, '')) || 0;}}
      if (numWinners >= 3) {
          thirdPrize = settingsSheet.getRange("E46").getValue() || 0;
          if (typeof thirdPrize === 'string') {
              thirdPrize = parseFloat(thirdPrize.replace(/[$,]/g, '')) || 0;}}      
      const teamCount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
      const headers = CONFIG.SHEETS.SPECIFIC.LEADERBOARD.REQUIRED_COLUMNS;
      const seasonWinnersIndex = headers.indexOf("Season Winners");      
      if (seasonWinnersIndex === -1) {
          return;}      
      const seasonWinnersCol = seasonWinnersIndex + 2;
      leaderboardSheet.getRange(6, seasonWinnersCol, teamCount, 1).clearContent();
      const placesRange = leaderboardSheet.getRange(6, 2, teamCount, 1).getValues();
      const teamsRange = leaderboardSheet.getRange(6, 3, teamCount, 1).getValues();
      const teamsByPlace = {};
      for (let i = 0; i < teamCount; i++) {
          const place = placesRange[i][0];
          if (!teamsByPlace[place]) {
              teamsByPlace[place] = [];}
          teamsByPlace[place].push({ index: i, name: teamsRange[i][0] });}     
      const uniquePlaces = Object.keys(teamsByPlace)
          .map(p => parseInt(p))
          .sort((a, b) => a - b);  
      const prizeValues = new Array(teamCount).fill(0);
      let prizesUsed = 0;
      for (let placeIndex = 0; placeIndex < uniquePlaces.length && prizesUsed < numWinners; placeIndex++) {
          const currentPlace = uniquePlaces[placeIndex];
          const teamsAtThisPlace = teamsByPlace[currentPlace];
          const numTeamsAtThisPlace = teamsAtThisPlace.length;
          const remainingPrizes = numWinners - prizesUsed;
          const prizesToPool = Math.min(numTeamsAtThisPlace, remainingPrizes);          
          if (prizesToPool === 0) break;
          let pooledAmount = 0;
          for (let i = 0; i < prizesToPool; i++) {
              const prizePosition = prizesUsed + i + 1;
              if (prizePosition === 1) pooledAmount += firstPrize;
              else if (prizePosition === 2) pooledAmount += secondPrize;
              else if (prizePosition === 3) pooledAmount += thirdPrize;}         
          const prizePerTeam = pooledAmount / numTeamsAtThisPlace;        
          teamsAtThisPlace.forEach(team => {
              prizeValues[team.index] = prizePerTeam;});        
          prizesUsed += numTeamsAtThisPlace;}
      const prizeValuesArray = prizeValues.map(value => [value]);
      leaderboardSheet.getRange(6, seasonWinnersCol, teamCount, 1)
          .setValues(prizeValuesArray)
          .setNumberFormat("$#,##0.00");}
  async function migrateHistoricalGames() {
      console.log("Starting historical games migration...");
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const seasonSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SEASON.NAME);
      const completedSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.COMPLETED.NAME);
      try {
          const lastRow = seasonSheet.getLastRow();
          if (lastRow < CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW) {
              console.log("No games to migrate - sheet appears empty");
              return;}
          const maxColumn = Math.max(
              CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME,
              21);
          const seasonDataRange = seasonSheet.getRange(
              CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW,
              1,  // Start at column A
              lastRow - CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW + 1,
              maxColumn);
          const displayValues = seasonDataRange.getDisplayValues();
          const rawValues = seasonDataRange.getValues();
          const GAME_ID_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_ID - 1;
          const DATE_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.DATE - 1;
          const TIME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TIME - 1;
          const STATUS_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.STATUS - 1;
          const WEEK_NAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.WEEK_NAME - 1;
          const BOWL_NAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.BOWL_NAME - 1;
          const TEAM_1_RANK_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_1_RANK - 1;
          const TEAM_1_NAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_1_NAME - 1;
          const TEAM_1_ABBREV_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_1_ABBREV - 1;
          const TEAM_2_RANK_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_2_RANK - 1;
          const TEAM_2_NAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_2_NAME - 1;
          const TEAM_2_ABBREV_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_2_ABBREV - 1;
          const SCORE_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.SCORE - 1;
          const CONFERENCE_GAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.CONFERENCE_GAME - 1;
          const GAME_TIME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME - 1;
          let hasValidData = false;
          for (let i = 0; i < rawValues.length; i++) {
              if (rawValues[i][GAME_ID_INDEX]) {
                  hasValidData = true;
                  console.log(`Found game ID at row ${i + CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW}: ${rawValues[i][GAME_ID_INDEX]}`);
                  break;}}
          if (!hasValidData) {
              console.log("No valid games found - Game ID column appears empty");
              return;}
          const completedLastRow = completedSheet.getLastRow();
          const completedGameIds = new Set();
          if (completedLastRow >= CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW) {
              const completedDataRange = completedSheet.getRange(
                  CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW,
                  1,
                  completedLastRow - CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW + 1,
                  maxColumn);
              const completedData = completedDataRange.getValues();
              completedData.forEach(row => {
                  const gameId = row[GAME_ID_INDEX];
                  if (gameId) completedGameIds.add(gameId);});}
          const today = new Date();
          const pendingGames = [];
          for (let i = 0; i < rawValues.length; i++) {
              const gameId = rawValues[i][GAME_ID_INDEX];
              if (!gameId) continue;
              if (completedGameIds.has(gameId)) continue;
              const dateStr = displayValues[i][DATE_INDEX];
              const timeStr = displayValues[i][TIME_INDEX];
              if (!dateStr || dateStr.trim() === '') {
                  console.log(`Game ${gameId} has no date`);
                  continue;}
              let gameDate;
              try {
                  if (timeStr && timeStr.trim() !== '') {
                      gameDate = new Date(`${dateStr} ${timeStr}`);
                  } else {
                      gameDate = new Date(dateStr);}
                  if (isNaN(gameDate.getTime()) || gameDate.getFullYear() < 2000 || gameDate.getFullYear() > 2030) {
                      console.log(`Game ${gameId} has invalid date: ${dateStr} ${timeStr}`);
                      continue;}
              } catch (error) {
                  console.log(`Error parsing date for game ${gameId}: ${dateStr} ${timeStr}`);
                  continue;}
              const gameStatus = rawValues[i][STATUS_INDEX];
              if (gameDate < today || gameStatus === 'post') {
                  pendingGames.push({
                      rawData: rawValues[i],
                      displayData: displayValues[i],
                      gameId: gameId,
                      weekName: displayValues[i][WEEK_NAME_INDEX]});}}
          if (pendingGames.length === 0) {
              console.log("No historical games to migrate");
              return;}
          console.log(`Found ${pendingGames.length} games to migrate`);
          const batchSize = 30;
          let processedCount = 0;
          for (let i = 0; i < pendingGames.length; i += batchSize) {
              const batch = pendingGames.slice(i, i + batchSize);
              try {
                  const completedGames = batch.map(game => {
                      const dateStr = game.displayData[DATE_INDEX];
                      const timeStr = game.displayData[TIME_INDEX];
                      let gameDateISO;
                      if (game.rawData[GAME_TIME_INDEX]) {
                          gameDateISO = game.rawData[GAME_TIME_INDEX];
                      } else {
                          try {
                              const dateObj = new Date(`${dateStr} ${timeStr}`);
                              if (!isNaN(dateObj.getTime())) {
                                  gameDateISO = dateObj.toISOString();
                              } else {
                                  console.log(`Invalid date for game ${game.gameId}: ${dateStr} ${timeStr}`);
                                  return null;}
                          } catch (err) {
                              console.log(`Error parsing date for game ${game.gameId}: ${err.message}`);
                              return null;}}
                      let awayScore = 0, homeScore = 0;
                      const scoreStr = game.rawData[SCORE_INDEX];
                      if (scoreStr && typeof scoreStr === 'string') {
                          const scoreParts = scoreStr.split(' - ');
                          if (scoreParts.length === 2) {
                              const awayMatch = scoreParts[0].match(/\d+/);
                              const homeMatch = scoreParts[1].match(/\d+/);
                              awayScore = awayMatch ? parseInt(awayMatch[0]) : 0;
                              homeScore = homeMatch ? parseInt(homeMatch[0]) : 0;}}
                      const gameObject = {
                          id: game.gameId,
                          status: { type: { state: 'post' } },
                          competitions: [{
                              date: gameDateISO,
                              notes: [{ headline: game.rawData[BOWL_NAME_INDEX] || '' }],
                              conferenceCompetition: game.rawData[CONFERENCE_GAME_INDEX] === "Yes",
                              competitors: [
                                  {
                                      homeAway: "away",
                                      team: {
                                          shortDisplayName: game.rawData[TEAM_1_NAME_INDEX] || '',
                                          abbreviation: game.rawData[TEAM_1_ABBREV_INDEX] || ''},
                                      curatedRank: {
                                          current: game.rawData[TEAM_1_RANK_INDEX] || 99},
                                      score: awayScore},
                                  {
                                      homeAway: "home",
                                      team: {
                                          shortDisplayName: game.rawData[TEAM_2_NAME_INDEX] || '',
                                          abbreviation: game.rawData[TEAM_2_ABBREV_INDEX] || ''},
                                      curatedRank: {
                                          current: game.rawData[TEAM_2_RANK_INDEX] || 99},
                                      score: homeScore}]}]};
                      const processedGame = processGameData(
                          gameObject,
                          game.weekName,
                          'COMPLETED');
                      if (processedGame && processedGame.data) {
                          const finalDate = processedGame.data[DATE_INDEX];
                          if (!finalDate || finalDate === '' || finalDate.includes('1969')) {
                              processedGame.data[DATE_INDEX] = dateStr;
                              processedGame.data[TIME_INDEX] = timeStr;}
                          return processedGame.data;}
                      return null;});
                  const validGames = completedGames.filter(game => 
                      game && 
                      game.length === CONFIG.SHEETS.SPECIFIC.COMPLETED.REQUIRED_COLUMNS.length &&
                      !game[DATE_INDEX].toString().includes('1969'));
                  if (validGames.length > 0) {
                      const lastRow = completedSheet.getLastRow();
                      const writeRow = Math.max(lastRow + 1, CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW);
                      const targetRange = completedSheet.getRange(
                          writeRow,
                          2,  // Write starting at column B
                          validGames.length,
                          CONFIG.SHEETS.SPECIFIC.COMPLETED.REQUIRED_COLUMNS.length);
                      targetRange.setValues(validGames);
                      processedCount += validGames.length;
                      console.log(`Migrated batch of ${validGames.length} games`);}
                  if (i + batchSize < pendingGames.length) {
                      Utilities.sleep(500);} 
              } catch (error) {
                  console.error(`Error processing batch starting at index ${i}:`, error);}}
          console.log(`Migration complete: ${processedCount} games successfully migrated`);
          if (processedCount > 0) {
              const sheetManager = SheetManager.getInstance();
              sheetManager.applyWeekRowColoring(completedSheet, 'COMPLETED');
              console.log("Applied week row coloring and bowl formatting to Completed sheet");}
      } catch (error) {
          console.error("Error in migrateHistoricalGames:", error);
          throw error;}}
  function updateAffectedUserSheets(processedGames) {
      console.log("Updating user sheets affected by completed games...");
      
      // Enhanced debugging
      console.log("Type of processedGames:", typeof processedGames);
      console.log("Is Array?:", Array.isArray(processedGames));
      console.log("Length:", processedGames ? processedGames.length : "N/A");
      if (processedGames && processedGames.length > 0) {
          console.log("First item:", JSON.stringify(processedGames[0]));
      }
      
      // Remove the early return temporarily to see what happens
      if (!processedGames || !Array.isArray(processedGames)) {
          console.log("Invalid processedGames parameter");
          return;
      }
      
      if (processedGames.length === 0) {
          console.log("Empty processedGames array");
          return;
      }
      
      const affectedSchools = new Set();
      
      // The processedGames array contains the data as it appears in the REQUIRED_COLUMNS
      // Based on COMPLETED REQUIRED_COLUMNS:
      // Index 8: Winner Team
      // Index 12: Loser Team
      processedGames.forEach((gameData, index) => {
          console.log(`Processing game ${index}:`, gameData ? `Length=${gameData.length}` : "null");
          
          if (gameData && gameData.length > 12) {
              const winnerTeam = gameData[8];  // Winner Team is at index 8
              const loserTeam = gameData[12];  // Loser Team is at index 12
              
              console.log(`  Game ${index}: Winner=${winnerTeam}, Loser=${loserTeam}`);
              
              if (winnerTeam) affectedSchools.add(winnerTeam);
              if (loserTeam) affectedSchools.add(loserTeam);
          } else {
              console.log(`  Game ${index}: Skipped - insufficient data`);
          }
      });
      
      console.log(`Total affected schools: ${affectedSchools.size}`);
      console.log(`Affected schools: ${Array.from(affectedSchools).join(', ')}`);
      
      if (affectedSchools.size === 0) {
          console.log("No affected schools found, exiting");
          return;
      }
      
      const teamsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Teams');
      if (!teamsSheet) {
          console.error("Teams sheet not found");
          return;
      }
      
      const teamsData = teamsSheet.getDataRange().getValues();
      const weekManager = WeekManager.getInstance();
      const currentWeek = weekManager.getCurrentWeek();
      const weekNum = currentWeek === "Bowls" || currentWeek === "CFP" ? 16 : 
                      parseInt(currentWeek.replace('Week ', ''));
      
      console.log(`Checking teams for week ${weekNum}`);
      
      const affectedTeams = new Set();
      teamsData.slice(1).forEach(row => {
          if (row[1] === weekNum) {  // Current week only
              const teamName = row[0];
              const schools = row.slice(2).filter(Boolean);
              if (schools.some(school => affectedSchools.has(school))) {
                  affectedTeams.add(teamName);
                  console.log(`  Team ${teamName} has affected schools`);
              }
          }
      });
      
      console.log(`Found ${affectedTeams.size} teams to update`);
      
      if (affectedTeams.size === 0) {
          console.log("No teams need updating");
          return;
      }
      
      affectedTeams.forEach(teamName => {
          try {
              console.log(`Updating points for team: ${teamName}`);
              updateSingleUserSheetPoints(teamName);
          } catch (error) {
              console.error(`Error updating ${teamName}:`, error);
          }
      });
  }
  function updateSingleUserSheetPoints(teamName) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(teamName);
    if (!sheet) {
      console.warn(`Sheet not found for team: ${teamName}`);
      return;}
    const pointsCalculator = new PointsCalculator(sheet, teamName);
    pointsCalculator.calculatePoints();
    console.log(`Updated points for ${teamName}`);}
// 11. Main Operations
  async function populateSeasonSchedule() {
    console.log("Starting season schedule population...");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SEASON.NAME);
    try {
      const lastRow = sheet.getLastRow();
      if (lastRow >= CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW) {
        sheet.getRange(
          CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW, 
          2, 
          lastRow - CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW + 1, 
          sheet.getLastColumn() - 1
        ).clear();}
      const calendar = await GameAPI.getCalendar();
      console.log(`Season runs from ${calendar.seasonStart} to ${calendar.seasonEnd}`);
      const processedGameIds = new Set();
      let totalGamesWritten = 0;
      let currentWriteRow = CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW; // Track where to write next
      for (const week of calendar.entries) {
        if (week.label?.toLowerCase().includes('all-star')) {
          console.log(`Skipping all-star week: ${week.label}`);
          continue;}
        console.log(`Processing ${week.label}...`);
        try {
          const games = await GameAPI.getGamesForDateRange(week.startDate, week.endDate);
          const weekGames = [];
          for (const game of games) {
            if (processedGameIds.has(game.id) || 
                game.season?.type?.name?.toLowerCase().includes('all-star')) {
              continue;}
            try {
              const processedGame = processGameData(game, week.label, 'SEASON');
              if (processedGame && processedGame.data) {
                weekGames.push(processedGame.data);
                processedGameIds.add(game.id);}
            } catch (gameError) {
              console.error(`Error processing game ${game.id}:`, gameError);}}
          if (weekGames.length > 0) {
            weekGames.sort((a, b) => {
              const dateA = new Date(a[CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME]);
              const dateB = new Date(b[CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME]);
              return dateA - dateB;});
            const targetRange = sheet.getRange(
              currentWriteRow,     // Current row position
              2,                   // Column 2 (Column B)
              weekGames.length,    // Number of rows for this week
              CONFIG.SHEETS.SPECIFIC.SEASON.REQUIRED_COLUMNS.length);
            targetRange.setValues(weekGames);
            SpreadsheetApp.flush();
            console.log(`Wrote ${weekGames.length} games for ${week.label} at row ${currentWriteRow}`);
            currentWriteRow += weekGames.length;
            totalGamesWritten += weekGames.length;}
          await Utilities.sleep(CONFIG.SYSTEM.API.RETRY.DELAY);
        } catch (weekError) {
          console.error(`Error processing week ${week.label}:`, weekError);}}
      if (totalGamesWritten === 0) {
        console.log("No games found to populate");
      } else {
        console.log(`Successfully populated ${totalGamesWritten} games total`);
        const sheetManager = SheetManager.getInstance();
        sheetManager.applyWeekRowColoring(sheet, 'SEASON');
        console.log("Applied week row coloring and bowl formatting to Season sheet");}
        colorSchoolCells(sheet);
    } catch (error) {
      console.error("Fatal error in populateSeasonSchedule:", error);
      throw error;}
  }
  function setupDailyGames(liveSheet = null) {
      console.log("Starting daily games setup...");
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      
      try {
          // Debug logging to see what was passed
          console.log("liveSheet parameter type:", typeof liveSheet);
          if (liveSheet) {
              console.log("liveSheet has getLastRow method?", typeof liveSheet.getLastRow === 'function');
          }
          
          // Robust validation - check if it's actually a Sheet object
          if (!liveSheet || typeof liveSheet.getLastRow !== 'function') {
              console.log("Invalid or missing liveSheet, fetching from config...");
              liveSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.LIVE.NAME);
              if (!liveSheet) {
                  console.error("Live Scoring sheet not found: " + CONFIG.SHEETS.SPECIFIC.LIVE.NAME);
                  return;
              }
              console.log("Successfully fetched Live Scoring sheet");
          }
          
          // Validate we have a working sheet
          try {
              const testRow = liveSheet.getLastRow();
              console.log("Live sheet validated, last row: " + testRow);
          } catch (e) {
              console.error("Live sheet validation failed:", e);
              console.error("Attempting to re-fetch Live Scoring sheet...");
              liveSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.LIVE.NAME);
              if (!liveSheet) {
                  console.error("Could not get valid Live Scoring sheet");
                  return;
              }
          }
          
          const seasonSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SEASON.NAME);
          if (!seasonSheet) {
              console.log("Season Schedule sheet not found, skipping daily games setup");
              return;
          }
          
          const today = new Date();
          console.log("Setting up games for:", today);
          
          // Column indices
          const GAME_ID_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_ID - 1;
          const WEEK_NAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.WEEK_NAME - 1;
          const DATE_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.DATE - 1;
          const TIME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TIME - 1;
          const BOWL_NAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.BOWL_NAME - 1;
          const TEAM_1_RANK_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_1_RANK - 1;
          const TEAM_1_NAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_1_NAME - 1;
          const TEAM_1_ABBREV_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_1_ABBREV - 1;
          const TEAM_2_RANK_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_2_RANK - 1;
          const TEAM_2_NAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_2_NAME - 1;
          const TEAM_2_ABBREV_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_2_ABBREV - 1;
          const STATUS_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.STATUS - 1;
          const SCORE_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.SCORE - 1;
          const CONFERENCE_GAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.CONFERENCE_GAME - 1;
          const GAME_TIME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME - 1;
          
          const lastRow = seasonSheet.getLastRow();
          const dataStartRow = CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW;
          
          if (lastRow < dataStartRow) {
              console.log("No games in season schedule");
              return;
          }
          
          const numColumns = Math.max(
              CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME,
              CONFIG.SHEETS.SPECIFIC.SEASON.REQUIRED_COLUMNS.length
          );
          
          const seasonDataRange = seasonSheet.getRange(
              dataStartRow,
              1,
              lastRow - dataStartRow + 1,
              numColumns
          );
          
          // GET BOTH DISPLAY VALUES AND RAW VALUES - THIS IS THE KEY FIX
          const displayValues = seasonDataRange.getDisplayValues();
          const rawValues = seasonDataRange.getValues();
          
          // Filter for today's games using raw values for date comparison
          const todayGames = [];
          for (let i = 0; i < rawValues.length; i++) {
              const gameDate = new Date(rawValues[i][DATE_INDEX]);
              if (gameDate.getFullYear() === today.getFullYear() &&
                  gameDate.getMonth() === today.getMonth() &&
                  gameDate.getDate() === today.getDate()) {
                  // Store both raw and display values for this game
                  todayGames.push({
                      raw: rawValues[i],
                      display: displayValues[i]
                  });
              }
          }
          
          console.log(`Found ${todayGames.length} games for today`);
          
          // Clear existing data in Live Scoring sheet
          const liveLastRow = liveSheet.getLastRow();
          if (liveLastRow >= dataStartRow) {
              console.log(`Clearing existing data from row ${dataStartRow} to ${liveLastRow}`);
              liveSheet.getRange(
                  dataStartRow,
                  1,
                  liveLastRow - dataStartRow + 1,
                  liveSheet.getLastColumn()
              ).clear();
          }
          
          // Update timestamp
          liveSheet.getRange(CONFIG.SHEETS.STRUCTURE.COMMON.TIMESTAMP_CELL)
              .setValue("Last Updated: " + Utils.formatDate(new Date(), CONFIG.SYSTEM.TIME.FORMATS.TIMESTAMP));
          
          // Clear any existing triggers
          if (typeof manageLiveScoringTriggers === 'function') {
              manageLiveScoringTriggers('clear');
          } else {
              console.log("manageLiveScoringTriggers function not found, skipping");
          }
          
          if (todayGames.length > 0) {
              const liveGames = todayGames.map(gameData => {
                  const game = gameData.raw;
                  const displayGame = gameData.display;
                  
                  // Use display values for date and time to preserve formatting
                  const dateStr = displayGame[DATE_INDEX];
                  const timeStr = displayGame[TIME_INDEX];
                  
                  // Try to create gameDateTime for the last column, but don't let it corrupt our display
                  let gameDateTime = '';
                  try {
                      const gameDate = new Date(game[DATE_INDEX]);
                      if (timeStr && gameDate) {
                          const timeMatch = String(timeStr).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                          if (timeMatch) {
                              let hours = parseInt(timeMatch[1]);
                              const minutes = parseInt(timeMatch[2]);
                              const isPM = timeMatch[3].toUpperCase() === 'PM';
                              
                              if (isPM && hours !== 12) hours += 12;
                              if (!isPM && hours === 12) hours = 0;
                              
                              gameDateTime = new Date(gameDate);
                              gameDateTime.setHours(hours, minutes, 0, 0);
                          }
                      }
                      
                      // Check for invalid date (1969 or other issues)
                      if (gameDateTime && gameDateTime.getFullYear() < 2000) {
                          gameDateTime = game[GAME_TIME_INDEX] || '';
                      }
                  } catch (e) {
                      console.log("Error creating gameDateTime, using fallback");
                      gameDateTime = game[GAME_TIME_INDEX] || '';
                  }
                  
                  const liveGameData = [
                      game[GAME_ID_INDEX],
                      "", // Empty column
                      displayGame[WEEK_NAME_INDEX],  // Use display value
                      dateStr,  // Use display value for date
                      timeStr,  // Use display value for time
                      "", // Empty column
                      game[BOWL_NAME_INDEX],
                      game[TEAM_1_RANK_INDEX],
                      game[TEAM_1_NAME_INDEX],
                      game[TEAM_1_ABBREV_INDEX],
                      game[TEAM_2_RANK_INDEX],
                      game[TEAM_2_NAME_INDEX],
                      game[TEAM_2_ABBREV_INDEX],
                      "", // Away Score
                      "", // Home Score
                      "", // Empty column
                      game[STATUS_INDEX],
                      "", // Quarter
                      "", // Clock
                      "", // Possession
                      "", // Possession Image
                      "", // Possession Team
                      displayGame[SCORE_INDEX],  // Use display value for score
                      "", // Empty column
                      game[CONFERENCE_GAME_INDEX],
                      "", // Empty column
                      gameDateTime
                  ];
                  
                  return liveGameData;
              });
              
              console.log(`Writing ${liveGames.length} games to Live Scoring sheet`);
              liveSheet.getRange(
                  dataStartRow,
                  2,
                  liveGames.length,
                  CONFIG.SHEETS.SPECIFIC.LIVE.REQUIRED_COLUMNS.length
              ).setValues(liveGames);
              
              // FIX: Format the buffer/separator columns with the correct background color
              const finalRow = dataStartRow + liveGames.length - 1;
              const bufferColor = CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT || "#154655";
              
              // Format buffer columns: A, C, G, Q, Y, AA (columns 1, 3, 7, 17, 25, 27)
              const bufferColumns = [
                  { col: 1, label: "A" },   // Column A
                  { col: 3, label: "C" },   // Column C
                  { col: 7, label: "G" },   // Column G
                  { col: 17, label: "Q" },  // Column Q
                  { col: 25, label: "Y" },  // Column Y
                  { col: 27, label: "AA" }  // Column AA
              ];
              
              bufferColumns.forEach(buffer => {
                  try {
                      const range = liveSheet.getRange(dataStartRow, buffer.col, liveGames.length, 1);
                      range.setBackground(bufferColor);
                      console.log(`Set background color for column ${buffer.label} from row ${dataStartRow} to ${finalRow}`);
                  } catch (e) {
                      console.error(`Error setting background for column ${buffer.label}:`, e);
                  }
              });
              
              // Color school cells if function exists
              if (typeof colorSchoolCells === 'function') {
                  colorSchoolCells(liveSheet);
              } else {
                  console.log("colorSchoolCells function not found, skipping");
              }
              
              // Setup smart triggers if function exists - pass the raw game data
              if (typeof setupSmartLiveScoringTriggers === 'function') {
                  setupSmartLiveScoringTriggers(todayGames.map(g => g.raw));
              } else {
                  console.log("setupSmartLiveScoringTriggers function not found, skipping");
              }
              
              console.log("Daily games setup completed successfully");
          } else {
              console.log("No games scheduled for today");
          }
          
      } catch (error) {
          console.error("Error in setupDailyGames:", error);
          console.error("Error stack:", error.stack);
          throw error;
      }
  }
  function setupSmartLiveScoringTriggers(todayGames) {
      const GAME_TIME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME - 1;
      const DATE_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.DATE - 1;
      const TIME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TIME - 1;
      const gameTimes = todayGames.map(game => {
          if (game[GAME_TIME_INDEX]) {
              return new Date(game[GAME_TIME_INDEX]);
          } else {
              const dateStr = game[DATE_INDEX];
              const timeStr = game[TIME_INDEX];
              return new Date(`${dateStr} ${timeStr}`);}
      }).filter(time => !isNaN(time.getTime()));
      if (gameTimes.length === 0) {
          console.log("No valid game times found");
          return;}
      const earliestGame = new Date(Math.min(...gameTimes));
      const now = new Date();
      const startTriggerTime = new Date(earliestGame.getTime() - (10 * 60 * 1000));      
      console.log(`First game at: ${earliestGame}`);
      console.log(`Will start live scoring at: ${startTriggerTime}`);      
      if (startTriggerTime > now) {
          console.log(`Scheduling live scoring to start at ${startTriggerTime}`);
          ScriptApp.newTrigger('startLiveScoring')
              .timeBased()
              .at(startTriggerTime)
              .create();
      } else {
          console.log("Games in progress or about to start, starting live scoring now");
          startLiveScoring();}}
  function startLiveScoring() {
      console.log("Starting live scoring updates...");
      const triggers = ScriptApp.getProjectTriggers();
      triggers.forEach(trigger => {
          if (trigger.getHandlerFunction() === 'updateLiveScoresWithCheck' ||
              trigger.getHandlerFunction() === 'startLiveScoring') {
              ScriptApp.deleteTrigger(trigger);}});
      ScriptApp.newTrigger('updateLiveScoresWithCheck')
          .timeBased()
          .everyMinutes(1)
          .create();
      console.log("Live scoring trigger created - running every minute");
      updateLiveScoresOptimized();}
  async function updateLiveScoresWithCheck() {
      console.log("Running live scores update with completion check...");
      try {
          await updateLiveScoresOptimized();
          const liveSheet = SpreadsheetApp.getActiveSpreadsheet()
              .getSheetByName(CONFIG.SHEETS.SPECIFIC.LIVE.NAME);
          const lastRow = liveSheet.getLastRow();
          const dataStartRow = CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW;
          let shouldStop = false;
          if (lastRow < dataStartRow) {
              console.log("No games remaining in live sheet - all games completed");
              shouldStop = true;}
          if (!shouldStop && lastRow >= dataStartRow) {
              const STATUS_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.STATUS + 1;
              const games = liveSheet.getRange(
                  dataStartRow,
                  1,
                  lastRow - dataStartRow + 1,
                  CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME
              ).getValues();
              const hasLiveGames = games.some(game => 
                  game[STATUS_INDEX] && 
                  game[STATUS_INDEX] !== '' && 
                  game[STATUS_INDEX] !== 'post');             
              if (!hasLiveGames) {
                  console.log("All games showing 'post' status or no status");
                  shouldStop = true;}}
          if (shouldStop) {
              console.log("Stopping live scoring - all games completed");
              stopLiveScoring();}
      } catch (error) {
          console.error("Error in updateLiveScoresWithCheck:", error);}}
  function stopLiveScoring() {
      console.log("Stopping live scoring triggers...");
      const triggers = ScriptApp.getProjectTriggers();
      let deletedCount = 0;
      triggers.forEach(trigger => {
          const handler = trigger.getHandlerFunction();
          if (handler === 'updateLiveScoresWithCheck' || 
              handler === 'startLiveScoring' ||
              handler === 'manageLiveScoringTriggers') {
              try {
                  ScriptApp.deleteTrigger(trigger);
                  deletedCount++;
                  console.log(`Deleted trigger: ${handler}`);
              } catch (e) {
                  console.error(`Error deleting trigger ${handler}:`, e);}}});
      PropertiesService.getScriptProperties().deleteProperty('liveScoringStartTime');
      PropertiesService.getScriptProperties().deleteProperty('liveScoringEndTime');
      console.log(`Live scoring stopped - deleted ${deletedCount} triggers`);
      SpreadsheetApp.getActiveSpreadsheet().toast(
          'Live scoring has ended for today',
          'Live Scoring Complete',
          5);}
  function manageLiveScoringTriggers(action = 'clear') {
      console.log(`Live scoring trigger action: ${action}`);
      if (action === 'clear' || action === 'stop') {
          stopLiveScoring();
      } else if (action === 'start') {
          PropertiesService.getScriptProperties().setProperty(
              'liveScoringStartTime',
              new Date().getTime().toString());
          startLiveScoring();}}
  async function updateLiveScoresOptimized() {
      console.log("Starting optimized live score updates...");
      
      // ENHANCEMENT 1: Check if another instance is already running
      // This prevents overlapping executions when games take longer to process
      const runningKey = 'live_scoring_running';
      const runningCheck = PropertiesService.getScriptProperties().getProperty(runningKey);
      
      if (runningCheck) {
          const runningTime = parseInt(runningCheck);
          const elapsed = new Date().getTime() - runningTime;
          
          if (elapsed < 50000) { // If less than 50 seconds (gives buffer before next minute trigger)
              console.log("Another instance is already running, skipping this execution");
              console.log(`Previous instance started ${elapsed/1000} seconds ago`);
              return;
          } else {
              console.log("Previous instance appears stuck (>50 seconds), proceeding anyway");
          }
      }
      
      // ENHANCEMENT 2: Mark this instance as running
      PropertiesService.getScriptProperties().setProperty(runningKey, new Date().getTime().toString());
      
      try {
          const ss = SpreadsheetApp.getActiveSpreadsheet();
          const liveSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.LIVE.NAME);
          const completedSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.COMPLETED.NAME);
          
          const dataStartRow = CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW;
          const lastRow = liveSheet.getLastRow();
          
          if (lastRow < dataStartRow) {
              console.log("No games found in Live Scoring sheet");
              return;
          }
          
          // Column indices (0-based for array access)
          const GAME_ID_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_ID - 1;
          const WEEK_NAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.WEEK_NAME - 1;
          const numColumns = CONFIG.SHEETS.SPECIFIC.LIVE.REQUIRED_COLUMNS.length;
          
          // Get all live games data
          const liveDataRange = liveSheet.getRange(
              dataStartRow,
              1,  // Start at column A
              lastRow - dataStartRow + 1,
              Math.max(CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME, numColumns)
          );
          
          const games = liveDataRange.getValues();
          
          // Create map of game IDs to their data and row positions
          const gameMap = new Map(games.map((game, index) => [
              game[GAME_ID_INDEX].toString().trim(),
              { data: game, index: index + dataStartRow }
          ]));
          
          const gameIds = Array.from(gameMap.keys()).filter(id => id);
          
          if (gameIds.length === 0) {
              console.log("No games to update");
              return;
          }
          
          console.log(`Fetching updates for ${gameIds.length} games...`);
          
          // Fetch updates from ESPN API
          const gameUpdates = await GameAPI.getBatchGameUpdates(gameIds);
          
          if (!gameUpdates || gameUpdates.length === 0) {
              console.log("No game updates received from API");
              return;
          }
          
          console.log(`Received updates for ${gameUpdates.length} games`);
          
          // Separate live updates from completed games
          const updates = [];
          const completedGames = [];
          
          for (const gameUpdate of gameUpdates) {
              const gameInfo = gameMap.get(gameUpdate.id);
              if (!gameInfo) continue;
              
              try {
                  const processedGame = processGameData(
                      gameUpdate,
                      gameInfo.data[WEEK_NAME_INDEX],
                      'LIVE'
                  );
                  
                  const gameStatus = gameUpdate.status?.type?.state || 'pre';
                  
                  console.log(`Game ${gameUpdate.id}:`);
                  console.log(`  - Status from API: "${gameStatus}"`);
                  console.log(`  - Full status object:`, JSON.stringify(gameUpdate.status));
                  console.log(`  - Competition status:`, JSON.stringify(gameUpdate.competitions?.[0]?.status));
                  
                  if (gameStatus === 'post') {
                      // Game is completed - prepare for moving to Completed sheet
                      const weekName = gameInfo.data[WEEK_NAME_INDEX];  // Preserve the original week name
                      const completedData = processGameData(
                          gameUpdate,
                          weekName,
                          'COMPLETED'
                      );
                      
                      if (completedData && completedData.data) {
                          completedGames.push({
                              rowIndex: gameInfo.index,
                              gameData: completedData.data,
                              weekName: weekName  // Store week name separately
                          });
                      }
                  } else {
                      // Game is still live - update the Live sheet
                      if (processedGame && processedGame.data) {
                          updates.push({
                              row: gameInfo.index,
                              data: processedGame.data
                          });
                      }
                  }
              } catch (error) {
                  console.error(`Error processing game update for ${gameUpdate.id}:`, error);
              }
          }
          
          // Update live games in the Live Scoring sheet
          if (updates.length > 0) {
              console.log(`Updating ${updates.length} live games...`);
              
              for (const update of updates) {
                  if (update.data.length === numColumns) {
                      // Write starting at column 2 (B) since column 1 is hidden Game ID
                      liveSheet.getRange(update.row, 2, 1, numColumns).setValues([update.data]);
                  } else {
                      console.error(`Skipping update for row ${update.row}: Invalid data length`);
                  }
              }
              
              // Apply formatting
              colorSchoolCells(liveSheet);
          }
          
          // ENHANCEMENT 3: Process completed games with the fixed batchProcessCompletedGames
          // The fixed version includes duplicate checking
          if (completedGames.length > 0) {
              console.log(`\n=== COMPLETED GAMES TO PROCESS ===`);
              completedGames.forEach(game => {
                  console.log(`  - Row ${game.rowIndex}: Game ID ${game.gameData[0]}`);
              });
              console.log(`===================================\n`);
              
              // This now includes duplicate checking in the fixed version
              await batchProcessCompletedGames(completedGames, liveSheet, completedSheet);
          }
          
          // Update the timestamp
          liveSheet.getRange(CONFIG.SHEETS.STRUCTURE.COMMON.TIMESTAMP_CELL)
              .setValue(`Last Updated: ${Utils.formatDate(new Date(), CONFIG.SYSTEM.TIME.FORMATS.TIMESTAMP)}`);
          
          console.log(`Update complete: ${updates.length} games updated, ${completedGames.length} games completed`);
          
      } catch (error) {
          console.error("Fatal error in updateLiveScoresOptimized:", error);
          throw error;
          
      } finally {
          // ENHANCEMENT 4: Always clear the running flag, even if there's an error
          // This prevents the system from getting stuck if an error occurs
          PropertiesService.getScriptProperties().deleteProperty(runningKey);
          console.log("Cleared running flag");
      }
  }
  async function verifyCompletedGames() {
    console.log("Starting completed games verification with correct column mapping...");
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const seasonSheet = ss.getSheetByName('Season Schedule');
    const completedSheet = ss.getSheetByName('Completed Games Cache');
    
    try {
      const startRow = 6;
      const today = new Date();
      
      console.log("Step 1: Getting valid completed games from Season Schedule...");
      const seasonLastRow = seasonSheet.getLastRow();
      if (seasonLastRow < startRow) {
        console.log("No season data to verify");
        return;
      }
      
      // Get ALL columns to match your actual sheet structure
      const seasonData = seasonSheet.getRange(startRow, 1, seasonLastRow - startRow + 1, 20).getValues();
      const validSeasonGameIds = new Set();
      
      // CORRECT column indexes based on your debug output:
      const GAME_ID_COL = 1;    // Column B (Game ID)
      const WEEK_COL = 3;        // Column D (Week Name)
      const DATE_COL = 4;        // Column E (Date)
      const TIME_COL = 5;        // Column F (Time - probably)
      const STATUS_COL = 15;     // Column P (Status = "post")
      const SCORE_COL = 16;      // Column Q (Score)
      
      // Find all games with status="post"
      let postCount = 0;
      seasonData.forEach((row, index) => {
        const gameId = row[GAME_ID_COL];
        const status = row[STATUS_COL];
        const gameDate = row[DATE_COL];
        
        if (gameId && status === 'post') {
          postCount++;
          // Also check if it's a past game
          if (gameDate && gameDate < today) {
            validSeasonGameIds.add(gameId.toString());
            // Log first few for verification
            if (validSeasonGameIds.size <= 5) {
              console.log(`Found completed game: ${gameId} from ${row[WEEK_COL]}`);
            }
          }
        }
      });
      
      console.log(`Found ${postCount} games with status='post'`);
      console.log(`Found ${validSeasonGameIds.size} completed games (post status + past date)`);
      
      // Step 2: Check Completed Games Cache
      console.log("\nStep 2: Checking Completed Games Cache...");
      const completedLastRow = completedSheet.getLastRow();
      const duplicateIds = new Set();
      const seenIds = new Set();
      const invalidIds = new Set();
      
      if (completedLastRow >= startRow) {
        // Completed sheet: Game ID is also in column B (index 1)
        const completedData = completedSheet.getRange(startRow, 1, completedLastRow - startRow + 1, 2).getValues();
        
        completedData.forEach((row, index) => {
          const gameId = row[1]; // Column B
          if (gameId) {
            const idStr = gameId.toString();
            
            // Check for duplicates
            if (seenIds.has(idStr)) {
              duplicateIds.add(idStr);
              console.log(`Duplicate found at row ${index + startRow}: ${idStr}`);
            }
            seenIds.add(idStr);
            
            // Check if valid (exists in Season Schedule)
            if (!validSeasonGameIds.has(idStr)) {
              invalidIds.add(idStr);
              console.log(`Invalid game at row ${index + startRow}: ${idStr} (not in Season with post status)`);
            }
          }
        });
      }
      
      console.log(`Completed Cache has ${seenIds.size} unique games`);
      
      // Step 3: Find missing games
      const missingIds = new Set();
      validSeasonGameIds.forEach(id => {
        if (!seenIds.has(id)) {
          missingIds.add(id);
          console.log(`Missing game: ${id}`);
        }
      });
      
      // Step 4: Report and fix if needed
      console.log("\n=== VERIFICATION RESULTS ===");
      console.log(`Season Schedule: ${validSeasonGameIds.size} completed games`);
      console.log(`Completed Cache: ${seenIds.size} unique games`);
      console.log(`Duplicates: ${duplicateIds.size}`);
      console.log(`Invalid: ${invalidIds.size}`);
      console.log(`Missing: ${missingIds.size}`);
      
      const hasIssues = duplicateIds.size > 0 || invalidIds.size > 0 || missingIds.size > 0;
      
      if (hasIssues) {
        console.log("\n⚠️ Issues detected! Rebuilding Completed Games Cache...");
        
        // Clear the sheet first
        clearCompletedGames();
        
        // Add await for async operation
        await Utilities.sleep(500); // Give time for clear to complete
        
        // Rebuild from Season Schedule
        await migrateHistoricalGames(); // Make this await if migrateHistoricalGames is async
        
        // Apply formatting after migration
        const sheetManager = SheetManager.getInstance();
        sheetManager.applyWeekRowColoring(completedSheet, 'COMPLETED');
        colorSchoolCells(completedSheet);
        
        console.log("✅ Completed Games Cache has been rebuilt");
      } else {
        console.log("\n✅ Completed Games Cache is valid - no issues found!");
      }
      
      return {
        isValid: !hasIssues,
        stats: {
          seasonCompleted: validSeasonGameIds.size,
          cacheGames: seenIds.size,
          duplicates: duplicateIds.size,
          invalid: invalidIds.size,
          missing: missingIds.size
        }
      };
      
    } catch (error) {
      console.error("Error in verification:", error);
      throw error;
    }
  }
  function clearCompletedGames() {
    console.log("Clearing Completed Games Cache...");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const completedSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.COMPLETED.NAME);
    try {
      if (completedSheet.getLastRow() > 1) {
        completedSheet.getRange(CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW, 2, completedSheet.getLastRow() - 1, completedSheet.getLastColumn()).clear();}
      console.log("Completed Games Cache cleared successfully");
    } catch (error) {
      console.error("Error clearing Completed Games Cache:", error);
      throw error;}}
  function resetColumns(sheetName) {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      if (sheet) {
          const lastRow = sheet.getLastRow();
          let startRow;
          let columns;
          
          if (sheetName === CONFIG.SHEETS.SPECIFIC.LIVE.NAME) {
              startRow = CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW;
              columns = CONFIG.SHEETS.STRUCTURE.COLUMNS.RESET_COLUMNS.LIVE;
          } else if (sheetName === CONFIG.SHEETS.SPECIFIC.COMPLETED.NAME) {
              startRow = CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW;
              columns = CONFIG.SHEETS.STRUCTURE.COLUMNS.RESET_COLUMNS.COMPLETED;
          } else if (sheetName === CONFIG.SHEETS.SPECIFIC.SEASON.NAME) {
              startRow = CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW;
              columns = CONFIG.SHEETS.STRUCTURE.COLUMNS.RESET_COLUMNS.SEASON;
          } else {
              startRow = 2;
              columns = [];
          }
          
          if (lastRow >= startRow) {
              // NEW: Get background colors from Column D (reference column with week coloring)
              const referenceColumn = 4; // Column D
              const referenceBackgrounds = sheet.getRange(
                  startRow,
                  referenceColumn,
                  lastRow - startRow + 1,
                  1
              ).getBackgrounds();
              
              columns.forEach((column) => {
                  console.log(`Resetting column ${column} in ${sheetName} from row ${startRow} to ${lastRow}`);
                  const range = sheet.getRange(startRow, column, lastRow - startRow + 1, 1);
                  
                  // NEW: Create backgrounds array from Column D backgrounds
                  const backgrounds = referenceBackgrounds.map(bg => [bg[0]]);
                  
                  console.log(`Before resetting: Font Color: ${range.getFontColor()}, Background Color: ${range.getBackground()}, Font Weight: ${range.getFontWeight()}`);
                  
                  // CHANGED: Set background to match Column D instead of null
                  range.setFontColor('#000000')  // Black text
                      .setBackgrounds(backgrounds)  // Use Column D backgrounds
                      .setFontWeight('normal');  // Normal weight
                  
                  console.log(`After resetting: Using Column D backgrounds, black text, normal weight`);
              });
          }
      } else {
          console.log('Sheet not found:', sheetName);
      }
  }
  function colorSchoolCells(sheetOrRange) {
      const cellStyles = extractCellStyles();
      const formatRanges = [];
      if (sheetOrRange.getSheet) { // Handle single range
          const range = sheetOrRange;
          const values = range.getDisplayValues();
          values.forEach((row, rowIndex) => {
              row.forEach((cellValue, colIndex) => {
                  if (cellStyles[cellValue]) {
                      const cell = range.getCell(rowIndex + 1, colIndex + 1);
                      formatRanges.push({ cell: cell, style: cellStyles[cellValue] });}});});
      } else { // Handle full sheet
          const sheet = sheetOrRange;
          const sheetName = sheet.getName();
          const range = sheet.getDataRange();
          const values = range.getDisplayValues();
          const sheetsWithHeaders = [
              CONFIG.SHEETS.SPECIFIC.LIVE.NAME,
              CONFIG.SHEETS.SPECIFIC.COMPLETED.NAME,
              CONFIG.SHEETS.SPECIFIC.SEASON.NAME];
          const startRow = sheetsWithHeaders.includes(sheetName) 
              ? CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW - 1 
              : 0;
          values.slice(startRow).forEach((row, rowIndex) => {
              row.forEach((cellValue, colIndex) => {
                  if (cellStyles[cellValue]) {
                      const cell = range.getCell(rowIndex + startRow + 1, colIndex + 1);
                      formatRanges.push({ cell: cell, style: cellStyles[cellValue] });}});});}
      formatRanges.forEach(({ cell, style }) => {
          cell
              .setFontColor(style.fontColor)
              .setBackground(style.backgroundColor)
              .setFontWeight(style.isBold ? "bold" : "normal");});
      if (!sheetOrRange.getSheet) {
          resetColumns(sheetOrRange.getName());}}
  function updatePoints() {
      console.log("Starting points update...");
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const pointsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.POINTS.NAME);
      const completedGamesSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.COMPLETED.NAME);
      const seasonSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SEASON.NAME);
      const leaderboardSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME);
      const settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);      
      
      try {
          const pointValues = {
              win: settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.WIN).getValue(),
              conferenceGame: settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_GAME).getValue(),
              over50: settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OVER_50).getValue(),
              shutout: settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.SHUTOUT).getValue(),
              oppRanked25: settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_25).getValue(),
              oppRanked10: settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_10).getValue(),
              conferenceWin: settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_WIN).getValue(),
              heismanWinner: settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HEISMAN_WINNER).getValue(),
              bowlAppearance: settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.BOWL_APPEARANCE).getValue(),
              playoffFirst: settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_FIRST).getValue(),
              playoffQuarter: settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_QUARTER).getValue(),
              playoffSemi: settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_SEMI).getValue(),
              championshipWin: settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CHAMPIONSHIP_WIN).getValue(),
              championshipLoss: settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CHAMPIONSHIP_LOSS).getValue()
          };
          
          const completedGamesData = completedGamesSheet.getDataRange().getValues();
          const seasonData = seasonSheet.getDataRange().getValues();
          const gameData = completedGamesData.slice(CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW - 1);
          console.log(`Found ${gameData.length} completed games in cache`);
          
          if (gameData.length > 0) {
              const firstGame = gameData[0];
              console.log(`First game: Week=${firstGame[CONFIG.SHEETS.STRUCTURE.COLUMNS.WEEK_NAME - 1]}, ` +
                        `Winner=${firstGame[CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.WINNER_TEAM - 1]}, ` +
                        `Loser=${firstGame[CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.LOSER_TEAM - 1]}`);
          }
          
          const WEEK_NAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.WEEK_NAME - 1;
          const WINNER_TEAM_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.WINNER_TEAM - 1;
          const LOSER_TEAM_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.LOSER_TEAM - 1;
          const WINNER_SCORE_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.WINNER_SCORE - 1;
          const LOSER_SCORE_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.LOSER_SCORE - 1;
          const LOSER_RANK_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.LOSER_RANK - 1;
          const CONFERENCE_GAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.CONFERENCE_GAME - 1;
          const GAME_ID_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_ID - 1;
          const BOWL_NAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.BOWL_NAME - 1;
          const TEAM_1_NAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_1_NAME - 1;
          const TEAM_2_NAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_2_NAME - 1;
          const TEAM_1_RANK_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_1_RANK - 1;
          const TEAM_2_RANK_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.TEAM_2_RANK - 1;
          const GAME_TIME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.GAME_TIME - 1;
          
          const schoolsRange = pointsSheet.getRange(
              CONFIG.SHEETS.SPECIFIC.POINTS.SCHOOLS_RANGE.START + ":" + 
              CONFIG.SHEETS.SPECIFIC.POINTS.SCHOOLS_RANGE.END
          );
          const schools = schoolsRange.getValues().map(row => row[0]).filter(Boolean);
          console.log(`Processing points for ${schools.length} schools`);
          
          // Get current week info
          const weekManager = WeekManager.getInstance();
          const currentWeek = weekManager.getCurrentWeek();
          const isRegularSeasonComplete = currentWeek === "Bowls" || currentWeek === "CFP";
          
          // Get Top 12 CFP teams from Leaderboard ONCE for all calculations
          const top12Teams = getTop12TeamsFromLeaderboard(leaderboardSheet);
          console.log(`CFP Top 12: ${top12Teams.join(', ')}`);
          
          // Calculate points for each school
          const allPointsData = [];
          
          schools.forEach((school, schoolIndex) => {
              const rowData = new Array(28).fill(0);
              let totalPoints = 0;
              
              // Process regular season weeks 1-14
              for (let week = 1; week <= 14; week++) {
                  const weekGames = gameData.filter(row => 
                      row[WEEK_NAME_INDEX] === `Week ${week}` && 
                      (row[WINNER_TEAM_INDEX] === school || row[LOSER_TEAM_INDEX] === school)
                  );
                  
                  const weekPoints = weekGames.reduce((sum, game) => 
                      sum + calculateRegularPoints(game, school, pointValues), 0
                  );
                  
                  rowData[week - 1] = weekPoints;
                  totalPoints += weekPoints;
              }
              
              // Week 15 - Conference Championships
              const week15Games = gameData.filter(row => 
                  row[WEEK_NAME_INDEX] === "Week 15" &&
                  (row[WINNER_TEAM_INDEX] === school || row[LOSER_TEAM_INDEX] === school)
              );
              
              const week15Points = week15Games.reduce((sum, game) => {
                  return sum + (game[WINNER_TEAM_INDEX] === school ? pointValues.conferenceWin : 0);
              }, 0);
              
              rowData[14] = week15Points;
              totalPoints += week15Points;
              
              // Week 16
              const week16Games = gameData.filter(row => 
                  row[WEEK_NAME_INDEX] === "Week 16" &&
                  (row[WINNER_TEAM_INDEX] === school || row[LOSER_TEAM_INDEX] === school)
              );
              
              const week16Points = week16Games.reduce((sum, game) => 
                  sum + calculateRegularPoints(game, school, pointValues), 0
              );
              
              rowData[15] = week16Points;
              totalPoints += week16Points;
              
              // Bowl Appearance (column 22)
              const seasonGamesData = seasonData.slice(CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW - 1);
              const bowlGames = seasonGamesData.filter(row => 
                  row[WEEK_NAME_INDEX] === "Bowls" &&
                  (row[TEAM_1_NAME_INDEX] === school || row[TEAM_2_NAME_INDEX] === school)
              );
              
              const bowlAppearancePoints = (isRegularSeasonComplete && bowlGames.length > 0) 
                  ? pointValues.bowlAppearance 
                  : 0;
              
              rowData[16] = bowlAppearancePoints;
              totalPoints += bowlAppearancePoints;
              
              // Heisman Winner (column 24)
              const heismanRow = PropertiesService.getScriptProperties().getProperty('HEISMAN_ROW');
              const heismanCol = Utils.columnToLetter(CONFIG.SHEETS.STRUCTURE.COLUMNS.LEADERBOARD.HEISMAN_SCHOOL + 2);
              const heismanWinner = isRegularSeasonComplete ? 
                  leaderboardSheet.getRange(`${heismanCol}${heismanRow}`).getValue() : "";
              const heismanPoints = (heismanWinner === school) ? pointValues.heismanWinner : 0;
              
              rowData[18] = heismanPoints;
              totalPoints += heismanPoints;
              
              // Bowl Scores (column 26)
              // Uses calculateBowlPoints with Leaderboard Top 12 instead of API Top 25
              const completedBowlGames = gameData.filter(row => 
                  row[WEEK_NAME_INDEX] === "Bowls" &&
                  (row[WINNER_TEAM_INDEX] === school || row[LOSER_TEAM_INDEX] === school)
              );
              
              const bowlPoints = completedBowlGames.reduce((sum, game) => 
                  sum + calculateBowlPoints(game, school, pointValues, top12Teams), 0
              );
              
              rowData[20] = bowlPoints;
              totalPoints += bowlPoints;
              
              // Playoff Appearance (column 27)
              // Uses CFP rank from Leaderboard Top 12 for bye determination
              let totalPlayoffPoints = 0;
              if (isRegularSeasonComplete) {
                  // Get this school's CFP rank (1-12, or 0 if not in playoff)
                  const schoolCFPRank = top12Teams.indexOf(school) + 1;
                  
                  const playoffGames = bowlGames.filter(row => {
                      const bowlName = (row[BOWL_NAME_INDEX] || '').trim();
                      return bowlName && (
                          bowlName.startsWith("College Football Playoff First Round") ||
                          bowlName.startsWith("College Football Playoff Quarterfinal") ||
                          bowlName.startsWith("College Football Playoff Semifinal") ||
                          bowlName.startsWith("CFP First Round") ||
                          bowlName.startsWith("CFP Quarterfinal") ||
                          bowlName.startsWith("CFP Semifinal")
                      );
                  });
                  
                  playoffGames.forEach(game => {
                      const bowlName = (game[BOWL_NAME_INDEX] || '').trim();
                      if (bowlName.startsWith("College Football Playoff First Round") || 
                          bowlName.startsWith("CFP First Round")) {
                          totalPlayoffPoints += pointValues.playoffFirst;
                      } else if (bowlName.startsWith("College Football Playoff Quarterfinal") || 
                                bowlName.startsWith("CFP Quarterfinal")) {
                          let quarterPoints = pointValues.playoffQuarter;
                          
                          // Check if team had a bye (CFP seeds 1-4) using Leaderboard CFP seedings
                          if (schoolCFPRank >= 1 && schoolCFPRank <= 4) {
                              quarterPoints = pointValues.playoffFirst + pointValues.playoffQuarter;
                          }
                          
                          totalPlayoffPoints += quarterPoints;
                      } else if (bowlName.startsWith("College Football Playoff Semifinal") || 
                                bowlName.startsWith("CFP Semifinal")) {
                          totalPlayoffPoints += pointValues.playoffSemi;
                      }
                  });
              }
              
              rowData[21] = totalPlayoffPoints;
              totalPoints += totalPlayoffPoints;
              
              // National Championship (column 28)
              const sortedGames = [...seasonGamesData].sort((a, b) => 
                  new Date(b[GAME_TIME_INDEX]) - new Date(a[GAME_TIME_INDEX])
              );
              
              const championshipGame = sortedGames[0];
              let championshipPoints = 0;
              
              if (championshipGame) {
                  const bowlName = (championshipGame[BOWL_NAME_INDEX] || '').trim();
                  const isChampionship = bowlName.startsWith("College Football Playoff National Championship") ||
                                        bowlName.toLowerCase().includes("national championship") ||
                                        (bowlName.toLowerCase().includes("championship") && 
                                        bowlName.toLowerCase().includes("playoff"));
                  
                  if (isChampionship) {
                      const schoolInGame = (championshipGame[TEAM_1_NAME_INDEX] === school || 
                                          championshipGame[TEAM_2_NAME_INDEX] === school);
                      
                      if (schoolInGame) {
                          const championshipGameCompleted = gameData.find(game => 
                              game[GAME_ID_INDEX] === championshipGame[GAME_ID_INDEX]
                          );
                          
                          if (championshipGameCompleted) {
                              if (championshipGameCompleted[WINNER_TEAM_INDEX] === school) {
                                  championshipPoints = pointValues.championshipWin;
                              } else if (championshipGameCompleted[LOSER_TEAM_INDEX] === school) {
                                  championshipPoints = pointValues.championshipLoss;
                              }
                          }
                      }
                  }
              }
              
              rowData[22] = championshipPoints;
              totalPoints += championshipPoints;
              
              // Total points
              rowData[23] = totalPoints;
              
              allPointsData.push(rowData);
          });
          
          // Write all the data to the Points Calculator sheet
          const dataStartRow = CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW;
          
          // Weeks 1-14 (columns F-S)
          const weeks1to14Data = allPointsData.map(row => row.slice(0, 14));
          pointsSheet.getRange(dataStartRow, 6, schools.length, 14).setValues(weeks1to14Data);
          
          // Week 15 (column T)
          const week15Data = allPointsData.map(row => [row[14]]);
          pointsSheet.getRange(dataStartRow, 20, schools.length, 1).setValues(week15Data);
          
          // Week 16 (column U)
          const week16Data = allPointsData.map(row => [row[15]]);
          pointsSheet.getRange(dataStartRow, 21, schools.length, 1).setValues(week16Data);
          
          // Bowl Appearance (column V)
          const bowlAppearanceData = allPointsData.map(row => [row[16]]);
          pointsSheet.getRange(dataStartRow, 22, schools.length, 1).setValues(bowlAppearanceData);
          
          // Heisman Winner (column X)
          const heismanData = allPointsData.map(row => [row[18]]);
          pointsSheet.getRange(dataStartRow, 24, schools.length, 1).setValues(heismanData);
          
          // Bowl Scores (column Z)
          const bowlScoresData = allPointsData.map(row => [row[20]]);
          pointsSheet.getRange(dataStartRow, 26, schools.length, 1).setValues(bowlScoresData);
          
          // Playoff Appearance (column AA)
          const playoffData = allPointsData.map(row => [row[21]]);
          pointsSheet.getRange(dataStartRow, 27, schools.length, 1).setValues(playoffData);
          
          // National Championship (column AB)
          const championshipData = allPointsData.map(row => [row[22]]);
          pointsSheet.getRange(dataStartRow, 28, schools.length, 1).setValues(championshipData);
          
          // Total (column D)
          const totalsData = allPointsData.map(row => [row[23]]);
          pointsSheet.getRange(dataStartRow, 4, schools.length, 1).setValues(totalsData);
          
          console.log("Points update completed successfully");
          
          // Update transaction log info
          updateTransactionLogInfo();
          
      } catch (error) {
          console.error("Error updating points:", error);
          throw error;
      }
  }
  function getTop12TeamsFromLeaderboard(leaderboardSheet) {
      const top12Teams = [];
      
      try {
          // CFP rankings are in column AK (column 37), starting at row 6
          const startRow = 6;
          const teamsCol = 37; // Column AK
          
          // Get top 12 teams from CFP rankings
          const teamData = leaderboardSheet.getRange(startRow, teamsCol, 12, 1).getValues();
          
          teamData.forEach(row => {
              if (row[0] && row[0] !== '') {
                  top12Teams.push(row[0].toString().trim());
              }
          });
          
          console.log(`Top 12 CFP teams from Leaderboard: ${top12Teams.join(', ')}`);
      } catch (error) {
          console.error("Error getting Top 12 from Leaderboard:", error);
      }
      
      return top12Teams;
  }
  function calculateBowlPoints(game, school, pointValues, top12Teams) {
      let points = 0;
      const WINNER_TEAM_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.WINNER_TEAM - 1;
      const WINNER_SCORE_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.WINNER_SCORE - 1;
      const LOSER_SCORE_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.LOSER_SCORE - 1;
      const LOSER_TEAM_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.LOSER_TEAM - 1;
      const CONFERENCE_GAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.CONFERENCE_GAME - 1;
      
      const isWinner = game[WINNER_TEAM_INDEX] === school;
      
      if (isWinner) {
          // Base win points
          points += pointValues.win;
          
          // Conference game bonus (should always be "No" for bowls, but keeping for consistency)
          if (game[CONFERENCE_GAME_INDEX] === "Yes") {
              points += pointValues.conferenceGame;
          }
          
          // Over 50 bonus
          const winnerScore = parseInt(game[WINNER_SCORE_INDEX]) || 0;
          if (winnerScore > 50) {
              points += pointValues.over50;
          }
          
          // Shutout bonus
          const loserScore = parseInt(game[LOSER_SCORE_INDEX]) || 0;
          if (loserScore === 0) {
              points += pointValues.shutout;
          }
          
          // Ranked opponent bonus - USE TOP 12 FROM LEADERBOARD instead of API ranking
          const loserTeam = game[LOSER_TEAM_INDEX];
          const loserRankInTop12 = top12Teams.indexOf(loserTeam) + 1; // 0 if not found, 1-12 if found
          
          if (loserRankInTop12 > 0 && loserRankInTop12 <= 12) {
              // Team is in CFP Top 12 from Leaderboard
              if (loserRankInTop12 <= 10) {
                  points += pointValues.oppRanked10;
              } else {
                  // Ranks 11-12 get the Top 25 bonus value
                  points += pointValues.oppRanked25;
              }
          }
          // If loserRankInTop12 is 0, team is not in Top 12 - no ranked bonus
      }
      
      return points;
  }
  function calculateRegularPoints(game, school, pointValues) {
      let points = 0;
      const WINNER_TEAM_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.WINNER_TEAM - 1;
      const WINNER_SCORE_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.WINNER_SCORE - 1;
      const LOSER_SCORE_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.LOSER_SCORE - 1;
      const LOSER_RANK_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.LOSER_RANK - 1;
      const CONFERENCE_GAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.CONFERENCE_GAME - 1;
      const isWinner = game[WINNER_TEAM_INDEX] === school;
      if (isWinner) {
          points += pointValues.win;
          if (game[CONFERENCE_GAME_INDEX] === "Yes") {
              points += pointValues.conferenceGame;}
          const winnerScore = parseInt(game[WINNER_SCORE_INDEX]) || 0;
          if (winnerScore > 50) {
              points += pointValues.over50;}
          const loserScore = parseInt(game[LOSER_SCORE_INDEX]) || 0;
          if (loserScore === 0) {
              points += pointValues.shutout;}
          const loserRank = parseInt(game[LOSER_RANK_INDEX]) || 0;
          if (loserRank > 0) {
              if (loserRank <= 10) {
                  points += pointValues.oppRanked10;
              } else if (loserRank <= 25) {
                  points += pointValues.oppRanked25;}}}
      return points;}
  function findColumnByHeader(headerName) {
    const headers = CONFIG.SHEETS.SPECIFIC.POINTS.REQUIRED_COLUMNS;
    const index = headers.indexOf(headerName);
    if (index === -1) {
      throw new Error(`Header "${headerName}" not found in REQUIRED_COLUMNS`);}
    return index + 1;}
  function updateRankings(range = null) {
      const sheet = Utils.getSheet(CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME);
      const data = Utils.fetchJSON(`${CONFIG.SYSTEM.API.BASE_URL}/rankings`);
      if (!data) {
          console.error("Error retrieving rankings data");
          return;}
      const rankings = data.rankings[1].ranks.map(rank => [
          data.rankings[1].name,
          data.rankings[0].occurrence.displayValue,
          rank.current,
          rank.team.nickname]);
      const startRow = parseInt(PropertiesService.getScriptProperties().getProperty('AP_RANKINGS_START_ROW'));
      const startCol = Utils.letterToColumn('AH');
      const dataRows = Math.min(rankings.length, 25);
      sheet.getRange(startRow, startCol, 25, 4).clearContent();
      sheet.getRange(startRow, startCol, dataRows, 4).setValues(rankings.slice(0, dataRows));
      sheet.getRange('AM4').setValue(
          `Last updated: ${Utils.formatDate(new Date(), CONFIG.SYSTEM.TIME.FORMATS.TIMESTAMP)}`);
      updateTransactionLogInfo();}
  function updateConferenceRankings() {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheets = {
          leaderboard: ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME),
          completed: ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.COMPLETED.NAME)
      };
      
      const WINNER_TEAM_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.WINNER_TEAM - 1;
      const LOSER_TEAM_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.LOSER_TEAM - 1;
      const CONFERENCE_GAME_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.CONFERENCE_GAME - 1;
      
      const lastRow = sheets.completed.getLastRow();
      const numColumns = Math.max(
          CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.COMPLETION_TIME,
          CONFIG.SHEETS.SPECIFIC.COMPLETED.REQUIRED_COLUMNS.length
      );
      
      let games = [];
      if (lastRow >= CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW) {
          const completedGamesRange = sheets.completed.getRange(
              CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW,
              1,  // Start at column A
              lastRow - CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW + 1,
              numColumns
          );
          games = completedGamesRange.getValues();
      }
      
      const config = JSON.parse(PropertiesService.getScriptProperties().getProperty('CONFERENCE_RANKINGS_CONFIG'));
      if (!config) {
          console.error("Conference rankings config not found");
          return;
      }
      
      const conferences = ['AAC', 'ACC', 'Big 12', 'Big Ten', 'CUSA', 'MAC', 'Mountain West', 'Pac-12', 'SEC', 'Sun Belt', 'Independent'];
      const conferencePositions = {
          'AAC': { startCol: 2, columns: 4 },
          'ACC': { startCol: 7, columns: 4 },
          'Big 12': { startCol: 12, columns: 4 },
          'Big Ten': { startCol: 17, columns: 4 },
          'CUSA': { startCol: 22, columns: 4 },
          'MAC': { startCol: 27, columns: 4 },
          'Mountain West': { startCol: 32, columns: 5 },
          'Pac-12': { startCol: 38, columns: 5 },
          'SEC': { startCol: 44, columns: 5 },
          'Sun Belt': { startCol: 50, columns: 5 },
          'Independent': { startCol: 56, columns: 2 }
      };
      
      for (const conference of conferences) {
          const position = conferencePositions[conference];
          const isIndependent = (conference === 'Independent');
          const has5Columns = position.columns === 5;
          
          const schools = SCHOOLS
              .filter(([, , , conf]) => conf === conference)
              .map(([school]) => school);
          
          if (schools.length === 0) {
              console.log(`No schools found for ${conference}`);
              continue;
          }
          
          const schoolData = schools.map(school => {
              // Special handling for Hawai'i - use includes to handle different apostrophe characters
              const isHawaii = school.includes("Hawai");
              const allGames = isHawaii
                  ? games.filter(g =>
                      (g[WINNER_TEAM_INDEX] && g[WINNER_TEAM_INDEX].startsWith("Hawai")) || 
                      (g[LOSER_TEAM_INDEX] && g[LOSER_TEAM_INDEX].startsWith("Hawai")))
                  : games.filter(g =>
                      g[WINNER_TEAM_INDEX] === school || 
                      g[LOSER_TEAM_INDEX] === school);
              
              if (isIndependent) {
                  const wins = isHawaii
                      ? allGames.filter(g => g[WINNER_TEAM_INDEX] && g[WINNER_TEAM_INDEX].startsWith("Hawai")).length
                      : allGames.filter(g => g[WINNER_TEAM_INDEX] === school).length;
                      
                  const losses = isHawaii
                      ? allGames.filter(g => g[LOSER_TEAM_INDEX] && g[LOSER_TEAM_INDEX].startsWith("Hawai")).length
                      : allGames.filter(g => g[LOSER_TEAM_INDEX] === school).length;
                  
                  return {
                      school,
                      record: `${wins}-${losses}`,
                      winPct: allGames.length ? wins / allGames.length : 0
                  };
              } else {
                  const confGames = allGames.filter(g => 
                      g[CONFERENCE_GAME_INDEX] === "Yes"
                  );
                  
                  const confWins = isHawaii
                      ? confGames.filter(g => g[WINNER_TEAM_INDEX] && g[WINNER_TEAM_INDEX].startsWith("Hawai")).length
                      : confGames.filter(g => g[WINNER_TEAM_INDEX] === school).length;
                      
                  const confLosses = isHawaii
                      ? confGames.filter(g => g[LOSER_TEAM_INDEX] && g[LOSER_TEAM_INDEX].startsWith("Hawai")).length
                      : confGames.filter(g => g[LOSER_TEAM_INDEX] === school).length;
                  
                  const totalWins = isHawaii
                      ? allGames.filter(g => g[WINNER_TEAM_INDEX] && g[WINNER_TEAM_INDEX].startsWith("Hawai")).length
                      : allGames.filter(g => g[WINNER_TEAM_INDEX] === school).length;
                      
                  const totalLosses = isHawaii
                      ? allGames.filter(g => g[LOSER_TEAM_INDEX] && g[LOSER_TEAM_INDEX].startsWith("Hawai")).length
                      : allGames.filter(g => g[LOSER_TEAM_INDEX] === school).length;
                  
                  return {
                      school,
                      confRecord: `${confWins}-${confLosses}`,
                      record: `${totalWins}-${totalLosses}`,
                      confWinPct: confGames.length ? confWins / confGames.length : 0,
                      winPct: allGames.length ? totalWins / allGames.length : 0
                  };
              }
          });
          
          const sortedSchools = schoolData.sort((a, b) => {
              if (isIndependent) {
                  if (a.winPct !== b.winPct) return b.winPct - a.winPct;
                  return a.school.localeCompare(b.school);
              } else {
                  if (a.confWinPct !== b.confWinPct) return b.confWinPct - a.confWinPct;
                  if (a.winPct !== b.winPct) return b.winPct - a.winPct;
                  return a.school.localeCompare(b.school);
              }
          });
          
          const maxRows = 19;
          sheets.leaderboard.getRange(config.startRow, position.startCol, maxRows, position.columns).clearContent();
          
          if (isIndependent) {
              const updateData = sortedSchools.map(data => [data.school, data.record]);
              if (updateData.length > 0) {
                  sheets.leaderboard.getRange(
                      config.startRow,
                      position.startCol,
                      updateData.length,
                      2
                  ).setValues(updateData)
                  .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT)
                  .setBackground(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND);
              }
          } else if (has5Columns) {
              const isSEC = (conference === 'SEC');
              sortedSchools.forEach((data, index) => {
                  const row = config.startRow + index;
                  
                  if (isSEC) {
                      sheets.leaderboard.getRange(row, position.startCol)
                          .setValue(index + 1)
                          .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT)
                          .setBackground(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND);
                      sheets.leaderboard.getRange(row, position.startCol + 1)
                          .setValue(data.school)
                          .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT)
                          .setBackground(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND);
                      sheets.leaderboard.getRange(row, position.startCol + 2)
                          .setValue(data.confRecord)
                          .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT)
                          .setBackground(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND);
                      sheets.leaderboard.getRange(row, position.startCol + 2, 1, 2).merge();
                      sheets.leaderboard.getRange(row, position.startCol + 4)
                          .setValue(data.record)
                          .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT)
                          .setBackground(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND);
                  } else {
                      sheets.leaderboard.getRange(row, position.startCol)
                          .setValue(index + 1)
                          .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT)
                          .setBackground(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND);
                      sheets.leaderboard.getRange(row, position.startCol + 1)
                          .setValue(data.school)
                          .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT)
                          .setBackground(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND);
                      sheets.leaderboard.getRange(row, position.startCol + 1, 1, 2).merge();
                      sheets.leaderboard.getRange(row, position.startCol + 3)
                          .setValue(data.confRecord)
                          .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT)
                          .setBackground(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND);
                      sheets.leaderboard.getRange(row, position.startCol + 4)
                          .setValue(data.record)
                          .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT)
                          .setBackground(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND);
                  }
              });
          } else {
              const updateData = sortedSchools.map((data, index) => 
                  [index + 1, data.school, data.confRecord, data.record]
              );
              if (updateData.length > 0) {
                  sheets.leaderboard.getRange(
                      config.startRow,
                      position.startCol,
                      updateData.length,
                      4
                  ).setValues(updateData)
                  .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT)
                  .setBackground(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND);
              }
          }
      }
      
      colorSchoolCells(sheets.leaderboard);
      console.log("Conference rankings update complete");
  }
  function setupConferenceRankings(sheet, startRow) {
      const dataStartRow = startRow + 3;  // Conference names + buffer + sub-headers = +3
      const conferenceLayout = [
          { name: 'AAC', startCol: 2, dataColumns: 4, bufferColumns: 1 },
          { name: 'ACC', startCol: 7, dataColumns: 4, bufferColumns: 1 },
          { name: 'Big 12', startCol: 12, dataColumns: 4, bufferColumns: 1 },
          { name: 'Big Ten', startCol: 17, dataColumns: 4, bufferColumns: 1 },
          { name: 'CUSA', startCol: 22, dataColumns: 4, bufferColumns: 1 },
          { name: 'MAC', startCol: 27, dataColumns: 4, bufferColumns: 1 },
          { name: 'Mountain West', startCol: 32, dataColumns: 5, bufferColumns: 1 },
          { name: 'Pac-12', startCol: 38, dataColumns: 5, bufferColumns: 1 },
          { name: 'SEC', startCol: 44, dataColumns: 5, bufferColumns: 1 },
          { name: 'Sun Belt', startCol: 50, dataColumns: 5, bufferColumns: 1 },
          { name: 'Independent', startCol: 56, dataColumns: 2, bufferColumns: 0 }];
      PropertiesService.getScriptProperties().setProperty('CONFERENCE_RANKINGS_CONFIG', 
          JSON.stringify({
              startRow: dataStartRow,
              conferences: ['AAC', 'ACC', 'Big 12', 'Big Ten', 'CUSA', 'MAC', 'Mountain West', 'Pac-12', 'SEC', 'Sun Belt', 'Independent'],
              conferenceLayout: conferenceLayout}));
      console.log("Conference rankings config stored (no initial data written)");}
  function updateIdealTeam() {
      try {
          const ss = SpreadsheetApp.getActiveSpreadsheet();
          const settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
          const pointsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.POINTS.NAME);
          const leaderboardSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME);
          const numSchools = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM).getValue();
          const idealDraftCol = Utils.letterToColumn('AV');
          const idealCurrentCol = Utils.letterToColumn('BA');
          const dataStartRow = 6;
          createIdealTeamSection(
              leaderboardSheet, 
              dataStartRow,  // Start data at row 6
              idealDraftCol,  // Column AV
              numSchools, 
              CONFIG.SHEETS.SPECIFIC.LEADERBOARD.IDEAL_SEASON, 
              `=QUERY('${CONFIG.SHEETS.SPECIFIC.POINTS.NAME}'!B:D, "SELECT B WHERE D IS NOT NULL ORDER BY D DESC LIMIT ${numSchools}", 0)`,
              `=QUERY('${CONFIG.SHEETS.SPECIFIC.POINTS.NAME}'!B:D, "SELECT D WHERE D IS NOT NULL ORDER BY D DESC LIMIT ${numSchools}", 0)`);
          const weekManager = WeekManager.getInstance();
          const currentWeek = weekManager.getCurrentWeek();
          let currentWeekSchoolsFormula;
          let currentWeekPointsFormula;
          if (currentWeek === "Bowls") {
              currentWeekSchoolsFormula = `=QUERY('${CONFIG.SHEETS.SPECIFIC.POINTS.NAME}'!B:AB, "SELECT B WHERE V+X+Z+AA+AB > 0 ORDER BY V+X+Z+AA+AB DESC LIMIT ${numSchools}", 0)`;
              currentWeekPointsFormula = `=QUERY('${CONFIG.SHEETS.SPECIFIC.POINTS.NAME}'!B:AB, "SELECT V+X+Z+AA+AB WHERE V+X+Z+AA+AB > 0 ORDER BY V+X+Z+AA+AB DESC LIMIT ${numSchools} LABEL V+X+Z+AA+AB ''", 0)`;
          } else {
              const weekNum = parseInt(currentWeek.replace('Week ', ''));
              const weekCol = Utils.columnToLetter(weekNum + 5);
              currentWeekSchoolsFormula = `=QUERY('${CONFIG.SHEETS.SPECIFIC.POINTS.NAME}'!B:${weekCol}, "SELECT B WHERE ${weekCol} IS NOT NULL ORDER BY ${weekCol} DESC LIMIT ${numSchools}", 0)`;
              currentWeekPointsFormula = `=QUERY('${CONFIG.SHEETS.SPECIFIC.POINTS.NAME}'!B:${weekCol}, "SELECT ${weekCol} WHERE ${weekCol} IS NOT NULL ORDER BY ${weekCol} DESC LIMIT ${numSchools} LABEL ${weekCol} ''", 0)`;}
          createIdealTeamSection(
              leaderboardSheet, 
              dataStartRow,  // Start data at row 6
              idealCurrentCol,  // Column BA
              numSchools, 
              CONFIG.SHEETS.SPECIFIC.LEADERBOARD.IDEAL_CURRENT_WEEK, 
              currentWeekSchoolsFormula,
              currentWeekPointsFormula);
          colorSchoolCells(leaderboardSheet);
      } catch (error) {
          console.error('Error in updateIdealTeam:', error);}}
  function createIdealTeamSection(
      leaderboardSheet, 
      startRow, 
      startCol, 
      numSchools, 
      headerText, 
      schoolNamesFormula,
      pointsFormula) {
      try {
          const dataRange = leaderboardSheet.getRange(startRow, startCol, numSchools + 1, 4); // +1 for total row
          dataRange.setBackground(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND);
          const numbersRange = leaderboardSheet.getRange(startRow, startCol, numSchools, 1);
          const numbers = Array.from({length: numSchools}, (_, i) => [i + 1]);
          numbersRange.setValues(numbers);
          const schoolNamesCell = leaderboardSheet.getRange(startRow, startCol + 1);
          schoolNamesCell.setFormula(schoolNamesFormula);
          for (let i = 0; i < numSchools; i++) {
              leaderboardSheet.getRange(startRow + i, startCol + 1, 1, 2).merge();}
          const pointsCol = startCol + 3;
          const pointsCell = leaderboardSheet.getRange(startRow, pointsCol);
          pointsCell.setFormula(pointsFormula);
          const totalRow = startRow + numSchools;
          leaderboardSheet.getRange(totalRow, startCol + 1, 1, 2)
              .merge()
              .setValue("Total:")
              .setFontWeight("bold");
          const totalCell = leaderboardSheet.getRange(totalRow, pointsCol);
          const columnLetter = Utils.columnToLetter(pointsCol);
          totalCell
              .setFormula(`=SUM(${columnLetter}${startRow}:${columnLetter}${totalRow - 1})`)
              .setFontWeight("bold");
      } catch (error) {
          console.error('Error in createIdealTeamSection:', error);}}
  function updateLeaderboardTeamOrder() {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const leaderboardSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME);
      const settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
      const teamCount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
      const highPointsEnabled = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HIGH_POINTS_YES_NO).getValue() === "Yes";
      const firstLeaderboardStartRow = CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW; // Row 6
      const firstLeaderboardEndRow = firstLeaderboardStartRow + teamCount - 1;
      updateTeamOrder(leaderboardSheet, firstLeaderboardStartRow, firstLeaderboardEndRow, 2, 32);
      if (highPointsEnabled) {
          const formulaRows = 5;
          const buffersAndHeaders = 3; // 1 buffer before headers, 1 header row, 1 buffer after
          const secondLeaderboardStartRow = firstLeaderboardEndRow + 1 + formulaRows + buffersAndHeaders;
          const secondLeaderboardEndRow = secondLeaderboardStartRow + teamCount - 1;
          const lastRow = leaderboardSheet.getLastRow();
          if (secondLeaderboardStartRow <= lastRow && secondLeaderboardEndRow <= lastRow) {
              updateTeamOrder(leaderboardSheet, secondLeaderboardStartRow, secondLeaderboardEndRow, 2, 32, false);}}}
  function updateTeamOrder(sheet, startRow, endRow, startCol = 2, endCol = 32, sortByTeamName = true) {
      const placeColumn = 2;  // Column B
      const teamColumn = 3;   // Column C
      const totalsColumn = 4; // Column D
      const range = sheet.getRange(startRow, startCol, endRow - startRow + 1, endCol - startCol + 1);
      if (sortByTeamName) {
          range.sort([
              { column: placeColumn, ascending: true },
              { column: teamColumn, ascending: true }]);
      } else {
          range.sort([
              { column: totalsColumn, ascending: false }]);}}
  function scrapeWikipediaTableAndCheckCalendar(startRow = null) {
      try {
          const wikipediaData = scrapeWikipediaTableInternal();
          const calendarData = fetchCalendarData();
          if (!calendarData) {
              throw new Error("Failed to fetch calendar data.");}
          const calendarYear = new Date(calendarData.calendarStartDate).getFullYear();
          const match = wikipediaData.find(row => row[0] === calendarYear.toString());
          const ss = SpreadsheetApp.getActiveSpreadsheet();
          const sheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME);
          const heismanRow = startRow || parseInt(PropertiesService.getScriptProperties().getProperty('HEISMAN_ROW'));
          const heismanCol = Utils.letterToColumn('AO');
          if (match) {
              sheet.getRange(heismanRow, heismanCol, 1, match.length).clearContent();
              sheet.getRange(heismanRow, heismanCol, 1, match.length).setValues([match]).setVerticalAlignment('middle').setHorizontalAlignment('center').setFontWeight('bold');
          } else {
              sheet.getRange(heismanRow, heismanCol, 1, 2).clearContent();
              sheet.getRange(heismanRow, heismanCol +1 , 1, 2).setValues([
                  [calendarYear.toString(), "No Heisman Winner yet"]
              ]).setVerticalAlignment('middle').setHorizontalAlignment('center').setFontWeight('bold');}
      } catch (error) {
          console.error("Error in scrapeWikipediaTableAndCheckCalendar:", error);}}
  function updateTeamImage(teamSheet) {
    if (!teamSheet) {
      console.error('No sheet provided to updateTeamImage');
      return;
    }
    
    try {
      const config = CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.IMAGE_AREA;
      const imageConfig = CONFIG.UI.IMAGE;
      const linkCell = teamSheet.getRange(config.LINK);
      const pictureCell = teamSheet.getRange(config.PICTURE);
      const imageUrl = linkCell.getValue();
      
      if (!imageUrl || typeof imageUrl !== 'string') {
        console.log('No valid image URL found in link cell');
        pictureCell.clearContent();
        return;
      }
      
      const imageFormula = `=IMAGE("${imageUrl}")`;
      pictureCell.setFormula(imageFormula);
      pictureCell.setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT);
      pictureCell.setVerticalAlignment(CONFIG.UI.STYLES.BASE.VERTICAL_ALIGNMENT);
      
      console.log(`Successfully updated team image for ${teamSheet.getName()}`);
      
      // Get the colors from storage cells
      const colorConfig = CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.COLOR_STORAGE;
      const headerColor = teamSheet.getRange(colorConfig.HEADER_COLOR).getValue();
      const borderColor = teamSheet.getRange(colorConfig.BORDER_COLOR).getValue();
      
      // Set E5 (linkCell) to have both font and background matching header color
      if (headerColor) {
        linkCell.setBackground(headerColor);  // ADD THIS LINE
        linkCell.setFontColor(headerColor);
      } else {
        // Fallback to default header background color if not found
        linkCell.setBackground(CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND);  // ADD THIS LINE
        linkCell.setFontColor(CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND);
      }
      
      // Set E6 to have both font and background matching border color
      const e6Cell = teamSheet.getRange("E6");
      if (borderColor) {
        e6Cell.setBackground(borderColor);
        e6Cell.setFontColor(borderColor);
      } else {
        // Fallback to default border color if not found
        const defaultBorderColor = CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT;
        e6Cell.setBackground(defaultBorderColor);
        e6Cell.setFontColor(defaultBorderColor);
      }
      
    } catch (error) {
      console.error('Error in updateTeamImage:', error);
      throw error;
    }
  }
  function handleTeamNameUpdate(sheet, userEmail) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
      const teamName = sheet.getName(); // The sheet name IS the team name
      const service = new TransactionService(userEmail);
      const permissionCheck = service.validateUserPermission(teamName);
      if (!permissionCheck.isValid) {
        sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.UPDATE_CONTROLS.TEAM_NAME_CHECKBOX).setValue(false);
        return;}
      PropertiesService.getUserProperties().setProperty('tempUserEmail', userEmail);
      sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.UPDATE_CONTROLS.TEAM_NAME_CHECKBOX).setValue(false);
      sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.UPDATE_CONTROLS.TEAM_NAME_LABEL)
        .setValue(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.UPDATE_CONTROLS.TEAM_NAME_LABEL_TEXT);
      const currentTeamName = sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.TEAM_NAME.INFO).getValue();
      const ui = SpreadsheetApp.getUi();
      const htmlOutput = HtmlService.createHtmlOutput(`
        <form id="teamNameForm" onsubmit="return false;">
          <div style="margin-bottom: 15px;">
            <label>Current Team Name: ${currentTeamName}</label>
          </div>
          <div id="errorMessage" style="color: red; margin-bottom: 10px; display: none;"></div>
          <div style="margin-bottom: 15px;">
            <label for="newName">New Team Name:</label><br>
            <input type="text" id="newName" name="newName" maxlength="25" style="width: 200px; margin-top: 5px;" required>
            <div style="font-size: 0.8em; color: #666;">Maximum 25 characters</div>
          </div>
          <button type="button" id="submitBtn" onclick="submitForm()" 
                  style="background-color: #4CAF50; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
            Submit
          </button>
        </form>
        <script>
          function submitForm() {
            const newName = document.getElementById('newName').value.trim();
            const errorDiv = document.getElementById('errorMessage');
            const submitBtn = document.getElementById('submitBtn');
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
            if (!newName) {
              showError('Please enter a new team name.');
              return;}
            if (newName.length > 25) {
              showError('Team name must be 25 characters or less.');
              return;}
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';
            google.script.run
              .withSuccessHandler(function(result) {
                console.log('Success handler received:', result);
                if (result && result.success) {
                  google.script.host.close();
                } else if (result && result.error) {
                  showError(result.error);
                  submitBtn.disabled = false;
                  submitBtn.textContent = 'Submit';
                } else {
                  console.error('Unexpected result format:', result);
                  showError('Unexpected response from server');
                  submitBtn.disabled = false;
                  submitBtn.textContent = 'Submit';}})
              .withFailureHandler(function(error) {
                console.error('Failure handler triggered:', error);
                showError('Unexpected error: ' + error);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit';})
              .processTeamNameChange(newName);}
          function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';}
          document.getElementById('newName').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitForm();}});
          document.getElementById('newName').focus();
        </script>
      `)
      .setWidth(300)
      .setHeight(220);
      ui.showModalDialog(htmlOutput, 'Update Team Name');
    } catch (error) {
      console.error('Error in handleTeamNameUpdate:', error);
      SpreadsheetApp.getUi().alert('Error updating team name: ' + error.message);
      sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.UPDATE_CONTROLS.TEAM_NAME_CHECKBOX).setValue(false);}}
  function processTeamNameChange(newTeamName) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
    const activeSheet = ss.getActiveSheet();
    try {
      const oldTeamName = activeSheet.getName();
      newTeamName = newTeamName.trim();
      const validation = validateTeamNameContent(newTeamName);
      if (!validation.isValid) {
        return { success: false, error: validation.error };}
      const currentTeamName = activeSheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.TEAM_NAME.INFO).getValue();
      const teamCount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
      const existingTeams = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START)
        .offset(0, 0, teamCount, 1)
        .getValues()
        .flat()
        .filter(name => name);
      const duplicateExists = existingTeams.some(name => 
        name.toLowerCase() === newTeamName.toLowerCase() && 
        name !== oldTeamName);
      if (duplicateExists) {
        return { success: false, error: 'This team name is already taken. Please choose a different name.' };}
      let found = false;
      for (let i = 0; i < existingTeams.length; i++) {
        if (existingTeams[i] === oldTeamName) {
          settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START).offset(i, 0).setValue(newTeamName);
          found = true;
          break;}}
      if (!found) {
        return { success: false, error: 'Could not find current team name in settings sheet.' };}
      activeSheet.setName(newTeamName);
      activeSheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.TEAM_NAME.INFO).setValue(newTeamName);
      const teamsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TEAMS.NAME);
      if (teamsSheet) {
        const teamsData = teamsSheet.getDataRange().getValues();
        for (let i = 0; i < teamsData.length; i++) {
          if (teamsData[i][0] === oldTeamName) {
            teamsSheet.getRange(i + 1, 1).setValue(newTeamName);}}}
      const leaderboardSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME);
      if (leaderboardSheet) {
        const leaderboardTeamColumn = CONFIG.SHEETS.STRUCTURE.COLUMNS.LEADERBOARD.TEAMS;
        const lastRow = leaderboardSheet.getLastRow();
        const leaderboardData = leaderboardSheet.getRange(1, leaderboardTeamColumn, lastRow, 1).getValues();
        for (let i = 0; i < leaderboardData.length; i++) {
          if (leaderboardData[i][0] === oldTeamName) {
            leaderboardSheet.getRange(i + 1, leaderboardTeamColumn).setValue(newTeamName);}}}
      const transactionLogSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME);
      if (transactionLogSheet) {
        const config = CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.HISTORY_DATA;
        const lastRow = transactionLogSheet.getLastRow();
        if (lastRow >= config.START_ROW) {
          const teamNameColumn = config.COLUMNS.TEAM_NAME; // Column K (11)
          const teamNameRange = transactionLogSheet.getRange(
            config.START_ROW,
            teamNameColumn,
            lastRow - config.START_ROW + 1,
            1);
          const teamNames = teamNameRange.getValues();
          let updated = false;
          for (let i = 0; i < teamNames.length; i++) {
            if (teamNames[i][0] === oldTeamName) {
              teamNames[i][0] = newTeamName;
              updated = true;}}
          if (updated) {
            teamNameRange.setValues(teamNames);
            console.log(`Updated transaction history: "${oldTeamName}" -> "${newTeamName}"`);}}}
      try {
        const addDropManager = new AddDropManager(activeSheet, newTeamName);
        addDropManager.updateCounter();
        console.log("Updated add/drop counter for new team name");
      } catch (error) {
        console.error("Error updating add/drop counter:", error);}
      const manager = new CompetitionManager();
      manager.loadState();
      if (manager.programs.has(oldTeamName)) {
        const teamPrograms = manager.programs.get(oldTeamName);
        manager.programs.delete(oldTeamName);
        manager.programs.set(newTeamName, teamPrograms);
        manager.saveState();
        console.log(`Updated Competition Manager state: "${oldTeamName}" -> "${newTeamName}"`);}
      updateLeaderboardFormulas(oldTeamName, newTeamName);
      const leaderboardDataStartRow = 6;
      const leaderboardDataEndRow = leaderboardDataStartRow + teamCount - 1;
      activeSheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.CURRENT_PLACE.PLACE)
        .setFormula(`=IFERROR(INDEX(${CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME}!B${leaderboardDataStartRow}:B${leaderboardDataEndRow}, MATCH("${newTeamName}", ${CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME}!C${leaderboardDataStartRow}:C${leaderboardDataEndRow}, 0)), "")`);
      const highPointsEnabled = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HIGH_POINTS_YES_NO).getValue() === "Yes";
      if (highPointsEnabled) {
        const moneyStart = teamCount + 8;
        activeSheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.CURRENT_WINNINGS.EARNINGS)
          .setFormula(`=IFERROR(INDEX(${CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME}!${Utils.columnToLetter(CONFIG.SHEETS.STRUCTURE.COLUMNS.LEADERBOARD.TOTALS)}:${Utils.columnToLetter(CONFIG.SHEETS.STRUCTURE.COLUMNS.LEADERBOARD.TOTALS)}, MATCH("${newTeamName}", OFFSET(${CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME}!${Utils.columnToLetter(CONFIG.SHEETS.STRUCTURE.COLUMNS.LEADERBOARD.TEAMS)}:${Utils.columnToLetter(CONFIG.SHEETS.STRUCTURE.COLUMNS.LEADERBOARD.TEAMS)}, ${moneyStart}, 0), 0) + ${moneyStart}), 0)`)
          .setNumberFormat("$#,##0.00");}
      console.log("Updated Current Place and Current Prize Winnings formulas with new team name");
      console.log("Leaderboard formulas updated to reference new team name");      
      if (!SHEETS || !SHEETS.ss) {
        SHEETS = {
          ss: ss,
          tracker: ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TRACKER.NAME),
          log: ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME),
          teams: teamsSheet,
          settings: settingsSheet};
        sheetsInitialized = true;}
      updateTeamDropdown();
      console.log("Team dropdown updated after team name change");
      const userSheetManager = new UserSheetManager();
      userSheetManager.setupDynamicProgramFormulas(activeSheet, newTeamName);
      SpreadsheetApp.flush();
      SpreadsheetApp.getActiveSpreadsheet().toast('Team name successfully updated to: ' + newTeamName, 'Success', 3);
      return { success: true };
    } catch (error) {
      console.error('Error in processTeamNameChange:', error);
      let errorMessage = error.message || 'An unexpected error occurred';
      if (errorMessage.includes('inappropriate language') ||
          errorMessage.includes('must be at least') ||
          errorMessage.includes('is already taken') ||
          errorMessage.includes('is reserved')) {
        return { success: false, error: errorMessage };
      } else {
        return { success: false, error: 'Failed to update team name: ' + errorMessage };}}}
  function updateLeaderboardFormulas(oldTeamName, newTeamName) {
    console.log(`Updating leaderboard formulas from ${oldTeamName} to ${newTeamName}`);  
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const leaderboardSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME);
    const settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);  
    if (!leaderboardSheet) {
      console.error("Leaderboard sheet not found");
      return;} 
    const teamCount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
    const highPointsEnabled = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HIGH_POINTS_YES_NO).getValue() === "Yes";
    const headers = CONFIG.SHEETS.SPECIFIC.LEADERBOARD.REQUIRED_COLUMNS; 
    const mainLeaderboardStartRow = 6;
    let teamRow = -1; 
    for (let i = 0; i < teamCount; i++) {
      const currentRow = mainLeaderboardStartRow + i;
      const teamNameInCell = leaderboardSheet.getRange(currentRow, 3).getValue(); // Column C
      if (teamNameInCell === newTeamName) {
        teamRow = currentRow;
        break;}} 
    if (teamRow === -1) {
      console.error(`Team ${newTeamName} not found in leaderboard`);
      return;} 
    console.log(`Found team at row ${teamRow}, updating formulas...`);
    const totalFormula = `=IFERROR(SUM(E${teamRow}:${Utils.columnToLetter(headers.length)}${teamRow}), 0)`;
    leaderboardSheet.getRange(teamRow, 4).setFormula(totalFormula);
    for (let weekCol = 0; weekCol < headers.length - 3; weekCol++) {
      const col = weekCol + 5; 
      const weekName = headers[weekCol + 3];
      if (weekName === "Season Winners") {
        continue;} 
      const formula = `=IFERROR(INDEX(INDIRECT("'${newTeamName}'!I12:AF12"), 1, MATCH("${weekName}", INDIRECT("'${newTeamName}'!I11:AF11"), 0)), "")`;
      leaderboardSheet.getRange(teamRow, col).setFormula(formula);}
    if (highPointsEnabled) {
      const numWeeks = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_HP_WEEKS).getValue();
      const weeklyAmount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HP_WEEKLY_AMOUNT).getValue(); 
      const hpStartRow = mainLeaderboardStartRow + teamCount + 8; // Adjust based on your layout
      let hpTeamRow = -1;
      for (let i = 0; i < teamCount; i++) {
        const currentRow = hpStartRow + i;
        const teamNameInCell = leaderboardSheet.getRange(currentRow, 3).getValue(); // Column C
        if (teamNameInCell === newTeamName) {
          hpTeamRow = currentRow;
          break;}}
      if (hpTeamRow !== -1) {
        console.log(`Updating high points formulas at row ${hpTeamRow}`);
        const hpTotalFormula = `=IFERROR(SUM(E${hpTeamRow}:${Utils.columnToLetter(headers.length + 1)}${hpTeamRow}), 0)`;
        leaderboardSheet.getRange(hpTeamRow, 4).setFormula(hpTotalFormula);
        for (let weekCol = 0; weekCol < numWeeks; weekCol++) {
          let actualCol = 5; // Start at column E
          if (weekCol >= 14) actualCol = weekCol + 5 + 4;
          else if (weekCol >= 10) actualCol = weekCol + 5 + 3;
          else if (weekCol >= 6) actualCol = weekCol + 5 + 2;
          else if (weekCol >= 2) actualCol = weekCol + 5 + 1;
          else actualCol = weekCol + 5;
          const columnLetter = Utils.columnToLetter(actualCol);
          const mainLeaderboardRange = `${columnLetter}$6:${columnLetter}$${5 + teamCount}`;
          const formula = `=IFERROR(
            IF(SUM(${mainLeaderboardRange})=0, "",
            IF(AND(INDIRECT("'Settings'!$C$42")="Yes", 
                INDEX(${mainLeaderboardRange}, MATCH(C${hpTeamRow}, C$6:C$${5 + teamCount}, 0))=MAX(${mainLeaderboardRange})), 
                ${weeklyAmount}/COUNTIF(${mainLeaderboardRange}, MAX(${mainLeaderboardRange})), 
                IF(AND(INDIRECT("'Settings'!$C$42")="No", 
                    COUNTIF(${mainLeaderboardRange}, MAX(${mainLeaderboardRange}))=1, 
                    INDEX(${mainLeaderboardRange}, MATCH(C${hpTeamRow}, C$6:C$${5 + teamCount}, 0))=MAX(${mainLeaderboardRange})), 
                    ${weeklyAmount}, 
                    ""))), "")`;
          leaderboardSheet.getRange(hpTeamRow, actualCol).setFormula(formula);}      
        const seasonWinnersCol = headers.indexOf("Season Winners") + 2;
        const seasonWinnersFormula = `=IFERROR(INDEX(Leaderboard!${Utils.columnToLetter(seasonWinnersCol)}$6:${Utils.columnToLetter(seasonWinnersCol)}$${5 + teamCount}, MATCH(C${hpTeamRow}, Leaderboard!C$6:C$${5 + teamCount}, 0)), 0)`;
        leaderboardSheet.getRange(hpTeamRow, headers.length + 1).setFormula(seasonWinnersFormula)
          .setNumberFormat("$#,##0.00");}}
    console.log("Leaderboard formulas updated successfully");
    SpreadsheetApp.flush();}
  function handleColorUpdate(sheet, userEmail) {
    try {
      const teamName = sheet.getName();
      const service = new TransactionService(userEmail);
      const permissionCheck = service.validateUserPermission(teamName);
      if (!permissionCheck.isValid) {
        sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.UPDATE_CONTROLS.COLORS_CHECKBOX).setValue(false);
        return;}
      PropertiesService.getUserProperties().setProperty('tempUserEmail', userEmail);
      sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.UPDATE_CONTROLS.COLORS_CHECKBOX).setValue(false);
      const ui = SpreadsheetApp.getUi();
      const colorConfig = CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.COLOR_STORAGE;
      const currentBorderColor = sheet.getRange(colorConfig.BORDER_COLOR).getValue() || CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT;
      const currentHeaderColor = sheet.getRange(colorConfig.HEADER_COLOR).getValue() || CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND;
      const currentActionColor = sheet.getRange(colorConfig.ACTION_COLOR).getValue() || CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD;
      const currentFontColor = sheet.getRange(colorConfig.FONT_COLOR).getValue() || CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT;
      const htmlOutput = HtmlService.createHtmlOutput(`
        <style>
          .color-row {
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;}
          .color-label {
            flex: 1;
            font-weight: bold;
            margin-right: 10px;}
          .color-input-wrapper {
            display: flex;
            align-items: center;
            flex: 1;}
          input[type="color"] {
            width: 60px;
            height: 35px;
            margin-right: 10px;
            cursor: pointer;
            border: 1px solid #ccc;
            border-radius: 4px;}
          .color-hex {
            font-family: monospace;
            color: #666;
            font-size: 12px;}
          .preview-box {
            margin: 20px 0;
            padding: 15px;
            border-radius: 8px;
            text-align: center;}
          button {
            padding: 10px 20px;
            margin: 5px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;}
          .apply-btn {
            background-color: #4CAF50;
            color: white;}
          .cancel-btn {
            background-color: #f44336;
            color: white;}
          .reset-btn {
            background-color: #2196F3;
            color: white;}
          .description {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 20px;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 4px;}
        </style>
        <form id="colorForm">
          <div class="description">
            Customize your team's color scheme. These colors will be applied to borders, headers, action items, and fonts throughout your sheet.
          </div>
          <div class="color-row">
            <div class="color-label">Border Color:</div>
            <div class="color-input-wrapper">
              <input type="color" id="borderColor" value="${currentBorderColor}">
              <span class="color-hex" id="borderHex">${currentBorderColor}</span>
            </div>
          </div>
          <div class="color-row">
            <div class="color-label">Header Background:</div>
            <div class="color-input-wrapper">
              <input type="color" id="headerColor" value="${currentHeaderColor}">
              <span class="color-hex" id="headerHex">${currentHeaderColor}</span>
            </div>
          </div>
          <div class="color-row">
            <div class="color-label">Action Items:</div>
            <div class="color-input-wrapper">
              <input type="color" id="actionColor" value="${currentActionColor}">
              <span class="color-hex" id="actionHex">${currentActionColor}</span>
            </div>
          </div>
          <div class="color-row">
            <div class="color-label">Header Font:</div>
            <div class="color-input-wrapper">
              <input type="color" id="fontColor" value="${currentFontColor}">
              <span class="color-hex" id="fontHex">${currentFontColor}</span>
            </div>
          </div>
          <div class="preview-box" id="preview">
            <div style="padding: 10px;">Preview of your color scheme</div>
          </div>
          <div style="text-align: center;">
            <button type="button" class="reset-btn" onclick="resetColors()">Reset to Defaults</button>
            <button type="button" class="apply-btn" onclick="submitForm()">Apply Colors</button>
            <button type="button" class="cancel-btn" onclick="google.script.host.close()">Cancel</button>
          </div>
        </form>
        <script>
          document.getElementById('borderColor').addEventListener('input', updatePreview);
          document.getElementById('headerColor').addEventListener('input', updatePreview);
          document.getElementById('actionColor').addEventListener('input', updatePreview);
          document.getElementById('fontColor').addEventListener('input', updatePreview);
          function updatePreview() {
            const border = document.getElementById('borderColor').value;
            const header = document.getElementById('headerColor').value;
            const action = document.getElementById('actionColor').value;
            const font = document.getElementById('fontColor').value;
            document.getElementById('borderHex').textContent = border;
            document.getElementById('headerHex').textContent = header;
            document.getElementById('actionHex').textContent = action;
            document.getElementById('fontHex').textContent = font;
            const preview = document.getElementById('preview');
            preview.style.border = '3px solid ' + border;
            preview.style.backgroundColor = header;
            preview.style.color = font;}
          function resetColors() {
            document.getElementById('borderColor').value = '${CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT}';
            document.getElementById('headerColor').value = '${CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND}';
            document.getElementById('actionColor').value = '${CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD}';
            document.getElementById('fontColor').value = '${CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT}';
            updatePreview();}
          function submitForm() {
            const colors = {
              border: document.getElementById('borderColor').value,
              header: document.getElementById('headerColor').value,
              action: document.getElementById('actionColor').value,
              font: document.getElementById('fontColor').value};
            google.script.run
              .withSuccessHandler(function() {
                google.script.host.close();})
              .withFailureHandler(function(error) {
                alert('Error: ' + error);})
              .processColorUpdate(colors);}
          updatePreview();
        </script>
      `)
      .setWidth(450)
      .setHeight(500);
      ui.showModalDialog(htmlOutput, 'Update Team Colors');
    } catch (error) {
      console.error('Error in handleColorUpdate:', error);
      SpreadsheetApp.getUi().alert('Error updating colors: ' + error.message);
      sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.UPDATE_CONTROLS.COLORS_CHECKBOX).setValue(false);}}
  function processColorUpdate(colors) {
    const sheet = SpreadsheetApp.getActiveSheet();
    const colorConfig = CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.COLOR_STORAGE;
    try {
      sheet.getRange(colorConfig.BORDER_COLOR).setValue(colors.border);
      sheet.getRange(colorConfig.HEADER_COLOR).setValue(colors.header);
      sheet.getRange(colorConfig.ACTION_COLOR).setValue(colors.action);
      sheet.getRange(colorConfig.FONT_COLOR).setValue(colors.font);
      applyUserSheetColors(sheet, colors);
      SpreadsheetApp.getUi().alert('Success', 'Team colors have been updated!', SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (error) {
      console.error('Error in processColorUpdate:', error);
      throw new Error('Failed to update colors: ' + error.message);}}
  function applyUserSheetColors(sheet, colors) {
      const config = CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET;
      const colorConfig = config.COLOR_STORAGE;
      const defaultColors = CONFIG.SETUP.VISUAL.COLORS;
      
      if (!colors) {
          colors = {
              border: sheet.getRange(colorConfig.BORDER_COLOR).getValue() || defaultColors.QUESTION_FONT,
              header: sheet.getRange(colorConfig.HEADER_COLOR).getValue() || defaultColors.HEADER_BACKGROUND,
              action: sheet.getRange(colorConfig.ACTION_COLOR).getValue() || defaultColors.ACTION_GOLD,
              font: sheet.getRange(colorConfig.FONT_COLOR).getValue() || defaultColors.HEADER_FONT
          };
      }
      
      const borderRanges = Object.values(config.BORDER).filter(range => range && range.includes(':'));
      borderRanges.forEach(range => {
          try {
              sheet.getRange(range)
                  .setBackground(colors.border)
                  .setFontColor(colors.font);
          } catch (error) {
              console.error(`Error updating border range ${range}:`, error);
          }
      });
      
      const headerRanges = [
          'B2:P2', 'B4', 'E4:F4', 'I4:J4', 'E5:F5', 'I5:J5',
          'B6', 'I6:J6', 'M6:N6', 'I7:J7', 'M7:N7', 'B8',
          'I8:J8', 'B10', 'I9:J9', 'E10', 'I10:J10',
          config.PROGRAM.TEAMS.PROGRAMS_HEADER_RANGE,
          config.PROGRAM.TEAMS.PROGRAMS_WEEK_TOTALS_RANGE
      ];
      
      headerRanges.forEach(range => {
          try {
              sheet.getRange(range)
                  .setBackground(colors.header)
                  .setFontColor(colors.font);
          } catch (error) {
              console.error(`Error updating header range ${range}:`, error);
          }
      });
      
      const actionRanges = ['M8:N9', 'B12'];
      actionRanges.forEach(range => {
          try {
              sheet.getRange(range)
                  .setBackground(colors.action)
                  .setFontColor(colors.font);
          } catch (error) {
              console.error(`Error updating action range ${range}:`, error);
          }
      });
      
      const specialCells = {
          'C12:F12': { bg: defaultColors.USER_BACKGROUND, font: '#000000' },
          'K9': { bg: '#FFFFFF', font: colors.action },
          'F10': { bg: '#FFFFFF', font: colors.action },
          'K10': { bg: '#FFFFFF', font: colors.action }};
      
      Object.entries(specialCells).forEach(([range, style]) => {
          try {
              sheet.getRange(range)
                  .setBackground(style.bg)
                  .setFontColor(style.font);
          } catch (error) {
              console.error(`Error updating special range ${range}:`, error);
          }
      });
      
      console.log(`Successfully updated sheet colors for ${sheet.getName()}`);
  }
  function handleImageUpdate(sheet, userEmail) {
    try {
      const teamName = sheet.getName();
      const service = new TransactionService(userEmail);
      const permissionCheck = service.validateUserPermission(teamName);
      if (!permissionCheck.isValid) {
        sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.UPDATE_CONTROLS.IMAGE_CHECKBOX).setValue(false);
        return;}
      PropertiesService.getUserProperties().setProperty('tempUserEmail', userEmail);
      const ui = SpreadsheetApp.getUi();
      const htmlOutput = HtmlService.createHtmlOutput(`
        <form id="imageForm">
          <div style="margin-bottom: 15px;">
            <label for="imageUrl">Enter Image URL:</label><br>
            <input type="url" id="imageUrl" name="imageUrl" 
                  style="width: 100%; margin-top: 5px; padding: 5px;" 
                  placeholder="https://example.com/team-logo.png" required>
            <div style="font-size: 0.8em; color: #666; margin-top: 5px;">
              Enter a direct link to your team image/logo (PNG, JPG, etc.)
            </div>
          </div>
          <button type="button" onclick="submitForm()" 
                  style="background-color: #4CAF50; color: white; padding: 8px 16px; 
                        border: none; border-radius: 4px; cursor: pointer;">
            Update Image
          </button>
          <button type="button" onclick="google.script.host.close()" 
                  style="background-color: #f44336; color: white; padding: 8px 16px; 
                        border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
            Cancel
          </button>
        </form>
        <script>
          function submitForm() {
            const imageUrl = document.getElementById('imageUrl').value.trim();
            if (!imageUrl) {
              alert('Please enter an image URL.');
              return;}
            try {
              new URL(imageUrl);
            } catch (e) {
              alert('Please enter a valid URL.');
              return;}
            google.script.run
              .withSuccessHandler(function() {
                google.script.host.close();})
              .withFailureHandler(function(error) {
                alert('Error: ' + error);})
              .processImageUpdate(imageUrl);}
        </script>
      `)
      .setWidth(400)
      .setHeight(200);
      ui.showModalDialog(htmlOutput, 'Update Team Image');
      sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.UPDATE_CONTROLS.IMAGE_CHECKBOX).setValue(false);
    } catch (error) {
      console.error('Error in handleImageUpdate:', error);
      SpreadsheetApp.getUi().alert('Error updating image: ' + error.message);
      sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.UPDATE_CONTROLS.IMAGE_CHECKBOX).setValue(false);}}
  function processImageUpdate(imageUrl) {
    const sheet = SpreadsheetApp.getActiveSheet();
    try {
      const linkCell = sheet.getRange(CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.IMAGE_AREA.LINK);
      linkCell.setValue(imageUrl)
        .setFontColor("#FFFFFF")
        .setBackground("#FFFFFF");
      updateTeamImage(sheet);
      SpreadsheetApp.getUi().alert('Success', 'Team image has been updated!', SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (error) {
      console.error('Error in processImageUpdate:', error);
      throw new Error('Failed to update image: ' + error.message);}
  }
// 13. Transaction Handlers
  function handleSubmit(userEmail) {
      const service = getTransactionService(userEmail);
      return service.handleSubmit();}
  function processTrackerEdit(range, a1Notation, cellValue, e) {
    try {
      const mappedActions = CONFIG.SYSTEM.TRIGGERS.MAPPINGS.TRACKER[a1Notation];
      if (!mappedActions) {
        Logger.log(`No actions mapped for cell ${a1Notation} in Tracker`);
        return;}
      if (Array.isArray(mappedActions)) {
        mappedActions.forEach(action => {
          switch(action) {
            case 'handleDraftStart':
              handleDraftStart(range, range.getSheet());
              break;
            case 'handleDraftTypeChange':
              handleDraftTypeChange(range, range.getSheet());
              break;
            case 'handleTrackerEdit':
              handleTrackerEdit(range, range.getSheet(), a1Notation);
              break;
            default:
              Logger.log(`Unknown action: ${action}`);}});
      } else {
        switch(mappedActions) {
          case 'handleDraftStart':
            handleDraftStart(range, range.getSheet());
            break;
          case 'handleDraftTypeChange':
            handleDraftTypeChange(range, range.getSheet());
            break;
          case 'handleTrackerEdit':
            handleTrackerEdit(range, range.getSheet(), a1Notation);
            break;
          default:
            Logger.log(`Unknown action: ${mappedActions}`);}}
    } catch (error) {
      return getErrorHandler().handleSheetError(error, range.getSheet());}}
  function handleTransactionLogEdit(range, sheet, a1Notation, userEmail) {
      const cells = CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS;
      if (a1Notation === cells.SUBMIT) {         // D3
          handleTransactionSubmit(range, sheet, userEmail);
      } else if (a1Notation === cells.CONFIRM) { // H3
          handleTransactionConfirm(range, sheet, userEmail);
      } else if (a1Notation === cells.TEAM) {    // A3
          const service = getTransactionService(userEmail);
          service.refreshDropdowns();}}
  function handleTransactionSubmit(range, sheet, userEmail) {
      if (range.getValue() === true) {
          handleSubmit(userEmail);  // Pass userEmail
      } else {
          const confirmCell = sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.CONFIRM);
          CONFIG.SYSTEM.HELPERS.toggleConfirmButton(confirmCell, false);}}
  function handleTransactionConfirm(range, sheet, userEmail) {
      if (range.getValue() !== true) return;
      const submitRange = sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.SUBMIT);
      if (submitRange.getValue() === true) {
          handleConfirmation(userEmail);  // Pass userEmail
          CONFIG.SYSTEM.HELPERS.resetControls(submitRange, range);}}
  function handleConfirmation(userEmail) {
      const service = getTransactionService(userEmail);
      return service.handleConfirmation();}
  function updateTransactionLogEligibility() {
      console.log("Starting Transaction Log eligibility update...");
      if (!SHEETS) {
        initializeSheets();}
      const logSheet = SHEETS.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME);
      const settingsSheet = SHEETS.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
      const maxSelections = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_SCHOOL_SELECTIONS).getValue();
      const teamsSheet = SHEETS.teams;
      const teamsData = teamsSheet.getDataRange().getValues();
      const weekManager = WeekManager.getInstance();
      const currentWeek = weekManager.getCurrentWeek();
      const weekNum = currentWeek.includes('Bowls') ? 21 : 
                      parseInt(currentWeek.replace('Week ', ''));
      const schoolCounts = new Map();
      teamsData.slice(1)
          .filter(row => row[1] === weekNum)  // Filter for current week
          .forEach(row => {
              const schools = row.slice(2).filter(Boolean);
              schools.forEach(school => {
                  schoolCounts.set(school, (schoolCounts.get(school) || 0) + 1);});});
      if (!schoolEligibilityManager) {
          initializeEligibilityManager();}
      schoolCounts.forEach((count, school) => {
          const state = schoolEligibilityManager.eligibilityState.get(school);
          if (state) {
              state.currentSelections = count;}});
      const schoolsList = Utils.getSchoolNames();
      const eligibilityData = schoolsList.map(([school]) => {
          if (!school) return ['', ''];
          const count = schoolCounts.get(school) || 0;
          const remainingSelections = maxSelections - count;
          const state = schoolEligibilityManager.eligibilityState.get(school);
          if (state) {
              state.currentSelections = count;}
          return [remainingSelections, school];});
      const startRow = CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW;
      const selectionsCol = CONFIG.SHEETS.STRUCTURE.COLUMNS.TRANSACTION.SELECTIONS_LEFT;
      const lastRow = Math.max(logSheet.getLastRow(), startRow + schoolsList.length);
      logSheet.getRange(startRow, selectionsCol, lastRow - startRow + 1, 2).clearContent();
      const range = logSheet.getRange(startRow, selectionsCol, eligibilityData.length, 2);
      range.setValues(eligibilityData);
      colorSchoolCells(logSheet);
      schoolEligibilityManager.saveState();
      console.log("Transaction Log eligibility update complete");}
  function updateTransactionLogInfo() {
      console.log("Starting transaction log info update...");
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const helperSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.RESULTS.HELPER_SHEET);
      const leaderboardSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME);
      const pointsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.POINTS.NAME);
      const completedSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.COMPLETED.NAME);      
      if (!helperSheet) {
          console.error("TransactionData helper sheet not found!");
          return;}
      verifyEligibility();
      const startRow = 2; // Helper sheet starts at row 2 (after headers)
      const schools = Utils.getSchoolNames();
      const apStartRow = parseInt(PropertiesService.getScriptProperties().getProperty('AP_RANKINGS_START_ROW')) || 6;
      const apRankingsRange = leaderboardSheet.getRange(
          apStartRow, 
          34, // Column AH for AP Rankings
          25, // Top 25 teams
          4);
      const leaderboardData = apRankingsRange.getValues();
      const rankedSchools = new Map();
      leaderboardData.forEach(row => {
          if (row[3] && row[2]) { // School name in column 4, rank in column 3
              rankedSchools.set(row[3], row[2]);}});
      const pointsData = pointsSheet.getRange(
          CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW,
          2, // Column B for schools
          SCHOOLS.length,
          3  // Get columns B, C, D (Schools, empty, Total)
      ).getValues();
      const schoolPoints = new Map(pointsData.map(row => [row[0], row[2]])); // row[0] = school, row[2] = total points
      const conferenceMap = new Map(SCHOOLS.map(school => [school[0], school[3]]));
      const completedGamesData = completedSheet.getDataRange().getValues();
      const WINNER_TEAM_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.WINNER_TEAM - 1;
      const LOSER_TEAM_INDEX = CONFIG.SHEETS.STRUCTURE.COLUMNS.COMPLETED.LOSER_TEAM - 1;
      const overallRecords = new Map();
      schools.forEach(([school]) => {
          let wins = 0;
          let losses = 0;
          completedGamesData.slice(1).forEach(game => {
              if (game[WINNER_TEAM_INDEX] === school) wins++;
              if (game[LOSER_TEAM_INDEX] === school) losses++;});
          overallRecords.set(school, { wins, losses, record: `${wins}-${losses}` });});
      const confConfig = JSON.parse(PropertiesService.getScriptProperties().getProperty('CONFERENCE_RANKINGS_CONFIG'));
      const confStartRow = confConfig ? confConfig.startRow : 31;
      const conferenceLayouts = {
          'AAC': { startCol: 2, columns: 4, hasRank: true },           // B-E
          'ACC': { startCol: 7, columns: 4, hasRank: true },           // G-J
          'Big 12': { startCol: 12, columns: 4, hasRank: true },       // L-O
          'Big Ten': { startCol: 17, columns: 4, hasRank: true },      // Q-T
          'CUSA': { startCol: 22, columns: 4, hasRank: true },         // V-Y
          'MAC': { startCol: 27, columns: 4, hasRank: true },          // AA-AD
          'Mountain West': { startCol: 32, columns: 5, hasRank: true }, // AF-AJ
          'Pac-12': { startCol: 38, columns: 5, hasRank: true },       // AL-AP
          'SEC': { startCol: 44, columns: 5, hasRank: true, isSEC: true }, // AR-AV (special layout)
          'Sun Belt': { startCol: 50, columns: 5, hasRank: true },     // AX-BB
          'Independent': { startCol: 56, columns: 2, hasRank: false }};
      const maxCol = 57; // Through column BE
      const conferenceStandingsRange = leaderboardSheet.getRange(
          confStartRow,
          2,  // Start at column B
          20, // Get 20 rows of data (max schools per conference)
          maxCol - 1).getDisplayValues();
      const conferenceRanks = new Map();
      Object.entries(conferenceLayouts).forEach(([confName, layout]) => {
          if (!layout.hasRank) return; // Skip Independent (no ranks)
          const confSchools = SCHOOLS.filter(school => school[3] === confName).map(s => s[0]);
          for (let row = 0; row < conferenceStandingsRange.length; row++) {
              const rowData = conferenceStandingsRange[row];              
              confSchools.forEach(school => {
                  for (let col = layout.startCol - 2; col < layout.startCol + layout.columns - 2; col++) {
                      if (rowData[col] === school) {
                          let rank = '';
                          if (layout.columns === 5) {
                              if (layout.isSEC) {
                                  rank = rowData[layout.startCol - 2]; // First column is rank
                              } else {
                                  rank = rowData[layout.startCol - 2];}
                          } else {
                              rank = rowData[layout.startCol - 2];}                         
                          if (rank && !isNaN(rank) && rank !== '') {
                              conferenceRanks.set(school, rank);}
                          break;}}});}});
      const helperData = schools.map(([school]) => {
          if (!school) return ['', '', '', '', '', '', '', 0, 0];
          let selectionsLeft = 0;
          if (schoolEligibilityManager) {
              const state = schoolEligibilityManager.eligibilityState.get(school);
              if (state) {
                  selectionsLeft = state.maxSelections - state.currentSelections;}}
          const rank = rankedSchools.get(school) || 0;
          const conf = conferenceMap.get(school) || '';
          const points = schoolPoints.get(school) || 0;
          const recordData = overallRecords.get(school) || { wins: 0, losses: 0, record: '0-0' };
          const confRank = conferenceRanks.get(school) || '';
          if (!confRank && conf !== 'Independent') {
              console.log(`Missing conference rank for ${school} (${conf})`);}
          return [
              selectionsLeft,     // Column A
              school,            // Column B
              rank,              // Column C - AP Rank (0 for unranked)
              conf,              // Column D - Conference
              confRank,          // Column E - Conference Rank
              recordData.record, // Column F - Overall Record
              points,            // Column G - Points
              recordData.wins,   // Column H - Wins
              recordData.losses];});
      const headers = [
          "Selections Left", "School", "Rank", "Conference", 
          "Conf Rank", "Record", "Points", "Wins", "Losses"];
      helperSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      const lastRow = helperSheet.getLastRow();
      if (lastRow > 1) {
          helperSheet.getRange(2, 1, lastRow - 1, 9).clearContent();}
      helperSheet.getRange(startRow, 1, helperData.length, 9).setValues(helperData);
      colorSchoolCells(helperSheet);
      console.log("Transaction log helper sheet updated successfully");}
function initializeTransactionLogFormatting() {
  setupTransactionLogConditionalFormatting();}
function setupTransactionLogUI(sheet) {
    console.log("Setting up Transaction Log UI...");
    const config = CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI;
    sheet.getRange(config.SEPARATORS.COLUMN_1).setBackground(config.SEPARATORS.COLOR);
    sheet.getRange(config.SEPARATORS.COLUMN_2).setBackground(config.SEPARATORS.COLOR);
    sheet.getRange(config.TRANSACTION_HEADER.RANGE).merge()
        .setValue(config.TRANSACTION_HEADER.TITLE)
        .setBackground(config.TRANSACTION_HEADER.COLOR)
        .setFontWeight("bold")
        .setFontSize(12)
        .setHorizontalAlignment("center");
    sheet.getRange("A2:H2").setBackground("#f3f3f3");
    Object.values(config.CONTROLS).forEach(control => {
        sheet.getRange(control.LABEL_CELL)
            .setValue(control.LABEL_TEXT)
            .setFontWeight("bold")
            .setHorizontalAlignment("center");});
    sheet.getRange(config.CONTROLS.TEAM.VALUE_CELL).setBackground("#ffffff");
    sheet.getRange(config.CONTROLS.DROP.VALUE_CELL).setBackground("#ffffff");
    sheet.getRange(config.CONTROLS.ADD.VALUE_CELL).setBackground("#ffffff");
    const checkboxValidation = SpreadsheetApp.newDataValidation()
        .requireCheckbox()
        .build();
    sheet.getRange(config.CONTROLS.SUBMIT.VALUE_CELL)
        .setDataValidation(checkboxValidation)
        .setBackground("#ffffff");
    sheet.getRange(config.CONTROLS.SUMMARY.MERGE_RANGE).merge()
        .setValue("")
        .setBackground("#ffffff")
        .setFontStyle("italic")
        .setHorizontalAlignment("left");
    sheet.getRange(config.CONTROLS.CONFIRM.VALUE_CELL)
        .setDataValidation(checkboxValidation)
        .setBackground("#ffffff")
        .setFontColor("#ffffff");
    sheet.getRange(`${config.BUFFER_ROW.ROW}:${config.BUFFER_ROW.ROW}`)
        .setBackground(config.BUFFER_ROW.COLOR);
    sheet.setFrozenRows(config.FROZEN_ROWS);
    sheet.getRange(config.SECTIONS.RESEARCH.RANGE).merge()
        .setValue(config.SECTIONS.RESEARCH.TITLE)
        .setBackground(config.SECTIONS.RESEARCH.COLOR)
        .setFontWeight("bold")
        .setFontSize(12)
        .setHorizontalAlignment("center");
    sheet.getRange(config.SECTIONS.HISTORY.RANGE).merge()
        .setValue(config.SECTIONS.HISTORY.TITLE)
        .setBackground(config.SECTIONS.HISTORY.COLOR)
        .setFontWeight("bold")
        .setFontSize(12)
        .setHorizontalAlignment("center");
    setupTransactionFilters(sheet);
    const historyHeaders = config.HISTORY_HEADERS.VALUES;
    sheet.getRange(
        config.HISTORY_HEADERS.START_ROW, 
        config.HISTORY_HEADERS.START_COL, 
        1, 
        historyHeaders.length)
        .setValues([historyHeaders])
        .setFontWeight("bold")
        .setBackground(config.HISTORY_HEADERS.BACKGROUND)
        .setHorizontalAlignment("center");
    sheet.getRange(config.RESULTS.HEADER_RANGE).merge()
        .setValue(config.RESULTS.HEADER_TEXT)
        .setFontWeight("bold")
        .setBackground(config.RESULTS.HEADER_BACKGROUND);
    sheet.setColumnWidth(1, 150);   // Team Name
    sheet.setColumnWidth(2, 150);   // Dropping School
    sheet.setColumnWidth(3, 150);   // Adding School
    sheet.setColumnWidth(4, 200);    // Submit
    sheet.setColumnWidth(5, 180);   // Summary (part 1)
    sheet.setColumnWidth(6, 150);   // Summary (part 2)
    sheet.setColumnWidth(7, 100);   // Summary (part 3)
    sheet.setColumnWidth(8, 180);   // Confirm
    sheet.setColumnWidth(9, 25);    // Grey separator
    sheet.setColumnWidth(10, 150);  // Timestamp (J)
    sheet.setColumnWidth(11, 150);  // Team Name in history (K)
    sheet.setColumnWidth(16, 25);   // Grey separator (P)
    console.log("Transaction Log UI setup completed");}
function setupTransactionFilters(sheet) {
    const config = CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.FILTERS;
    const resultsConfig = CONFIG.SHEETS.SPECIFIC.TRANSACTION.COMBINED_UI.RESULTS;
    const styles = CONFIG.UI.STYLES.BASE;
    const filterBackgroundColor = "#e8f5e9";  // Light green - easy on eyes
    const filterFontColor = styles.FONT_COLOR;  // Black from config
    sheet.getRange(config.SORT_BY.LABEL_CELL)
        .setValue(config.SORT_BY.LABEL_TEXT)
        .setFontWeight(styles.FONT_WEIGHT)
        .setBackground(filterBackgroundColor)
        .setFontColor(filterFontColor);
    const sortValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(config.SORT_BY.OPTIONS)
        .build();
    sheet.getRange(config.SORT_BY.VALUE_CELL)
        .setDataValidation(sortValidation)
        .setValue(config.SORT_BY.DEFAULT)
        .setBackground("#ffffff");  // Keep white background
    sheet.getRange(config.CONFERENCE.LABEL_CELL)
        .setValue(config.CONFERENCE.LABEL_TEXT)
        .setFontWeight(styles.FONT_WEIGHT)
        .setBackground(filterBackgroundColor)
        .setFontColor(filterFontColor);
    const confValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(config.CONFERENCE.OPTIONS)
        .build();
    sheet.getRange(config.CONFERENCE.VALUE_CELL)
        .setDataValidation(confValidation)
        .setValue(config.CONFERENCE.DEFAULT)
        .setBackground("#ffffff");  // Keep white background
    sheet.getRange(config.MIN_POINTS.LABEL_CELL)
        .setValue(config.MIN_POINTS.LABEL_TEXT)
        .setFontWeight(styles.FONT_WEIGHT)
        .setBackground(filterBackgroundColor)
        .setFontColor(filterFontColor);
    sheet.getRange(config.MIN_POINTS.VALUE_CELL)
        .setValue(config.MIN_POINTS.DEFAULT)
        .setBackground("#ffffff");  // Keep white background
    sheet.getRange(config.FILTERS_LABEL.CELL)
        .setValue(config.FILTERS_LABEL.TEXT)
        .setFontWeight(styles.FONT_WEIGHT)
        .setBackground(filterBackgroundColor)
        .setFontColor(filterFontColor);
    const checkboxValidation = SpreadsheetApp.newDataValidation()
        .requireCheckbox()
        .build();
    sheet.getRange(config.RANKED_ONLY.LABEL_CELL)
        .setValue(config.RANKED_ONLY.LABEL_TEXT)
        .setFontWeight(styles.FONT_WEIGHT)
        .setBackground(filterBackgroundColor)
        .setFontColor(filterFontColor);
    sheet.getRange(config.RANKED_ONLY.CHECKBOX_CELL)
        .setDataValidation(checkboxValidation)
        .setValue(false)
        .setBackground("#ffffff");  // Keep white
    sheet.getRange(config.AVAILABLE_ONLY.LABEL_CELL)
        .setValue(config.AVAILABLE_ONLY.LABEL_TEXT)
        .setFontWeight(styles.FONT_WEIGHT)
        .setBackground(filterBackgroundColor)
        .setFontColor(filterFontColor);
    sheet.getRange(config.AVAILABLE_ONLY.CHECKBOX_CELL)
        .setDataValidation(checkboxValidation)
        .setValue(false)
        .setBackground("#ffffff");  // Keep white
    SpreadsheetApp.flush();
    const queryFormula = `=IFERROR(
        QUERY(
            {TransactionData!A:E, ARRAYFORMULA(TransactionData!H:H&"-"&TransactionData!I:I), TransactionData!G:G, TransactionData!H:H},
            "SELECT Col1, Col2, Col3, Col4, Col5, Col6, Col7 WHERE Col2 IS NOT NULL" &
            IF(${config.CONFERENCE.VALUE_CELL}="${config.CONFERENCE.DEFAULT}", "", " AND Col4 = '"&${config.CONFERENCE.VALUE_CELL}&"'") &
            IF(${config.MIN_POINTS.VALUE_CELL}=${config.MIN_POINTS.DEFAULT}, "", " AND Col7 >= "&${config.MIN_POINTS.VALUE_CELL}) &
            IF(${config.RANKED_ONLY.CHECKBOX_CELL}=FALSE, "", " AND Col3 > 0") &
            IF(${config.AVAILABLE_ONLY.CHECKBOX_CELL}=FALSE, "", " AND Col1 > 0") &
            " ORDER BY " &
            SWITCH(${config.SORT_BY.VALUE_CELL},
                "${config.SORT_BY.OPTIONS[0]}", "Col7 DESC",
                "${config.SORT_BY.OPTIONS[1]}", "Col7 ASC",
                "${config.SORT_BY.OPTIONS[2]}", "Col2 ASC",
                "${config.SORT_BY.OPTIONS[3]}", "Col2 DESC",
                "${config.SORT_BY.OPTIONS[4]}", "Col8 DESC, Col7 DESC",
                "${config.SORT_BY.OPTIONS[5]}", "Col8 ASC, Col7 ASC",
                "${config.SORT_BY.OPTIONS[6]}", "Col4 ASC, Col5 ASC",
                "Col7 DESC"),
            1),
        "${resultsConfig.ERROR_MESSAGE}")`;
    sheet.getRange(resultsConfig.QUERY_CELL).setFormula(queryFormula);
    sheet.getRange("C9:C").setNumberFormat('#;-#;""');
    sheet.getRange(resultsConfig.RESULT_HEADER_RANGE)
        .setFontWeight("bold");
    resultsConfig.CENTER_ALIGN_COLUMNS.forEach(col => {
        const columnLetter = Utils.columnToLetter(col);
        sheet.getRange(`${columnLetter}9:${columnLetter}`)
            .setHorizontalAlignment("center");});}
function setupTransactionLogConditionalFormatting() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Transaction Log');
  const startRow = 11; // Where query results start
  
  sheet.clearConditionalFormatRules();
  
  const cellStyles = extractCellStyles();
  const rules = [];
  
  // Rule 1: Column B (Selections Left) - Red when 0
  const columnARange = sheet.getRange("B11:B");
  const zeroRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberEqualTo(0)
    .setBackground("#FF0000")  // Red background
    .setFontColor("#FFFFFF")    // White font
    .setBold(true)              // Bold text
    .setRanges([columnARange])
    .build();
  rules.push(zeroRule);
  
  // Rule 2: Column C (Schools) - Individual school colors
  SCHOOLS.forEach(([school, fontColor, backgroundColor]) => {
    const range = sheet.getRange("C11:C");
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(school)
      .setFontColor(fontColor)
      .setBackground(backgroundColor)
      .setBold(true)
      .setRanges([range])
      .build();
    rules.push(rule);
  });
  const defaultRange = sheet.getRange("C11:C");
  const defaultRule = SpreadsheetApp.newConditionalFormatRule()
    .whenCellEmpty()
    .setBackground("#FFFFFF")      // Default white background
    .setFontColor("#000000")  // Black font
    .setBold(false)           // Not bold
    .setRanges([defaultRange])
    .build();
  rules.push(defaultRule);
  
  sheet.setConditionalFormatRules(rules);
  console.log(`Applied ${rules.length} conditional formatting rules (including default rule for non-FBS schools)`);
}
function setupLeaderboardConditionalFormatting() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Leaderboard');
  const startRow = 6; // Where query results start
  sheet.clearConditionalFormatRules();
  const cellStyles = extractCellStyles();
  const rules = [];
  SCHOOLS.forEach(([school, fontColor, backgroundColor]) => {
    const range = sheet.getRange("AV6:BD26");
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(school)
      .setFontColor(fontColor)
      .setBackground(backgroundColor)
      .setBold(true)
      .setRanges([range])
      .build();
    rules.push(rule);});
  sheet.setConditionalFormatRules(rules);
  console.log(`Applied ${rules.length} conditional formatting rules`);}
function syncCompetitionManagerFromTeamsSheet() {
  const manager = new CompetitionManager();
  const teamsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.TEAMS.NAME);
  if (!teamsSheet) {
    throw new Error("Teams sheet not found");}
  manager.programs = new Map();
  const data = teamsSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const teamName = data[i][0];
    const week = data[i][1];
    const schools = data[i].slice(2).filter(school => school); // Get schools from column C onward
    if (teamName && week) {
      if (!manager.programs.has(teamName)) {
        manager.programs.set(teamName, new Map());}
      manager.programs.get(teamName).set(week, schools);}}
  manager.saveState();
  console.log("Competition Manager synced from Teams sheet");}

// 14. UI Updates
  function updateTeamDropdown() {
    console.log("Updating team dropdown...");
    try {
      const teamsSheet = SHEETS.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TEAMS.NAME);
      const weekManager = WeekManager.getInstance();
      const currentWeek = weekManager.getCurrentWeek();
      const weekNum = currentWeek === "Bowls" || currentWeek === "CFP" ? 16 : 
                      parseInt(currentWeek.replace('Week ', ''));
      const teamsData = teamsSheet.getDataRange().getValues();
      const currentWeekTeams = teamsData
        .filter(row => row[1] === weekNum)
        .map(row => row[0])
        .filter(name => name);
      const uniqueTeams = [...new Set(currentWeekTeams)];
      console.log("Found current week team names:", uniqueTeams);
      if (uniqueTeams.length === 0) {
        throw new Error("No team names found for current week");}
      const validation = SpreadsheetApp.newDataValidation()
        .requireValueInList(uniqueTeams)
        .build();
      const teamCell = SHEETS.log.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.TEAM);
      teamCell.setDataValidation(validation);
      const dropCell = SHEETS.log.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.DROP);
      const addCell = SHEETS.log.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.ADD);
      dropCell.clearContent().clearDataValidations();
      addCell.clearContent().clearDataValidations();
      console.log("Team dropdown updated successfully");
    } catch (error) {
      console.error("Error updating team dropdown:", error);
      throw error;}}
  function updateDroppingSchoolDropdown(userEmail) {
      console.log("Updating dropping school dropdown...");
      try {
        const service = getTransactionService(userEmail); // ✅ Pass userEmail
        const logSheet = service.logSheet;
        const cells = CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS;
        const team = logSheet.getRange(cells.TEAM).getValue();
        if (!team) {
          console.log("No team selected, skipping dropping school dropdown update");
          const dropCell = logSheet.getRange(cells.DROP);
          dropCell.clearContent().clearDataValidations();
          return;}
        const currentTeamName = service.getCurrentTeamName(team);
        const currentSchools = service.getTeamSchools(currentTeamName);
        console.log("Current schools for team:", currentSchools);
        if (currentSchools.length === 0) {
          console.log("No schools available to drop");
          return;}
        const validation = SpreadsheetApp.newDataValidation()
          .requireValueInList(currentSchools)
          .build();
        logSheet.getRange(cells.DROP).setDataValidation(validation);
        const addCell = logSheet.getRange(cells.ADD);
        addCell.clearContent().clearDataValidations();
        console.log("Dropping school dropdown updated with schools:", currentSchools);
      } catch (error) {
        console.error("Error updating dropping school dropdown:", error);
        throw error;}}
  function updateAddingSchoolDropdown(userEmail) {
      console.log("Updating adding school dropdown...");
      try {
        const service = getTransactionService(userEmail); // ✅ Pass userEmail
        const logSheet = service.logSheet;
        const cells = CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS;
        const team = logSheet.getRange(cells.TEAM).getValue();
        if (!team) {
          console.log("No team selected, skipping adding school dropdown update");
          return;}
        const currentTeamName = service.getCurrentTeamName(team);
        const droppingSchool = logSheet.getRange(cells.DROP).getValue();
        const eligibleSchools = service.getEligibleSchools(currentTeamName, droppingSchool);
        if (eligibleSchools.length === 0) {
          console.log("No eligible schools available for adding");
          return;}
        const validation = SpreadsheetApp.newDataValidation()
          .requireValueInList(eligibleSchools)
          .build();
        logSheet.getRange(cells.ADD).setDataValidation(validation);
        console.log("Adding school dropdown updated successfully");
      } catch (error) {
        console.error("Error updating adding school dropdown:", error);
        throw error;}}


// 15. Draft Process
  function initializeDraftSetup() {
    if (!SHEETS) {
      initializeSheets();}
    setupDraftRange();
    return true;}
  function setupDraftRange() {
      const tracker = SHEETS.tracker;
      const settingsSheet = SHEETS.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
      const teamCount = Utils.getTeamCount();
      const startCol = CONFIG.SHEETS.STRUCTURE.COLUMNS.TRACKER.TEAM_START;
      const paddedWidth = teamCount + CONFIG.DRAFT.SETUP.TEAM_PADDING;
      const teamNameStartCell = CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START;
      const teamNames = settingsSheet
          .getRange(teamNameStartCell)
          .offset(0, 0, teamCount)
          .getValues()
          .map(row => row[0])
          .filter(name => name);
      console.log("Setting up draft range for teams:", teamNames);
      const numSchoolsPerTeam = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM).getValue();
      const extraRows = CONFIG.DRAFT.SETUP.EXTRA_ROWS;
      const headerRow = tracker.getRange(
          CONFIG.SHEETS.STRUCTURE.COMMON.SUB_HEADER_ROW_2,  // Updated
          startCol,
          1,
          paddedWidth);
      const headerValues = Array(paddedWidth).fill("");
      teamNames.forEach((name, index) => {
          headerValues[index] = name;});
      headerRow.setValues([headerValues]);
      headerRow
          .setFontFamily(CONFIG.UI.STYLES.BASE.FONT_FAMILY)
          .setFontSize(CONFIG.UI.STYLES.BASE.SUB_HEADER_FONT_SIZE)
          .setFontColor(CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT)
          .setFontWeight(CONFIG.UI.STYLES.BASE.FONT_WEIGHT)
          .setBackground(CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND)
          .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT)
          .setVerticalAlignment(CONFIG.UI.STYLES.BASE.VERTICAL_ALIGNMENT)
          .setWrap(CONFIG.UI.STYLES.BASE.WRAP);
      const roundsColumn = CONFIG.SHEETS.STRUCTURE.COLUMNS.TRACKER.ROUNDS;
      const roundNumbers = [];
      for (let i = 1; i <= numSchoolsPerTeam; i++) {
          roundNumbers.push([`Round ${i}`]);}
      tracker.getRange(
          CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW,
          roundsColumn,
          numSchoolsPerTeam,
          1
      ).setValues(roundNumbers)
      .setFontFamily(CONFIG.UI.STYLES.BASE.FONT_FAMILY)
      .setFontSize(CONFIG.UI.STYLES.BASE.FONT_SIZE)
      .setFontWeight(CONFIG.UI.STYLES.BASE.FONT_WEIGHT)
      .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT)
      .setVerticalAlignment(CONFIG.UI.STYLES.BASE.VERTICAL_ALIGNMENT)
      .setWrap(CONFIG.UI.STYLES.BASE.WRAP);
      const draftArea = tracker.getRange(
          CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW,  // Updated
          startCol,
          numSchoolsPerTeam + extraRows,
          teamCount);
      draftArea.clear();
      const schoolsList = getCachedSchoolsList().map(row => row[0]);
      const validation = SpreadsheetApp.newDataValidation()
          .requireValueInList(schoolsList)
          .build();
      const firstCell = tracker.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW, startCol);
      firstCell.setDataValidation(validation);
      console.log("Draft range setup complete");
      return {
          startCol: startCol,
          endCol: startCol + teamCount - 1,
          teamCount: teamCount,
          schoolsList: schoolsList};}
  function handleDraftStart(range, sheet) {
      Logger.log("Draft start handler triggered with value: " + range.getValue());
      if (range.getValue() !== true) {
          Logger.log("Draft start value not true");
          return false;}
      try {
          const settingsSheet = SHEETS.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
          const labelCell = sheet.getRange(4, 2, 1, 14);
          const currentLabel = labelCell.getValue();
          if (currentLabel && currentLabel.includes("Complete")) {
              Logger.log("Draft already completed - checking admin and starting league");
              range.setValue(false);
              const authData = getCurrentAuthenticatedUser();
              if (!authData) {
                  SpreadsheetApp.getUi().alert(
                      'Authentication Required',
                      'You must be authenticated to start the league.\n\n' +
                      'Please use: League Tools > Authenticate Me',
                      SpreadsheetApp.getUi().ButtonSet.OK);
                  return false;}
              const adminEmail = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ADMIN_EMAIL).getValue();
              if (!adminEmail) {
                  SpreadsheetApp.getUi().alert(
                      'Configuration Error',
                      'No admin email configured. Please contact your league administrator.',
                      SpreadsheetApp.getUi().ButtonSet.OK);
                  return false;}
              if (!isUserAdmin(authData.email)) {
                  SpreadsheetApp.getUi().alert(
                      'Admin Access Required',
                      `Only the league admin can start the league after draft completion.\n\n` +
                      `Your Email: ${authData.email}\n\n` +
                      `Please ask the admin to authenticate and start the league.`,
                      SpreadsheetApp.getUi().ButtonSet.OK);
                  return false;}
              const ui = SpreadsheetApp.getUi();
              const response = ui.alert(
                  'Start Your League',
                  'Great drafting! Please make sure to verify your draft results below.\n\n' +
                  'All set? Click "Start League" to initialize your league.\n\n' +
                  'This will set up all sheets, scoring, and user profiles.\n\n' +
                  `Authenticated as admin: ${authData.email}`,
                  ui.ButtonSet.OK_CANCEL);
              if (response === ui.Button.OK) {
                  const currentStatus = PropertiesService.getScriptProperties().getProperty('initialization_status');
                  if (currentStatus && (currentStatus.includes('phase_') || currentStatus === 'completed')) {
                      console.log("Initialization already in progress or completed");
                      SpreadsheetApp.getActiveSpreadsheet().toast(
                          'Initialization already in progress or completed.',
                          'Status',
                          3);
                      return false;}
                  SpreadsheetApp.getActiveSpreadsheet().toast(
                      'Starting 3-phase initialization. This will complete in 6-10 minutes total.',
                      'Initialization Starting',
                      5);
                  const manager = new InitializationManager();
                  manager.initializeSystem({ fromDraft: true })
                      .then(() => {
                          console.log("Initialization completed successfully");})
                      .catch(error => {
                          console.error("Initialization failed:", error);
                          SpreadsheetApp.getActiveSpreadsheet().toast(
                              'Initialization failed: ' + error.message,
                              'Error',
                              10);});}
              return true;}
          const draftDateValue = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_DATE).getValue();
          console.log("Retrieved draft date:", draftDateValue);
          if (!draftDateValue) {
              Logger.log("No draft date value found");
              sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.START_DRAFT).setValue(false);
              CONFIG.SYSTEM.HELPERS.showError("No Draft Date selected. Please contact your League Commissioner for a Draft Date");
              return false;}
          const draftType = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_TYPE).getValue();
          console.log("Retrieved draft type:", draftType);
          if (!draftType) {
              Logger.log("No draft type value found");
              sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.START_DRAFT).setValue(false);
              CONFIG.SYSTEM.HELPERS.showError("Please select a Draft Type.");
              return false;}
          const draftDate = new Date(draftDateValue);
          const today = new Date();
          const year = draftDate.getFullYear();
          if (today < draftDate) {
              Logger.log("Draft date is in the future");
              sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.START_DRAFT).setValue(false);
              CONFIG.SYSTEM.HELPERS.showError(CONFIG.UI.MESSAGES.DRAFT.WAIT(year));
              return false;}
          clearDraftArea();
          initializeDraftCaches();
          const success = initializeDraftSetup();
          if (success) {
              CONFIG.SYSTEM.HELPERS.showSuccess(CONFIG.UI.MESSAGES.DRAFT.WELCOME(year));
              return true;}
          return false;
      } catch (error) {
          console.error("Error in handleDraftStart:", error);
          clearCaches();
          getErrorHandler().handleError(error);
          return false;}}
  function handleDraftSelection(e) {
      console.log("=== HANDLE DRAFT SELECTION STARTED ===");
      console.log("Event range:", e.range.getA1Notation());
      console.log("Event value:", e.range.getValue());
      stopDraftTimer();
      if (!SHEETS || !SHEETS.log) {
          console.log("Initializing SHEETS...");
          initializeSheets();}
      const settingsSheet = SHEETS.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
      if (!settingsSheet) {
          console.error("Settings sheet not found");
          return;}
      const maxSelections = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_SCHOOL_SELECTIONS).getValue();
      console.log("Max selections per school:", maxSelections);
      const range = e.range;
      if (!range || !range.getSheet()) {
          console.log("No range or sheet in event");
          return;}
      const sheet = range.getSheet();
      const draftStarted = sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.START_DRAFT).getValue();
      console.log("Draft started?", draftStarted);
      if (!draftStarted) {
          console.log("Draft not started, exiting");
          return;}
      const selectedSchool = range.getValue();
      console.log("Selected school:", selectedSchool);
      if (!selectedSchool) {
          console.log("No school selected, exiting");
          return;}
      const teamCount = Utils.getTeamCount();
      const startCol = CONFIG.SHEETS.STRUCTURE.COLUMNS.TRACKER.TEAM_START;
      const currentRow = range.getRow() - CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW;
      console.log("Team count:", teamCount);
      console.log("Start column:", startCol);
      console.log("Current row offset:", currentRow);
      const selections = getCurrentSelections();
      const schoolCounts = Utils.getSchoolCounts(selections);
      console.log("Current count for", selectedSchool, ":", schoolCounts.get(selectedSchool));
      if (!schoolEligibilityManager) {
          console.log("Initializing eligibility manager");
          initializeEligibilityManager();}
      console.log("Skipping eligibility manager transaction during draft");
      const updates = {
          currentTeam: sheet.getRange(CONFIG.SHEETS.STRUCTURE.COMMON.SUB_HEADER_ROW_2, range.getColumn()).getValue(),
          teamCount: teamCount,
          startCol: startCol,
          endCol: startCol + teamCount - 1,
          isDraftSnake: SHEETS.ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME)
              .getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_TYPE).getValue() === "Snake",
          currentRow: currentRow};
      console.log("Updates object:", updates);
      console.log("Current team:", updates.currentTeam);
      const nextPosition = calculateNextPosition(updates, range);
      console.log("Next position:", nextPosition);
      try {
          console.log("Coloring cell");
          colorSchoolCells(range);
          console.log("Preparing eligibility data");
          const eligibilityData = Utils.getSchoolNames().map(([school]) => {
              if (!school) return ['', ''];
              const count = schoolCounts.get(school) || 0;
              const availableSelections = maxSelections - count;
              console.log(`${school}: count=${count}, available=${availableSelections}`);
              return [school, availableSelections];});
          const selectedSchoolData = eligibilityData.find(row => row[0] === selectedSchool);
          console.log("Selected school eligibility:", selectedSchoolData);
          const eligibilityRange = sheet.getRange(
              CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW,
              CONFIG.SHEETS.STRUCTURE.COLUMNS.TRACKER.SCHOOLS,
              eligibilityData.length,
              2);
          eligibilityRange.setValues(eligibilityData);
          console.log("Eligibility data set successfully");
          if (!nextPosition.isLastSelection) {
              const nextTeam = nextPosition.nextTeam || sheet.getRange(CONFIG.SHEETS.STRUCTURE.COMMON.SUB_HEADER_ROW_2, nextPosition.nextCol).getValue();
              if (nextTeam) {
                  console.log("Setting up next selection for team:", nextTeam);
                  const nextCell = sheet.getRange(
                      nextPosition.nextRow + CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW,
                      nextPosition.nextCol);
                  console.log("Next cell:", nextCell.getA1Notation());
                  const teamSelections = getTeamSelectionsForColumn(nextPosition.nextCol);
                  console.log("Team selections for next team:", teamSelections);
                  const availableSchools = Utils.getSchoolNames()
                      .map(([school]) => school)
                      .filter(school => {
                          const count = schoolCounts.get(school) || 0;
                          const alreadySelectedByTeam = teamSelections.includes(school);
                          const available = count < maxSelections && !alreadySelectedByTeam;
                          if (!available) {
                              console.log(`${school} not available: count=${count}, maxSelections=${maxSelections}, alreadySelected=${alreadySelectedByTeam}`);}
                          return available;});
                  console.log("Available schools count:", availableSchools.length);
                  const validation = SpreadsheetApp.newDataValidation()
                      .requireValueInList(availableSchools)
                      .build();
                  nextCell.setDataValidation(validation);
                  console.log("Validation set on next cell");
                  showSelectionMessage(
                      updates.currentTeam,
                      selectedSchool,
                      nextTeam);
                  const draftRange = getDraftRange();
                  const draftSelections = draftRange.getValues();
                  let totalSelections = 0;
                  for (let row of draftSelections) {
                      for (let cell of row) {
                          if (cell && cell !== '') totalSelections++;}}
                  if (totalSelections > 1) {
                      const timerSeconds = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TIMER_AMOUNT).getValue();
                      const timerLocation = CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.TIMER;
                      customCountdownTimerWithLock(timerSeconds, timerLocation, 10, 3);}
              } else {
                  console.error("Could not determine next team!");}}
          cachedSelections = null;
          cachedTeamSelections.clear();
          if (nextPosition.isLastSelection) {
              console.log("Draft is complete!");
              handleDraftCompletion(sheet);}
          console.log("=== HANDLE DRAFT SELECTION COMPLETED SUCCESSFULLY ===");
      } catch (error) {
          console.error("Error in handleDraftSelection:", error);
          console.error("Error stack:", error.stack);
          throw error;}}
  function handleDraftTypeChange(range, sheet) {
    const draftStarted = sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.START_DRAFT).getValue();
    if (!draftStarted) return;
    clearCaches();
    const teamCount = Utils.getTeamCount();
    const startCol = CONFIG.SHEETS.STRUCTURE.COLUMNS.TRACKER.TEAM_START;
    const draftRange = getDraftRange();
    const currentSelections = draftRange.getValues();
    let nextEmptyPosition = null;
    for (let row = 0; row < currentSelections.length; row++) {
      for (let col = 0; col < currentSelections[row].length; col++) {
        if (!currentSelections[row][col]) {
          nextEmptyPosition = {
            nextRow: row,
            nextCol: col + startCol};
          break;}}
      if (nextEmptyPosition) break;}
    if (nextEmptyPosition) {
      setupNextSelection(nextEmptyPosition, range);}
    initializeDraftCaches();}
  function getDraftRange() {
    const tracker = SHEETS.tracker;
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
    const numSchoolsPerTeam = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM).getValue();
    const teamCount = Utils.getTeamCount();
    const startCol = CONFIG.SHEETS.STRUCTURE.COLUMNS.TRACKER.TEAM_START;
    return tracker.getRange(
      CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW,
      startCol,
      numSchoolsPerTeam,
      teamCount);}
  function getAvailableSchools(teamCol) {
      const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
      const maxSelections = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_SCHOOL_SELECTIONS).getValue();
      const selections = getCurrentSelections();
      const maxedOutTeamSchools = getTeamSelectionsForColumn(teamCol);
      const schoolCounts = new Map();
      for (const row of selections) {
          for (const school of row) {
              if (school) {
                  schoolCounts.set(school, (schoolCounts.get(school) || 0) + 1);}}}
      return getCachedSchoolsList().map(school => school[0]).filter(school => {
          const overallCount = schoolCounts.get(school) || 0;
          return overallCount < maxSelections && !maxedOutTeamSchools.includes(school);});}
  function updateEligibilityTracker(selectedSchool) {
      const tracker = SHEETS.tracker;
      const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
      const maxSelections = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_SCHOOL_SELECTIONS).getValue();
      const draftRange = getDraftRange();
      const selections = draftRange.getValues();
      const schoolCounts = new Map();
      for (let row = 0; row < selections.length; row++) {
          for (let col = 0; col < selections[row].length; col++) {
              const school = selections[row][col];
              if (school) {
                  schoolCounts.set(school, (schoolCounts.get(school) || 0) + 1);}}}
      if (!schoolEligibilityManager) {
          initializeEligibilityManager();}
      const eligibilityUpdates = getCachedSchoolsList().map(([school]) => {
          if (!school) return ['', ''];
          const selectionCount = schoolCounts.get(school) || 0;
          const state = schoolEligibilityManager.eligibilityState.get(school);
          if (state) {
              state.currentSelections = selectionCount;}
          return [school, maxSelections - selectionCount];});
      tracker.getRange(
          CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW,  // Changed from CONFIG.SHEETS.STRUCTURE.COMMON.DATA_START_ROW
          CONFIG.SHEETS.STRUCTURE.COLUMNS.TRACKER.SCHOOLS,
          eligibilityUpdates.length,
          CONFIG.SHEETS.STRUCTURE.COLUMNS.TRACKER.SELECTIONS_LEFT
      ).setValues(eligibilityUpdates);
      schoolEligibilityManager.saveState();}
  function handleDraftCompletion(sheet) {
    stopDraftTimer();
    const year = new Date().getFullYear();
    CONFIG.SYSTEM.HELPERS.showSuccess(CONFIG.UI.MESSAGES.DRAFT.COMPLETE(year));
    sheet.getRange(4, 2, 1, 14).merge()
        .setValue(CONFIG.SETUP.CONTROLS.SETUP_START.DRAFT_COMPLETE_LABEL)
        .setFontFamily(CONFIG.UI.STYLES.BASE.FONT_FAMILY)
        .setFontSize(16)
        .setFontColor(CONFIG.SETUP.VISUAL.COLORS.HEADER_FONT)
        .setBackground(CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND)
        .setFontWeight(CONFIG.UI.STYLES.BASE.FONT_WEIGHT)
        .setHorizontalAlignment(CONFIG.UI.STYLES.BASE.ALIGNMENT_RIGHT);
    sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.START_DRAFT)
        .setValue(false)
        .setFontColor(CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD)
        .setBackground(CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND);}
  function showSelectionMessage(currentTeam, selectedSchool, nextTeam) {
    Logger.log(`Showing selection message for ${currentTeam} selecting ${selectedSchool}, next team: ${nextTeam}`);
    CONFIG.SYSTEM.HELPERS.showSuccess(
      CONFIG.UI.MESSAGES.DRAFT.SELECTION(currentTeam, selectedSchool, nextTeam));}
  function initializeDraftCaches() {
      console.log("Starting initializeDraftCaches");
      clearCaches();
      console.log("Draft caches initialized");}
  function customCountdownTimerWithLock(startSeconds, cellAddress, redThreshold, boldThreshold) {
      console.log("=== TIMER START CALLED ===");
      const scriptProperties = PropertiesService.getScriptProperties();
      
      // Clear any existing lock first
      scriptProperties.deleteProperty('countdownRunning');
      
      // Set the new lock
      scriptProperties.setProperty('countdownRunning', 'true');
      console.log("Timer lock set to true");
      
      if (!startSeconds) {
          const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
              .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
          startSeconds = settingsSheet
              .getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TIMER_AMOUNT)
              .getValue();
      }
      
      console.log(`Starting countdown from ${startSeconds} seconds`);
      
      cellAddress = cellAddress || CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.TIMER;
      redThreshold = redThreshold || 10;
      boldThreshold = boldThreshold || 3;
      
      const sheetName = CONFIG.SHEETS.SPECIFIC.TRACKER.NAME;
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = spreadsheet.getSheetByName(sheetName);
      
      if (!sheet) {
          SpreadsheetApp.getUi().alert(`Sheet "${sheetName}" not found.`);
          scriptProperties.deleteProperty('countdownRunning');
          return;
      }
      
      const targetCell = sheet.getRange(cellAddress);
      
      try {
          for (let i = startSeconds; i >= 0; i--) {
              if (scriptProperties.getProperty('countdownRunning') !== 'true') {
                  console.log(`Timer stopped at ${i} seconds - lock was removed`);
                  break;
              }
              
              targetCell.setFontColor(null);
              targetCell.setFontWeight("normal");
              
              if (i <= boldThreshold) {
                  targetCell.setFontColor("#FF0000");
                  targetCell.setFontWeight("bold");
              } else if (i <= redThreshold) {
                  targetCell.setFontColor("#FF0000");
              }
              
              targetCell.setValue(i);
              SpreadsheetApp.flush();
              
              if (i > 0) {
                  Utilities.sleep(570);
              }
          }
          
          if (scriptProperties.getProperty('countdownRunning') === 'true') {
              targetCell.setValue("DONE!");
              targetCell.setFontColor("#FF0000");
              targetCell.setFontWeight("bold");
              console.log("Timer completed successfully");
          }
      } finally {
          scriptProperties.deleteProperty('countdownRunning');
          console.log("=== TIMER END - Lock cleared ===");
      }
  }
  function stopDraftTimer() {
      console.log("=== STOP TIMER CALLED ===");
      const scriptProperties = PropertiesService.getScriptProperties();
      const wasRunning = scriptProperties.getProperty('countdownRunning');
      console.log(`Timer was running: ${wasRunning}`);
      
      scriptProperties.deleteProperty('countdownRunning');
      
      const sheet = SpreadsheetApp.getActiveSpreadsheet()
          .getSheetByName(CONFIG.SHEETS.SPECIFIC.TRACKER.NAME);
      if (sheet) {
          const timerLocation = CONFIG.SHEETS.SPECIFIC.TRACKER.CELLS.TIMER;
          const timerCell = sheet.getRange(timerLocation);
          timerCell.setValue("--");
          timerCell.setFontColor(null);
          timerCell.setFontWeight("normal");
          console.log("Timer cell reset to '--'");
      }
      console.log("=== STOP TIMER COMPLETED ===");
  }
  function setupDraftSheetConditionalFormatting() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.TRACKER.NAME);
    if (!sheet) {
      console.error("Draft/Tracker sheet not found");
      return;}
    sheet.clearConditionalFormatRules();
    const selectionsCol = CONFIG.SHEETS.STRUCTURE.COLUMNS.TRACKER.SELECTIONS_LEFT;
    const startRow = CONFIG.SHEETS.SPECIFIC.TRACKER.DATA_START_ROW;
    const columnLetter = Utils.columnToLetter(selectionsCol);
    const selectionsRange = sheet.getRange(`${columnLetter}${startRow}:${columnLetter}`);
    const zeroRule = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberEqualTo(0)
      .setBackground("#FF0000")  // Red background
      .setFontColor("#FFFFFF")   // White font
      .setBold(true)             // Bold text
      .setRanges([selectionsRange])
      .build();
    sheet.setConditionalFormatRules([zeroRule]);
    console.log(`Applied conditional formatting to Draft sheet column ${columnLetter} for zero selections`);
  }
// 16. Event Handlers
function resetInitializationForTesting() {
  InitializationManager.resetInitialization();
  PropertiesService.getScriptProperties().deleteProperty('gameState');
  PropertiesService.getScriptProperties().deleteProperty('eligibilityState');
  clearCaches();
  const tracker = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Draft');
  if (tracker) {
    tracker.getRange('E2').setValue(false); // Draft Complete
    tracker.getRange('F2').setValue(false)  // Confirm Season
      .setBackground('#ffffff')
      .setFontColor('#ffffff');}
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'System reset complete. You can now run another initialization test.',
    'Reset Complete',
    5);}
function setupUserSheetConditionalFormatting(sheet) {
  const existingRules = sheet.getConditionalFormatRules();
  const preservedRules = existingRules.filter(rule => {
    const ranges = rule.getRanges();
    return !ranges.some(range => range.getColumn() === 5);
  });
  
  const newRules = [...preservedRules];
  
  // Rules for each school (HIGHEST PRIORITY - added first)
  SCHOOLS.forEach(([school, fontColor, backgroundColor]) => {
    const range = sheet.getRange("E13:E"); // Column E from row 13 downward
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(school)
      .setFontColor(fontColor)
      .setBackground(backgroundColor)
      .setBold(true)
      .setRanges([range])
      .build();
    newRules.push(rule);
  });
  
  // Default rule for non-empty cells that don't match any school (MEDIUM PRIORITY)
  const nonEmptyDefaultRange = sheet.getRange("E13:E");
  const nonEmptyDefaultRule = SpreadsheetApp.newConditionalFormatRule()
    .whenCellNotEmpty()
    .setBackground("#FFFFFF")  // Default white background
    .setFontColor("#000000")   // Default black font
    .setBold(false)            // Not bold
    .setRanges([nonEmptyDefaultRange])
    .build();
  newRules.push(nonEmptyDefaultRule);
  
  // Default rule for empty cells (LOWEST PRIORITY)
  const emptyDefaultRange = sheet.getRange("E13:E");
  const emptyDefaultRule = SpreadsheetApp.newConditionalFormatRule()
    .whenCellEmpty()
    .setBackground("#FFFFFF")  // Default white background
    .setFontColor("#000000")   // Default black font
    .setBold(false)            // Not bold
    .setRanges([emptyDefaultRange])
    .build();
  newRules.push(emptyDefaultRule);
  
  sheet.setConditionalFormatRules(newRules);
  console.log(`Applied conditional formatting to ${sheet.getName()} - Column E with school rules and default formatting`);
}


function validateTeamNameContent(teamName) {
  const config = TEAM_NAME_CONFIG;
  teamName = teamName.trim();
  if (!teamName || teamName.length < config.MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Team name must be at least ${config.MIN_LENGTH} characters.` };}
  if (teamName.length > config.MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Team name must be ${config.MAX_LENGTH} characters or less.` };}
  const teamNameLower = teamName.toLowerCase();
  const teamNameNoSpaces = teamNameLower.replace(/\s+/g, '');
  const isWhitelisted = config.WHITELIST.some(white => 
    white.toLowerCase() === teamNameLower);
  if (!isWhitelisted && config.PROFANITY_FILTER.ENABLED) {
    const containsProfanity = config.PROFANITY_FILTER.WORDS.some(word => {
      const wordBoundaryRegex = new RegExp(`\\b${word}\\b`, 'i');
      const separatorPatterns = [
        `\\b${word}\\b`,           // Standard word boundaries
        `^${word}$`,               // Exact match only
        `^${word}\\s`,             // Start of string
        `\\s${word}$`,             // End of string
        `\\s${word}\\s`,           // Surrounded by spaces
        `[._-]${word}[._-]`,       // Surrounded by separators
        `^${word}[._-]`,           // Start with word + separator
        `[._-]${word}$`,           // End with separator + word
      ];
      return separatorPatterns.some(pattern => 
        new RegExp(pattern, 'i').test(teamName));});
    const matchesPattern = config.PROFANITY_FILTER.PATTERNS.some(pattern => {
      return pattern.test(teamName) || pattern.test(teamNameNoSpaces);});
    if (containsProfanity || matchesPattern) {
      return { 
        isValid: false, 
        error: 'Team name contains inappropriate language. Please choose a different name.' };}}
  if (config.RESERVED_NAMES.some(reserved => reserved.toLowerCase() === teamNameLower)) {
    return { 
      isValid: false, 
      error: 'This name is reserved. Please choose a different name.' };}
  if (config.SYSTEM_SHEETS.some(name => name.toLowerCase() === teamNameLower)) {
    return { 
      isValid: false, 
      error: 'This name is reserved for system use. Please choose a different name.' };}
  const validNamePattern = /^[a-zA-Z0-9\s\-_'.]+$/;
  if (!validNamePattern.test(teamName)) {
    return { 
      isValid: false, 
      error: 'Team name can only contain letters, numbers, spaces, hyphens, underscores, apostrophes, and periods.' };}
  if (/\s{2,}/.test(teamName)) {
    return { 
      isValid: false, 
      error: 'Team name cannot contain multiple consecutive spaces.' };}
  if (/^[^a-zA-Z0-9]/.test(teamName) || /[^a-zA-Z0-9]$/.test(teamName)) {
    return { 
      isValid: false, 
      error: 'Team name must start and end with a letter or number.' };}
  return { isValid: true };}
function validateTeamName(teamName, allTeamNames, currentIndex) {
  const validation = validateTeamNameContent(teamName);
  if (!validation.isValid) {
    return validation;}
  if (allTeamNames && allTeamNames.length > 0) {
    const teamNameLower = teamName.toLowerCase();
    for (let i = 0; i < allTeamNames.length; i++) {
      if (i !== currentIndex && allTeamNames[i] && 
          allTeamNames[i].toLowerCase() === teamNameLower) {
        return { 
          isValid: false, 
          error: 'This team name is already in use.' };}}}
  return { isValid: true };}
function validateSettingsForDraft() {
  const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
  const errors = [];
  try {
    const draftDate = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_DATE).getValue();
    if (!draftDate) {
      errors.push(`Draft Date is missing (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_DATE})`);
    } else if (!(draftDate instanceof Date)) {
      errors.push(`Draft Date must be a valid date (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_DATE})`);}
    const draftType = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_TYPE).getValue();
    if (!draftType) {
      errors.push(`Draft Type is missing (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_TYPE})`);
    } else if (!CONFIG.DRAFT.SETUP.TYPE_OPTIONS.includes(draftType)) {
      errors.push(`Draft Type must be either "Linear" or "Snake" (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_TYPE})`);}
    const teamCount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
    if (!teamCount || teamCount < 1) {
      errors.push(`Team Count must be at least 1 (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT})`);
    } else if (!Number.isInteger(teamCount)) {
      errors.push(`Team Count must be a whole number (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT})`);}
    const schoolsPerTeam = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM).getValue();
    if (!schoolsPerTeam || schoolsPerTeam < 1) {
      errors.push(`Number of Schools per Team must be at least 1 (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM})`);
    } else if (!Number.isInteger(schoolsPerTeam)) {
      errors.push(`Number of Schools per Team must be a whole number (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM})`);}
    const maxTimesAllowed = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_TIMES_SCHOOL_ALLOWED).getValue();
    if (!maxTimesAllowed || maxTimesAllowed < 1) {
      errors.push(`Max Times School Allowed must be at least 1 (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_TIMES_SCHOOL_ALLOWED})`);
    } else if (!Number.isInteger(maxTimesAllowed)) {
      errors.push(`Max Times School Allowed must be a whole number (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_TIMES_SCHOOL_ALLOWED})`);}
    const maxSelections = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_SCHOOL_SELECTIONS).getValue();
    if (!maxSelections || maxSelections < 1) {
      errors.push(`Max School Selections must be at least 1 (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_SCHOOL_SELECTIONS})`);
    } else if (!Number.isInteger(maxSelections)) {
      errors.push(`Max School Selections must be a whole number (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_SCHOOL_SELECTIONS})`);}
    const adminName = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ADMIN_NAME).getValue();
    const adminEmail = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ADMIN_EMAIL).getValue();
    if (!adminName) {
      errors.push(`Admin Name is missing (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ADMIN_NAME})`);}
    if (!adminEmail) {
      errors.push(`Admin Email is missing (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ADMIN_EMAIL})`);
    } else if (!isValidEmail(adminEmail)) {
      errors.push(`Admin Email is not a valid email address (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ADMIN_EMAIL})`);}
    const finalAddDropDate = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.FINAL_ADD_DROP_DATE).getValue();
    if (!finalAddDropDate) {
      errors.push(`Final Add/Drop Date is missing (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.FINAL_ADD_DROP_DATE})`);
    } else if (!(finalAddDropDate instanceof Date)) {
      errors.push(`Final Add/Drop Date must be a valid date (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.FINAL_ADD_DROP_DATE})`);}
    const numAddDrops = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_OF_ADD_DROPS).getValue();
    if (numAddDrops === "" || numAddDrops === null || numAddDrops === undefined) {
      errors.push(`Number of Add/Drops is missing (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_OF_ADD_DROPS})`);
    } else if (!Number.isInteger(numAddDrops) || numAddDrops < 0) {
      errors.push(`Number of Add/Drops must be 0 or a positive whole number (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_OF_ADD_DROPS})`);}
    const totalPrizePool = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ENTRY_FEE).getValue();
    if (totalPrizePool === "" || totalPrizePool === null || totalPrizePool === undefined) {
      errors.push(`Total Prize Pool is missing (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ENTRY_FEE})`);
    } else if (typeof totalPrizePool !== 'number' || totalPrizePool < 0) {
      errors.push(`Total Prize Pool must be 0 or a positive number (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ENTRY_FEE})`);}
    const highPointsEnabled = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HIGH_POINTS_YES_NO).getValue();
    if (highPointsEnabled !== "Yes" && highPointsEnabled !== "No") {
      errors.push(`High Points Weekly must be either 'Yes' or 'No' (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HIGH_POINTS_YES_NO})`);}
    if (highPointsEnabled === "Yes") {
      const weeklyAmount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HP_WEEKLY_AMOUNT).getValue();
      const numHPWeeks = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_HP_WEEKS).getValue();
      if (!weeklyAmount || weeklyAmount < 0) {
        errors.push(`High Points Weekly Amount must be 0 or positive (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HP_WEEKLY_AMOUNT})`);}
      if (!numHPWeeks || numHPWeeks < 1) {
        errors.push(`Number of High Points Weeks must be at least 1 (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_HP_WEEKS})`);}}
    if (teamCount && teamCount > 0) {
      const teamNames = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START)
        .offset(0, 0, teamCount, 1)
        .getValues()
        .flat();
      const ownerNames = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OWNER_NAMES_START)
        .offset(0, 0, teamCount, 1)
        .getValues()
        .flat();
      const ownerEmails = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OWNER_EMAILS_START)
        .offset(0, 0, teamCount, 2)
        .getValues();
      const startRow = parseInt(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START.match(/\d+/)[0]);
      for (let i = 0; i < teamCount; i++) {
        const rowNum = startRow + i;
        if (!teamNames[i]) {
          errors.push(`Team ${i + 1} name is missing (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START.replace(/\d+/, rowNum)})`);
        } else {
          const teamNameValidation = validateTeamName(teamNames[i], teamNames, i);
          if (!teamNameValidation.isValid) {
            errors.push(`Team ${i + 1} (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START.replace(/\d+/, rowNum)}): ${teamNameValidation.error}`);}}
        if (!ownerNames[i]) {
          errors.push(`Team ${i + 1} owner name is missing (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OWNER_NAMES_START.replace(/\d+/, rowNum)})`);}
        if (!ownerEmails[i][0]) { // Primary email
          errors.push(`Team ${i + 1} owner email is missing (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OWNER_EMAILS_START.replace(/\d+/, rowNum)})`);
        } else if (!isValidEmail(ownerEmails[i][0])) {
          errors.push(`Team ${i + 1} owner email is invalid (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OWNER_EMAILS_START.replace(/\d+/, rowNum)})`);}
        const secondaryEmailCol = CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ADDITIONAL_OWNER_EMAIL_START.replace(/\d+/, rowNum);
        if (ownerEmails[i][1] && !isValidEmail(ownerEmails[i][1])) {
          errors.push(`Team ${i + 1} secondary email is invalid (${secondaryEmailCol})`);}}
      const uniqueTeamNames = new Set();
      teamNames.forEach((name, index) => {
        if (name) {
          const lowerName = name.toLowerCase();
          if (uniqueTeamNames.has(lowerName)) {
            const rowNum = startRow + index;
            errors.push(`Duplicate team name found: "${name}" (${CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START.replace(/\d+/, rowNum)})`);}
          uniqueTeamNames.add(lowerName);}});}
    return errors;
  } catch (error) {
    console.error("Error during settings validation:", error);
    errors.push(`Validation error: ${error.message}`);
    return errors;}}
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);}
function handleStartLeague(range, sheet) {
  console.log("Handling start league trigger");
  if (range.getValue() === true) {
    showDraftInitializationDialog();}}
function showDraftInitializationDialog() {
  const ui = SpreadsheetApp.getUi();
  const errors = validateSettingsForDraft();
  if (errors.length > 0) {
    const errorMessage = "Cannot proceed with draft setup. Please fix the following issues:\n\n" + 
                        errors.join("\n");
    ui.alert(
      '⚠️ Settings Validation Failed',
      errorMessage,
      ui.ButtonSet.OK);
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
    settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.START_LEAGUE).setValue(false);
    return;}
  const result = ui.alert(
    '✅ Settings Validated Successfully',
    'All settings have been validated.\n\n' +
    'Are you ready to initialize the draft?\n' +
    'This will set up the tracker sheet and prepare for team selections.\n\n' +
    'Click YES to proceed or NO to cancel.',
    ui.ButtonSet.YES_NO);
  if (result == ui.Button.YES) {
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
    settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.START_LEAGUE).setValue(false);
    initializeTrackerOnly()
      .then(() => {
        ui.alert(
          '🎉 Success!',
          CONFIG.UI.MESSAGES.SUCCESS.DRAFT,
          ui.ButtonSet.OK);})
      .catch(error => {
        ui.alert(
          '❌ Error',
          'Draft initialization failed: ' + error.message,
          ui.ButtonSet.OK);
        getErrorHandler().handleError(error);});
  } else {
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
    settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.START_LEAGUE).setValue(false);
    ui.alert(
      'Cancelled',
      'Draft initialization cancelled. You can try again when ready.',
      ui.ButtonSet.OK);}}
function handleSetupStart(range, sheet) {
  const checkboxValue = range.getValue();
  if (checkboxValue === true) {
    range.setValue(false);
    if (isInitialSetupComplete()) {
      showDraftInitializationDialog();
    } else {
      range.setFontColor(CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND)
           .setBackground(CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND);
      const labelCell = sheet.getRange(CONFIG.SETUP.CONTROLS.SETUP_START.LABEL_CELL);
      labelCell.setValue("");
      showCommissionerDialog();}}}
function showCommissionerDialog() {
  const ui = SpreadsheetApp.getUi();
  const htmlOutput = HtmlService.createHtmlOutput(`
    <style>
      body { 
        font-family: Arial, sans-serif; 
        padding: 5px ;
        margin: 0;}
      h3 {
        margin-top: 0;}
      input { 
        width: 100%; 
        padding: 8px; 
        margin: 5px 0 15px 0;
        border: 2px solid ${CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD};
        border-radius: 4px;}
      button { 
        background: ${CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND}; 
        color: white; 
        padding: 10px 20px; 
        border: none;
        border-radius: 4px;
        cursor: pointer;}
      button:hover {
        opacity: 0.9;
      }
    </style>
    <h3>Let's set up the Commissioner Account.</h3>
    <label>Commissioner Name:</label>
    <input type="text" id="commissionerName" placeholder="John Smith">
    <label>Commissioner Email:</label>
    <input type="email" id="commissionerEmail" placeholder="email@example.com">
    <button onclick="submitForm()">Continue</button>
    <script>
      function submitForm() {
        const name = document.getElementById('commissionerName').value;
        const email = document.getElementById('commissionerEmail').value;
        if (name && email && email.includes('@')) {
          google.script.run.withSuccessHandler(() => google.script.host.close())
                           .processCommissionerSetup(name, email);
        } else {
          alert('Please enter both name and valid email');}}
      document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          submitForm();}});
      document.getElementById('commissionerName').focus();
    </script>
  `)
  .setWidth(300)
  .setHeight(250);
  ui.showModalDialog(htmlOutput, 'Commissioner Setup');}
function addNotesToCells(sheet) {
  const notesMappings = [
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_DATE, note: CONFIG.SETUP.NOTES.DRAFT_DATE },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_TYPE, note: CONFIG.SETUP.NOTES.DRAFT_TYPE },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT, note: CONFIG.SETUP.NOTES.TEAM_COUNT },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM, note: CONFIG.SETUP.NOTES.SCHOOLS_PER_TEAM },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_TIMES_SCHOOL_ALLOWED, note: CONFIG.SETUP.NOTES.MAX_TIMES_ALLOWED },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_SCHOOL_SELECTIONS, note: CONFIG.SETUP.NOTES.MAX_SELECTIONS },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.FINAL_ADD_DROP_DATE, note: CONFIG.SETUP.NOTES.FINAL_DATE },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_OF_ADD_DROPS, note: CONFIG.SETUP.NOTES.NUM_ADD_DROPS },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TIMER_AMOUNT, note: CONFIG.SETUP.NOTES.TIMER_AMOUNT },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.WIN, note: CONFIG.SETUP.NOTES.WIN },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_GAME, note: CONFIG.SETUP.NOTES.CONFERENCE_GAME },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OVER_50, note: CONFIG.SETUP.NOTES.OVER_50 },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.SHUTOUT, note: CONFIG.SETUP.NOTES.SHUTOUT },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_25, note: CONFIG.SETUP.NOTES.RANKED_25 },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_10, note: CONFIG.SETUP.NOTES.RANKED_10 },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_WIN, note: CONFIG.SETUP.NOTES.CONFERENCE_WIN },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.LOSS, note: CONFIG.SETUP.NOTES.LOSS },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_GAME_LOSS, note: CONFIG.SETUP.NOTES.CONFERENCE_GAME_LOSS },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OVER_50_LOSS, note: CONFIG.SETUP.NOTES.OVER_50_LOSS },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.SHUTOUT_LOSS, note: CONFIG.SETUP.NOTES.SHUTOUT_LOSS },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_25_LOSS, note: CONFIG.SETUP.NOTES.RANKED_25_LOSS },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_10_LOSS, note: CONFIG.SETUP.NOTES.RANKED_10_LOSS },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_LOSS, note: CONFIG.SETUP.NOTES.CONFERENCE_LOSS },//
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HEISMAN_WINNER, note: CONFIG.SETUP.NOTES.HEISMAN_WINNER },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.BOWL_APPEARANCE, note: CONFIG.SETUP.NOTES.BOWL_APPEARANCE },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_FIRST, note: CONFIG.SETUP.NOTES.PLAYOFF_APPEARANCE },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_QUARTER, note: CONFIG.SETUP.NOTES.PLAYOFF_QUARTER },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_SEMI, note: CONFIG.SETUP.NOTES.PLAYOFF_SEMI },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CHAMPIONSHIP_WIN, note: CONFIG.SETUP.NOTES.CHAMPIONSHIP_WIN },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CHAMPIONSHIP_LOSS, note: CONFIG.SETUP.NOTES.CHAMPIONSHIP_LOSS },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ENTRY_FEE, note: CONFIG.SETUP.NOTES.ENTRY_FEE },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HIGH_POINTS_YES_NO, note: CONFIG.SETUP.NOTES.HIGH_POINTS_YN },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HP_WEEKLY_AMOUNT, note: CONFIG.SETUP.NOTES.WEEKLY_AMOUNT },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TIES, note: CONFIG.SETUP.NOTES.TIES_YN },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_WINNERS, note: CONFIG.SETUP.NOTES.NUM_WINNERS },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_HP_WEEKS, note: CONFIG.SETUP.NOTES.NUM_HP_WEEKS },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HP_PRIZE_POOL, note: CONFIG.SETUP.NOTES.HP_PRIZE_POOL },
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OWNER_INFO, note: CONFIG.SETUP.NOTES.OWNER_INFO },    
    { cell: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAME_INFO, note: CONFIG.SETUP.NOTES.TEAM_NAME_INFO }, 
   ];
  notesMappings.forEach(item => {
    sheet.getRange(item.cell).setNote(item.note);});}
function handleSetupFieldEdit(e) {
  const range = e.range;
  const sheet = e.source.getActiveSheet();
  const a1Notation = range.getA1Notation();
  const checkmarkMap = {
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_DATE]: CONFIG.SETUP.CHECKMARK_CELLS.DRAFT_DATE,
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_TYPE]: CONFIG.SETUP.CHECKMARK_CELLS.DRAFT_TYPE,
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT]: CONFIG.SETUP.CHECKMARK_CELLS.TEAM_COUNT,
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM]: CONFIG.SETUP.CHECKMARK_CELLS.SCHOOLS_PER_TEAM,
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_TIMES_SCHOOL_ALLOWED]: CONFIG.SETUP.CHECKMARK_CELLS.MAX_TIMES_ALLOWED,
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_SCHOOL_SELECTIONS]: CONFIG.SETUP.CHECKMARK_CELLS.MAX_SELECTIONS,
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.FINAL_ADD_DROP_DATE]: CONFIG.SETUP.CHECKMARK_CELLS.FINAL_DATE,
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_OF_ADD_DROPS]: CONFIG.SETUP.CHECKMARK_CELLS.NUM_ADD_DROPS,
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TIMER_AMOUNT]: CONFIG.SETUP.CHECKMARK_CELLS.TIMER,  // Added timer
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HEISMAN_WINNER]: CONFIG.SETUP.CHECKMARK_CELLS.HEISMAN_WINNER,
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.BOWL_APPEARANCE]: CONFIG.SETUP.CHECKMARK_CELLS.BOWL_APPEARANCE,
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ENTRY_FEE]: CONFIG.SETUP.CHECKMARK_CELLS.ENTRY_FEE,
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HIGH_POINTS_YES_NO]: CONFIG.SETUP.CHECKMARK_CELLS.HIGH_POINTS_YN,    
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TIES]: CONFIG.SETUP.CHECKMARK_CELLS.TIES_YN,
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_WINNERS]: CONFIG.SETUP.CHECKMARK_CELLS.NUM_WINNERS,};
  const pairedCells = {
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.WIN]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.LOSS,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.WIN},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.LOSS]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.WIN,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.WIN},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_GAME]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_GAME_LOSS,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.CONFERENCE_GAME},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_GAME_LOSS]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_GAME,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.CONFERENCE_GAME},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OVER_50]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OVER_50_LOSS,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.OVER_50},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OVER_50_LOSS]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OVER_50,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.OVER_50},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.SHUTOUT]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.SHUTOUT_LOSS,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.SHUTOUT},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.SHUTOUT_LOSS]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.SHUTOUT,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.SHUTOUT},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_25]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_25_LOSS,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.RANKED_25},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_25_LOSS]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_25,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.RANKED_25},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_10]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_10_LOSS,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.RANKED_10},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_10_LOSS]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_10,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.RANKED_10},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_WIN]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_LOSS,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.CONFERENCE_WIN},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_LOSS]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_WIN,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.CONFERENCE_WIN},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CHAMPIONSHIP_WIN]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CHAMPIONSHIP_LOSS,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.CHAMPIONSHIP_WIN},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CHAMPIONSHIP_LOSS]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CHAMPIONSHIP_WIN,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.CHAMPIONSHIP_WIN},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HP_WEEKLY_AMOUNT]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_HP_WEEKS,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.WEEKLY_AMOUNT},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_HP_WEEKS]: {
      partner: CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HP_WEEKLY_AMOUNT,
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.WEEKLY_AMOUNT}};
  const tripleCells = {
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_FIRST]: {
      partners: [
        CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_QUARTER,
        CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_SEMI],
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.PLAYOFF_APPEARANCE},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_QUARTER]: {
      partners: [
        CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_FIRST,
        CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_SEMI],
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.PLAYOFF_APPEARANCE},
    [CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_SEMI]: {
      partners: [
        CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_FIRST,
        CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_QUARTER],
      checkmark: CONFIG.SETUP.CHECKMARK_CELLS.PLAYOFF_APPEARANCE}};
  if (tripleCells[a1Notation]) {
    const tripleInfo = tripleCells[a1Notation];
    const currentValue = range.getValue();
    const partner1Value = sheet.getRange(tripleInfo.partners[0]).getValue();
    const partner2Value = sheet.getRange(tripleInfo.partners[1]).getValue();
    if (currentValue !== "" && currentValue !== null && currentValue !== undefined &&
        partner1Value !== "" && partner1Value !== null && partner1Value !== undefined &&
        partner2Value !== "" && partner2Value !== null && partner2Value !== undefined) {
      range.setBorder(false, false, false, false, false, false);
      sheet.getRange(tripleInfo.partners[0]).setBorder(false, false, false, false, false, false);
      sheet.getRange(tripleInfo.partners[1]).setBorder(false, false, false, false, false, false);
      sheet.getRange(tripleInfo.checkmark)
          .setValue('✓')
          .setFontColor(CONFIG.SETUP.VISUAL.COLORS.CHECKMARK_GREEN)
          .setFontSize(14);
    } else {
      sheet.getRange(tripleInfo.checkmark).setValue('');
      range.setBorder(
        true, true, true, true, false, false,
        CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD,
        SpreadsheetApp.BorderStyle.SOLID_THICK);
      sheet.getRange(tripleInfo.partners[0]).setBorder(
        true, true, true, true, false, false,
        CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD,
        SpreadsheetApp.BorderStyle.SOLID_THICK);
      sheet.getRange(tripleInfo.partners[1]).setBorder(
        true, true, true, true, false, false,
        CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD,
        SpreadsheetApp.BorderStyle.SOLID_THICK);}}
  else if (pairedCells[a1Notation]) {
    const pairedInfo = pairedCells[a1Notation];
    const currentValue = range.getValue();
    const partnerValue = sheet.getRange(pairedInfo.partner).getValue();    
    if (currentValue !== "" && currentValue !== null && currentValue !== undefined &&
        partnerValue !== "" && partnerValue !== null && partnerValue !== undefined) {
      range.setBorder(false, false, false, false, false, false);
      sheet.getRange(pairedInfo.partner).setBorder(false, false, false, false, false, false);
      sheet.getRange(pairedInfo.checkmark)
          .setValue('✓')
          .setFontColor(CONFIG.SETUP.VISUAL.COLORS.CHECKMARK_GREEN)
          .setFontSize(14);
    } else {
      sheet.getRange(pairedInfo.checkmark).setValue('');
      range.setBorder(
        true, true, true, true, false, false,
        CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD,
        SpreadsheetApp.BorderStyle.SOLID_THICK);
      sheet.getRange(pairedInfo.partner).setBorder(
        true, true, true, true, false, false,
        CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD,
        SpreadsheetApp.BorderStyle.SOLID_THICK);}} 
  else if (checkmarkMap[a1Notation]) {
    if (range.getValue()) {
      range.setBorder(false, false, false, false, false, false);
      sheet.getRange(checkmarkMap[a1Notation])
          .setValue('✓')
          .setFontColor(CONFIG.SETUP.VISUAL.COLORS.CHECKMARK_GREEN)
          .setFontSize(14);
    } else {
      sheet.getRange(checkmarkMap[a1Notation]).setValue('');
      range.setBorder(
        true, true, true, true, false, false,
        CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD,
        SpreadsheetApp.BorderStyle.SOLID_THICK);}}
  const row = range.getRow();
  const col = range.getColumn();
  if (row >= 10 && row <= 25 && (col === 9 || col === 10 || col === 12) && range.getValue()) {
    range.setBorder(false, false, false, false, false, false);}
  if (a1Notation === CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT) {
    updateOwnerRowNumbers(range.getValue());}
  checkSetupProgress();}
function updateOwnerRowNumbers(teamCount) {
  if (!teamCount || teamCount < 1) return;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
  const startRow = parseInt(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OWNER_NAMES_START.match(/\d+/)[0]);
  sheet.getRange('I10:L25').setBorder(false, false, false, false, false, false);
  for (let i = 0; i < teamCount && i < 16; i++) {
    const currentRow = startRow + i;
    sheet.getRange(`H${currentRow}`).setValue(i + 1);
    sheet.getRange(`I${currentRow}`).setBorder(
      true, true, true, true, false, false,
      CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD,
      SpreadsheetApp.BorderStyle.SOLID_THICK);
    sheet.getRange(`J${currentRow}`).setBorder(
      true, true, true, true, false, false,
      CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD,
      SpreadsheetApp.BorderStyle.SOLID_THICK);
    sheet.getRange(`L${currentRow}`).setBorder(
      true, true, true, true, false, false,
      CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD,
      SpreadsheetApp.BorderStyle.SOLID_THICK);}}
function checkSetupProgress() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
  const errors = validateSettingsForDraft();
  const teamCount = sheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
  if (teamCount && teamCount > 0) {
    const startRow = parseInt(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OWNER_NAMES_START.match(/\d+/)[0]);
    for (let i = 0; i < teamCount; i++) {
      const currentRow = startRow + i;
      const ownerName = sheet.getRange(`I${currentRow}`).getValue();
      const ownerEmail = sheet.getRange(`J${currentRow}`).getValue();
      const teamName = sheet.getRange(`L${currentRow}`).getValue();
      if (!ownerName || !ownerEmail || !teamName) {
        return;}}}
  if (errors.length === 0) {
    sheet.getRange(CONFIG.SETUP.CONTROLS.SUBHEADER.RANGE)
         .setValue(CONFIG.SETUP.CONTROLS.SUBHEADER.COMPLETE_TEXT);
    const checkboxCell = sheet.getRange(CONFIG.SETUP.CONTROLS.SETUP_START.CHECKBOX_CELL);
    const labelCell = sheet.getRange(CONFIG.SETUP.CONTROLS.SETUP_START.LABEL_CELL);
    checkboxCell.setValue(false)
                .setBackground(CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD)
                .setFontColor('#000000'); // Make sure it's visible
    labelCell.setValue(CONFIG.SETUP.CONTROLS.SETUP_START.COMPLETE_LABEL);}}
function processCommissionerSetup(name, email) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
  sheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ADMIN_NAME).setValue(name);
  sheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ADMIN_EMAIL).setValue(email);
  revealAllSections();}
function revealAllSections() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
  addNotesToCells(sheet);
  const scoringRange = sheet.getRange('B7:E48');
  scoringRange.setFontColor(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT);
  const usersRange = sheet.getRange('G6:K48');
  usersRange.setFontColor(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT);
  const usersRange2 = sheet.getRange('L7:N48');
  usersRange2.setFontColor(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT);
  const allInputCells = [
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_DATE,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_TYPE,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_SCHOOLS_PER_TEAM,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_TIMES_SCHOOL_ALLOWED,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.MAX_SCHOOL_SELECTIONS,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.FINAL_ADD_DROP_DATE,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_OF_ADD_DROPS,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TIMER_AMOUNT,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.WIN,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.LOSS,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_GAME,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_GAME_LOSS,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OVER_50,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.SHUTOUT,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_25,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_10,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.OVER_50_LOSS,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.SHUTOUT_LOSS,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_25_LOSS,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.RANKED_10_LOSS,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_WIN,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CONFERENCE_LOSS,    
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HEISMAN_WINNER,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.BOWL_APPEARANCE,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_FIRST,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_QUARTER,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.PLAYOFF_APPEARANCE_SEMI,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CHAMPIONSHIP_WIN,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.CHAMPIONSHIP_LOSS,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ENTRY_FEE,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HIGH_POINTS_YES_NO,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.HP_WEEKLY_AMOUNT,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TIES,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_WINNERS,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.NUMBER_HP_WEEKS,];
  allInputCells.forEach(cellRef => {
    const cellRow = parseInt(cellRef.match(/\d+/)[0]);
    if (cellRow < 49) {
      sheet.getRange(cellRef).setBorder(
        true, true, true, true, false, false, 
        CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD, 
        SpreadsheetApp.BorderStyle.SOLID_THICK);}});
  addDateValidation(sheet);}
function addDateValidation(sheet) {
  const dateFields = [
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.DRAFT_DATE,
    CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.FINAL_ADD_DROP_DATE];
  dateFields.forEach(cellRef => {
    const validation = SpreadsheetApp.newDataValidation()
      .requireDate()
      .setAllowInvalid(false)
      .build();
    sheet.getRange(cellRef).setDataValidation(validation);});}
function isInitialSetupComplete() {
    try {
        const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
            .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
        if (!settingsSheet) {
            console.log('Settings sheet not found');
            return false;}
        const adminEmail = settingsSheet
            .getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ADMIN_EMAIL)
            .getValue();
        const adminName = settingsSheet
            .getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ADMIN_NAME)
            .getValue();
        const isComplete = adminEmail && adminEmail !== '' && 
                          adminName && adminName !== ''
        console.log('Initial setup complete:', isComplete);
        return isComplete;
    } catch (error) {
        console.error('Error checking setup status:', error);
        return false;}
}

function isUserAdmin(email) {
    if (!email) return false;
    
    try {
        const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
            .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
        
        if (!settingsSheet) {
            console.error('Settings sheet not found');
            return false;
        }
        
        // Get both admin emails from J7 and K7
        const adminEmail1 = settingsSheet.getRange('J7').getValue();
        const adminEmail2 = settingsSheet.getRange('K7').getValue();
        
        // Normalize emails for comparison (lowercase and trim)
        const normalizedEmail = email.toString().toLowerCase().trim();
        const normalizedAdmin1 = adminEmail1 ? adminEmail1.toString().toLowerCase().trim() : '';
        const normalizedAdmin2 = adminEmail2 ? adminEmail2.toString().toLowerCase().trim() : '';
        
        // Check if the email matches either admin
        return normalizedEmail === normalizedAdmin1 || normalizedEmail === normalizedAdmin2;
        
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

function handleMyEdit(e) {
    console.log('handleMyEdit triggered');
    
    // First, try to get the actual user from onEdit's temporary storage
    let actualUserEmail = null;
    
    try {
        const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
            .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
        
        if (settingsSheet) {
            const tempEditStartRow = 49;
            const maxTempRows = 10;
            const emailCol = Utils.letterToColumn("P");
            const timestampCol = Utils.letterToColumn("Q");
            const dataCol = Utils.letterToColumn("R");
            
            const currentSheet = e.range.getSheet().getName();
            const currentRange = e.range.getA1Notation();
            const currentTime = new Date().getTime();
            
            // Look for a matching recent edit
            for (let row = tempEditStartRow; row < tempEditStartRow + maxTempRows; row++) {
                const storedEmail = settingsSheet.getRange(row, emailCol).getValue();
                const storedTimestamp = settingsSheet.getRange(row, timestampCol).getValue();
                const storedDataJson = settingsSheet.getRange(row, dataCol).getValue();
                
                if (storedEmail && storedTimestamp && storedDataJson) {
                    // Check if this entry is recent (within 2 seconds)
                    if (currentTime - storedTimestamp < 2000) {
                        try {
                            const storedData = JSON.parse(storedDataJson);
                            // Check if this matches our current edit
                            if (storedData.sheet === currentSheet && storedData.range === currentRange) {
                                actualUserEmail = storedEmail;
                                console.log(`Found actual user from onEdit: ${actualUserEmail} (row ${row})`);
                                
                                // Clear this temporary entry
                                settingsSheet.getRange(row, emailCol, 1, 3).clearContent();
                                break;
                            }
                        } catch (parseError) {
                            console.log('Error parsing stored edit data:', parseError);
                        }
                    } else {
                        // Clean up old entry
                        settingsSheet.getRange(row, emailCol, 1, 3).clearContent();
                    }
                }
            }
        }
    } catch (error) {
        console.log('Could not retrieve user from temporary storage:', error);
    }
    
    // Cache handling
    const cache = CacheService.getScriptCache();
    let count = parseInt(cache.get('edit_count') || '0') + 1;
    cache.put('edit_count', count.toString(), 40);
    if (count >= 38) {
        ScriptApp.newTrigger('breakChainVisible')
            .timeBased()
            .after(1) // 1 millisecond
            .create();
        cache.remove('edit_count');
    }
    
    if (!e?.range) return;
    const range = e.range;
    const sheet = range.getSheet();
    if (!sheet) return;
    const sheetName = sheet.getName();
    const a1Notation = range.getA1Notation();
    const cellValue = range.getValue();
    
    const isSettingsSheet = sheetName === CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME;
    const isSetupOperation = isSettingsSheet && (
        a1Notation === CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.START_LEAGUE || 
        a1Notation === CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.START_LEAGUE ||  
        a1Notation === CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.REPORT_ISSUE ||
        (range.getRow() >= 4 && range.getRow() <= 56 && 
        range.getColumn() >= 2 && range.getColumn() <= 5) ||
        (range.getRow() >= 4 && range.getRow() <= 56 && 
        range.getColumn() >= 7 && range.getColumn() <= 15));
    
    // IMPORTANT FIX: Check if this is a tracker/draft sheet - NO AUTH NEEDED
    const isTrackerSheet = sheetName === CONFIG.SHEETS.SPECIFIC.TRACKER.NAME;
    
    const setupComplete = isInitialSetupComplete();
    let userEmail = null;
    
    // FIXED: Don't require auth for tracker sheet
    if (setupComplete && !isSetupOperation && !isTrackerSheet) {
        // Pass the actual user email to authentication check
        const authData = getCurrentAuthenticatedUserFromSheet(sheet, range, actualUserEmail);
        
        // IMPROVED: Only show authentication required if we truly can't authenticate
        if (!authData) {
            // Special handling for Transaction Log without team selected
            if (sheetName === CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME) {
                const teamDropdownCell = sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.TEAM);
                const selectedTeam = teamDropdownCell.getValue();
                
                if (!selectedTeam || selectedTeam === '') {
                    // No team selected - this is expected, don't show auth error
                    console.log('No team selected in transaction log - skipping auth check');
                    return; // Just return, don't show error
                }
            }
            
            // Only show the error if we really need authentication
            SpreadsheetApp.getActiveSpreadsheet().toast(
                'Please authenticate first: League Tools > Authenticate Me\n' +
                'Note: You must be authenticated as the team owner',
                '⚠️ Authentication Required',
                5);
            if (e && e.range) {
                e.range.setValue(e.oldValue || '');
            }
            return;
        }
        
        userEmail = authData.email;
        console.log(`Authenticated user: ${userEmail} via ${authData.verificationMethod}`);
        
        const timeLeft = CONFIG.USER_SESSION.SESSION_TIMEOUT - (new Date().getTime() - authData.timestamp);
        if (timeLeft < CONFIG.USER_SESSION.WARNING_TIME) {
            SpreadsheetApp.getActiveSpreadsheet().toast(
                'Your session will expire in ' + Math.floor(timeLeft / 60000) + ' minutes. Please re-authenticate.',
                '⏰ Session Expiring',
                3);
        }
    }
    
    // For tracker sheet, log that no auth is required
    if (isTrackerSheet) {
        console.log('Tracker/Draft sheet - no authentication required');
    }
    
    if (!SHEETS || !sheetsInitialized) {
        SHEETS = {
            ss: SpreadsheetApp.getActiveSpreadsheet(),
            tracker: SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.TRACKER.NAME),
            log: SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME),
            teams: SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.TEAMS.NAME),
            settings: SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME)
        };
        sheetsInitialized = true;
    }
    
    // Process draft selection WITHOUT requiring authentication
    if (sheet.getName() === CONFIG.SHEETS.SPECIFIC.TRACKER.NAME && isDraftCell(range)) {
        console.log('Processing draft selection - no auth required');
        handleDraftSelection(e);
        return;
    }
    
    try {
        if (Utils.isSchoolName(cellValue)) {
            colorSchoolCells(sheet);
        }
        
        if (sheetName === CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME) {
            const mappedAction = CONFIG.SYSTEM.TRIGGERS.MAPPINGS.SETTINGS[a1Notation];
            if (mappedAction) {
                switch(mappedAction) {
                    case 'handleStartLeague':
                        handleStartLeague(range, sheet);
                        break;
                    case 'handleSetupStart':
                        handleSetupStart(range, sheet);
                        break;
                }
            }
            
            if (a1Notation === CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.REPORT_ISSUE && cellValue === true) {
                var ui = SpreadsheetApp.getUi();
                var html = `
                    <form id="issueForm">
                        <label for="email">Enter Email:</label><br>
                        <input type="email" id="email" name="email" style="width: 100%; margin-bottom: 10px; font-family: Arial, sans-serif;" required><br>
                        <label for="subject">Subject:</label><br>
                        <input type="text" id="subject" name="subject" style="width: 100%; margin-bottom: 10px; font-family: Arial, sans-serif;"><br>
                        <label for="message">Message:</label><br>
                        <textarea id="message" name="message" rows="5" style="width: 100%; margin-bottom: 10px; font-family: Arial, sans-serif;"></textarea>
                        <button type="button" onclick="submitForm()">Submit</button>
                    </form>
                    <script>
                        function submitForm() {
                            var form = document.getElementById('issueForm');
                            var email = form.email.value;
                            var subject = form.subject.value;
                            var message = form.message.value;
                            google.script.run
                                .withSuccessHandler(function() {
                                    google.script.host.close();
                                })
                                .processForm(email, subject, message);
                        }
                    </script>
                `;
                try {
                    var htmlOutput = HtmlService.createHtmlOutput(html)
                        .setWidth(400)
                        .setHeight(300);
                    ui.showModalDialog(htmlOutput, 'Report an Issue');
                    range.setValue(false);
                } catch (error) {
                    console.error('Error processing the "Report an issue" dialog:', error);
                    getErrorHandler().handleError(error);
                }
            }
            
            const row = range.getRow();
            const col = range.getColumn();
            if (row >= 4 && row <= 56 && col >= 2 && col <= 5) {
                handleSetupFieldEdit(e);
            } else if (row >= 4 && row <= 56 && col >= 7 && col <= 15) {
                handleSetupFieldEdit(e);
                if (col >= 9 && col <= 15) {
                    checkSetupProgress();
                }
            }
        }
        else if (sheetName === CONFIG.SHEETS.SPECIFIC.TRACKER.NAME) {
            // Tracker operations - NO AUTH REQUIRED
            const mappedAction = CONFIG.SYSTEM.TRIGGERS.MAPPINGS.TRACKER[a1Notation];
            if (mappedAction) {
                if (Array.isArray(mappedAction)) {
                    mappedAction.forEach(action => {
                        switch (action) {
                            case 'handleDraftStart':
                                handleDraftStart(range, sheet);
                                break;
                            case 'handleTrackerEdit':
                                handleTrackerEdit(range, sheet, a1Notation);
                                break;
                            case 'updateDroppingSchoolDropdown':
                                // Pass null for userEmail since tracker doesn't need auth
                                updateDroppingSchoolDropdown(null);
                                break;
                            case 'updateAddingSchoolDropdown':
                                // Pass null for userEmail since tracker doesn't need auth
                                updateAddingSchoolDropdown(null);
                                break;
                        }
                    });
                } else {
                    switch (mappedAction) {
                        case 'handleDraftStart':
                            handleDraftStart(range, sheet);
                            break;
                        case 'handleTrackerEdit':
                            handleTrackerEdit(range, sheet, a1Notation);
                            break;
                    }
                }
            }
        }
        else if (sheet.getName() !== CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME && 
                sheet.getName() !== CONFIG.SHEETS.SPECIFIC.TRACKER.NAME &&
                sheet.getName() !== CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME) {
            const a1 = range.getA1Notation();
            const value = range.getValue();
            
            if (a1 === CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.PROGRAM.WEEK.WEEK_CELL) {
                console.log(`Week dropdown changed to: ${value}`);
                SpreadsheetApp.flush();
                SpreadsheetApp.getActiveSpreadsheet().toast(
                    `Displaying data for ${value}`,
                    'Week Updated',
                    2);
                return;
            }
            
            if (a1 === CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.UPDATE_CONTROLS.TEAM_NAME_CHECKBOX && value === true) {
                handleTeamNameUpdate(sheet, userEmail);
            } else if (a1 === CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.UPDATE_CONTROLS.COLORS_CHECKBOX && value === true) {
                handleColorUpdate(sheet, userEmail);
            } else if (a1 === CONFIG.SHEETS.STRUCTURE.DEFAULT_USER_SHEET.UPDATE_CONTROLS.IMAGE_CHECKBOX && value === true) {
                handleImageUpdate(sheet, userEmail);
            }
        }
        else if (sheetName === CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME) {
            const mappedActions = CONFIG.SYSTEM.TRIGGERS.MAPPINGS.TRANSACTION[a1Notation];
            console.log('Processing Transaction Log');
            
            if (mappedActions) {
                if (Array.isArray(mappedActions)) {
                    mappedActions.forEach(action => {
                        switch(action) {
                            case 'updateDroppingSchoolDropdown':
                                updateDroppingSchoolDropdown(userEmail);
                                console.log('updatedroppingschooldropdown');
                                break;
                            case 'updateAddingSchoolDropdown':
                                updateAddingSchoolDropdown(userEmail);
                                break;
                            case 'handleTransactionLogEdit':
                                handleTransactionLogEdit(range, sheet, a1Notation, userEmail);
                                break;
                        }
                    });
                } else {
                    switch(mappedActions) {
                        case 'handleTransactionLogEdit':
                            handleTransactionLogEdit(range, sheet, a1Notation, userEmail);
                            break;
                    }
                }
            }
        }
        
    } catch (error) {
        console.error(`Error in handleMyEdit: ${error.message}`);
        console.error(`Stack: ${error.stack}`);
        getErrorHandler().handleError(error);
    }
}
function onEdit(e) {
    try {
        const actualUser = Session.getActiveUser().getEmail();
        if (!actualUser) return;
        
        const settingsSheet = e.source.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
        if (!settingsSheet) return;
        
        // Find an available row in the temporary edit tracking area (rows 49+)
        const tempEditStartRow = 49;
        const maxTempRows = 10; // Track up to 10 concurrent edits
        const emailCol = Utils.letterToColumn("P");
        const timestampCol = Utils.letterToColumn("Q");
        const dataCol = Utils.letterToColumn("R");
        
        let targetRow = null;
        let oldestTime = new Date().getTime();
        let oldestRow = tempEditStartRow;
        
        // Find an empty row or the oldest entry to overwrite
        for (let row = tempEditStartRow; row < tempEditStartRow + maxTempRows; row++) {
            const existingTimestamp = settingsSheet.getRange(row, timestampCol).getValue();
            
            if (!existingTimestamp) {
                // Found empty row
                targetRow = row;
                break;
            } else {
                // Check if this entry is stale (older than 5 seconds)
                if (new Date().getTime() - existingTimestamp > 5000) {
                    targetRow = row;
                    break;
                }
                // Track oldest for potential overwrite
                if (existingTimestamp < oldestTime) {
                    oldestTime = existingTimestamp;
                    oldestRow = row;
                }
            }
        }
        
        // If no empty or stale row found, overwrite the oldest
        if (!targetRow) {
            targetRow = oldestRow;
        }
        
        // Store the edit information
        const editData = JSON.stringify({
            sheet: e.range.getSheet().getName(),
            range: e.range.getA1Notation(),
            value: e.value
        });
        
        // Write to the cells
        settingsSheet.getRange(targetRow, emailCol).setValue(actualUser);
        settingsSheet.getRange(targetRow, timestampCol).setValue(new Date().getTime());
        settingsSheet.getRange(targetRow, dataCol).setValue(editData);
        
        // Hide the data using QUESTION_FONT color (same as auth data)
        settingsSheet.getRange(targetRow, emailCol, 1, 3)
            .setFontColor(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT)
            .setBackground(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT);
        
        console.log(`onEdit: Captured ${actualUser} in row ${targetRow}`);
        
    } catch (error) {
        // Fail silently - don't interrupt the edit
        console.log('onEdit error:', error);
    }
}

function authenticateUser() {
    const ui = SpreadsheetApp.getUi();
    const email = Session.getActiveUser().getEmail();
    
    if (!email) {
        ui.alert(
            'Authentication Failed',
            'Unable to detect your email address.\n\n' +
            'Possible solutions:\n' +
            '1. Make sure you are logged into Google\n' +
            '2. Try refreshing the page\n' +
            '3. Check that you have edit access to this sheet\n' +
            '4. Contact your league administrator',
            ui.ButtonSet.OK);
        return;
    }
    
    const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
    
    // Find the user's row based on their email
    const ownerEmailsStart = Utils.letterToColumn("J"); // Column J has owner emails
    const startRow = 10; // Users start at row 10
    const maxRows = 20; // Check up to 20 rows for users
    
    let userRow = -1;
    for (let row = startRow; row < startRow + maxRows; row++) {
        const ownerEmail = settingsSheet.getRange(row, ownerEmailsStart).getValue();
        const additionalEmail = settingsSheet.getRange(row, ownerEmailsStart + 1).getValue(); // Column K
        
        if (ownerEmail === email || additionalEmail === email) {
            userRow = row;
            break;
        }
    }
    
    if (userRow === -1) {
        ui.alert(
            'User Not Found',
            `The email ${email} is not registered in this league.\n\n` +
            'Please contact your league administrator to be added.',
            ui.ButtonSet.OK);
        return;
    }
    
    const sessionId = Utilities.getUuid();
    const timestamp = new Date().getTime();
    
    // Write to columns P, Q, R in the user's row
    const emailCol = Utils.letterToColumn("P");
    const timestampCol = Utils.letterToColumn("Q");
    const sessionIdCol = Utils.letterToColumn("R");
    
    settingsSheet.getRange(userRow, emailCol).setValue(email);
    settingsSheet.getRange(userRow, timestampCol).setValue(timestamp);
    settingsSheet.getRange(userRow, sessionIdCol).setValue(sessionId);
    
    // Hide the session data
    settingsSheet.getRange(userRow, emailCol, 1, 3)
        .setFontColor(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT)
        .setBackground(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT);
    
    // Store in user properties
    PropertiesService.getUserProperties().setProperty('auth_session', JSON.stringify({
        email: email,
        timestamp: timestamp,
        sessionId: sessionId,
        userRow: userRow  // Store the row for later use
    }));
    
    // Get the team name for this user
    const teamNameCol = Utils.letterToColumn("L");
    const teamName = settingsSheet.getRange(userRow, teamNameCol).getValue();
    
    ui.alert(
        'Authentication Successful! ✓',
        `You are now authenticated as:\n${email}\n` +
        `Team: ${teamName}\n\n` +
        `Session valid for: 1 hour\n` +
        `Session ID: ${sessionId.substring(0, 8)}...\n\n` +
        `You can now:\n` +
        `• Edit your team information\n` +
        `• Make add/drop transactions\n` +
        `• Update team colors and images\n` +
        `• Participate in the draft`,
        ui.ButtonSet.OK);
    
    console.log(`User authenticated: ${email} (row ${userRow}) at ${new Date(timestamp)}`);
}
function checkAuthentication() {
  const ui = SpreadsheetApp.getUi();
  const authData = getCurrentAuthenticatedUser();
  if (!authData) {
    ui.alert(
      'Not Authenticated',
      'You are not currently authenticated.\n\n' +
      'Please use: League Tools > Authenticate Me',
      ui.ButtonSet.OK);
    return;}
  const timeLeft = CONFIG.USER_SESSION.SESSION_TIMEOUT - (new Date().getTime() - authData.timestamp);
  const minutesLeft = Math.floor(timeLeft / 60000);
  ui.alert(
    'Authentication Status',
    `Currently authenticated as:\n${authData.email}\n\n` +
    `Time remaining: ${minutesLeft} minutes\n` +
    `Session ID: ${authData.sessionId.substring(0, 8)}...\n\n` +
    (minutesLeft < 5 ? '⚠️ Session expiring soon! Re-authenticate to continue.' : '✓ Session active'),
    ui.ButtonSet.OK);}
function getCurrentAuthenticatedUser() {
    // This function is used for non-trigger contexts (menu items, dialogs, etc.)
    try {
        // First try PropertiesService
        const authSession = PropertiesService.getUserProperties().getProperty('auth_session');
        if (authSession) {
            const authData = JSON.parse(authSession);
            
            // Check if session expired
            if (new Date().getTime() - authData.timestamp > CONFIG.USER_SESSION.SESSION_TIMEOUT) {
                PropertiesService.getUserProperties().deleteProperty('auth_session');
                return null;
            }
            return authData;
        }
    } catch (error) {
        console.log('Error reading from PropertiesService:', error);
    }
    
    // Fall back to checking the sheet for current user's email
    try {
        const currentEmail = Session.getActiveUser().getEmail();
        if (!currentEmail) return null;
        
        const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
            .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
        if (!settingsSheet) {
            console.error('Settings sheet not found');
            return null;
        }
        
        // Find the user's row
        const ownerEmailsStart = Utils.letterToColumn("J");
        const startRow = 10;
        const maxRows = 20;
        
        for (let row = startRow; row < startRow + maxRows; row++) {
            const ownerEmail = settingsSheet.getRange(row, ownerEmailsStart).getValue();
            const additionalEmail = settingsSheet.getRange(row, ownerEmailsStart + 1).getValue();
            
            if (ownerEmail === currentEmail || additionalEmail === currentEmail) {
                // Check if they have session data in columns P, Q, R
                const emailCol = Utils.letterToColumn("P");
                const timestampCol = Utils.letterToColumn("Q");
                const sessionIdCol = Utils.letterToColumn("R");
                
                const storedEmail = settingsSheet.getRange(row, emailCol).getValue();
                const timestamp = settingsSheet.getRange(row, timestampCol).getValue();
                const sessionId = settingsSheet.getRange(row, sessionIdCol).getValue();
                
                if (!storedEmail || !timestamp) {
                    return null;
                }
                
                // Check if expired
                if (new Date().getTime() - timestamp > CONFIG.USER_SESSION.SESSION_TIMEOUT) {
                    settingsSheet.getRange(row, emailCol, 1, 3).clearContent();
                    PropertiesService.getUserProperties().deleteProperty('auth_session');
                    return null;
                }
                
                const authData = {
                    email: storedEmail,
                    timestamp: timestamp,
                    sessionId: sessionId,
                    userRow: row
                };
                
                // Cache it in PropertiesService
                PropertiesService.getUserProperties().setProperty('auth_session', JSON.stringify(authData));
                
                return authData;
            }
        }
        
        return null;
        
    } catch (error) {
        console.error('Error reading authentication from cells:', error);
        return null;
    }
}
function getCurrentAuthenticatedUserFromSheet(sheet, range, actualUserEmail) {
    console.log('Getting authenticated user for sheet:', sheet?.getName());
    console.log('Actual user from onEdit:', actualUserEmail || 'not captured');
    
    try {
        const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
            .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
        if (!settingsSheet) {
            console.error('Settings sheet not found');
            return null;
        }
        
        // BEST CASE: We have the actual user from onEdit!
        if (actualUserEmail) {
            console.log('✓ Using verified user from onEdit:', actualUserEmail);
            
            // Find this user's authentication in rows 10-30
            const ownerEmailCol = Utils.letterToColumn("J");
            const secondaryEmailCol = Utils.letterToColumn("K");
            const emailCol = Utils.letterToColumn("P");
            const timestampCol = Utils.letterToColumn("Q");
            const sessionIdCol = Utils.letterToColumn("R");
            const teamNameCol = Utils.letterToColumn("L");
            const startRow = 10;
            const maxRows = 20;
            
            for (let row = startRow; row < startRow + maxRows; row++) {
                const primaryEmail = settingsSheet.getRange(row, ownerEmailCol).getValue();
                const secondaryEmail = settingsSheet.getRange(row, secondaryEmailCol).getValue();
                
                if (actualUserEmail === primaryEmail || actualUserEmail === secondaryEmail) {
                    const sessionEmail = settingsSheet.getRange(row, emailCol).getValue();
                    const timestamp = settingsSheet.getRange(row, timestampCol).getValue();
                    const sessionId = settingsSheet.getRange(row, sessionIdCol).getValue();
                    const teamName = settingsSheet.getRange(row, teamNameCol).getValue();
                    
                    console.log(`Found user ${actualUserEmail} in row ${row}, session: ${sessionEmail}`);
                    
                    if (sessionEmail === actualUserEmail && timestamp) {
                        if (new Date().getTime() - timestamp <= CONFIG.USER_SESSION.SESSION_TIMEOUT) {
                            console.log('🔒 VERIFIED: Actual user has valid session!');
                            return {
                                email: sessionEmail,
                                timestamp: timestamp,
                                sessionId: sessionId,
                                userRow: row,
                                teamName: teamName,
                                verifiedUser: true,
                                verificationMethod: 'onEdit'
                            };
                        } else {
                            console.log('Session expired for user:', actualUserEmail);
                            settingsSheet.getRange(row, emailCol, 1, 3).clearContent();
                        }
                    } else if (!sessionEmail) {
                        console.log('User identified but no active session for:', actualUserEmail);
                        // Don't return null - continue to team-based check
                    }
                    break;
                }
            }
            
            console.log('Actual user captured but not authenticated, trying team-based fallback...');
        }
        
        // FALLBACK: Team-based authentication
        console.log('Checking team-based authentication...');
        
        const sheetName = sheet?.getName();
        let targetTeamName = null;
        
        // Handle Transaction Log specially
        if (sheetName === CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME) {
            const teamDropdownCell = sheet.getRange(CONFIG.SHEETS.SPECIFIC.TRANSACTION.CELLS.TEAM);
            targetTeamName = teamDropdownCell.getValue();
            
            if (!targetTeamName || targetTeamName === '') {
                console.log('Transaction log: No team selected in dropdown');
                // If we have actualUserEmail, try to find ANY of their authenticated teams
                if (actualUserEmail) {
                    console.log('Checking if user has any authenticated team...');
                    const ownerEmailCol = Utils.letterToColumn("J");
                    const secondaryEmailCol = Utils.letterToColumn("K");
                    const emailCol = Utils.letterToColumn("P");
                    const timestampCol = Utils.letterToColumn("Q");
                    const startRow = 10;
                    const maxRows = 20;
                    
                    for (let row = startRow; row < startRow + maxRows; row++) {
                        const primaryEmail = settingsSheet.getRange(row, ownerEmailCol).getValue();
                        const secondaryEmail = settingsSheet.getRange(row, secondaryEmailCol).getValue();
                        
                        if (actualUserEmail === primaryEmail || actualUserEmail === secondaryEmail) {
                            const sessionEmail = settingsSheet.getRange(row, emailCol).getValue();
                            const timestamp = settingsSheet.getRange(row, timestampCol).getValue();
                            
                            if (sessionEmail && timestamp && 
                                new Date().getTime() - timestamp <= CONFIG.USER_SESSION.SESSION_TIMEOUT) {
                                console.log('User has authenticated team, allowing transaction log access');
                                return {
                                    email: sessionEmail,
                                    timestamp: timestamp,
                                    sessionId: settingsSheet.getRange(row, Utils.letterToColumn("R")).getValue(),
                                    userRow: row,
                                    teamName: settingsSheet.getRange(row, Utils.letterToColumn("L")).getValue(),
                                    verifiedUser: true,
                                    verificationMethod: 'any-team-auth'
                                };
                            }
                        }
                    }
                }
                return null; // No team selected and no user auth found
            }
            console.log('Transaction log edit, team from dropdown:', targetTeamName);
            
        } else if (sheetName === CONFIG.SHEETS.SPECIFIC.TRACKER.NAME) {
            console.log('Tracker sheet - checking any valid authentication');
            // For tracker, accept any valid authentication
            if (actualUserEmail) {
                // Already checked above, fall through
            }
            
        } else if (sheetName === CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME) {
            console.log('Settings sheet - no team context needed');
            return null;
            
        } else {
            // Check if this sheet name matches any team name
            targetTeamName = sheetName; // Assume sheet name IS the team name
            console.log('Checking for team sheet:', targetTeamName);
        }
        
        if (!targetTeamName) {
            console.log('Could not determine team context');
            return null;
        }
        
        // Find the team and check their authentication
        const teamNameCol = Utils.letterToColumn("L");
        const ownerEmailCol = Utils.letterToColumn("J");
        const secondaryEmailCol = Utils.letterToColumn("K");
        const emailCol = Utils.letterToColumn("P");
        const timestampCol = Utils.letterToColumn("Q");
        const sessionIdCol = Utils.letterToColumn("R");
        const startRow = 10;
        const maxRows = 20;
        
        for (let row = startRow; row < startRow + maxRows; row++) {
            const rowTeamName = settingsSheet.getRange(row, teamNameCol).getValue();
            
            if (rowTeamName === targetTeamName) {
                const primaryOwnerEmail = settingsSheet.getRange(row, ownerEmailCol).getValue();
                const secondaryOwnerEmail = settingsSheet.getRange(row, secondaryEmailCol).getValue();
                
                console.log(`Team ${targetTeamName} owners: ${primaryOwnerEmail}, ${secondaryOwnerEmail}`);
                
                const sessionEmail = settingsSheet.getRange(row, emailCol).getValue();
                const timestamp = settingsSheet.getRange(row, timestampCol).getValue();
                const sessionId = settingsSheet.getRange(row, sessionIdCol).getValue();
                
                if (!sessionEmail || !timestamp) {
                    console.log('No session found for team:', targetTeamName);
                    return null;
                }
                
                if (new Date().getTime() - timestamp > CONFIG.USER_SESSION.SESSION_TIMEOUT) {
                    console.log('Session expired for team:', targetTeamName);
                    settingsSheet.getRange(row, emailCol, 1, 3).clearContent();
                    return null;
                }
                
                if (sessionEmail === primaryOwnerEmail || sessionEmail === secondaryOwnerEmail) {
                    console.log('⚠️ Using team-based auth:', sessionEmail);
                    return {
                        email: sessionEmail,
                        timestamp: timestamp,
                        sessionId: sessionId,
                        userRow: row,
                        teamName: targetTeamName,
                        verifiedUser: false,
                        verificationMethod: 'team-based'
                    };
                }
                
                console.log('Session email does not match team owners');
                return null;
            }
        }
        
        console.log('Team not found in settings:', targetTeamName);
        return null;
        
    } catch (error) {
        console.error('Error in getCurrentAuthenticatedUserFromSheet:', error);
        return null;
    }
}
function cleanupExpiredSessions() {
    try {
        // Clean PropertiesService
        const authSession = PropertiesService.getUserProperties().getProperty('auth_session');
        if (authSession) {
            const authData = JSON.parse(authSession);
            if (new Date().getTime() - authData.timestamp > CONFIG.USER_SESSION.SESSION_TIMEOUT) {
                PropertiesService.getUserProperties().deleteProperty('auth_session');
                console.log('Cleaned up expired session from PropertiesService');
            }
        }
    } catch (error) {
        console.log('Error cleaning PropertiesService:', error);
    }
    
    try {
        // Clean all user rows in the sheet
        const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
            .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
        if (settingsSheet) {
            const startRow = 10;
            const maxRows = 20;
            const timestampCol = Utils.letterToColumn("Q");
            const emailCol = Utils.letterToColumn("P");
            
            for (let row = startRow; row < startRow + maxRows; row++) {
                const timestamp = settingsSheet.getRange(row, timestampCol).getValue();
                
                if (timestamp && (new Date().getTime() - timestamp > CONFIG.USER_SESSION.SESSION_TIMEOUT)) {
                    settingsSheet.getRange(row, emailCol, 1, 3).clearContent();
                    console.log(`Cleaned up expired session from row ${row}`);
                }
            }
        }
    } catch (error) {
        console.log('Error cleaning cells:', error);
    }
}
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('League Tools')
    .addItem('🔐 Authenticate Me', 'authenticateUser')
    .addItem('✓ Check My Authentication', 'checkAuthentication')
    .addItem('🔄 Re-authenticate', 'reauthenticate')
    .addToUi();
  cleanupExpiredSessions();}
function reauthenticate() {
    const ui = SpreadsheetApp.getUi();
    const result = ui.alert(
        'Re-authenticate?',
        'This will end your current session and start a new one.\n\nContinue?',
        ui.ButtonSet.YES_NO);
    if (result === ui.Button.YES) {
        const settingsSheet = SpreadsheetApp.getActiveSpreadsheet()
            .getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
        const row = CONFIG.USER_SESSION.SETTINGS_ROW;
        const emailCol = Utils.letterToColumn(CONFIG.USER_SESSION.EMAIL_COLUMN);
        settingsSheet.getRange(row, emailCol, 1, 3).clearContent();
        PropertiesService.getUserProperties().deleteProperty('auth_session');
        authenticateUser();}
}
function debugUserEmails() {
    const activeUser = Session.getActiveUser().getEmail();
    const effectiveUser = Session.getEffectiveUser().getEmail();
    console.log('Active User:', activeUser || 'empty');
    console.log('Effective User:', effectiveUser || 'empty');
}




// Simplified nightly reset trigger setup
function setupSimplifiedNightlyReset() {
  // Clear any existing nightly reset triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'performSimplifiedNightlyReset' ||
        trigger.getHandlerFunction() === 'performSimplifiedNightlyReset') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger for 3 AM
  ScriptApp.newTrigger('performSimplifiedNightlyReset')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
  
  console.log("Created simplified nightly reset trigger for 3 AM");
}

async function performSimplifiedNightlyReset() {
  console.log("🔄 Starting simplified nightly reset at " + new Date());
  
  try {
    const sheetManager = SheetManager.getInstance();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Step 1: Reset Points Calculator WITHOUT deleting
    console.log("Resetting Points Calculator...");
    const pointsSheet = ss.getSheetByName('Points Calculator');
    if (pointsSheet) {
      // Clear all data rows but preserve headers and structure
      const lastRow = pointsSheet.getLastRow();
      if (lastRow > 5) { // Assuming headers are in rows 1-5
        pointsSheet.getRange(6, 1, lastRow - 5, pointsSheet.getLastColumn()).clearContent();
      }
      
      // Re-setup the points sheet structure
      await sheetManager.setupPointsSheet(pointsSheet);
      updatePoints();  // Repopulate with current data
      
      // Position and color it
      try {
        ss.setActiveSheet(pointsSheet);
        ss.moveActiveSheet(8);
        pointsSheet.setTabColor(CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD);
        console.log("Points Calculator reset and positioned at position 8");
      } catch (error) {
        console.error("Error positioning Points Calculator:", error);
      }
    }
    
    // Step 2: Reset Leaderboard WITHOUT deleting
    console.log("Resetting Leaderboard...");
    const leaderboardSheet = ss.getSheetByName('Leaderboard');
    if (leaderboardSheet) {
      // Clear all content but preserve structure
      leaderboardSheet.getRange(1, 1, leaderboardSheet.getMaxRows(), leaderboardSheet.getMaxColumns()).clearContent();
      
      // Re-setup the leaderboard
      await sheetManager.setupLeaderboardSheet(leaderboardSheet);
      
      // Add a small delay to ensure sheet is fully set up
      Utilities.sleep(1000);
      SpreadsheetApp.flush();
      
      // Position and color it
      try {
        ss.setActiveSheet(leaderboardSheet);
        ss.moveActiveSheet(9);
        leaderboardSheet.setTabColor(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT);
        console.log("Leaderboard reset and positioned at position 9");
      } catch (error) {
        console.error("Error positioning Leaderboard:", error);
      }
    }
    
    // Step 3: Reset Transaction Log with preserved history
    console.log("Resetting Transaction Log with preserved history...");
    try {
      await resetTransactionLogWithHistory();
    } catch (error) {
      console.error("Error resetting Transaction Log:", error);
    }
    
    // Step 5: Clear authentication data
    console.log("Clearing authentication data...");
    try {
      const settingsSheet = ss.getSheetByName('Settings');
      if (settingsSheet) {
        const authColumns = ['P', 'Q', 'R'];
        authColumns.forEach(col => {
          settingsSheet.getRange(`${col}10:${col}48`).clearContent();
          settingsSheet.getRange(`${col}49:${col}59`).clearContent();
        });
      }
    } catch (error) {
      console.error("Error clearing authentication data:", error);
    }
    
    // Step 6: Clear cache
    console.log("Clearing cache...");
    try {
      const cache = CacheService.getScriptCache();
      cache.removeAll(['gameState', 'eligibilityState', 'edit_count']);
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
    
    // Step 7: Run verification
    console.log("Verifying completed games...");
    try {
      await verifyCompletedGames();
    } catch (error) {
      console.error("Error verifying completed games:", error);
    }
    
    // Step 8: Force flush
    SpreadsheetApp.flush();
    
    console.log("✅ Simplified nightly reset completed successfully at " + new Date());
    
  } catch (error) {
    console.error("❌ Error during simplified nightly reset:", error);
    throw error;
  }
}


function notifyAdminOfResetError(error) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
  const adminEmail = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ADMIN_EMAIL).getValue();
  
  if (adminEmail) {
    try {
      MailApp.sendEmail({
        to: adminEmail,
        subject: "Nightly Reset Error - FBS Fantasy League",
        body: `An error occurred during the nightly reset at ${new Date()}:\n\n${error.message}\n\nStack trace:\n${error.stack}\n\nPlease check the script logs for more details.`
      });
    } catch (emailError) {
      console.error("Could not send error notification email:", emailError);
    }
  }
}








function updateAllUserSheetPoints() {
  console.log("Starting update of all user sheet points...");
  
  try {
    // Get the settings sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
    
    // Get team count and team names
    const teamCount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
    const teamNamesRange = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START)
      .offset(0, 0, teamCount, 1);
    const teamNames = teamNamesRange.getValues()
      .map(row => row[0])
      .filter(name => name); // Filter out empty values
    
    console.log(`Found ${teamNames.length} teams to update`);
    
    // Update each team's sheet
    let successCount = 0;
    let failedTeams = [];
    
    teamNames.forEach(teamName => {
      try {
        console.log(`Updating points for: ${teamName}`);
        updateSingleUserSheetPoints(teamName);
        successCount++;
      } catch (error) {
        console.error(`Failed to update ${teamName}:`, error);
        failedTeams.push(teamName);
      }
    });
    
    // Show completion message
    const message = failedTeams.length > 0 
      ? `Updated ${successCount} teams. Failed: ${failedTeams.join(', ')}`
      : `Successfully updated all ${successCount} team sheets!`;
    
    SpreadsheetApp.getActiveSpreadsheet().toast(message, 'Points Update Complete', 5);
    console.log("Points update completed. " + message);
    
  } catch (error) {
    console.error("Error in updateAllUserSheetPoints:", error);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Error updating user sheet points: ' + error.message, 
      'Update Failed', 
      5
    );
  }
}


function resetToInitialState() {
  // Check if UI is available (running from spreadsheet) or not (running from editor)
  let ui;
  let hasUI = false;
  
  try {
    ui = SpreadsheetApp.getUi();
    hasUI = true;
  } catch (e) {
    // Running from editor - no UI available
    console.log('Running from Apps Script editor - no UI confirmation available');
    hasUI = false;
  }
  
  // If running from spreadsheet, show confirmation
  if (hasUI) {
    const result = ui.alert(
      '⚠️ Complete Reset',
      'This will reset EVERYTHING back to initial setup state.\n\n' +
      '• All sheets except Settings will be deleted\n' +
      '• All team data will be lost\n' +
      '• All settings will be cleared\n\n' +
      'This action cannot be undone. Are you absolutely sure?',
      ui.ButtonSet.YES_NO
    );
    
    if (result !== ui.Button.YES) {
      ui.alert('Reset cancelled', 'No changes were made.', ui.ButtonSet.OK);
      return;
    }
  } else {
    // Running from editor - log warning
    console.log('⚠️ STARTING COMPLETE RESET - This will delete all data!');
  }
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
    
    if (!settingsSheet) {
      throw new Error('Settings sheet not found');
    }
    
    console.log('Step 1: Deleting all sheets except Settings...');
    // Step 1: Delete all sheets except Settings
    const allSheets = ss.getSheets();
    allSheets.forEach(sheet => {
      if (sheet.getName() !== CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME) {
        console.log(`  Deleting sheet: ${sheet.getName()}`);
        ss.deleteSheet(sheet);
      }
    });
    
    console.log('Step 2: Running resetInitializationForTesting...');
    // Step 2: Run existing reset function
    resetInitializationForTesting();
    
    console.log('Step 3: Resetting header texts...');
    // Step 3: Reset header texts
    settingsSheet.getRange(CONFIG.SETUP.CONTROLS.SUBHEADER.RANGE)
      .setValue(CONFIG.SETUP.CONTROLS.SUBHEADER.INITIAL_TEXT);
    
    settingsSheet.getRange(CONFIG.SETUP.CONTROLS.SETUP_START.LABEL_CELL)
      .setValue(CONFIG.SETUP.CONTROLS.SETUP_START.INITIAL_LABEL);
    
    console.log('Step 4: Hiding scoring section...');
    // Step 4: Hide scoring section (B6:B47) - make font same as background
    const scoringLabelRange = settingsSheet.getRange('B6:B47');
    scoringLabelRange.setFontColor(CONFIG.SETUP.VISUAL.COLORS.SCORING_BACKGROUND)
      .setBackground(CONFIG.SETUP.VISUAL.COLORS.SCORING_BACKGROUND);
    
    console.log('Step 5: Hiding scoring values section...');
    // Step 5: Hide scoring values section (C6:F47) - make font same as background
    const scoringValueRange = settingsSheet.getRange('C6:F47');
    scoringValueRange.setFontColor(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND)
      .setBackground(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND);
    
    console.log('Step 6: Removing notes...');
    // Step 6: Remove all notes from the scoring sections
    const notesToRemove = [
      'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C16', 'C17', 'C18',
      'C21', 'C22', 'C23', 'C24', 'C25', 'C26', 'C30', 'C31', 'C32',
      'C34', 'C35', 'C38', 'C40', 'C41', 'C42', 'C43',
      'D21', 'D22', 'D23', 'D24', 'D25', 'D26', 'D30', 'D34', 'D35', 'D41',
      'E34', 'E41'
    ];
    
    notesToRemove.forEach(cell => {
      settingsSheet.getRange(cell).clearNote();
    });
    
    console.log('Step 7: Clearing values except specified cells...');
    // Step 7: Clear all values except specified cells
    const rangesToClear = [
      'C6:C19',   // Before C20
      'C21:C28',  // Between C20 and C29
      'C30:C32',  // Between C29 and C33
      'C34:C38',  // Between C33 and C39
      'C40:C43',  // Between C39 and C44
      'D6:D19',   // Before D20
      'D21:D28',  // Between D20 and D29
      'D30:D32',  // Between D29 and D33
      'D34:D43',  // After D33 except E33
      'E6:E32',   // Before E33
      'E34:E40',  // Between E33 and E41
      'E42:E43',  // Between E41 and E44
      'F6:F47'    // All of F column in this range
    ];
    
    rangesToClear.forEach(range => {
      settingsSheet.getRange(range).clearContent();
    });
    
    console.log('Step 8: Clearing Commissioner information...');
    // Step 8: Clear Commissioner information
    settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ADMIN_NAME).clearContent();
    settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.ADMIN_EMAIL).clearContent();
    
    console.log('Step 9: Clearing owner/team information...');
    // Step 9: Clear owner/team information and remove borders/notes
    const ownerTeamRange = settingsSheet.getRange('H10:L29');
    ownerTeamRange.clearContent()
      .setBorder(false, false, false, false, false, false)
      .clearNote();
    
    // Also clear row numbers in column H
    settingsSheet.getRange('H10:H29').clearContent();
    
    console.log('Step 10: Hiding user section headers...');
    // Step 10: Hide user section headers (H6:K6)
    const userHeaderRange = settingsSheet.getRange('H6:K6');
    userHeaderRange.setFontColor(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND)
      .setBackground(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND);
    
    console.log('Step 11: Hiding user section content...');
    // Step 11: Hide user section content (H7:N47)
    const userContentRange = settingsSheet.getRange('H7:N47');
    userContentRange.setFontColor(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND)
      .setBackground(CONFIG.SETUP.VISUAL.COLORS.USER_BACKGROUND);
    
    console.log('Step 12: Clearing checkmarks...');
    // Step 12: Clear all checkmarks
    const checkmarkCells = [
      'F8', 'F9', 'F10', 'F11', 'F12', 'F13', 'F16', 'F17', 'F18',
      'F21', 'F22', 'F23', 'F24', 'F25', 'F26', 'F30', 'F31', 'F32',
      'F34', 'F35', 'F38', 'F40', 'F41', 'F42', 'F43'
    ];
    
    checkmarkCells.forEach(cell => {
      settingsSheet.getRange(cell).clearContent();
    });
    
    console.log('Step 13: Resetting setup checkbox...');
    // Step 13: Reset the setup checkbox
    const checkboxCell = settingsSheet.getRange(CONFIG.SETUP.CONTROLS.SETUP_START.CHECKBOX_CELL);
    checkboxCell.setValue(false)
      .setBackground(CONFIG.SETUP.VISUAL.COLORS.ACTION_GOLD)
      .setFontColor(CONFIG.SETUP.VISUAL.COLORS.QUESTION_FONT);
    
    console.log('Step 14: Removing borders...');
    // Step 14: Remove all borders from input cells
    const allBorderCells = [
      'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C16', 'C17', 'C18',
      'C21', 'C22', 'C23', 'C24', 'C25', 'C26', 'C30', 'C31', 'C32',
      'C34', 'C35', 'C38', 'C40', 'C41', 'C42', 'C43',
      'D21', 'D22', 'D23', 'D24', 'D25', 'D26', 'D30', 'D34', 'D35', 'D41',
      'E34', 'E41'
    ];
    
    allBorderCells.forEach(cell => {
      settingsSheet.getRange(cell).setBorder(false, false, false, false, false, false);
    });
    
    console.log('Step 15: Clearing authentication data...');
    // Step 15: Clear any authentication data if present
    const authStartRow = 10;
    const authEndRow = 48;
    const authColumns = ['P', 'Q', 'R'];
    
    authColumns.forEach(col => {
      const range = settingsSheet.getRange(`${col}${authStartRow}:${col}${authEndRow}`);
      range.clearContent();
    });
    
    console.log('Step 16: Clearing temporary edit tracking data...');
    // Step 16: Clear any temporary edit tracking data
    const tempEditStartRow = 49;
    const tempEditEndRow = 59;
    
    authColumns.forEach(col => {
      const range = settingsSheet.getRange(`${col}${tempEditStartRow}:${col}${tempEditEndRow}`);
      range.clearContent();
    });
    
    console.log('Step 17: Clearing cache...');
    // Step 17: Clear cache
    const cache = CacheService.getScriptCache();
    cache.removeAll(['gameState', 'eligibilityState', 'edit_count']);
    
    console.log('Step 18: Removing triggers (except handleMyEdit)...');
    // Step 18: Remove all triggers except handleMyEdit
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      const handlerFunction = trigger.getHandlerFunction();
      if (handlerFunction !== 'handleMyEdit') {
        console.log(`  Deleting trigger: ${handlerFunction}`);
        ScriptApp.deleteTrigger(trigger);
      } else {
        console.log(`  Keeping trigger: ${handlerFunction}`);
      }
    });
    
    // Refresh the spreadsheet
    SpreadsheetApp.flush();
    
    console.log('✅ RESET COMPLETE - Spreadsheet has been reset to initial state');
    
    // Show success message if UI is available
    if (hasUI) {
      ui.alert(
        '✅ Reset Complete',
        'The spreadsheet has been reset to its initial state.\n\n' +
        'To begin setup again, click the checkbox in cell J4.',
        ui.ButtonSet.OK
      );
    }
    
  } catch (error) {
    console.error('❌ Error during reset:', error);
    
    if (hasUI) {
      ui.alert(
        '❌ Reset Failed',
        'An error occurred during reset: ' + error.message + '\n\n' +
        'Please try again or contact support.',
        ui.ButtonSet.OK
      );
    } else {
      throw error; // Re-throw so you see it in the editor
    }
  }
}

function runPhase4WithPreservedCustomizations() {
  console.log("Starting Phase 4 with preserved customizations...");
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName('Settings');
  
  if (!settingsSheet) {
    throw new Error("Settings sheet not found!");
  }
  
  // Step 1: Collect all team customizations
  console.log("Step 1: Saving team customizations...");
  const teamCustomizations = [];
  
  // Get team count from C10
  let teamCount;
  try {
    teamCount = settingsSheet.getRange("C10").getValue();
    console.log(`Team count from C10: ${teamCount}`);
  } catch (e) {
    console.error("Error getting team count from C10:", e);
    return;
  }
  
  // Get all sheets and filter for team sheets (exclude system sheets)
  const systemSheets = ['Settings', 'Teams', 'Draft', 'Transaction Log', 'Season Schedule', 
                        'Live Scoring', 'Completed Games', 'Points Calculator', 'Leaderboard',
                        'TransactionData', 'TransactionHelper', 'Default User', 'Completed Games Cache'];
  
  const allSheets = ss.getSheets();
  const teamSheets = allSheets.filter(sheet => !systemSheets.includes(sheet.getName()));
  
  console.log(`Found ${teamSheets.length} potential team sheets`);
  
  teamSheets.forEach(teamSheet => {
    const teamName = teamSheet.getName();
    try {
      const customData = {
        teamName: teamName,
        imageUrl: null,
        colors: {}
      };
      
      // Try to get image URL from E5
      try {
        const imageUrl = teamSheet.getRange("E5").getValue();
        if (imageUrl && imageUrl.toString().length > 0) {
          customData.imageUrl = imageUrl;
          console.log(`Found image for ${teamName}: ${imageUrl}`);
        }
      } catch (e) {
        // No image, that's okay
      }
      
      // Try to get colors from H5:H8
      try {
        const colorRange = teamSheet.getRange("H5:H8");
        const colorValues = colorRange.getValues();
        
        // Only save if there are actual color values
        if (colorValues[0][0]) customData.colors.border = colorValues[0][0];
        if (colorValues[1][0]) customData.colors.header = colorValues[1][0];
        if (colorValues[2][0]) customData.colors.action = colorValues[2][0];
        if (colorValues[3][0]) customData.colors.font = colorValues[3][0];
        
        if (Object.keys(customData.colors).length > 0) {
          console.log(`Found colors for ${teamName}:`, customData.colors);
        }
      } catch (e) {
        // No colors, that's okay
      }
      
      // Only save if we found some customizations
      if (customData.imageUrl || Object.keys(customData.colors).length > 0) {
        teamCustomizations.push(customData);
        console.log(`Saved customizations for ${teamName}`);
      }
      
    } catch (error) {
      console.error(`Error processing ${teamName}:`, error);
    }
  });
  
  console.log(`Saved customizations for ${teamCustomizations.length} teams`);
  
  // Step 2: Run Phase 4
  console.log("Step 2: Running Phase 4...");
  try {
    runPhase4Only();
    
    // Wait for sheets to be recreated
    Utilities.sleep(5000);
    SpreadsheetApp.flush();
    
  } catch (error) {
    console.error("Error running Phase 4:", error);
    throw error;
  }
  
  // Step 3: Restore customizations
  console.log("Step 3: Restoring team customizations...");
  let restoredCount = 0;
  
  teamCustomizations.forEach(customData => {
    try {
      const teamSheet = ss.getSheetByName(customData.teamName);
      if (teamSheet) {
        let customizationApplied = false;
        
        // Restore colors
        if (customData.colors && Object.keys(customData.colors).length > 0) {
          try {
            // First, set the color values back in the hidden cells
            if (customData.colors.border) teamSheet.getRange("H5").setValue(customData.colors.border);
            if (customData.colors.header) teamSheet.getRange("H6").setValue(customData.colors.header);
            if (customData.colors.action) teamSheet.getRange("H7").setValue(customData.colors.action);
            if (customData.colors.font) teamSheet.getRange("H8").setValue(customData.colors.font);
            
            // Now apply the colors using the correct function
            applyUserSheetColors(teamSheet, customData.colors);
            console.log(`Restored colors for ${customData.teamName}`);
            customizationApplied = true;
          } catch (e) {
            console.error(`Error applying colors for ${customData.teamName}:`, e);
          }
        }
        
        // Restore image
        if (customData.imageUrl) {
          try {
            // Set the image URL back in E5
            teamSheet.getRange("E5").setValue(customData.imageUrl).setFontColor(customData.colors.header);
            
            // Apply the image
            updateTeamImage(teamSheet);
            console.log(`Restored image for ${customData.teamName}`);
            customizationApplied = true;
          } catch (e) {
            console.error(`Error applying image for ${customData.teamName}:`, e);
          }
        }
        
        if (customizationApplied) {
          restoredCount++;
        }
      } else {
        console.warn(`Sheet not found for ${customData.teamName} after Phase 4`);
      }
    } catch (error) {
      console.error(`Error restoring ${customData.teamName}:`, error);
    }
  });
  
  // Final refresh
  SpreadsheetApp.flush();
  
  console.log(`✅ Phase 4 complete with customizations preserved for ${restoredCount} teams`);
  
  SpreadsheetApp.getActiveSpreadsheet().toast(
    `Phase 4 completed! Preserved ${restoredCount} team customizations.`,
    'Success',
    10
  );
}
async function resetTransactionLogWithHistory() {
  console.log("Starting Transaction Log reset with preserved history...");
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const transactionSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME);
  
  if (!transactionSheet) {
    console.error("Transaction Log sheet not found!");
    return;
  }
  
  // Step 1: Save the transaction history (J6:O and beyond)
  console.log("Step 1: Saving transaction history...");
  let historyData = [];
  let lastRow = transactionSheet.getLastRow();
  
  try {
    if (lastRow >= 6) {
      const historyRange = transactionSheet.getRange(6, 10, lastRow - 5, 6);
      historyData = historyRange.getValues();
      historyData = historyData.filter(row => 
        row.some(cell => cell !== "" && cell !== null)
      );
      console.log(`Saved ${historyData.length} transaction history records`);
    }
  } catch (error) {
    console.error("Error saving history:", error);
  }

  // Step 2: Reset TransactionData helper sheet WITHOUT deleting
  console.log("Step 2: Resetting TransactionData helper sheet...");
  try {
    let dataSheet = ss.getSheetByName('TransactionData');
    
    if (!dataSheet) {
      // Create if it doesn't exist
      dataSheet = ss.insertSheet('TransactionData');
      dataSheet.hideSheet();
      console.log("Created TransactionData sheet");
    } else {
      // Clear existing content
      dataSheet.clear();
      console.log("Cleared existing TransactionData sheet");
    }
    
    // Set up the TransactionData structure
    const headers = [
      ["Selections Left", "School", "Rank", "Conference", "Conference Rank", 
       "Record", "Points", "Wins", "Losses"]
    ];
    dataSheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
    dataSheet.setFrozenRows(1);
    console.log("TransactionData headers set");
    
    // Update the data
    updateTransactionLogInfo();
    updateTeamDropdown();
    console.log("TransactionData populated with school info");
    
  } catch (error) {
    console.error("Error resetting TransactionData sheet:", error);
    // Don't throw - we can continue without it
  }
  
  // Step 3: Clear and reset the Transaction Log sheet WITHOUT deleting
  console.log("Step 3: Resetting Transaction Log sheet...");
  try {
    // Clear all content
    transactionSheet.clear();
    console.log("Cleared Transaction Log content");
    
    // Wait a moment for the clear to complete
    Utilities.sleep(500);
    
    // Re-setup the sheet using the existing sheet manager
    const sheetManager = SheetManager.getInstance();
    sheetManager.ss = ss;
    
    await sheetManager.setupTransactionLogSheet(transactionSheet);
    console.log("Transaction Log structure recreated");
    
    // Position the sheet
    ss.setActiveSheet(transactionSheet);
    ss.moveActiveSheet(10);
    transactionSheet.setTabColor(CONFIG.SETUP.VISUAL.COLORS.HEADER_BACKGROUND);
    
    Utilities.sleep(2000);
    SpreadsheetApp.flush();
    
  } catch (error) {
    console.error("Error resetting Transaction Log:", error);
    throw error;
  }
  
  // Step 4: Restore the transaction history
  console.log("Step 4: Restoring transaction history...");
  if (historyData.length > 0) {
    try {
      // Re-get the sheet reference after reset
      const resetTransactionSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME);
      
      if (resetTransactionSheet) {
        const restoreRange = resetTransactionSheet.getRange(6, 10, historyData.length, 6);
        restoreRange.setValues(historyData);
        
        console.log(`Restored ${historyData.length} transaction history records`);
        
        // Apply formatting to restored data
        restoreRange.setFontSize(10)
          .setHorizontalAlignment("center")
          .setVerticalAlignment("middle");
        
        const timestampRange = resetTransactionSheet.getRange(6, 10, historyData.length, 1);
        timestampRange.setNumberFormat("MM/dd/yyyy HH:mm:ss");
      }
    } catch (error) {
      console.error("Error restoring history:", error);
    }
  }
  
  // Step 5: Apply school colors to the Transaction Log
  console.log("Step 5: Applying school colors...");
  try {
    const finalTransactionSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.TRANSACTION.NAME);
    if (finalTransactionSheet) {
      colorSchoolCells(finalTransactionSheet);
      console.log("School colors applied successfully");
    }
  } catch (error) {
    console.error("Error applying school colors:", error);
  }
  
  console.log("✅ Transaction Log reset complete");
  
  SpreadsheetApp.getActiveSpreadsheet().toast(
    `Transaction Log reset. Preserved ${historyData.length} history records.`,
    'Success',
    5
  );
}
function updateAllUserSheetSorting() {
  console.log("Starting updateAllUserSheetSorting...");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName('Settings');
  
  if (!settingsSheet) {
    console.error("Settings sheet not found!");
    return;
  }
  
  const teamCount = settingsSheet.getRange("C10").getValue();
  console.log(`Team count from C10: ${teamCount}`);
  
  // Team names should be at D12 (CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_NAMES_START is "D12")
  const teamNamesRange = settingsSheet.getRange("L10:L" + (11 + teamCount));
  const teamNamesRaw = teamNamesRange.getValues();
  console.log(`Raw team names from L10:L${11 + teamCount}:`, teamNamesRaw);
  
  const teamNames = teamNamesRaw.flat().filter(Boolean);
  console.log(`Actual team names found:`, teamNames);
  
  // Alternative: Get team names from actual sheet names (excluding system sheets)
  if (teamNames.length === 0) {
    console.log("No team names found in Settings, trying to get from sheet names...");
    const systemSheets = ['Settings', 'Teams', 'Draft', 'Transaction Log', 'Season Schedule', 
                          'Live Scoring', 'Completed Games', 'Points Calculator', 'Leaderboard',
                          'TransactionData', 'TransactionHelper', 'Default User', 'Completed Games Cache'];
    
    const allSheets = ss.getSheets();
    const userSheets = allSheets.filter(sheet => !systemSheets.includes(sheet.getName()));
    teamNames = userSheets.map(sheet => sheet.getName());
    console.log(`Found team sheets:`, teamNames);
  }
  
  if (teamNames.length === 0) {
    console.error("No team names found!");
    return;
  }
  
  teamNames.forEach((teamName, index) => {
    try {
      console.log(`\n--- Processing team ${index + 1}/${teamNames.length}: "${teamName}" ---`);
      const sheet = ss.getSheetByName(teamName);
      
      if (!sheet) {
        console.error(`Sheet not found for team: "${teamName}"`);
        return;
      }
      
      console.log(`Found sheet for ${teamName}`);
      
      // Create instances
      const programManager = new ProgramManager(sheet, teamName);
      const pointsCalculator = new PointsCalculator(sheet, teamName);
      
      // 1. Sort (active schools first, dropped last)
      console.log(`Calling sortProgramArea for ${teamName}...`);
      programManager.sortProgramArea();
      
      // 2. Reset formatting of points area (L13:AF100)
      console.log(`Resetting points area formatting for ${teamName}...`);
      sheet.getRange("L13:AF100")
           .setBackground("#ffffff")
           .setFontColor("#000000");
      
      // 3. Recalculate points (applies black cells and colors correctly)
      console.log(`Calling calculatePoints for ${teamName}...`);
      pointsCalculator.calculatePoints();
      
      console.log(`Completed processing for ${teamName}`);
      
    } catch (error) {
      console.error(`Error updating ${teamName}:`, error);
      console.error(`Stack trace:`, error.stack);
    }
  });
  
  SpreadsheetApp.flush();
  console.log("\n=== All user sheets updated! ===");
}

function fixLeaderboardNationalChampionshipFormulas() {
    console.log("Fixing Leaderboard National Championship formulas...");
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const leaderboardSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.LEADERBOARD.NAME);
    const settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SPECIFIC.SETTINGS.NAME);
    
    const teamCount = settingsSheet.getRange(CONFIG.SHEETS.SPECIFIC.SETTINGS.CELLS.TEAM_COUNT).getValue();
    
    // Find the National Championship column on the Leaderboard
    const headers = CONFIG.SHEETS.SPECIFIC.LEADERBOARD.REQUIRED_COLUMNS;
    const natChampIndex = headers.indexOf("National Championship Game");
    
    if (natChampIndex === -1) {
        console.error("National Championship Game column not found in headers");
        return;
    }
    
    // Column position: headers array index + 2 (because headers start at column B)
    const natChampCol = natChampIndex + 2;
    console.log(`Found National Championship Game at column ${natChampCol}`);
    
    // Get the team names from the Leaderboard itself (column C, starting at row 6)
    const leaderboardTeamNames = leaderboardSheet.getRange(6, 3, teamCount, 1).getValues();
    
    // Update formula for each team based on its actual position on the Leaderboard
    for (let i = 0; i < teamCount; i++) {
        const teamRow = i + 6; // Leaderboard teams start at row 6
        const teamName = leaderboardTeamNames[i][0];
        
        if (!teamName) {
            console.log(`Skipping empty row ${teamRow}`);
            continue;
        }
        
        // Extended formula that includes column AF (National Championship)
        const formula = `=IFERROR(INDEX(INDIRECT("'${teamName}'!I12:AF12"), 1, MATCH("National Championship Game", INDIRECT("'${teamName}'!I11:AF11"), 0)), "")`;
        
        leaderboardSheet.getRange(teamRow, natChampCol).setFormula(formula);
        console.log(`Updated formula for ${teamName} at row ${teamRow}`);
    }
    
    SpreadsheetApp.flush();
    console.log("✅ All National Championship formulas updated");
    
    SpreadsheetApp.getActiveSpreadsheet().toast(
        'National Championship formulas fixed on Leaderboard!',
        'Success',
        5
    );
}