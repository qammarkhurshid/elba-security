CREATE TABLE IF NOT EXISTS "admin" (
	"id" text PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"last_sync_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_organisation_id_id_unique" UNIQUE("organisation_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organisation" (
	"organisation_id" uuid PRIMARY KEY NOT NULL,
	"id" integer NOT NULL,
	"account_login" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organisation_id_unique" UNIQUE("id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin" ADD CONSTRAINT "admin_organisation_id_organisation_organisation_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "organisation"("organisation_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
