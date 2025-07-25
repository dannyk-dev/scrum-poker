"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsScrumMaster } from "@/hooks/use-is-scrumaster";
import { IconCrown } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import type { Room } from "prisma/interfaces";
import React from "react";

type Props = {
  room: Room;
};

const ScrumMasterBadge = ({ room }: Props) => {
  const { data: session } = useSession();
  const isScrumMaster = useIsScrumMaster(room, session);

  return (
    <>
      {isScrumMaster && (
        <Tooltip>
          <TooltipTrigger asChild>
            <IconCrown size={20} />
          </TooltipTrigger>
          <TooltipContent>Scrum Master</TooltipContent>
        </Tooltip>
      )}
    </>
  );
};

export default ScrumMasterBadge;
