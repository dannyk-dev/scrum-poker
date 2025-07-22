import RoomActions from "@/app/(tabs)/scrum-room/_components/room-actions";
import ScrumMasterBadge from "@/app/(tabs)/scrum-room/_components/scrum-master-badge";
import InPageSidebar from "@/app/_components/in-page-sidebar";
import { Badge } from "@/components/ui/badge";
import type { Room } from "prisma/interfaces";
import React from "react";

type Props = {
  rooms: (Room & {_count: { users: number; }})[]
}

const RoomsSidebar = async ({ rooms }: Props) => {
  const basePath = "/scrum-room";

  const sidebarLinks = rooms.map((item) => ({
    label: item.name,
    badge: (
      <div className="flex items-center gap-x-2">
        <ScrumMasterBadge room={item} />
        <Badge variant="outline">Users: {item._count.users}</Badge>
      </div>
    ),
    href: `${basePath}/${item.id}`,
    optionsMenu: <RoomActions room={item} />,
  }));

  return (
    <div className="bg-secondary ring-accent h-full w-full rounded-xl border-none p-4 shadow-md ring ring-offset-2">
      {sidebarLinks.length > 0 ? (
        <InPageSidebar basePath={""} items={sidebarLinks} />
      ) : (
        <p className="text-foreground text-sm leading-loose font-semibold tracking-tighter">
          No rooms found create one...
        </p>
      )}
    </div>
  );
};

export default RoomsSidebar;
