-- Remove only the known sample records shipped by the old seed.
DELETE FROM "EsportsMatch"
WHERE "provider" = 'MANUAL'
  AND "competition" IN ('CBLOL Split 2', 'CBLOL Playoffs', 'IEM Cologne', 'VCT Americas', 'The International', 'LCK Summer', 'VCT EMEA', 'RLCS Major', 'LPL Summer', 'ESL Pro League');

DELETE FROM "TeamRanking"
WHERE "teamName" IN ('Gen.G', 'BLG', 'T1', 'Team Spirit', 'FaZe Clan', 'MOUZ', 'Fnatic', 'Paper Rex');

DELETE FROM "Tournament"
WHERE "provider" = 'MANUAL'
  AND "name" IN ('CBLOL Split 2', 'VCT Americas', 'IEM Cologne', 'EVO 2024');

DROP TABLE IF EXISTS "EsportsNews";
