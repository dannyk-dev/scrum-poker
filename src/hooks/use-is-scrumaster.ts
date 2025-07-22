'use client'

import { Role } from "@prisma/client";
import type { Session } from "next-auth";
import type { Room } from "prisma/interfaces";

export const useIsScrumMaster = (room: Room, session: Session|null) => {
  if (!session) return false;
  if (room.users) {
    const myUser = room.users.find((usr) => usr.userId === session.user?.id);

    return myUser?.role === Role.SCRUM_MASTER;
  }
}
