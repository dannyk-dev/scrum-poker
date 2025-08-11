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
import GameSidebar from "@/app/(tabs)/scrum-room/[roomId]/_components/game-sidebar";
import type { IOnVoteEvent } from "@/lib/types/game.types";
import type { RoomEvent } from "@/lib/types/events.types";

export default function GameBoard({ roomId }: { roomId: string }) {
  const { data: session } = useSession();
  const uid = session!.user.id;

  const { data: room, isLoading: roomLoading } = api.room.getRoomById.useQuery({
    roomId,
  });
  const isScrumMaster = useIsScrumMaster(room!, session);

  const { data: snap, isLoading: snapLoading } = api.game.snapshot.useQuery({
    roomId,
  });

  const [gameId, setGameId] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [results, setResults] = useState<IOnVoteEvent[] | null>(null);
  const [estimate, setEstimate] = useState<number|null>(null);

  useEffect(() => {
    if (!snap?.votes) return;

    setGameId(snap.gameId);
    setVotes(Object.fromEntries(snap.votes.map((v) => [v.userId, v.value])));
    setResults(null);
  }, [snap]);

  api.game.roomEvents.useSubscription(
    { roomId },
    {
      onData: ({ data }: { data: RoomEvent }) => {
        switch (data.type) {
          case "start":
            toast.success('Game started!')
            setGameId(data.gameId);
            setVotes({});
            setResults(null);
            setEstimate(null);
            break;
          case "vote":
            const voteEvent: IOnVoteEvent = data;
            if (voteEvent.userId !== uid) {
              toast.info(`${voteEvent.username} has submitted a vote`)
            }



            setVotes((v) => ({ ...v, [voteEvent.userId]: voteEvent.value }));
            break;
          case "end":
            toast.success('Game ended!')
            setGameId(null);
            setResults(data.results as IOnVoteEvent[]);
            setEstimate(data.estimate);
            setVotes({});
            break;
          case "restart":
            setGameId(data.gameId);
            setVotes({});
            setResults(null);
            setEstimate(null);
            break;
        }
      },
    },
  );

  const startGame = api.game.startGame.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const endGame = api.game.endGame.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const restartGame = api.game.restartGame.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const castVote = api.game.castVote.useMutation({
    onMutate: ({ value }) => setVotes((v) => ({ ...v, [uid]: value })),
    onError: (e) => toast.error(e.message),
  });

  const handleVote = useCallback(
    (value: number) => {
      if (gameId) castVote.mutate({ roomId, gameId, value });
    },
    [castVote, gameId, roomId],
  );

  const busy =
    startGame.isPending || endGame.isPending || restartGame.isPending;
  const hasVoted = useMemo(() => uid in votes, [uid, votes]);

  if (roomLoading || snapLoading) return <Spinner />;

  return (
    <div className="flex flex-col-reverse gap-y-10 md:gap-y-0 w-full h-full md:gap-x-4 max-w-screen md:flex-row ">
      <GameSidebar room={room} roomId={roomId} isLoading={roomLoading} isScrumMaster={isScrumMaster} votes={votes} />
      <div className="flex mt-4 md:mt-0 h-full w-full flex-col justify-between">
        <div className="flex flex-col gap-6 w-full">
          {isScrumMaster && (
            <GameControls
              gameId={gameId}
              startGame={() => startGame.mutate({ roomId })}
              endGame={() => gameId && endGame.mutate({ roomId, gameId })}
              restartGame={() =>
                gameId && restartGame.mutate({ roomId, gameId })
              }
              busy={busy}
            />
          )}

          {results ? (
            <ResultsCard results={results} users={room!.users} estimate={estimate} />
          ) : gameId && !isScrumMaster ? (
            <VotePanel votes={votes} disabled={hasVoted} onVote={handleVote} userId={uid} />
          ) : (
            <p className="text-muted-foreground text-center mt-4 md:mt-0">
              {isScrumMaster && !gameId && (
                "Press “Start game” to begin."
              )}
              {!isScrumMaster && "Waiting for Scrum‑Master to start…"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
