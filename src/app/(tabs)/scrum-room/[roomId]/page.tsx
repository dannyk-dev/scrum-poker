import GameBoard from "@/app/(tabs)/scrum-room/[roomId]/_components/game-board";

import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";

type Props = {
  params: Promise<{
    roomId: string;
  }>;
};

const ScrumRoomGameRoom = async ({ params }: Props) => {
  const { roomId } = await params;

  return (
    <>
      <CardHeader>
        <CardTitle>Game Room</CardTitle>
      </CardHeader>
      <CardContent className="flex h-full w-full items-center space-x-4 py-4">
        <GameBoard roomId={roomId} />
      </CardContent>
    </>
  );
};

export default ScrumRoomGameRoom;
