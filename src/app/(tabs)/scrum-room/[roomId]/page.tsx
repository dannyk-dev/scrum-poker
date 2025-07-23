import GameBoard from '@/app/(tabs)/scrum-room/[roomId]/_components/game-board';
import GameControls from '@/app/(tabs)/scrum-room/[roomId]/_components/game-controls';
import GameSidebar from '@/app/(tabs)/scrum-room/[roomId]/_components/game-sidebar';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from "@/trpc/server";
import React from "react";

type Props = {
  params: Promise<{
    roomId: string;
  }>
}

const ScrumRoomGameRoom = async ({ params }: Props) => {
  const { roomId } = await params;

  return (
    <>
      <CardHeader>
        <CardTitle>
          Game Room
        </CardTitle>
      </CardHeader>
      <CardContent className=' py-4 h-full flex items-center'>
          <GameSidebar roomId={roomId} />

          <div className="flex flex-col justify-between h-full w-full">
            <GameBoard />
            <GameControls />
          </div>
      </CardContent>
    </>
  );
};

export default ScrumRoomGameRoom;
