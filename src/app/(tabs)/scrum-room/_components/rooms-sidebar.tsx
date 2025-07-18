import InPageSidebar from "@/app/_components/in-page-sidebar";
import { Separator } from "@/components/ui/separator";
import { getBaseUrl } from "@/lib/utils";
import { trpc } from "@/trpc/server";
import React from "react";

const RoomsSidebar = async () => {
  const rooms = await trpc.game.getRooms();
  const basePath = `${getBaseUrl()}/scrum-room`;

  const sidebarLinks = rooms.map((item) => ({
    label: item.name,
    href: `${basePath}/${item.id}`,
  }));

  return (
    <div className="bg-accent ring-accent h-full w-full rounded-xl border-none p-4 shadow-md ring-2 ring-offset-2">
      {sidebarLinks.length > 0 ? (
        <InPageSidebar basePath={basePath} items={sidebarLinks} />
      ) : (
        <p className="text-foreground text-sm leading-loose font-semibold tracking-tighter">
          No rooms found create one...
        </p>
      )}
    </div>
  );
};

export default RoomsSidebar;
