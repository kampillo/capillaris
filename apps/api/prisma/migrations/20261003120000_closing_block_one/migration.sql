-- Additive only. Reviewed locally; never applied to the existing database here.
ALTER TABLE "users" ADD COLUMN "auth_version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "patients" ADD COLUMN "drive_folder_url" VARCHAR(1000);
CREATE TABLE "google_oauth_states" (
  "digest" VARCHAR(64) NOT NULL PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "google_oauth_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "google_oauth_states_expires_at_idx" ON "google_oauth_states"("expires_at");
ALTER TABLE "physical_explorations" ADD COLUMN "talla_unidad" VARCHAR(2);
ALTER TABLE "patients" ADD COLUMN "merged_field_snapshot" JSONB;
