import { CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from "@/trpc/server";
import React from "react";

type Props = {
  searchParams: Promise<{
    roomId: string;
  }>
}

const ScrumRoomGameRoom = async ({ searchParams }: Props) => {



  return (
    <>
      <CardHeader>
        <CardTitle>
          Game Room
          {(await searchParams).roomId}
        </CardTitle>
      </CardHeader>
    </>
  );
};

export default ScrumRoomGameRoom;
