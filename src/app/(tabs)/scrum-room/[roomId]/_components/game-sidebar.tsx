"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import type { Room } from "prisma/interfaces";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { IconArrowBackUp } from "@tabler/icons-react";
import InvitePlayers from "@/app/(tabs)/scrum-room/_components/invite-players";
import { useIsScrumMaster } from "@/hooks/use-is-scrumaster";
import { useSession } from "next-auth/react";

type Props = {
  roomId: string;
};

export function formatJoinTime(date: Date): string {
  const today = new Date();
  const isSameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  return isSameDay
    ? format(date, "HH:mm")
    : format(date, "d MMM yyyy HH:mm");
}

const GameSidebar = ({ roomId }: Props) => {
  const utils = api.useUtils();
  const { data: session }  = useSession();


  const { data: room, isLoading } = api.room.getRoomById.useQuery({ roomId });
  const { mutate, isPending } = api.room.leaveRoom.useMutation();
  const router = useRouter();
  const isScrumMaster = useIsScrumMaster(room as Room, session);

  const [lastUserJoined, setLastUserJoined] = useState<string | null>(null);

  api.player.onUserJoined.useSubscription(
    { roomId: roomId, lastEventId: lastUserJoined },
    {
      async onData(data) {
        //
        if (data.data.kind === 'join') {
          toast(`${data.data.name} has joined the room`);
        } else {
          toast(`${data.data.name} has left the room`);
        }

        setLastUserJoined(data.data.lastId);
        await utils.room.getRoomById.invalidate({ roomId });
      },
    },
  );

  const leaveRoom = useCallback(() => {
    if (isScrumMaster) {
      return router.replace('/scrum-room');
    }

    mutate(
      { roomId },
      {
        onSuccess() {
          toast("Leaving room...");
          router.replace("/scrum-room");
        },
      },
    );
  },[isScrumMaster, mutate, roomId, router])

  return (
    <Card className="h-full min-w-1/4 max-w-2/6">
      <CardHeader>
        <CardTitle className="flex w-full items-center justify-between">
          <span>Players</span>
          <div className="flex items-center gap-x-2">
            <Button
              variant="destructive"
              size="sm"
              className="text-xs"
              isLoading={isPending}
              onClick={leaveRoom}
            >
              <IconArrowBackUp />
              Leave Room
            </Button>
            {room && (
              <InvitePlayers
                room={room}
                hideText
              />
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Spinner />
        ) : (
          <div className="flex flex-col gap-y-3">
            {room?.users.map((item) => (
              <div
                key={item.userId}
                className="bg-accent text-accent-foreground flex w-full items-center justify-between rounded-lg p-3"
              >
                <div className="flex items-center gap-x-2">
                  <Badge variant="default"></Badge>
                  <span className="text-sm" >{item.user.name}</span>
                </div>

                <div className="flex items-center gap-x-2">
                  {item.role === 'SCRUM_MASTER' && (
                    <Badge className="text-sm" variant="default">Scrum Master</Badge>
                  )}
                  <span className="text-muted-foreground text-xs">
                  {formatJoinTime(new Date(item.joinedAt))}
                </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GameSidebar;
