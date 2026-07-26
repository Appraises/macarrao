-- Community audio was dropped in favour of a proper TTS, so the enum value goes too.
-- Postgres cannot remove a value from an enum in place; the type is recreated.
-- Safe: no row uses AUDIO (verified before writing this migration).
ALTER TYPE "TermMediaKind" RENAME TO "TermMediaKind_old";
CREATE TYPE "TermMediaKind" AS ENUM ('ORIGIN', 'IMAGE');
ALTER TABLE "TermMedia"
  ALTER COLUMN "kind" TYPE "TermMediaKind"
  USING ("kind"::text::"TermMediaKind");
DROP TYPE "TermMediaKind_old";
