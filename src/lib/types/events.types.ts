export type RoomEvent =
  | { type: "start"; gameId: string }
  | { type: "vote"; userId: string; value: number; username: string }
  | { type: "end"; gameId: string; results: { userId: string; value: number }[]; estimate: number }
  | { type: "restart"; gameId: string };
