import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "./core";
import { interactionRouter } from "./routers/interaction.js";
import { linkRouter } from "./routers/link.js";
import { tagRouter } from "./routers/tag.js";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => {
    return { ok: true, name: "verity-server" };
  }),
interaction: interactionRouter,
  tag: tagRouter,
  link: linkRouter,
  hello: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .query(({ input }) => {
      return { greeting: `Hello, ${input.name}` };
    }),
});

export type AppRouter = typeof appRouter;
