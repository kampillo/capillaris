-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "merged_at" TIMESTAMP(3),
ADD COLUMN     "merged_into_id" UUID;

-- CreateIndex
CREATE INDEX "patients_merged_into_id_idx" ON "patients"("merged_into_id");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
