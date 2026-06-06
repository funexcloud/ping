-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "name" TEXT;
ALTER TABLE "Contact" ADD COLUMN "phone" TEXT;

-- CreateIndex
CREATE INDEX "Contact_phone_idx" ON "Contact"("phone");
