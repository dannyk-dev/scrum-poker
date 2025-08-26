"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ComboboxUsers from "@/components/ui/user-combobox";
import {
  invitePlayerSchema,
  type TInvitePlayerSchema,
} from "@/lib/schemas/players.schema";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconSend } from "@tabler/icons-react";
import type { Room } from "prisma/interfaces";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type Props = {
  room: Room;
  isDropdown?: boolean;
  hideText?: boolean;
};

const InvitePlayers = ({
  room,
  isDropdown = false,
  hideText = false,
}: Props) => {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = api.player.invitePlayers.useMutation();

  const form = useForm<TInvitePlayerSchema>({
    resolver: zodResolver(invitePlayerSchema),
    defaultValues: {
      emails: [],
    },
  });

  const onSubmit = (values: TInvitePlayerSchema) => {
    mutate(
      {
        ...values,
        roomId: room.id,
      },
      {
        onSuccess() {
          toast("Invitations sent successfully!");
          setOpen(false);
        },
      },
    );
  };

  return (
    <Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            {isDropdown ? (
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <IconSend />
                Invite Players
              </DropdownMenuItem>
            ) : (
              <Button size="sm" variant="secondary">
                <IconSend />
                {!hideText && 'Invite Players'}
              </Button>
            )}
          </DialogTrigger>
        </TooltipTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite players to room</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              className="mt-4 space-y-6"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="emails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Player Emails</FormLabel>
                    <FormControl>
                      <ComboboxUsers
                        value={field.value}
                        onValueChange={field.onChange}

                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button className="w-full" type="submit" isLoading={isPending}>
                <IconSend />
                Invite
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <TooltipContent>Invite Players</TooltipContent>
    </Tooltip>
  );
};

export default InvitePlayers;
