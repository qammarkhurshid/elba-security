CREATE TABLE IF NOT EXISTS "conversations" (
	"team_id" text NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"is_shared_externally" boolean NOT NULL,
	CONSTRAINT conversations_team_id_id PRIMARY KEY("team_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"elba_organisation_id" text NOT NULL,
	"url" text NOT NULL,
	CONSTRAINT "teams_elba_organisation_id_unique" UNIQUE("elba_organisation_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE cascade ON UPDATE restrict;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
