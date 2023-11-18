CREATE TABLE IF NOT EXISTS "tokens" (
	"organisation_id" uuid PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"team_name" text NOT NULL,
	"admin_team_member_id" text NOT NULL,
	"root_namespace_id" text NOT NULL,
	"unauthorized_at" timestamp,
	"refresh_after" timestamp,
	"expires_at" timestamp,
	"updated_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL
);
