"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  IconEdit,
  IconEditCircle,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import type { Room } from "prisma/interfaces";
import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import UpdateRoom from "./update-room";
import InvitePlayers from "@/app/(tabs)/scrum-room/_components/invite-players";

type Props = {
  room: Room;
};

const RoomActions = ({ room }: Props) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { mutate: deleteRoom, isPending: isDeletingRoom } =
    api.game.deleteRoom.useMutation();

  const isPending = useMemo(() => {
    return isDeletingRoom;
  }, [isDeletingRoom]);

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
              <InvitePlayers room={room} />
              {/* <DropdownMenuItem>
                <IconSend />
                Invite Players
              </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <IconCircleMinus />
                Leave Room
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                <IconTrash />
                Delete (Permanent)
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipTrigger>
      <TooltipContent hideWhenDetached>Room Options</TooltipContent>
    </Tooltip>
  );
};

export default RoomActions;
