/*
  Warnings:

  - A unique constraint covering the columns `[postId,author]` on the table `suggestions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "suggestions_postId_author_key" ON "public"."suggestions"("postId", "author");
