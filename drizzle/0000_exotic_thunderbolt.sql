CREATE TABLE "ai_video_summary" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ai_video_summary_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"video_id" bigint NOT NULL,
	"page_id" bigint,
	"summary_type" varchar(32) DEFAULT 'full' NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"model_name" varchar(128),
	"prompt_version" varchar(64),
	"subtitle_track_id" bigint,
	"input_hash" varchar(128) NOT NULL,
	"summary_text" text,
	"summary_json" jsonb,
	"error_message" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bilibili_fetch_job" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bilibili_fetch_job_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"job_type" varchar(32) NOT NULL,
	"target_bvid" varchar(32),
	"target_mid" bigint,
	"target_series_id" bigint,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"payload" jsonb,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bilibili_video_page" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bilibili_video_page_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"video_id" bigint NOT NULL,
	"cid" bigint NOT NULL,
	"page_no" integer NOT NULL,
	"part" text NOT NULL,
	"duration_seconds" integer NOT NULL,
	"first_frame_url" text,
	"raw" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bilibili_video_subtitle_segment" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bilibili_video_subtitle_segment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"track_id" bigint NOT NULL,
	"cid" bigint NOT NULL,
	"sid" integer NOT NULL,
	"start_seconds" double precision NOT NULL,
	"end_seconds" double precision NOT NULL,
	"content" text NOT NULL,
	"music_score" double precision,
	"location" integer,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bilibili_video_subtitle_track" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bilibili_video_subtitle_track_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"page_id" bigint NOT NULL,
	"subtitle_id_str" varchar(64) NOT NULL,
	"lan" varchar(32) NOT NULL,
	"lan_doc" varchar(64) NOT NULL,
	"is_ai" boolean DEFAULT true NOT NULL,
	"is_auto_selected" boolean DEFAULT false NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"subtitle_url" text,
	"ai_type" integer,
	"ai_status" integer,
	"source_type" varchar(32) DEFAULT 'bilibili' NOT NULL,
	"raw" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bilibili_video" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bilibili_video_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"bvid" varchar(32) NOT NULL,
	"aid" bigint NOT NULL,
	"title" text NOT NULL,
	"owner_mid" bigint NOT NULL,
	"owner_name" text NOT NULL,
	"videos" integer DEFAULT 1 NOT NULL,
	"cover_url" text,
	"publish_time" timestamp with time zone,
	"raw" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_video_summary" ADD CONSTRAINT "ai_video_summary_video_id_bilibili_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."bilibili_video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_video_summary" ADD CONSTRAINT "ai_video_summary_page_id_bilibili_video_page_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."bilibili_video_page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_video_summary" ADD CONSTRAINT "ai_video_summary_subtitle_track_id_bilibili_video_subtitle_track_id_fk" FOREIGN KEY ("subtitle_track_id") REFERENCES "public"."bilibili_video_subtitle_track"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bilibili_video_page" ADD CONSTRAINT "bilibili_video_page_video_id_bilibili_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."bilibili_video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bilibili_video_subtitle_segment" ADD CONSTRAINT "bilibili_video_subtitle_segment_track_id_bilibili_video_subtitle_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."bilibili_video_subtitle_track"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bilibili_video_subtitle_track" ADD CONSTRAINT "bilibili_video_subtitle_track_page_id_bilibili_video_page_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."bilibili_video_page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_video_summary_scope_hash_uidx" ON "ai_video_summary" USING btree ("video_id","page_id","summary_type","input_hash");--> statement-breakpoint
CREATE INDEX "ai_video_summary_video_status_idx" ON "ai_video_summary" USING btree ("video_id","status");--> statement-breakpoint
CREATE INDEX "ai_video_summary_page_status_idx" ON "ai_video_summary" USING btree ("page_id","status");--> statement-breakpoint
CREATE INDEX "bilibili_fetch_job_type_status_idx" ON "bilibili_fetch_job" USING btree ("job_type","status");--> statement-breakpoint
CREATE INDEX "bilibili_fetch_job_target_bvid_idx" ON "bilibili_fetch_job" USING btree ("target_bvid");--> statement-breakpoint
CREATE UNIQUE INDEX "bilibili_video_page_cid_uidx" ON "bilibili_video_page" USING btree ("cid");--> statement-breakpoint
CREATE UNIQUE INDEX "bilibili_video_page_video_page_no_uidx" ON "bilibili_video_page" USING btree ("video_id","page_no");--> statement-breakpoint
CREATE INDEX "bilibili_video_page_video_id_idx" ON "bilibili_video_page" USING btree ("video_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bilibili_video_subtitle_segment_track_sid_uidx" ON "bilibili_video_subtitle_segment" USING btree ("track_id","sid");--> statement-breakpoint
CREATE INDEX "bilibili_video_subtitle_segment_cid_start_idx" ON "bilibili_video_subtitle_segment" USING btree ("cid","start_seconds");--> statement-breakpoint
CREATE UNIQUE INDEX "bilibili_video_subtitle_track_page_subtitle_uidx" ON "bilibili_video_subtitle_track" USING btree ("page_id","subtitle_id_str");--> statement-breakpoint
CREATE INDEX "bilibili_video_subtitle_track_page_id_idx" ON "bilibili_video_subtitle_track" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "bilibili_video_subtitle_track_page_lan_idx" ON "bilibili_video_subtitle_track" USING btree ("page_id","lan");--> statement-breakpoint
CREATE INDEX "bilibili_video_subtitle_track_page_selected_idx" ON "bilibili_video_subtitle_track" USING btree ("page_id","is_auto_selected");--> statement-breakpoint
CREATE UNIQUE INDEX "bilibili_video_bvid_uidx" ON "bilibili_video" USING btree ("bvid");--> statement-breakpoint
CREATE UNIQUE INDEX "bilibili_video_aid_uidx" ON "bilibili_video" USING btree ("aid");--> statement-breakpoint
CREATE INDEX "bilibili_video_owner_mid_idx" ON "bilibili_video" USING btree ("owner_mid");
--> statement-breakpoint
ALTER TABLE "bilibili_fetch_job" ADD COLUMN "max_attempts" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "bilibili_fetch_job" ADD COLUMN "error_code" varchar(64);--> statement-breakpoint
ALTER TABLE "bilibili_fetch_job" ADD COLUMN "retryable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bilibili_fetch_job" ADD COLUMN "next_retry_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bilibili_fetch_job" ADD COLUMN "source_job_id" bigint;--> statement-breakpoint
ALTER TABLE "bilibili_fetch_job" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "bilibili_fetch_job_retry_idx" ON "bilibili_fetch_job" USING btree ("job_type","status","retryable","next_retry_at");
--> statement-breakpoint
ALTER TABLE "bilibili_fetch_job" ADD CONSTRAINT "bilibili_fetch_job_source_job_id_fk" FOREIGN KEY ("source_job_id") REFERENCES "public"."bilibili_fetch_job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_video_summary_full_scope_hash_uidx" ON "ai_video_summary" USING btree ("video_id","summary_type","input_hash") WHERE "ai_video_summary"."page_id" is null;
