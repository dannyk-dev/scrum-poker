
import { BorderBeam } from "@/components/magicui/border-beam";
import { Card } from "@/components/ui/card";
import React, {  type PropsWithChildren } from "react";

const RoomsLayout = ({ children }: PropsWithChildren) => {

  return (
    <div className="mx-auto mt-10 flex min-h-screen w-5/6 items-start justify-center ">
      <Card className="relative z-10 w-full gap-y-3 shadow-2xl md:h-[80vh] 2xl:h-[85vh]">
        {children}
        <BorderBeam
          size={400}
          duration={15}
          colorFrom="rgba(36,163,190,1)"
          colorTo="rgba(15,2,2,1)"
        />
      </Card>
    </div>
  );
};

export default RoomsLayout;
