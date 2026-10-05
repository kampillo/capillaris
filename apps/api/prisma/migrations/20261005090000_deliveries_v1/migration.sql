BEGIN;

-- AlterTable
ALTER TABLE "prescription_items" ADD COLUMN     "fulfillment_quantity" INTEGER;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "stock_unit" VARCHAR(30);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "prescription_id" UUID,
    "reversal_of_id" UUID,
    "idempotency_key" UUID NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "reason" VARCHAR(500),
    "physical_stock_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_lines" (
    "id" UUID NOT NULL,
    "delivery_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "prescription_item_id" UUID,
    "stock_movement_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "product_sku" VARCHAR(50),
    "presentation" VARCHAR(100),
    "stock_unit" VARCHAR(30) NOT NULL,

    CONSTRAINT "delivery_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_reversal_of_id_key" ON "deliveries"("reversal_of_id");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_idempotency_key_key" ON "deliveries"("idempotency_key");

-- CreateIndex
CREATE INDEX "deliveries_prescription_id_created_at_idx" ON "deliveries"("prescription_id", "created_at");

-- CreateIndex
CREATE INDEX "deliveries_created_at_idx" ON "deliveries"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_lines_stock_movement_id_key" ON "delivery_lines"("stock_movement_id");

-- CreateIndex
CREATE INDEX "delivery_lines_delivery_id_idx" ON "delivery_lines"("delivery_id");

-- CreateIndex
CREATE INDEX "delivery_lines_prescription_item_id_idx" ON "delivery_lines"("prescription_item_id");

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_lines" ADD CONSTRAINT "delivery_lines_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_lines" ADD CONSTRAINT "delivery_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_lines" ADD CONSTRAINT "delivery_lines_prescription_item_id_fkey" FOREIGN KEY ("prescription_item_id") REFERENCES "prescription_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_lines" ADD CONSTRAINT "delivery_lines_stock_movement_id_fkey" FOREIGN KEY ("stock_movement_id") REFERENCES "stock_movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- New nullable fields are deliberately not backfilled from names or quantity.
ALTER TABLE "prescription_items" ADD CONSTRAINT "fulfillment_quantity_positive" CHECK ("fulfillment_quantity" IS NULL OR "fulfillment_quantity" > 0);
ALTER TABLE "products" ADD CONSTRAINT "stock_unit_nonempty" CHECK ("stock_unit" IS NULL OR length(btrim("stock_unit")) > 0);
ALTER TABLE "delivery_lines" ADD CONSTRAINT "delivery_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "delivery_lines" ADD CONSTRAINT "delivery_stock_unit_nonempty" CHECK (length(btrim("stock_unit")) > 0);
ALTER TABLE "deliveries" ADD CONSTRAINT "delivery_source_valid" CHECK (("source" = 'direct' AND "prescription_id" IS NULL) OR ("source" = 'prescription' AND "prescription_id" IS NOT NULL));
ALTER TABLE "deliveries" ADD CONSTRAINT "delivery_kind_valid" CHECK (
 ("kind" = 'delivery' AND "reversal_of_id" IS NULL AND NOT "physical_stock_confirmed") OR
 ("kind" = 'reversal' AND "reversal_of_id" IS NOT NULL AND "reversal_of_id" <> "id" AND "physical_stock_confirmed" AND "reason" IS NOT NULL AND length(btrim("reason")) > 0)
);

-- Corrections append a linked reversal; the original and its lines stay intact.
CREATE FUNCTION capillaris_delivery_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Deliveries are immutable; append a linked reversal';
END;
$$;
CREATE TRIGGER delivery_immutable BEFORE UPDATE OR DELETE ON "deliveries" FOR EACH ROW EXECUTE FUNCTION capillaris_delivery_immutable();
CREATE TRIGGER delivery_line_immutable BEFORE UPDATE OR DELETE ON "delivery_lines" FOR EACH ROW EXECUTE FUNCTION capillaris_delivery_immutable();

COMMIT;
