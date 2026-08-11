-- CreateTable
CREATE TABLE "treatment_types" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatments" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "realizado_por_id" UUID,
    "fecha" DATE NOT NULL,
    "sesion_numero" INTEGER,
    "duracion" INTEGER,
    "dilucion" VARCHAR(100),
    "descripcion" TEXT,
    "comentarios" TEXT,
    "origen" VARCHAR(30),
    "origen_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_on_types" (
    "id" UUID NOT NULL,
    "treatment_id" UUID NOT NULL,
    "treatment_type_id" UUID NOT NULL,

    CONSTRAINT "treatment_on_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_zones" (
    "id" UUID NOT NULL,
    "treatment_id" UUID NOT NULL,
    "hair_type_id" UUID NOT NULL,

    CONSTRAINT "treatment_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "treatment_types_code_key" ON "treatment_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_types_name_key" ON "treatment_types"("name");

-- CreateIndex
CREATE INDEX "treatments_patient_id_idx" ON "treatments"("patient_id");

-- CreateIndex
CREATE INDEX "treatments_fecha_idx" ON "treatments"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "treatments_origen_origen_id_key" ON "treatments"("origen", "origen_id");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_on_types_treatment_id_treatment_type_id_key" ON "treatment_on_types"("treatment_id", "treatment_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_zones_treatment_id_hair_type_id_key" ON "treatment_zones"("treatment_id", "hair_type_id");

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_realizado_por_id_fkey" FOREIGN KEY ("realizado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_on_types" ADD CONSTRAINT "treatment_on_types_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_on_types" ADD CONSTRAINT "treatment_on_types_treatment_type_id_fkey" FOREIGN KEY ("treatment_type_id") REFERENCES "treatment_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_zones" ADD CONSTRAINT "treatment_zones_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_zones" ADD CONSTRAINT "treatment_zones_hair_type_id_fkey" FOREIGN KEY ("hair_type_id") REFERENCES "hair_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
