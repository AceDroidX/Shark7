CREATE TABLE "ai_streamer_schedule_run" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ai_streamer_schedule_run_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"streamer_id" varchar(64) NOT NULL,
	"source_type" varchar(32) NOT NULL,
	"source_id" varchar(128) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"model_name" varchar(128),
	"prompt_version" varchar(64),
	"input_hash" varchar(128) NOT NULL,
	"request_json" jsonb,
	"response_json" jsonb,
	"error_message" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streamer_schedule_evidence" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "streamer_schedule_evidence_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"item_id" bigint NOT NULL,
	"source_type" varchar(32) NOT NULL,
	"source_id" varchar(128) NOT NULL,
	"source_url" text,
	"source_published_at" timestamp with time zone NOT NULL,
	"evidence_text" text NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"raw_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streamer_schedule_item" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "streamer_schedule_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"streamer_id" varchar(64) NOT NULL,
	"platform" varchar(32) DEFAULT 'weibo' NOT NULL,
	"external_user_id" bigint NOT NULL,
	"title" text NOT NULL,
	"category" varchar(32) NOT NULL,
	"schedule_state" varchar(32) DEFAULT 'scheduled' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"certainty" varchar(32) DEFAULT 'unknown' NOT NULL,
	"confidence" double precision,
	"start_date" varchar(10),
	"end_date" varchar(10),
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"date_text" text,
	"time_text" text,
	"time_precision" varchar(32) DEFAULT 'unknown' NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Shanghai' NOT NULL,
	"summary" text,
	"dedupe_key" varchar(128) NOT NULL,
	"extra_json" jsonb,
	"last_extracted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "streamer_schedule_evidence" ADD CONSTRAINT "streamer_schedule_evidence_item_id_streamer_schedule_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."streamer_schedule_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_streamer_schedule_run_source_hash_uidx" ON "ai_streamer_schedule_run" USING btree ("source_type","source_id","input_hash");--> statement-breakpoint
CREATE INDEX "ai_streamer_schedule_run_streamer_status_idx" ON "ai_streamer_schedule_run" USING btree ("streamer_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "streamer_schedule_evidence_item_source_uidx" ON "streamer_schedule_evidence" USING btree ("item_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "streamer_schedule_evidence_source_idx" ON "streamer_schedule_evidence" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "streamer_schedule_item_streamer_status_date_idx" ON "streamer_schedule_item" USING btree ("streamer_id","status","start_date");--> statement-breakpoint
CREATE INDEX "streamer_schedule_item_streamer_start_at_idx" ON "streamer_schedule_item" USING btree ("streamer_id","start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "streamer_schedule_item_active_dedupe_uidx" ON "streamer_schedule_item" USING btree ("streamer_id","dedupe_key") WHERE "streamer_schedule_item"."status" = 'active';
