import type { Vote } from "prisma/interfaces";

export interface IGameSnapshot {
  gameId: string|null;
  votes?: Vote[];
}

export interface IEndGameResponse {
  ok: boolean;
  results: Vote[];
}
