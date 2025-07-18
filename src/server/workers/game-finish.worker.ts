import { db } from "@/server/db";
import { redisClient } from "@/server/redis";
import {  PrismaClient } from "@prisma/client";
import { Worker } from "bullmq";

const worker = new Worker('game-finish', async (job) => {
  const { gameId, state } = job.data;

  for (const [uid, val] of Object.entries(state)) {
      await db.vote.create({
        data: { gameId: gameId as string, userId: uid, value: Number(val) }
      })
    }

  await redisClient.del(`game:${gameId}:votes`);
});

worker.on('error', (err) => console.error('Worker error', err));
