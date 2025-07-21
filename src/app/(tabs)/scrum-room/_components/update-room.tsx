"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import PopoverForm from "@/components/ui/popover-form";
import type { TRoomSchema } from "@/lib/schemas/room.schema";
import { api } from "@/trpc/react";
import { IconEditCircle } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import type { Room } from "prisma/interfaces";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import ScrumRoomForm from "./scrum-room-form";

type Props = {
  room: Room;
};

const UpdateRoom = ({ room }: Props) => {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = api.game.updateRoom.useMutation();
  const router = useRouter();

  const handleSubmit = useCallback(
    (payload: TRoomSchema) => {
      mutate(
        {
          ...payload,
          roomId: room.id,
        },
        {
          onSuccess() {
            toast.success("Room Created");
            router.refresh();
            setOpen(false);
          },
          onError(error) {
            toast.error("Failed to create room");
            console.log(error);
          },
        },
      );
    },
    [mutate, room.id, router],
  );

  return (
    <PopoverForm
      showSuccess={false}
      title="Edit Room"
      showTitleBeforeChild
      customTrigger={({ onClick }) => (
        <DropdownMenuItem
          onClick={(e) => e.stopPropagation()}
          onSelect={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="w-full"
        >
          <IconEditCircle />
          Edit
        </DropdownMenuItem>
      )}
      open={open}
      setOpen={setOpen}
      width="350px"
      isAction
      popupClass="top-8 "
      height="200px"
      showCloseButton={true}
      openChild={
        <ScrumRoomForm
          defaultValues={{ name: room.name }}
          onSubmit={handleSubmit}
          isPending={isPending}
        />
      }
    />
  );
};

export default UpdateRoom;
