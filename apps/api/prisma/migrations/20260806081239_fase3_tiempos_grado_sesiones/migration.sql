-- AlterTable
ALTER TABLE "medical_consultations" ADD COLUMN     "grado_ludwig" VARCHAR(10),
ADD COLUMN     "grado_norwood" VARCHAR(10);

-- AlterTable
ALTER TABLE "procedure_reports" ADD COLUMN     "hora_comida_fin" VARCHAR(5),
ADD COLUMN     "hora_comida_inicio" VARCHAR(5),
ADD COLUMN     "hora_fin" VARCHAR(5),
ADD COLUMN     "hora_implantacion_inicio" VARCHAR(5),
ADD COLUMN     "hora_inicio" VARCHAR(5),
ADD COLUMN     "session_day" INTEGER,
ADD COLUMN     "session_group_id" UUID;

-- CreateIndex
CREATE INDEX "procedure_reports_session_group_id_idx" ON "procedure_reports"("session_group_id");
