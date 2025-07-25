import type { Vote } from "prisma/interfaces";

export interface IGameSnapshot {
  gameId: string|null;
  votes?: Vote[];
}

export interface IEndGameResponse {
  ok: boolean;
  results: { userId: string; value: number }[];
  estimate: number;
}

export interface IOnVoteEvent {
  userId: string;
  value: number;
  username: string;
}
