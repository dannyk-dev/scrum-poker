import React, { type PropsWithChildren } from "react";


const RoomViewLayout = async ({ children }:  PropsWithChildren) => {

  return (
      <div className="h-full">{children}</div>
  );
};

export default RoomViewLayout;
