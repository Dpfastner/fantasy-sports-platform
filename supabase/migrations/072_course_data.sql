-- Course layout data for golf tournaments
-- Stores 18-hole data (par, yardage) so we don't refetch course metadata every sync.
-- Populated from ESPN Core API courses endpoint on first golf sync for a tournament.
--
-- Shape: { name, totalYards, totalPar, parOut, parIn, holes: [{number, par, yards}, ...] }

ALTER TABLE event_tournaments
  ADD COLUMN IF NOT EXISTS course_data JSONB;

COMMENT ON COLUMN event_tournaments.course_data IS
  'Golf course layout: 18-hole par/yardage + course meta. Populated once per tournament from ESPN Core API.';
