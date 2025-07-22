import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

const RoomsSidebarSkeleton = () => {
  return (
    <div className="bg-secondary ring-accent h-full w-full rounded-xl border-none p-4 shadow-md ring ring-offset-2">
      <div className="mr-[8px] flex h-full min-w-[250px] flex-col justify-between">
        {Array.from({ length: 7 }, () => Math.random()).map((item) => (
          <div className="flex flex-col gap-[4px] px-0" key={item}>
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoomsSidebarSkeleton;
