import { GameProvider } from "@/app/(tabs)/scrum-room/[roomId]/_components/game-provider";
import React, { type PropsWithChildren } from "react";


const RoomViewLayout = async ({ children }:  PropsWithChildren) => {

  return (
      <div className="h-full">{children}</div>
  );
};

export default RoomViewLayout;
