-- CreateTable
CREATE TABLE "Integration" (
    "id" SERIAL NOT NULL,
    "organisationId" TEXT NOT NULL,
    "notionToken" TEXT NOT NULL,
    "notionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);
