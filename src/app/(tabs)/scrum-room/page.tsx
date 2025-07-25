import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React, { Suspense } from "react";
import CreateRoom from "./_components/create-room";
import RoomsSidebarSkeleton from "./_components/rooms-sidebar-skeleton";
import RoomsSidebar from "./_components/rooms-sidebar";
import { trpc } from "@/trpc/server";

const ScrumRoomPage = async () => {
  void await trpc.player.getPlayerEmails.prefetch();
  const rooms = await trpc.room.getRooms();

  return (
    <>
      <CardHeader className="w-2/6 pr-0">
        <CardTitle className="flex w-full items-center justify-between px-0 font-semibold">
          <span className="w-fit text-xl">Scrum Room</span>
          <CreateRoom />
        </CardTitle>
      </CardHeader>
      <CardContent className="h-full w-full max-w-screen">
        <div className="grid h-full w-full grid-cols-6">
          <div className="col-span-2">
            <Suspense fallback={<RoomsSidebarSkeleton />}>
              <RoomsSidebar rooms={rooms} />
            </Suspense>
          </div>
          <div className="col-span-4">
            <div className="mx-auto flex h-full w-full flex-col items-center justify-center">
              <h1 className="text-2xl leading-loose">
                Welcome to scrum poker.
              </h1>
              <p>Choose a room or create a new one</p>
            </div>
          </div>
        </div>
      </CardContent>
    </>
  );
};

export default ScrumRoomPage;
