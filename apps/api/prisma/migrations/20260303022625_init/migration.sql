-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "celular" VARCHAR(20),
    "cedula_profesional" VARCHAR(50),
    "fecha_nacimiento" DATE,
    "avatar_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "celular" VARCHAR(20),
    "celular_normalized" VARCHAR(20),
    "direccion" TEXT,
    "fecha_nacimiento" DATE,
    "edad_approximada" BOOLEAN NOT NULL DEFAULT false,
    "genero" VARCHAR(30),
    "estado_civil" VARCHAR(30),
    "ocupacion" VARCHAR(30),
    "tipo_paciente" VARCHAR(30) NOT NULL DEFAULT 'lead',
    "origen_canal" VARCHAR(30),
    "referido_por" VARCHAR(255),
    "ciudad" VARCHAR(100),
    "estado" VARCHAR(100),
    "pais" VARCHAR(100) NOT NULL DEFAULT 'Mexico',
    "consent_data_processing" BOOLEAN NOT NULL DEFAULT false,
    "consent_marketing" BOOLEAN NOT NULL DEFAULT false,
    "consent_date" TIMESTAMP(3),
    "notas_internas" TEXT,
    "legacy_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "title" VARCHAR(255),
    "description" TEXT,
    "start_datetime" TIMESTAMP(3) NOT NULL,
    "end_datetime" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER,
    "status" VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    "cancellation_reason" TEXT,
    "google_calendar_event_id" VARCHAR(255),
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "prescription_date" DATE NOT NULL,
    "notas" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "product_id" UUID,
    "medicine_name" VARCHAR(255) NOT NULL,
    "dosage" VARCHAR(100),
    "frequency" VARCHAR(100),
    "duration_days" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "instructions" TEXT,
    "requires_refill" BOOLEAN NOT NULL DEFAULT false,
    "refill_reminder_days" INTEGER,
    "dispensed" BOOLEAN NOT NULL DEFAULT false,
    "dispensed_at" TIMESTAMP(3),
    "dispensed_by" UUID,
    "dispensed_quantity" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_consultations" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "grosor" VARCHAR(30),
    "caspa" BOOLEAN,
    "color" VARCHAR(30),
    "grasa" BOOLEAN,
    "textura" VARCHAR(30),
    "valoracion_zona_donante" VARCHAR(30),
    "diagnostico" TEXT,
    "estrategia_quirurgica" TEXT,
    "fecha_sugerida_transplante" DATE,
    "comentarios" TEXT,
    "consultation_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "medical_consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donor_zones" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donor_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_donor_zones" (
    "id" UUID NOT NULL,
    "consultation_id" UUID NOT NULL,
    "donor_zone_id" UUID NOT NULL,

    CONSTRAINT "consultation_donor_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_variants" (
    "id" UUID NOT NULL,
    "consultation_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,

    CONSTRAINT "consultation_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_reports" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "procedure_date" DATE NOT NULL,
    "descripcion" TEXT,
    "punch_size" DECIMAL(3,1),
    "implantador" VARCHAR(100),
    "cb1" INTEGER,
    "cb2" INTEGER,
    "cb3" INTEGER,
    "cb4" INTEGER,
    "total_foliculos" INTEGER,
    "anest_ext_fecha_inicial" TIMESTAMP(3),
    "anest_ext_fecha_final" TIMESTAMP(3),
    "anest_ext_lidocaina" VARCHAR(50),
    "anest_ext_adrenalina" DECIMAL(5,2),
    "anest_ext_bicarbonato_de_sodio" DECIMAL(5,2),
    "anest_ext_solucion_fisiologica" DECIMAL(5,2),
    "anest_ext_anestesia_infiltrada" VARCHAR(100),
    "anest_ext_betametasona" VARCHAR(50),
    "anest_imp_fecha_inicial" TIMESTAMP(3),
    "anest_imp_fecha_final" TIMESTAMP(3),
    "anest_imp_lidocaina" VARCHAR(50),
    "anest_imp_adrenalina" DECIMAL(5,2),
    "anest_imp_bicarbonato_de_sodio" DECIMAL(5,2),
    "anest_imp_solucion_fisiologica" DECIMAL(5,2),
    "anest_imp_anestesia_infiltrada" VARCHAR(100),
    "anest_imp_betametasona" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "procedure_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_report_doctors" (
    "id" UUID NOT NULL,
    "procedure_report_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,

    CONSTRAINT "procedure_report_doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hair_types" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hair_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_report_hair_types" (
    "id" UUID NOT NULL,
    "procedure_report_id" UUID NOT NULL,
    "hair_type_id" UUID NOT NULL,

    CONSTRAINT "procedure_report_hair_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_histories" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "personales_patologicos" TEXT,
    "padecimiento_actual" TEXT,
    "tratamiento" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "clinical_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inherit_relatives" (
    "id" UUID NOT NULL,
    "clinical_history_id" UUID NOT NULL,
    "negados" BOOLEAN NOT NULL DEFAULT false,
    "hta" BOOLEAN NOT NULL DEFAULT false,
    "dm" BOOLEAN NOT NULL DEFAULT false,
    "ca" BOOLEAN NOT NULL DEFAULT false,
    "respiratorios" BOOLEAN NOT NULL DEFAULT false,
    "otros" TEXT,

    CONSTRAINT "inherit_relatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "non_pathological_personals" (
    "id" UUID NOT NULL,
    "clinical_history_id" UUID NOT NULL,
    "tabaquismo" BOOLEAN NOT NULL DEFAULT false,
    "alcoholismo" BOOLEAN NOT NULL DEFAULT false,
    "alergias" BOOLEAN NOT NULL DEFAULT false,
    "act_fisica" BOOLEAN NOT NULL DEFAULT false,
    "otros" TEXT,

    CONSTRAINT "non_pathological_personals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "previous_treatments" (
    "id" UUID NOT NULL,
    "clinical_history_id" UUID NOT NULL,
    "minoxidil" BOOLEAN NOT NULL DEFAULT false,
    "fue" BOOLEAN NOT NULL DEFAULT false,
    "finasteride" BOOLEAN NOT NULL DEFAULT false,
    "fuss" BOOLEAN NOT NULL DEFAULT false,
    "dutasteride" BOOLEAN NOT NULL DEFAULT false,
    "bicalutamida" BOOLEAN NOT NULL DEFAULT false,
    "negados" BOOLEAN NOT NULL DEFAULT false,
    "otros" TEXT,

    CONSTRAINT "previous_treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physical_explorations" (
    "id" UUID NOT NULL,
    "clinical_history_id" UUID NOT NULL,
    "fc" INTEGER,
    "ta" VARCHAR(20),
    "fr" INTEGER,
    "temperatura" DECIMAL(4,1),
    "peso" DECIMAL(5,2),
    "talla" DECIMAL(5,2),
    "description" TEXT,

    CONSTRAINT "physical_explorations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "micropigmentations" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "duracion" INTEGER,
    "dilucion" VARCHAR(100),
    "descripcion" TEXT,
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "micropigmentations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "micropigmentation_hair_types" (
    "id" UUID NOT NULL,
    "micropigmentation_id" UUID NOT NULL,
    "hair_type_id" UUID NOT NULL,

    CONSTRAINT "micropigmentation_hair_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hairmedicines" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "descripcion" TEXT,
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "hairmedicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "sku" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category_id" UUID,
    "content" DECIMAL(10,2),
    "unit" VARCHAR(20),
    "unit_price" DECIMAL(10,2),
    "is_medicine" BOOLEAN NOT NULL DEFAULT false,
    "requires_prescription" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "image_url" VARCHAR(500),
    "min_stock_alert" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "movement_type" VARCHAR(30) NOT NULL,
    "reason" VARCHAR(30) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "related_entity_type" VARCHAR(50),
    "related_entity_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_balances" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "current_quantity" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_images" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "s3_key" VARCHAR(500) NOT NULL,
    "s3_bucket" VARCHAR(100),
    "file_name" VARCHAR(255),
    "file_size_bytes" INTEGER,
    "mime_type" VARCHAR(50),
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "is_before" BOOLEAN NOT NULL DEFAULT false,
    "is_after" BOOLEAN NOT NULL DEFAULT false,
    "image_type" VARCHAR(50),
    "taken_at" TIMESTAMP(3),
    "procedure_report_id" UUID,
    "uploaded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "reminder_type" VARCHAR(30) NOT NULL,
    "related_entity_type" VARCHAR(50),
    "related_entity_id" UUID,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "channel" VARCHAR(30) NOT NULL DEFAULT 'internal',
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMP(3),
    "error_message" TEXT,
    "message_template" VARCHAR(100),
    "message_variables" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(30) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sync_log" (
    "id" UUID NOT NULL,
    "integration" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "direction" VARCHAR(10) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "payload" JSONB,
    "error_message" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "patients_email_idx" ON "patients"("email");

-- CreateIndex
CREATE INDEX "patients_celular_normalized_idx" ON "patients"("celular_normalized");

-- CreateIndex
CREATE INDEX "patients_tipo_paciente_idx" ON "patients"("tipo_paciente");

-- CreateIndex
CREATE INDEX "patients_nombre_apellido_idx" ON "patients"("nombre", "apellido");

-- CreateIndex
CREATE INDEX "patients_deleted_at_idx" ON "patients"("deleted_at");

-- CreateIndex
CREATE INDEX "patients_legacy_id_idx" ON "patients"("legacy_id");

-- CreateIndex
CREATE INDEX "appointments_patient_id_idx" ON "appointments"("patient_id");

-- CreateIndex
CREATE INDEX "appointments_doctor_id_idx" ON "appointments"("doctor_id");

-- CreateIndex
CREATE INDEX "appointments_start_datetime_idx" ON "appointments"("start_datetime");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "prescriptions_patient_id_idx" ON "prescriptions"("patient_id");

-- CreateIndex
CREATE INDEX "prescriptions_doctor_id_idx" ON "prescriptions"("doctor_id");

-- CreateIndex
CREATE INDEX "prescriptions_status_idx" ON "prescriptions"("status");

-- CreateIndex
CREATE INDEX "prescription_items_prescription_id_idx" ON "prescription_items"("prescription_id");

-- CreateIndex
CREATE INDEX "prescription_items_product_id_idx" ON "prescription_items"("product_id");

-- CreateIndex
CREATE INDEX "medical_consultations_patient_id_idx" ON "medical_consultations"("patient_id");

-- CreateIndex
CREATE INDEX "medical_consultations_doctor_id_idx" ON "medical_consultations"("doctor_id");

-- CreateIndex
CREATE INDEX "medical_consultations_consultation_date_idx" ON "medical_consultations"("consultation_date");

-- CreateIndex
CREATE UNIQUE INDEX "donor_zones_name_key" ON "donor_zones"("name");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_donor_zones_consultation_id_donor_zone_id_key" ON "consultation_donor_zones"("consultation_id", "donor_zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "variants_name_key" ON "variants"("name");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_variants_consultation_id_variant_id_key" ON "consultation_variants"("consultation_id", "variant_id");

-- CreateIndex
CREATE INDEX "procedure_reports_patient_id_idx" ON "procedure_reports"("patient_id");

-- CreateIndex
CREATE INDEX "procedure_reports_procedure_date_idx" ON "procedure_reports"("procedure_date");

-- CreateIndex
CREATE UNIQUE INDEX "procedure_report_doctors_procedure_report_id_doctor_id_key" ON "procedure_report_doctors"("procedure_report_id", "doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "hair_types_name_key" ON "hair_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "procedure_report_hair_types_procedure_report_id_hair_type_i_key" ON "procedure_report_hair_types"("procedure_report_id", "hair_type_id");

-- CreateIndex
CREATE INDEX "clinical_histories_patient_id_idx" ON "clinical_histories"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "inherit_relatives_clinical_history_id_key" ON "inherit_relatives"("clinical_history_id");

-- CreateIndex
CREATE UNIQUE INDEX "non_pathological_personals_clinical_history_id_key" ON "non_pathological_personals"("clinical_history_id");

-- CreateIndex
CREATE UNIQUE INDEX "previous_treatments_clinical_history_id_key" ON "previous_treatments"("clinical_history_id");

-- CreateIndex
CREATE UNIQUE INDEX "physical_explorations_clinical_history_id_key" ON "physical_explorations"("clinical_history_id");

-- CreateIndex
CREATE INDEX "micropigmentations_patient_id_idx" ON "micropigmentations"("patient_id");

-- CreateIndex
CREATE INDEX "micropigmentations_doctor_id_idx" ON "micropigmentations"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "micropigmentation_hair_types_micropigmentation_id_hair_type_key" ON "micropigmentation_hair_types"("micropigmentation_id", "hair_type_id");

-- CreateIndex
CREATE INDEX "hairmedicines_patient_id_idx" ON "hairmedicines"("patient_id");

-- CreateIndex
CREATE INDEX "hairmedicines_doctor_id_idx" ON "hairmedicines"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_idx" ON "stock_movements"("product_id");

-- CreateIndex
CREATE INDEX "stock_movements_movement_type_idx" ON "stock_movements"("movement_type");

-- CreateIndex
CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "stock_balances_product_id_key" ON "stock_balances"("product_id");

-- CreateIndex
CREATE INDEX "patient_images_patient_id_idx" ON "patient_images"("patient_id");

-- CreateIndex
CREATE INDEX "patient_images_procedure_report_id_idx" ON "patient_images"("procedure_report_id");

-- CreateIndex
CREATE INDEX "patient_images_image_type_idx" ON "patient_images"("image_type");

-- CreateIndex
CREATE INDEX "reminders_patient_id_idx" ON "reminders"("patient_id");

-- CreateIndex
CREATE INDEX "reminders_scheduled_for_idx" ON "reminders"("scheduled_for");

-- CreateIndex
CREATE INDEX "reminders_status_idx" ON "reminders"("status");

-- CreateIndex
CREATE INDEX "reminders_reminder_type_idx" ON "reminders"("reminder_type");

-- CreateIndex
CREATE INDEX "audit_log_user_id_idx" ON "audit_log"("user_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "integration_sync_log_integration_idx" ON "integration_sync_log"("integration");

-- CreateIndex
CREATE INDEX "integration_sync_log_entity_type_entity_id_idx" ON "integration_sync_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "integration_sync_log_status_idx" ON "integration_sync_log"("status");

-- CreateIndex
CREATE INDEX "integration_sync_log_created_at_idx" ON "integration_sync_log"("created_at");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_consultations" ADD CONSTRAINT "medical_consultations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_consultations" ADD CONSTRAINT "medical_consultations_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_donor_zones" ADD CONSTRAINT "consultation_donor_zones_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "medical_consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_donor_zones" ADD CONSTRAINT "consultation_donor_zones_donor_zone_id_fkey" FOREIGN KEY ("donor_zone_id") REFERENCES "donor_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_variants" ADD CONSTRAINT "consultation_variants_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "medical_consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_variants" ADD CONSTRAINT "consultation_variants_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_reports" ADD CONSTRAINT "procedure_reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_report_doctors" ADD CONSTRAINT "procedure_report_doctors_procedure_report_id_fkey" FOREIGN KEY ("procedure_report_id") REFERENCES "procedure_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_report_doctors" ADD CONSTRAINT "procedure_report_doctors_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_report_hair_types" ADD CONSTRAINT "procedure_report_hair_types_procedure_report_id_fkey" FOREIGN KEY ("procedure_report_id") REFERENCES "procedure_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_report_hair_types" ADD CONSTRAINT "procedure_report_hair_types_hair_type_id_fkey" FOREIGN KEY ("hair_type_id") REFERENCES "hair_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_histories" ADD CONSTRAINT "clinical_histories_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inherit_relatives" ADD CONSTRAINT "inherit_relatives_clinical_history_id_fkey" FOREIGN KEY ("clinical_history_id") REFERENCES "clinical_histories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_pathological_personals" ADD CONSTRAINT "non_pathological_personals_clinical_history_id_fkey" FOREIGN KEY ("clinical_history_id") REFERENCES "clinical_histories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "previous_treatments" ADD CONSTRAINT "previous_treatments_clinical_history_id_fkey" FOREIGN KEY ("clinical_history_id") REFERENCES "clinical_histories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_explorations" ADD CONSTRAINT "physical_explorations_clinical_history_id_fkey" FOREIGN KEY ("clinical_history_id") REFERENCES "clinical_histories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "micropigmentations" ADD CONSTRAINT "micropigmentations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "micropigmentations" ADD CONSTRAINT "micropigmentations_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "micropigmentation_hair_types" ADD CONSTRAINT "micropigmentation_hair_types_micropigmentation_id_fkey" FOREIGN KEY ("micropigmentation_id") REFERENCES "micropigmentations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "micropigmentation_hair_types" ADD CONSTRAINT "micropigmentation_hair_types_hair_type_id_fkey" FOREIGN KEY ("hair_type_id") REFERENCES "hair_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hairmedicines" ADD CONSTRAINT "hairmedicines_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hairmedicines" ADD CONSTRAINT "hairmedicines_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_images" ADD CONSTRAINT "patient_images_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_images" ADD CONSTRAINT "patient_images_procedure_report_id_fkey" FOREIGN KEY ("procedure_report_id") REFERENCES "procedure_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
