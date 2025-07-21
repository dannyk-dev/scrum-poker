import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer, type Server } from "ws";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

const wss = new WebSocketServer({
  port: 3001,
});

wss.on("error", (err) => {
  console.error("WebSocket Server Error:", err);
});

const handler = applyWSSHandler({
  wss,
  router: appRouter,
  // @ts-expect-error
  createContext: createTRPCContext,
  // Enable heartbeat messages to keep connection open (disabled by default)
  keepAlive: {
    enabled: false,
    // server ping message interval in milliseconds
    pingMs: 30000,
    // connection is terminated if pong message is not received in this many milliseconds
    pongWaitMs: 5000,
  },
});

let lastLog = 0;
wss.on('connection', (_, req) => {
  const now = Date.now();
  if (now - lastLog > 1000) {
    console.log('⚡️ WS connection from', req.socket.remoteAddress);
    lastLog = now;
  }
});
wss.on('close', () => {
  console.log('⛔️ WS disconnected');
});
console.log("✅ WebSocket Server listening on ws://localhost:3001");

process.on("SIGTERM", () => {
  console.log("SIGTERM");
  handler.broadcastReconnectNotification();
  wss.close();
});
