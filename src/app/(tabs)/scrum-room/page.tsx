import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React, { Suspense } from "react";
import CreateRoom from "./_components/create-room";
import RoomsSidebarSkeleton from "./_components/rooms-sidebar-skeleton";
import RoomsSidebar from "./_components/rooms-sidebar";
import { trpc } from "@/trpc/server";
import { auth } from "@/server/auth";
import { Badge } from "@/components/ui/badge";

const ScrumRoomPage = async () => {
  void await trpc.player.getPlayerEmails.prefetch();
  const {rooms, organization} = await trpc.room.getRooms();

  return (
    <>
      <CardHeader className="w-full lg:w-2/6 md:pr-0">
        <CardTitle className="flex w-full items-center justify-between px-0 font-semibold">
          <div className="flex w-fit gap-x-4">
            <span className="text-xl">Scrum Room</span>
            <Badge variant='default' className="font-semibold">
              {organization?.name}
            </Badge>
          </div>
          <CreateRoom />
        </CardTitle>
      </CardHeader>
      <CardContent className="h-full w-full max-w-screen">
        <div className="flex flex-col-reverse gap-y-10 md:gap-y-0 my-6 md:my-0 md:grid h-full w-full md:grid-cols-6">
          <div className="col-span-2 w-full">
            <Suspense fallback={<RoomsSidebarSkeleton />}>
              <RoomsSidebar rooms={rooms} />
            </Suspense>
          </div>
          <div className="col-span-4">
            <div className="mx-auto flex h-full w-full flex-col items-center justify-center">
              <h1 className="text-lg lg:text-2xl leading-loose">
                Welcome to scrum poker.
              </h1>
              <p className="text-sm">Choose a room or create a new one</p>
            </div>
          </div>
        </div>
      </CardContent>
    </>
  );
};

export default ScrumRoomPage;
