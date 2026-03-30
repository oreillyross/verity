import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "../core.js";
import { issues, interactions } from "../../db/schema.js";

export const issueRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ titleCiphertext: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [issue] = await ctx.db
        .insert(issues)
        .values({ titleCiphertext: input.titleCiphertext })
        .returning();
      return issue;
    }),

  close: publicProcedure
    .input(z.object({
      issueId: z.string().uuid(),
      resolution: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(issues)
        .set({ status: "closed", resolution: input.resolution, resolvedAt: new Date() })
        .where(eq(issues.id, input.issueId));
    }),

  list: publicProcedure
    .input(z.object({ status: z.enum(["open", "closed", "all"]).default("all") }))
    .query(async ({ ctx, input }) => {
      return await ctx.db
        .select({
          id: issues.id,
          titleCiphertext: issues.titleCiphertext,
          status: issues.status,
          createdAt: issues.createdAt,
          resolvedAt: issues.resolvedAt,
        })
        .from(issues)
        .where(input.status === "all" ? undefined : eq(issues.status, input.status))
        .orderBy(desc(issues.createdAt));
    }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [issue] = await ctx.db
        .select()
        .from(issues)
        .where(eq(issues.id, input.id))
        .limit(1);

      if (!issue) throw new Error("Issue not found");

      const linkedInteractions = await ctx.db
        .select({ id: interactions.id, titleCiphertext: interactions.titleCiphertext })
        .from(interactions)
        .where(eq(interactions.issueId, input.id));

      return { ...issue, interactions: linkedInteractions };
    }),
});
