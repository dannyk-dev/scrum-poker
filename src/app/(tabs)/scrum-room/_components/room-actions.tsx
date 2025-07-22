"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/trpc/react";
import {
  IconCircleMinus,
  IconDotsCircleHorizontal,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import type { Room } from "prisma/interfaces";
import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import UpdateRoom from "./update-room";
import InvitePlayers from "@/app/(tabs)/scrum-room/_components/invite-players";
import { useIsScrumMaster } from "@/hooks/use-is-scrumaster";
import { useSession } from "next-auth/react";

type Props = {
  room: Room;
};

const RoomActions = ({ room }: Props) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const isScrumMaster = useIsScrumMaster(room, session);

  const { mutate: deleteRoom, isPending: isDeletingRoom } =
    api.room.deleteRoom.useMutation();
  const { mutate: leaveRoom, isPending: isLeavingRoom } = api.room.leaveRoom.useMutation();

  const isPending = useMemo(() => {
    return isDeletingRoom || isLeavingRoom;
  }, [isDeletingRoom, isLeavingRoom]);

  const handleDelete = useCallback(() => {
    deleteRoom(
      {
        roomId: room.id,
      },
      {
        onSuccess() {
          router.refresh();
          toast.success("Deleted room");
          setOpen(false);
        },
        onError() {
          toast.error("Failed to delete user");
        },
      },
    );
  }, [deleteRoom, room.id, router]);

  const handleLeaveRoom = useCallback(() => {
    leaveRoom({
      roomId: room.id
    }, {
      onSuccess() {
        toast.info(`left room ${room.name}`)
        router.refresh();
      }
    });
  }, [])

  return (
    <Tooltip>
      <TooltipTrigger>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              isLoading={isPending}
            >
              <IconDotsCircleHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <UpdateRoom room={room} />
              <InvitePlayers room={room} isDropdown />
              {/* <DropdownMenuItem>
                <IconSend />
                Invite Players
              </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleLeaveRoom}>
                <IconCircleMinus />
                Leave Room
              </DropdownMenuItem>
              {isScrumMaster && (
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                <IconTrash />
                Delete (Permanent)
              </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipTrigger>
      <TooltipContent hideWhenDetached>Room Options</TooltipContent>
    </Tooltip>
  );
};

export default RoomActions;
