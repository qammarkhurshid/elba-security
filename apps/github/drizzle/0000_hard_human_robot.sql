CREATE TABLE IF NOT EXISTS "installation" (
	"id" integer NOT NULL,
	"organisation_id" uuid NOT NULL,
	"account_id" integer,
	"account_login" text NOT NULL,
	"suspended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "installation_id_unique" UNIQUE("id"),
	CONSTRAINT "installation_organisation_id_unique" UNIQUE("organisation_id"),
	CONSTRAINT "installation_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "installation_admin" (
	"installation_id" integer NOT NULL,
	"admin_id" text NOT NULL,
	"last_sync_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"update_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "installation_admin_installation_id_admin_id_unique" UNIQUE("installation_id","admin_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organisation" (
	"organisation_id" uuid PRIMARY KEY NOT NULL,
	"is_activated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installation" ADD CONSTRAINT "installation_organisation_id_organisation_organisation_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "organisation"("organisation_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installation_admin" ADD CONSTRAINT "installation_admin_installation_id_installation_id_fk" FOREIGN KEY ("installation_id") REFERENCES "installation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
