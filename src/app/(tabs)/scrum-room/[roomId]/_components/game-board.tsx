
"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { api } from "@/trpc/react";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import GameControls from "./game-controls";
import VotePanel from "./vote-panel";
import ResultsCard from "./results-card";
import { useIsScrumMaster } from "@/hooks/use-is-scrumaster";
// import type { RoomEvent } from "@/server/api/routers/gameRouter";
import { type RoomEvent } from '../../../../../server/api/routers/game';


export default function GameBoard({ roomId }: { roomId: string }) {
  const { data: session } = useSession();
  const uid = session?.user.id ?? "";

  /* ---------- room / users (static) ---------------------------------- */
  const { data: room, isLoading: roomLoading } = api.room.getRoomById.useQuery({ roomId });
  const isScrumMaster = useIsScrumMaster(room, session);

  /* ---------- snapshot ---------------------------------------------- */
  const { data: snap, isLoading: snapLoading } = api.game.snapshot.useQuery({ roomId });

  /* ---------- local state ------------------------------------------- */
  const [gameId, setGameId] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [results, setResults] = useState<{ userId: string; value: number }[] | null>(null);

  // hydrate from snapshot once
  useEffect(() => {
    if (!snap) return;
    setGameId(snap.gameId);
    setVotes(Object.fromEntries(snap.votes.map((v) => [v.userId, v.value])));
    setResults(null);
  }, [snap]);

  /* ---------- one subscription -------------------------------------- */
  api.game.roomEvents.useSubscription({ roomId }, {
    onData: ({ data }: { data: RoomEvent }) => {
      switch (data.type) {
        case "start":
          setGameId(data.gameId);
          setVotes({});
          setResults(null);
          break;
        case "vote":
          setVotes((v) => ({ ...v, [data.userId]: data.value }));
          break;
        case "end":
          setGameId(null);
          setResults(data.results);
          setVotes({});
          break;
        case "restart":
          setGameId(data.gameId);
          setVotes({});
          setResults(null);
          break;
      }
    },
  });

  /* ---------- mutations --------------------------------------------- */
  const startGame = api.game.startGame.useMutation({ onError: (e) => toast.error(e.message) });
  const endGame   = api.game.endGame.useMutation({ onError: (e) => toast.error(e.message) });
  const restartGame = api.game.restartGame.useMutation({ onError: (e) => toast.error(e.message) });
  const castVote = api.game.castVote.useMutation({
    onMutate: ({ value }) => setVotes((v) => ({ ...v, [uid]: value })),
    onError  : (e) => toast.error(e.message),
  });

  const handleVote = useCallback((value: number) => {
    if (gameId) castVote.mutate({ roomId, gameId, value });
  }, [castVote, gameId, roomId]);

  const busy = startGame.isPending || endGame.isPending || restartGame.isPending;
  const hasVoted = useMemo(() => uid in votes, [uid, votes]);

  /* ---------- render ------------------------------------------------- */
  if (roomLoading || snapLoading) return <Spinner />;

  return (
    <div className="flex flex-col gap-6">
      {isScrumMaster && (
        <GameControls
          gameId={gameId}
          startGame={() => startGame.mutate({ roomId })}
          endGame={() => gameId && endGame.mutate({ roomId, gameId })}
          restartGame={() => gameId && restartGame.mutate({ roomId, gameId })}
          busy={busy}
        />
      )}

      {results ? (
        <ResultsCard results={results} users={room!.users} />
      ) : gameId ? (
        <VotePanel votes={votes} disabled={hasVoted} onVote={handleVote} />
      ) : (
        <p className="text-center text-muted-foreground">
          {isScrumMaster ? "Press “Start game” to begin." : "Waiting for Scrum‑Master to start…"}
        </p>
      )}
    </div>
  );
}
