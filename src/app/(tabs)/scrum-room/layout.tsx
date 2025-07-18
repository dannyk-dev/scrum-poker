import CreateRoom from '@/app/(tabs)/scrum-room/_components/create-room';
import RoomsSidebar from '@/app/(tabs)/scrum-room/_components/rooms-sidebar';
import RoomsSidebarSkeleton from '@/app/(tabs)/scrum-room/_components/rooms-sidebar-skeleton';
import { BorderBeam } from '@/components/magicui/border-beam';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner';
import { trpc } from '@/trpc/server'
import React, { Suspense, type PropsWithChildren } from 'react'

const RoomsLayout = ({children}: PropsWithChildren) => {
  void trpc.game.getRooms.prefetch();

  return (
    <div className="w-4/5 mx-auto min-h-screen flex items-center justify-center">
      <Card className='w-full  gap-y-3 z-10 shadow-2xl relative' style={{
        height: "75vh"
      }}>
      <CardHeader className='w-2/6 pr-0'>
        <CardTitle className=' font-semibold px-0 flex w-full items-center justify-between'>
          <span className='w-fit text-xl'>Scrum Room</span>
          <CreateRoom  />
        </CardTitle>

      </CardHeader>
      <CardContent className='h-full'>
        <div className="grid grid-cols-6 h-full w-full ">
          <div className="col-span-2 ">
            <Suspense fallback={<RoomsSidebarSkeleton />}>
              <RoomsSidebar />
            </Suspense>
          </div>
          <div className="col-span-4">
            {children}
          </div>
        </div>

      </CardContent>
      <BorderBeam  size={400} duration={15} colorFrom='rgba(36,163,190,1)' colorTo='rgba(15,2,2,1)' />
    </Card>
    </div>
  )
}

export default RoomsLayout
