CREATE TABLE "interaction_links" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_id" varchar(36) NOT NULL,
	"to_id" varchar(36) NOT NULL,
	"relation_type" text DEFAULT 'related' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interaction_tags" (
	"interaction_id" varchar(36) NOT NULL,
	"tag_id" varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_ciphertext" text NOT NULL,
	"content_ciphertext" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interaction_links" ADD CONSTRAINT "interaction_links_from_id_interactions_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."interactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction_links" ADD CONSTRAINT "interaction_links_to_id_interactions_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."interactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction_tags" ADD CONSTRAINT "interaction_tags_interaction_id_interactions_id_fk" FOREIGN KEY ("interaction_id") REFERENCES "public"."interactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction_tags" ADD CONSTRAINT "interaction_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interaction_links_from_idx" ON "interaction_links" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "interaction_links_to_idx" ON "interaction_links" USING btree ("to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "interaction_tags_unique" ON "interaction_tags" USING btree ("interaction_id","tag_id");--> statement-breakpoint
CREATE INDEX "interaction_tags_interaction_idx" ON "interaction_tags" USING btree ("interaction_id");--> statement-breakpoint
CREATE INDEX "interaction_tags_tag_idx" ON "interaction_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "interactions_occurred_at_idx" ON "interactions" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_unique" ON "tags" USING btree ("name");