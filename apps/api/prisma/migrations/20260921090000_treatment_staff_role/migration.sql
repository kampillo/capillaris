-- Add a role only. Do not change accounts, historical authors or assignments.
INSERT INTO "roles" ("id", "name", "display_name", "description", "updated_at")
VALUES (gen_random_uuid(), 'treatment_staff', 'Tratamientos', 'Consulta y captura de tratamientos; sin acceso al expediente completo, cirugía, agenda, inventario ni reportes.', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
