import { gameRouter } from "@/server/api/routers/game";
import { playerRouter } from "@/server/api/routers/players";
import { roomRouter } from "@/server/api/routers/room";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { gameSettingsRouter } from "@/server/api/routers/game-settings";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  game: gameRouter,
  room: roomRouter,
  player: playerRouter,
  gameSettings: gameSettingsRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
