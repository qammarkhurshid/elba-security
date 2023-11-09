DO $$ BEGIN
 CREATE TYPE "sync_job_status" AS ENUM('scheduled', 'started');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "sync_job_type" AS ENUM('users', 'apps');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"last_tpa_scan" timestamp,
	"last_user_scan" timestamp,
	CONSTRAINT "organization_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permission_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"app_id" text NOT NULL,
	"grant_id" text NOT NULL,
	CONSTRAINT "permission_grant_tenant_id_user_id_app_id_grant_id_unique" UNIQUE("tenant_id","user_id","app_id","grant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"status" "sync_job_status" DEFAULT 'scheduled' NOT NULL,
	"type" "sync_job_type" NOT NULL,
	"pagination_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "permission_grant" ADD CONSTRAINT "permission_grant_tenant_id_organization_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "organization"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_job" ADD CONSTRAINT "sync_job_tenant_id_organization_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "organization"("tenant_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
