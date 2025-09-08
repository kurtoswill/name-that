-- AlterTable
ALTER TABLE "public"."posts" ADD COLUMN     "deployTxHash" VARCHAR(66),
ADD COLUMN     "escrowAddress" VARCHAR(42);
