'use client';

import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import React from 'react'
import { toast } from 'sonner';

type Props = {
  inviteToken: string;
}

const AcceptInvite = ({ inviteToken }: Props) => {
  const { mutate, isPending } = api.player.acceptInvite.useMutation();
  const router = useRouter();

  const handleAccept = () => {

    mutate({
      token: inviteToken
    }, {
      onSuccess() {
        toast('Room joined successfully');
        router.refresh();
      },
      onError(){
        toast('Failed to join room.')
      }
    })
  }

  return (
    <Button variant='outline' size='sm' className='text-xs' isLoading={isPending} onClick={handleAccept} >Accept Invite</Button>
  )
}

export default AcceptInvite
