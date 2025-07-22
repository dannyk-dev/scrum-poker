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
        <CardContent className='px-0 mt-6'>
          <GameSidebar roomId={roomId} />
        </CardContent>
      </CardHeader>
    </>
  );
};

export default ScrumRoomGameRoom;
