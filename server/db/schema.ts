import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
  varchar,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Interactions
 * - title/content are ciphertext (client-side encrypted)
 * - occurredAt is the "when it happened"
 * - createdAt/updatedAt are server timestamps
 */
export const interactions = pgTable(
  "interactions",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    titleCiphertext: text("title_ciphertext").notNull(),
    contentCiphertext: text("content_ciphertext").notNull(),

    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    issueId: uuid("issue_id").references(() => issues.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    occurredAtIdx: index("interactions_occurred_at_idx").on(t.occurredAt),
  }),
);

export const tags = pgTable(
  "tags",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // store normalized tag name (lowercase trim) at write-time
    name: text("name").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    nameUnique: uniqueIndex("tags_name_unique").on(t.name),
  }),
);

/**
 * join table for many-to-many
 */
export const interactionTags = pgTable(
  "interaction_tags",
  {
    interactionId: varchar("interaction_id", { length: 36 })
      .notNull()
      .references(() => interactions.id, { onDelete: "cascade" }),

    tagId: varchar("tag_id", { length: 36 })
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    uniqueJoin: uniqueIndex("interaction_tags_unique").on(
      t.interactionId,
      t.tagId,
    ),
    interactionIdx: index("interaction_tags_interaction_idx").on(
      t.interactionId,
    ),
    tagIdx: index("interaction_tags_tag_idx").on(t.tagId),
  }),
);

/**
 * Links between interactions (for sequences/threads)
 */
export const interactionLinks = pgTable(
  "interaction_links",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    fromId: varchar("from_id", { length: 36 })
      .notNull()
      .references(() => interactions.id, { onDelete: "cascade" }),

    toId: varchar("to_id", { length: 36 })
      .notNull()
      .references(() => interactions.id, { onDelete: "cascade" }),

    relationType: text("relation_type").notNull().default("related"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    fromIdx: index("interaction_links_from_idx").on(t.fromId),
    toIdx: index("interaction_links_to_idx").on(t.toId),
  }),
);

export const issues = pgTable("issues", {
  id: uuid("id").defaultRandom().primaryKey(),

  title: text("title").notNull(),

  status: text("status", { enum: ["open", "closed"] })
    .notNull()
    .default("open"),

  resolution: text("resolution"), // nullable until closed

  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"), // nullable
});

// Helpful TS types
export type InteractionRow = typeof interactions.$inferSelect;
export type TagRow = typeof tags.$inferSelect;
export type InteractionTagRow = typeof interactionTags.$inferSelect;
export type InteractionLinkRow = typeof interactionLinks.$inferSelect;
