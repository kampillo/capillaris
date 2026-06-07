-- AlterTable: add "trasplante de dos días" flag to medical consultations
ALTER TABLE "medical_consultations" ADD COLUMN "trasplante_dos_dias" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: operating rooms catalog (quirófanos)
CREATE TABLE "operating_rooms" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operating_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operating_rooms_name_key" ON "operating_rooms"("name");

-- AlterTable: assign an operating room to a procedure report
ALTER TABLE "procedure_reports" ADD COLUMN "operating_room_id" UUID;

-- AddForeignKey
ALTER TABLE "procedure_reports" ADD CONSTRAINT "procedure_reports_operating_room_id_fkey" FOREIGN KEY ("operating_room_id") REFERENCES "operating_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
