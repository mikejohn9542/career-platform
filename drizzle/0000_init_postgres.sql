CREATE TABLE "contacts" (
	"id" integer PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"linkedin" text NOT NULL,
	"github" text NOT NULL,
	"website" text,
	"location" text NOT NULL,
	CONSTRAINT "contacts_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "education" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "education_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"profile_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"school" text NOT NULL,
	"degree" text NOT NULL,
	"field" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"summary" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_highlights" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "experience_highlights_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"experience_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "experiences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"profile_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"company" text NOT NULL,
	"role" text NOT NULL,
	"location" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"current" boolean DEFAULT false NOT NULL,
	"summary" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"headline" text NOT NULL,
	"summary" text NOT NULL,
	"location" text NOT NULL,
	"pronouns" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_highlights" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_highlights_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_links" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_links_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_media" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_media_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"src" text NOT NULL,
	"alt" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_technologies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_technologies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"project_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "projects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"profile_id" integer NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"status" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_metadata" (
	"id" integer PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"published_at" text NOT NULL,
	"status" text NOT NULL,
	"pdf_url" text NOT NULL,
	"summary" text NOT NULL,
	CONSTRAINT "resume_metadata_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "skill_groups" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "skill_groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"profile_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "skill_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"skill_group_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education" ADD CONSTRAINT "education_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_highlights" ADD CONSTRAINT "experience_highlights_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_highlights" ADD CONSTRAINT "project_highlights_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_links" ADD CONSTRAINT "project_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_metadata" ADD CONSTRAINT "resume_metadata_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_groups" ADD CONSTRAINT "skill_groups_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_items" ADD CONSTRAINT "skill_items_skill_group_id_skill_groups_id_fk" FOREIGN KEY ("skill_group_id") REFERENCES "public"."skill_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "education_profile_order_idx" ON "education" USING btree ("profile_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "experience_highlights_order_idx" ON "experience_highlights" USING btree ("experience_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "experiences_profile_order_idx" ON "experiences" USING btree ("profile_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "project_highlights_order_idx" ON "project_highlights" USING btree ("project_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "project_links_order_idx" ON "project_links" USING btree ("project_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "project_technologies_order_idx" ON "project_technologies" USING btree ("project_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_profile_slug_idx" ON "projects" USING btree ("profile_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_profile_order_idx" ON "projects" USING btree ("profile_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_groups_profile_order_idx" ON "skill_groups" USING btree ("profile_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_items_group_order_idx" ON "skill_items" USING btree ("skill_group_id","sort_order");