import CreateRoom from "@/app/(tabs)/scrum-room/_components/create-room";
import RoomsSidebar from "@/app/(tabs)/scrum-room/_components/rooms-sidebar";
import RoomsSidebarSkeleton from "@/app/(tabs)/scrum-room/_components/rooms-sidebar-skeleton";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/trpc/server";
import React, { Suspense, type PropsWithChildren } from "react";

const RoomsLayout = ({ children }: PropsWithChildren) => {
  // void trpc.game.getRooms.prefetch();

  return (
    <div className="mx-auto mt-10 flex min-h-screen w-5/6 items-start justify-center ">
      <Card className="relative z-10 w-full gap-y-3 shadow-2xl md:h-[80vh] 2xl:h-[85vh]">
        {children}
        <BorderBeam
          size={400}
          duration={15}
          colorFrom="rgba(36,163,190,1)"
          colorTo="rgba(15,2,2,1)"
        />
      </Card>
    </div>
  );
};

export default RoomsLayout;
