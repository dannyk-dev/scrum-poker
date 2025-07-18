import RoomsSidebar from '@/app/(tabs)/scrum-room/_components/rooms-sidebar';
import { BorderBeam } from '@/components/magicui/border-beam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/trpc/server'
import React, { type PropsWithChildren } from 'react'

const RoomsLayout = ({children}: PropsWithChildren) => {
  void trpc.game.getRooms.prefetch();

  return (
    <div className="w-4/5 mx-auto min-h-screen flex items-center justify-center">
      <Card className='w-full h-[600px] z-10 shadow-2xl relative overflow-hidden'>
      <CardHeader>
        <CardTitle className='text-xl font-semibold px-2'>Scrum Room</CardTitle>
        <CardDescription className='px-2'>
          {/* <ProfileBreadCrumbs items={profileLinks} /> */}
        </CardDescription>
      </CardHeader>
      <CardContent className='h-full'>
        <div className="grid grid-cols-5 h-full w-full ">
          <div className="col-span-1 ">
            <RoomsSidebar />
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
