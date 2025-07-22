import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

const wss = new WebSocketServer({ port: 3001 });

const wsContext = async ({ connectionParams }: { connectionParams?: Record<string, unknown> }) => {
  const headers = new Headers();
  const raw = typeof connectionParams === "object" && typeof connectionParams.cookie === "string"
    ? (connectionParams.cookie as string)
    : "";
  if (raw) {
    headers.set("cookie", raw);
  }
  return createTRPCContext({ header: headers });
};

const handler = applyWSSHandler({
  wss,
  router: appRouter,
  createContext: ({ req }) => wsContext(req.headers),
  onError(err){
    console.error(err);
  },
  keepAlive: {
    enabled: false,

  },
});

// wss.on('connection', () => {
//   console.log('ws connecting')
// });
wss.on('open', () => {
  console.log('opened')
})

wss.on('error', (error) => {
  console.error(error);
});

wss.on('wsClientError', (error) => {
  console.error(`wsClientError: ${error}`)
})
// wss.on("connection", (socket, req) => {
//   const now = Date.now();
//   if (now - lastLog > 1000) {
//     console.log("⚡️ WS connection from", req.socket.remoteAddress);
//     lastLog = now;
//   }
//   socket.on("close", () => console.log("⛔️ WS disconnected"));
// });

console.log("✅ WebSocket Server listening on ws://localhost:3001");

process.on("SIGTERM", () => {
  handler.broadcastReconnectNotification();
  wss.close();
});
