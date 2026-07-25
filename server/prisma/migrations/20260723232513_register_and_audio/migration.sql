-- CreateEnum
CREATE TYPE "Register" AS ENUM ('NEUTRO', 'INFORMAL', 'IRONICO', 'PEJORATIVO', 'OFENSIVO');

-- AlterEnum
ALTER TYPE "TermMediaKind" ADD VALUE 'AUDIO';

-- AlterTable
ALTER TABLE "TermMeaning" ADD COLUMN     "register" "Register";

