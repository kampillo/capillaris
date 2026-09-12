CREATE TABLE "nursing_assignments" (
  "id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "nurse_id" UUID NOT NULL,
  "assigned_by" UUID NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  "revoked_by" UUID,
  CONSTRAINT "nursing_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "nursing_assignments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "nursing_assignments_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "nursing_assignments_patient_id_nurse_id_key" ON "nursing_assignments"("patient_id", "nurse_id");
CREATE INDEX "nursing_assignments_nurse_id_revoked_at_idx" ON "nursing_assignments"("nurse_id", "revoked_at");
CREATE TABLE "procedure_report_nurses" (
  "id" UUID NOT NULL,
  "procedure_id" UUID NOT NULL,
  "nurse_id" UUID NOT NULL,
  CONSTRAINT "procedure_report_nurses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "procedure_report_nurses_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "procedure_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "procedure_report_nurses_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "procedure_report_nurses_procedure_id_nurse_id_key" ON "procedure_report_nurses"("procedure_id", "nurse_id");
CREATE INDEX "procedure_report_nurses_nurse_id_idx" ON "procedure_report_nurses"("nurse_id");
INSERT INTO "roles" ("id", "name", "display_name", "description", "updated_at")
VALUES (gen_random_uuid(), 'nurse', 'Enfermería', 'Procedimientos de pacientes asignados. Sin agenda, inventario ni reportes.', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
