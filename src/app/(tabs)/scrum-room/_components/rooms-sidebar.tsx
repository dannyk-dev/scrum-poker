import InPageSidebar from '@/app/_components/in-page-sidebar';
import { Separator } from '@/components/ui/separator';
import { getBaseUrl } from '@/lib/utils';
import { trpc } from '@/trpc/server'
import React from 'react'

const RoomsSidebar = async () => {
  const rooms = await trpc.game.getRooms();
  const basePath = `${getBaseUrl()}/scrum-room`

  const sidebarLinks = rooms.map((item) => ({
    label: item.name,
    href: `${basePath}/${item.id}`,
    disabled: item._count.games < 1
  }));

  return (
    <div className='w-full h-full bg-accent p-4 rounded-xl shadow-md shadow-gray-900 outline outline-secondary ring-2 ring-offset-2 ring-accent'>
      {(sidebarLinks.length > 0) ? (
        <InPageSidebar
      basePath={basePath}
      items={sidebarLinks}
    />
      ) : (
        <p className='text-sm text-foreground font-semibold tracking-tighter leading-loose'>
          No rooms found create one...
        </p>
      )}
    </div>
  )
}

export default RoomsSidebar
