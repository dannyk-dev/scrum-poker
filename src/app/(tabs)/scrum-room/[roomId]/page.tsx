import { CardHeader } from "@/components/ui/card";
import { trpc } from "@/trpc/server";
import React from "react";

const ScrumRoom = async () => {
  const room = trpc.game.return(
    <>
      <CardHeader></CardHeader>
    </>,
  );
};

export default ScrumRoom;
