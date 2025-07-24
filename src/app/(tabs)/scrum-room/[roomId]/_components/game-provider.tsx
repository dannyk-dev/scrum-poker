/* --------------------------------------------------------------------------
   GameProvider – one source of truth for a single room
-------------------------------------------------------------------------- */
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

/* ---------- Types ------------------------------------------------------- */
type Room = RouterOutputs["room"]["getRoomById"];
type Game = RouterOutputs["game"]["startGame"];
type Vote = { userId: string; value: number };

interface State {
  room: Room | null;
  game: Game | null;
  votes: Record<string, number>;
}

type Action =
  | { type: "SET_ROOM"; payload: Room }
  | { type: "USER_JOINED"; payload: { userId: string; name: string } }
  | { type: "USER_LEFT"; payload: { userId: string } }
  | { type: "GAME_STARTED"; payload: Game }
  | { type: "GAME_ENDED"; payload: { results: Vote[] } }
  | { type: "GAME_RESTARTED" }
  | { type: "VOTE"; payload: Vote };

const initialState: State = { room: null, game: null, votes: {} };

/* ---------- Reducer ----------------------------------------------------- */
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_ROOM":
      return { ...state, room: action.payload };

    case "USER_JOINED":
      return state.room
        ? {
            ...state,
            room: {
              ...state.room,
              users: [
                ...state.room.users,
                {
                  userId: action.payload.userId,
                  user: { name: action.payload.name },
                } as any,
              ],
            },
          }
        : state;

    case "USER_LEFT":
      return state.room
        ? {
            ...state,
            room: {
              ...state.room,
              users: state.room.users.filter(
                (u) => u.userId !== action.payload.userId,
              ),
            },
          }
        : state;

    case "GAME_STARTED":
      return { ...state, game: action.payload, votes: {} };

    case "VOTE":
      return {
        ...state,
        votes: { ...state.votes, [action.payload.userId]: action.payload.value },
      };

    case "GAME_ENDED":
      return {
        ...state,
        game: null,
        votes: Object.fromEntries(
          action.payload.results.map((v) => [v.userId, v.value]),
        ),
      };

    case "GAME_RESTARTED":
      return { ...state, votes: {} };

    default:
      return state;
  }
}

/* ---------- Context API ------------------------------------------------- */
interface Ctx extends State {
  /** derived loading flags */
  isLoading: boolean;
  isFetching: boolean;
  isSaving: boolean;
  /** commands */
  leaveRoom: () => void;
  startGame: () => void;
  castVote: (value: number) => void;
  endGame: () => void;
  restartGame: () => void;
  /** helpers */
  isScrumMaster: (uid: string) => boolean;
  userVote: (uid: string) => number | undefined;
}

const GameContext = createContext<Ctx | null>(null);

/* ---------- Provider ---------------------------------------------------- */
export const GameProvider: React.FC<{
  roomId: string;
  children: React.ReactNode;
}> = ({ roomId, children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const utils = api.useUtils();
  const { data: session } = useSession();
  const uid = session?.user.id ?? "";

  /* ── Queries ----------------------------------------------------------- */
  const roomQ = api.room.getRoomById.useQuery(
    { roomId },
    {
      onSuccess: (room: Room) => dispatch({ type: "SET_ROOM", payload: room }),
    },
  );

  console.log(roomQ);

  /* ── Mutations --------------------------------------------------------- */
  const leaveRoomM = api.room.leaveRoom.useMutation({
    onSuccess: () => utils.room.getRoomById.invalidate({ roomId }),
  });

  const startGameM = api.game.startGame.useMutation({
    onSuccess: (game) => dispatch({ type: "GAME_STARTED", payload: game }),
  });

  const castVoteM = api.game.castVote.useMutation({
    onSuccess: (_resp, vars) =>
      dispatch({ type: "VOTE", payload: { userId: uid, value: vars.value } }),
  });

  const endGameM = api.game.endGame.useMutation({
    onSuccess: ({ results }) =>
      dispatch({ type: "GAME_ENDED", payload: { results } }),
  });

  const restartGameM = api.game.restartGame.useMutation({
    onSuccess: () => dispatch({ type: "GAME_RESTARTED" }),
  });

  const isSaving =
    leaveRoomM.isPending ||
    startGameM.isPending ||
    castVoteM.isPending ||
    endGameM.isPending ||
    restartGameM.isPending;

  /* ── Subscriptions ----------------------------------------------------- */
  api.player.onUserJoined.useSubscription({ roomId }, {
    onData({ data }) {
      const type = data.kind === "join" ? "USER_JOINED" : "USER_LEFT";
      toast(`${data.name} ${data.kind === "join" ? "joined" : "left"}`);
      dispatch({
        type,
        payload: { userId: data.userId, name: data.name } as any,
      });
    },
  });

  api.game.onGameStart.useSubscription({ roomId }, {
    onData({ data }) {
      dispatch({ type: "GAME_STARTED", payload: { id: data.gameId } as Game });
    },
  });

  api.game.onVote.useSubscription({ roomId }, {
    onData({ data }) {
      dispatch({ type: "VOTE", payload: data });
    },
  });

  api.game.onGameEnd.useSubscription({ roomId }, {
    onData({ data }) {
      dispatch({ type: "GAME_ENDED", payload: { results: data.results } });
    },
  });

  api.game.onGameRestart.useSubscription({ roomId }, {
    onData() {
      dispatch({ type: "GAME_RESTARTED" });
    },
  });

  /* ── Helpers ----------------------------------------------------------- */
  const isScrumMaster = useCallback(
    (u: string) =>
      !!state.room?.users.find(
        (ru) => ru.userId === u && ru.role === "SCRUM_MASTER",
      ),
    [state.room],
  );

  const userVote = useCallback(
    (u: string) => state.votes[u],
    [state.votes],
  );

  /* ── Commands ---------------------------------------------------------- */
  const leaveRoom = () => leaveRoomM.mutate({ roomId });
  const startGame = () => startGameM.mutate({ roomId });
  const castVote = (value: number) =>
    state.game && castVoteM.mutate({ roomId, gameId: state.game.id, value });
  const endGame = () =>
    state.game && endGameM.mutate({ roomId, gameId: state.game.id });
  const restartGame = () =>
    state.game && restartGameM.mutate({ roomId, gameId: state.game.id });

  /* ── Value ------------------------------------------------------------- */
  const ctx = useMemo<Ctx>(
    () => ({
      ...state,
      isLoading: roomQ.isLoading,
      isFetching: roomQ.isFetching,
      isSaving,
      leaveRoom,
      startGame,
      castVote,
      endGame,
      restartGame,
      isScrumMaster,
      userVote,
    }),
    [state, roomQ.isLoading, roomQ.isFetching, isSaving],
  );

  return <GameContext.Provider value={ctx}>{children}</GameContext.Provider>;
};

/* ---------- Hook -------------------------------------------------------- */
export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
};
