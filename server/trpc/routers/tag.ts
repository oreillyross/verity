import { createTRPCRouter, publicProcedure } from "../core";

export const tagRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    return [];
  }),
});