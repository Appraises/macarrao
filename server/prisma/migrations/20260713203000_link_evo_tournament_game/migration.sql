UPDATE "Tournament"
SET
  "gameId" = (SELECT "id" FROM "Game" WHERE "slug" = 'sf6' LIMIT 1),
  "game" = 'Street Fighter 6'
WHERE "name" = 'EVO 2024' AND "gameId" IS NULL;
