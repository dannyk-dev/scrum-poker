/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createClient } from "redis";

export const getRedisClient = () => {
  return createClient({
    username: "default",
    password: "40MDOLvuGX5O6Tmmxwu1Q1DvRkz8FB3x",
    socket: {
      host: "redis-13128.c89.us-east-1-3.ec2.redns.redis-cloud.com",
      port: 13128,
    },
  });
};
