-- CreateEnum
CREATE TYPE "WordClass" AS ENUM ('SUBSTANTIVO', 'VERBO', 'ADJETIVO', 'ADVERBIO', 'INTERJEICAO', 'EXPRESSAO');

-- AlterTable
ALTER TABLE "TermMeaning" ADD COLUMN     "inflections" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "wordClass" "WordClass";

