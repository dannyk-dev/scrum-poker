import Redis from "ioredis";

export const getRedisClient = () => {
  return new Redis(process.env.REDIS_URL + '?family=0');
}
