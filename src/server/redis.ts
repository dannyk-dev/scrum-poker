import { Redis } from "@upstash/redis";

export const getRedisClient = () => {
  return Redis.fromEnv();
}
