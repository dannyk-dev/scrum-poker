import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

const RoomsSidebarSkeleton = () => {
  return (
    <div className="bg-secondary ring-accent h-full w-full rounded-xl border-none p-4 shadow-md ring ring-offset-2">
      {Array.from({length: 7}, () => Math.random()).map((item) => (
        <div className="flex flex-col justify-between  min-w-[250px] mr-[8px] h-full " key={item}>
          <div className="flex flex-col gap-[4px] px-0 ">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default RoomsSidebarSkeleton;
