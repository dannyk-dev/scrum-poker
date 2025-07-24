"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import type { Room } from "prisma/interfaces";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { IconArrowBackUp, IconCrown } from "@tabler/icons-react";
import InvitePlayers from "@/app/(tabs)/scrum-room/_components/invite-players";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  room?: Room | null;
  roomId: string;
  isLoading?: boolean;
  isScrumMaster?: boolean;
};

export function formatJoinTime(date: Date): string {
  const today = new Date();
  const isSameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  return isSameDay ? format(date, "HH:mm") : format(date, "d MMM yyyy HH:mm");
}

const GameSidebar = ({
  room,
  isScrumMaster = false,
  roomId,
  isLoading = false,
}: Props) => {
  const utils = api.useUtils();

  const { mutate, isPending } = api.room.leaveRoom.useMutation();
  const router = useRouter();

  const [lastUserJoined, setLastUserJoined] = useState<string | null>(null);

  api.player.onUserJoined.useSubscription(
    { roomId: roomId, lastEventId: lastUserJoined },
    {
      async onData(data) {
        if (data.data.kind === "join") {
          toast(`${data.data.name} has joined the room`);
        } else {
          toast(`${data.data.name} has left the room`);
        }

        setLastUserJoined(data.data.lastId);
        await utils.room.getRoomById.invalidate({ roomId: roomId });
      },
    },
  );

  const leaveRoom = useCallback(() => {
    if (isScrumMaster) {
      return router.replace("/scrum-room");
    }

    mutate(
      { roomId: roomId },
      {
        onSuccess() {
          toast("Leaving room...");
          router.replace("/scrum-room");
        },
      },
    );
  }, [isScrumMaster, mutate, roomId, router]);

  return (
    <Card className="h-full max-w-4/6 min-w-2/6">
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
            {room && <InvitePlayers room={room} hideText />}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-full">
        {isLoading ? (
          <div className="w-full flex items-center ">
            <Spinner className="mx-auto " />
          </div>
        ) : (
          <div className="flex flex-col gap-y-3">
            {room?.users && room.users.length > 0 ? (
              room?.users?.map((item) => (
                <div
                  key={item.userId}
                  className="bg-accent text-accent-foreground flex w-full items-center justify-between rounded-lg p-3"
                >
                  <div className="flex items-center gap-x-2">
                    <Badge variant="default"></Badge>
                    <span className="text-sm">{item.user!.name}</span>
                  </div>

                  <div className="flex items-center gap-x-2">
                    {item.role === "SCRUM_MASTER" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <IconCrown size={20} />
                        </TooltipTrigger>
                        <TooltipContent>Scrum Master</TooltipContent>
                      </Tooltip>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {formatJoinTime(new Date(item.joinedAt))}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p>No users found</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GameSidebar;
