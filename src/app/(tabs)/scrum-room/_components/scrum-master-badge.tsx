'use client'

import { Badge } from '@/components/ui/badge'
import { useIsScrumMaster } from '@/hooks/use-is-scrumaster'
import { useSession } from 'next-auth/react'
import type { Room } from 'prisma/interfaces'
import React from 'react'

type Props = {
  room: Room;
}

const ScrumMasterBadge = ({room}: Props) => {
  const { data: session } = useSession();
  const isScrumMaster = useIsScrumMaster(room, session);

  return (
    <>
      {isScrumMaster && (
        <Badge variant="default">
          Scrum Master
        </Badge>
      )}
    </>
  )
}

export default ScrumMasterBadge
