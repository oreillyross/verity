import { z } from "zod";
import {eq, ilike} from "drizzle-orm"
import { createTRPCRouter, publicProcedure } from "../core.js";
import { issues } from "../../db/schema.js";

export const issueRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [issue] = await ctx.db
        .insert(issues)
        .values({
          title: input.title,
        })
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
      .set({
        status: "closed",
        resolution: input.resolution,
        resolvedAt: new Date(),
      })
      .where(eq(issues.id, input.issueId));
  }),
  search: publicProcedure
  .input(
    z.object({
      query: z.string().min(3),
    })
  )
  .query(async ({ ctx, input }) => {
    return await ctx.db
      .select({
        id: issues.id,
        title: issues.title,
        status: issues.status,
      })
      .from(issues)
      .where(ilike(issues.title, `%${input.query}%`))
      .limit(5);
  }),
  
});
