-- CreateTable
CREATE TABLE "public"."views" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "views_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."views" ADD CONSTRAINT "views_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."views" ADD CONSTRAINT "views_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
