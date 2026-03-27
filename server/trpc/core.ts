import { initTRPC } from "@trpc/server";
import { db as dbValue} from "../db/client"

export type Context = {
  db: typeof dbValue
};

const t = initTRPC.context<Context>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;