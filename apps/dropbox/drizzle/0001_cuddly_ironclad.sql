ALTER TABLE "tokens" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tokens" ALTER COLUMN "created_at" SET DEFAULT now();