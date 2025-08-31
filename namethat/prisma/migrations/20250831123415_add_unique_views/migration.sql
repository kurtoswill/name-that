/*
  Warnings:

  - A unique constraint covering the columns `[postId,viewerId]` on the table `views` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "views_postId_viewerId_key" ON "public"."views"("postId", "viewerId");
