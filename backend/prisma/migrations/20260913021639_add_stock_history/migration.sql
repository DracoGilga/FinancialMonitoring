/*
  Warnings:

  - You are about to drop the column `company_name` on the `stock_history` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "stock_history" DROP COLUMN "company_name";

-- CreateTable
CREATE TABLE "monitored_stocks" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitored_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monitored_stocks_symbol_key" ON "monitored_stocks"("symbol");

-- AddForeignKey
ALTER TABLE "stock_history" ADD CONSTRAINT "stock_history_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "monitored_stocks"("symbol") ON DELETE CASCADE ON UPDATE CASCADE;
