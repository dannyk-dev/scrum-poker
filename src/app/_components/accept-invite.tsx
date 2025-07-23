'use client';

import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import React from 'react'
import { toast } from 'sonner';
import type {  RoomUser } from 'prisma/interfaces';

type Props = {
  onAccept?: (data: RoomUser) => void;
  inviteToken: string;
  inviteStatus?: {
    accepted: boolean;
    acceptedAt: Date | null;
  } | null;
}

const AcceptInvite = ({ inviteToken, inviteStatus, onAccept }: Props) => {
  const { mutate, isPending } = api.player.acceptInvite.useMutation();
  const utils = api.useUtils();
  const router = useRouter();

  const handleAccept = () => {
    mutate({
      token: inviteToken
    }, {
      async onSuccess(data) {
        toast('Room joined successfully');
        await utils.player.getNotifications.invalidate();
        if (onAccept) onAccept(data.roomUser);
        router.replace(`scrum-room/${data.roomUser.roomId}`);

      },
      onError(error){
        toast(error.message);
      }
    })
  }

  return (
    <Button variant='outline' disabled={inviteStatus?.accepted} size='sm' className='text-xs' isLoading={isPending} onClick={handleAccept} >
      {inviteStatus?.accepted ? (
        'Invite Expired'
      ) : (
        'Accept Invite'
      )}
    </Button>
  )
}

export default AcceptInvite
