-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ruleNeedsPct" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "ruleSavingsPct" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "ruleWantsPct" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "WishlistItem" ADD COLUMN     "notifiedMilestone" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "targetDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CategoryBudget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "month" TEXT NOT NULL,
    "limitAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryBudget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryBudget_userId_month_idx" ON "CategoryBudget"("userId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryBudget_userId_category_month_key" ON "CategoryBudget"("userId", "category", "month");

-- AddForeignKey
ALTER TABLE "CategoryBudget" ADD CONSTRAINT "CategoryBudget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
