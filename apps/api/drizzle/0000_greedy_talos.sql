CREATE TABLE IF NOT EXISTS "weather_scene_cache" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "weather_scene_day" (
	"day" date PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
