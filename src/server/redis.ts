import Redis from "ioredis";


export const getRedisClient = () =>
  new Redis(process.env.REDIS_URL! + '?family=0');
