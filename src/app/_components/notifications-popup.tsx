"use client";

import AcceptInvite from "@/app/_components/accept-invite";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { IconBellRinging, IconChecks, IconTrash } from "@tabler/icons-react";
import type { Notification } from "prisma/interfaces";
import React, { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

const NotificationsPopup = () => {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();

  const { data: notifications = [], isLoading } =
    api.player.getNotifications.useQuery();
  const { mutate, isPending: isPendingView } =
    api.player.viewNotification.useMutation();
  const { mutate: deleteNotification, isPending: isDeleting } =
    api.player.deleteNotification.useMutation();
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  const viewNotification = useCallback(
    (notification: Notification) => {
      if (notification.read) return;

      mutate(
        { notificationId: notification.id },
        {
          async onSuccess() {
            await utils.player.getNotifications.invalidate();
          },
        },
      );
    },
    [mutate, utils.player.getNotifications],
  );

  api.player.onNotification.useSubscription(
    {
      lastEventId,
    },
    {
      onError(err) {
        console.error(err);
      },
      onData(newNotif) {
        toast(newNotif.data.message, {
          onDismiss() {
            viewNotification(newNotif.data);
          },
          action: (
            <div className="ml-auto">
              <AcceptInvite
                inviteToken={newNotif.data.data!.token}
                inviteStatus={
                  newNotif.data.data as {
                    accepted: boolean;
                    acceptedAt: Date | null;
                  }
                }
              />
            </div>
          ),
        });
        setLastEventId(newNotif.id);

        utils.player.getNotifications.setData(undefined, (old) => {
          const list = old ?? [];
          const exists = list.some((n) => n.id === newNotif.data.id);
          if (exists) return list;
          return [newNotif.data, ...list];
        });
      },
    },
  );

  const handleDeleteNotification = useCallback(
    (notification: Notification) => {
      if (isPendingView) return;

      deleteNotification(
        { notificationId: notification.id },
        {
          async onSuccess() {
            await utils.player.getNotifications.invalidate();
          },
        },
      );
    },
    [deleteNotification, isPendingView, utils.player.getNotifications],
  );

  const unreadNotifications = useMemo(() => {
    if (notifications.length === 0) return 0;

    const unread = notifications.filter((notif) => notif.read === false);
    return unread.length;
  }, [notifications]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="relative cursor-pointer" asChild>
        <div className="">
          <IconBellRinging className="h-full w-full text-neutral-500 dark:text-neutral-300" />
          {unreadNotifications > 0 && (
            <Badge
              variant="default"
              className="absolute -top-5 -right-5 px-2 py-0"
            >
              {unreadNotifications}
            </Badge>
          )}
        </div>
      </DialogTrigger>
      <DialogContent className="max-h-[500px] min-w-full max-w-full md:min-w-[550px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex w-full items-center justify-between">
            My Notifications
            {unreadNotifications > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <IconChecks />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Mark all as read</TooltipContent>
              </Tooltip>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {isLoading ? (
            <Spinner />
          ) : notifications.length > 0 ? (
            notifications.map((notif) => (
              <Card
                key={notif.id}
                className={cn(!notif.read && "bg-secondary")}
                onMouseEnter={() => viewNotification(notif)}
              >
                <CardHeader>
                  <CardTitle className="flex w-full items-center justify-between">
                    {notif.message}
                  </CardTitle>
                  <CardDescription className="mt-2 flex flex-col gap-1">
                    <Badge variant="outline">{notif?.data!.roomName}</Badge>
                    <p>From: {notif?.data!.inviteBy}</p>
                  </CardDescription>
                </CardHeader>
                <CardFooter className="flex w-full items-center">
                  {notif.type === "Invitation" && (
                    <div className="flex items-center gap-x-2">
                      <AcceptInvite
                        inviteToken={notif!.data!.token}
                        onAccept={() => setOpen(false)}
                        inviteStatus={
                          notif.data as {
                            accepted: boolean;
                            acceptedAt: Date | null;
                          }
                        }
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteNotification(notif)}
                        isLoading={isDeleting}
                      >
                        <IconTrash />
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))
          ) : (
            <p>No notifications found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationsPopup;
