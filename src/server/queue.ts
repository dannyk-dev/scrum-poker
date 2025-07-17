import { Queue } from "bullmq";

export const gameFinishQueue = new Queue('game-finish', {
  connection: {
    host: process.env.UPSTASH_REDIS_HOST,
    port: Number(process.env.UPSTASH_REDIS_PORT),
    password: process.env.UPSTASH_REDIS_TOKEN,
  },
});
