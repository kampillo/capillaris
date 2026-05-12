-- Add denormalized user_email so audit rows survive user soft-deletes.
ALTER TABLE "audit_log" ADD COLUMN "user_email" VARCHAR(255);
