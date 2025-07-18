import { db } from "@/server/db";
import { redisClient } from "@/server/redis";
import { Job, Worker, type JobData } from "bullmq";

const worker = new Worker('game-finish', async (job: Job) => {
  const { gameId, state } = job.data as JobData;

  for (const [uid, val] of Object.entries(state)) {
      await db.vote.create({
        data: { gameId: gameId as string, userId: uid, value: Number(val) }
      })
    }

  await redisClient.del(`game:${gameId}:votes`);
}, {
  connection: {
    host: process.env.UPSTASH_REDIS_HOST,
    port: Number(process.env.UPSTASH_REDIS_PORT),
    password: process.env.UPSTASH_REDIS_TOKEN,
  },
});


worker.on('error', (err) => console.error('Worker error', err));
