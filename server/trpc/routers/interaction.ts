import { z } from "zod";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "../core.js";
import {
  interactions,
  interactionTags,
  interactionLinks,
  tags,
  issues,
} from "../../db/schema.js";

function normalizeTagName(raw: string) {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

export const interactionRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        titleCiphertext: z.string().min(1),
        contentCiphertext: z.string().min(1),
        occurredAt: z.string().datetime(),
        tags: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const occurredAt = new Date(input.occurredAt);
      const tagNames = Array.from(
        new Set(input.tags.map(normalizeTagName).filter(Boolean)),
      );

      const result = await ctx.db.transaction(async (tx) => {
        // 1) insert interaction
        const [interaction] = await tx
          .insert(interactions)
          .values({
            titleCiphertext: input.titleCiphertext,
            contentCiphertext: input.contentCiphertext,
            occurredAt,
            // createdAt/updatedAt default in DB
          })
          .returning({
            id: interactions.id,
            occurredAt: interactions.occurredAt,
          });

        // 2) upsert tags
        let tagRows: { id: string; name: string }[] = [];
        if (tagNames.length > 0) {
          // Insert all, ignore conflicts on unique(name)
          await tx
            .insert(tags)
            .values(tagNames.map((name) => ({ name })))
            .onConflictDoNothing({ target: tags.name });

          // Fetch IDs for all names
          tagRows = await tx
            .select({ id: tags.id, name: tags.name })
            .from(tags)
            .where(inArray(tags.name, tagNames));
        }

        // 3) insert join rows
        if (tagRows.length > 0) {
          await tx
            .insert(interactionTags)
            .values(
              tagRows.map((t) => ({
                interactionId: interaction.id,
                tagId: t.id,
              })),
            )
            .onConflictDoNothing();
        }

        return {
          interactionId: interaction.id,
          occurredAt: interaction.occurredAt,
          tags: tagRows.map((t) => t.name),
        };
      });

      return { ok: true, ...result };
    }),
  createFromInteraction: publicProcedure
    .input(
      z.object({
        interactionId: z.string().uuid(),
        title: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        // 1. get interaction (optional but nice)
        const interaction = await tx.query.interactions.findFirst({
          where: eq(interactions.id, input.interactionId),
        });

        // 2. create issue
        const [issue] = await tx
          .insert(issues)
          .values({
            title:
              input.title ?? interaction?.titleCiphertext ?? "Untitled Issue",
          })
          .returning();

        // 3. link interaction → issue
        await tx
          .update(interactions)
          .set({ issueId: issue.id })
          .where(eq(interactions.id, input.interactionId));

        return issue;
      });
    }),
  linkInteraction: publicProcedure
    .input(
      z.object({
        interactionId: z.string().uuid(),
        issueId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(interactions)
        .set({ issueId: input.issueId })
        .where(eq(interactions.id, input.interactionId));
    }),
  list: publicProcedure
    .input(
      z.object({
        cursor: z
          .object({
            occurredAt: z.string().datetime(),
            id: z.string(),
          })
          .optional(),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const limit = input.limit;

      // Stable pagination: order by occurredAt desc, then id desc
      // Cursor is the last item you saw: fetch items "before" it.
      const cursorOccurredAt = input.cursor
        ? new Date(input.cursor.occurredAt)
        : null;
      const cursorId = input.cursor?.id ?? null;

      const whereClause =
        cursorOccurredAt && cursorId
          ? and(
              lt(interactions.occurredAt, cursorOccurredAt),
              // If two interactions share same occurredAt, we also need an id tie-break.
              // This condition handles the tie-break in SQL:
              // (occurredAt < cursorOccurredAt) OR (occurredAt = cursorOccurredAt AND id < cursorId)
              // Drizzle doesn't have a simple OR+AND helper combo that’s as clean, so we use sql``.
              sql`(
                ${interactions.occurredAt} < ${cursorOccurredAt}
                OR (${interactions.occurredAt} = ${cursorOccurredAt} AND ${interactions.id} < ${cursorId})
              )`,
            )
          : undefined;

      const rows = await ctx.db
        .select({
          id: interactions.id,
          titleCiphertext: interactions.titleCiphertext,
          contentCiphertext: interactions.contentCiphertext,
          occurredAt: interactions.occurredAt,
          createdAt: interactions.createdAt,
          updatedAt: interactions.updatedAt,
        })
        .from(interactions)
        .where(whereClause)
        .orderBy(desc(interactions.occurredAt), desc(interactions.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      const nextCursor = hasMore
        ? {
            occurredAt: items[items.length - 1]!.occurredAt.toISOString(),
            id: items[items.length - 1]!.id,
          }
        : null;

      return { items, nextCursor };
    }),
  get: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const [row] = await ctx.db
        .select({
          id: interactions.id,
          titleCiphertext: interactions.titleCiphertext,
          contentCiphertext: interactions.contentCiphertext,
          occurredAt: interactions.occurredAt,
          createdAt: interactions.createdAt,
          updatedAt: interactions.updatedAt,
        })
        .from(interactions)
        .where(eq(interactions.id, input.id))
        .limit(1);

      if (!row) {
        // tRPC will map this into a client error
        throw new Error("Interaction not found");
      }

      // Fetch tags
      const tagRows = await ctx.db
        .select({ name: tags.name })
        .from(interactionTags)
        .innerJoin(tags, eq(tags.id, interactionTags.tagId))
        .where(eq(interactionTags.interactionId, input.id))
        .orderBy(tags.name);

      return {
        ...row,
        tags: tagRows.map((t) => t.name),
      };
    }),
  thread: publicProcedure
    .input(
      z.object({
        id: z.string().min(1),
        max: z.number().min(2).max(500).default(200),
      }),
    )
    .query(async ({ input, ctx }) => {
      const startId = input.id;
      const max = input.max;

      // Helper: find the previous item in a "next" chain:
      // previous --(next)--> current  => link.toId = current
      async function findPrev(currentId: string) {
        const [row] = await ctx.db
          .select({
            fromId: interactionLinks.fromId,
            id: interactionLinks.id,
          })
          .from(interactionLinks)
          .where(
            and(
              eq(interactionLinks.toId, currentId),
              eq(interactionLinks.relationType, "next"),
            ),
          )
          .orderBy(desc(interactionLinks.createdAt))
          .limit(1);

        return row?.fromId ?? null;
      }

      // Helper: find the next item in a "next" chain:
      // current --(next)--> next  => link.fromId = current
      async function findNext(currentId: string) {
        const [row] = await ctx.db
          .select({
            toId: interactionLinks.toId,
            id: interactionLinks.id,
          })
          .from(interactionLinks)
          .where(
            and(
              eq(interactionLinks.fromId, currentId),
              eq(interactionLinks.relationType, "next"),
            ),
          )
          .orderBy(desc(interactionLinks.createdAt))
          .limit(1);

        return row?.toId ?? null;
      }

      // Walk backwards to the head
      const seen = new Set<string>([startId]);
      const backward: string[] = [];
      let cursor = startId;

      for (let i = 0; i < max; i++) {
        const prev = await findPrev(cursor);
        if (!prev) break;
        if (seen.has(prev)) break; // cycle protection
        seen.add(prev);
        backward.push(prev);
        cursor = prev;
      }

      backward.reverse(); // from head -> ... -> just before start

      // Walk forwards to the tail
      const forward: string[] = [];
      cursor = startId;

      for (let i = 0; i < max; i++) {
        const next = await findNext(cursor);
        if (!next) break;
        if (seen.has(next)) break; // cycle protection
        seen.add(next);
        forward.push(next);
        cursor = next;
      }

      // Full chain ids in order
      const ids = [...backward, startId, ...forward];

      // Fetch interaction rows (ciphertext + occurredAt is enough for sequence UI)
      const rows = await ctx.db
        .select({
          id: interactions.id,
          occurredAt: interactions.occurredAt,
          titleCiphertext: interactions.titleCiphertext,
        })
        .from(interactions)
        .where(inArray(interactions.id, ids));

      const byId = new Map(rows.map((r) => [r.id, r]));
      const items = ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((r) => ({
          id: r!.id,
          occurredAt: r!.occurredAt,
          titleCiphertext: r!.titleCiphertext,
        }));

      return {
        headId: ids[0] ?? startId,
        tailId: ids[ids.length - 1] ?? startId,
        items,
        currentIndex: Math.max(0, ids.indexOf(startId)),
      };
    }),
  assignToIssue: publicProcedure
    .input(
      z.object({
        interactionId: z.string().uuid(),
        issueId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(interactions)
        .set({ issueId: input.issueId })
        .where(eq(interactions.id, input.interactionId));
    }),
  update: publicProcedure
    .input(
      z.object({
        id: z.string().min(1),
        titleCiphertext: z.string().min(1),
        contentCiphertext: z.string().min(1),
        occurredAt: z.string().datetime(),
        // tags update can come next; keep this minimal first
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const occurredAt = new Date(input.occurredAt);

      const [row] = await ctx.db
        .update(interactions)
        .set({
          titleCiphertext: input.titleCiphertext,
          contentCiphertext: input.contentCiphertext,
          occurredAt,
          updatedAt: new Date(), // explicit so you see it change immediately
        })
        .where(eq(interactions.id, input.id))
        .returning({
          id: interactions.id,
          occurredAt: interactions.occurredAt,
          createdAt: interactions.createdAt,
          updatedAt: interactions.updatedAt,
        });

      if (!row) throw new Error("Interaction not found");

      return { ok: true, interaction: row };
    }),
});
