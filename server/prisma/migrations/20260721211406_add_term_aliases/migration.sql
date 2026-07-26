-- AlterTable
ALTER TABLE "Term" ADD COLUMN     "aliases" JSONB NOT NULL DEFAULT '[]';
