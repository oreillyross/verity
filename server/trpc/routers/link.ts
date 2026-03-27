import { z } from "zod";
import { desc, eq, or } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "../core.js";
import { interactionLinks, interactions } from "../../db/schema.js";

export const linkRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        fromId: z.string().min(1),
        toId: z.string().min(1),
        relationType: z.string().min(1).default("related"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.fromId === input.toId) {
        throw new Error("Cannot link an interaction to itself");
      }

      // optional: ensure both interactions exist (nice UX errors)
      const existing = await ctx.db
        .select({ id: interactions.id })
        .from(interactions)
        .where(
          or(
            eq(interactions.id, input.fromId),
            eq(interactions.id, input.toId),
          ),
        );

      const ids = new Set(existing.map((r) => r.id));
      if (!ids.has(input.fromId)) throw new Error("fromId does not exist");
      if (!ids.has(input.toId)) throw new Error("toId does not exist");

      const [row] = await ctx.db
        .insert(interactionLinks)
        .values({
          fromId: input.fromId,
          toId: input.toId,
          relationType: input.relationType,
        })
        .returning({
          id: interactionLinks.id,
          fromId: interactionLinks.fromId,
          toId: interactionLinks.toId,
          relationType: interactionLinks.relationType,
          createdAt: interactionLinks.createdAt,
        });

      return { ok: true, link: row };
    }),

  listForInteraction: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const rows = await ctx.db
        .select({
          id: interactionLinks.id,
          fromId: interactionLinks.fromId,
          toId: interactionLinks.toId,
          relationType: interactionLinks.relationType,
          createdAt: interactionLinks.createdAt,
        })
        .from(interactionLinks)
        .where(
          or(
            eq(interactionLinks.fromId, input.id),
            eq(interactionLinks.toId, input.id),
          ),
        )
        .orderBy(desc(interactionLinks.createdAt));

      const outgoing = rows.filter((r) => r.fromId === input.id);
      const incoming = rows.filter((r) => r.toId === input.id);

      return { outgoing, incoming };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(interactionLinks)
        .where(eq(interactionLinks.id, input.id));
      return { ok: true };
    }),
  createNext: publicProcedure
    .input(
      z.object({
        previousId: z.string().min(1),
        currentId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.previousId === input.currentId) {
        throw new Error("Cannot link an interaction to itself");
      }

      // Ensure both exist
      const existing = await ctx.db
        .select({ id: interactions.id })
        .from(interactions)
        .where(
          or(
            eq(interactions.id, input.previousId),
            eq(interactions.id, input.currentId),
          ),
        );

      const ids = new Set(existing.map((r) => r.id));
      if (!ids.has(input.previousId))
        throw new Error("previousId does not exist");
      if (!ids.has(input.currentId))
        throw new Error("currentId does not exist");

      // previous -> current with relationType = "next"
      const [row] = await ctx.db
        .insert(interactionLinks)
        .values({
          fromId: input.previousId,
          toId: input.currentId,
          relationType: "next",
        })
        .returning({
          id: interactionLinks.id,
          fromId: interactionLinks.fromId,
          toId: interactionLinks.toId,
          relationType: interactionLinks.relationType,
          createdAt: interactionLinks.createdAt,
        });

      return { ok: true, link: row };
    }),
});
