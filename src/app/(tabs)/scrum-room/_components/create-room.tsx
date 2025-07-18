'use client'

import ScrumRoomForm from '@/app/(tabs)/scrum-room/_components/scrum-room-form';
import PopoverForm from '@/components/ui/popover-form';
import type { TRoomSchema } from '@/lib/schemas/room.schema';
import { api } from '@/trpc/react'
import { IconPencil } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useState } from 'react'
import { toast } from 'sonner';

const CreateRoom =  () => {
  const [open, setOpen] = useState(false);
  const { mutate, isPending, isSuccess } =  api.game.createRoom.useMutation();
  const router = useRouter();

  const handleSubmit = useCallback((payload: TRoomSchema) => {
    mutate(payload, {
      onSuccess(){
        toast.success('Room Created');
        router.refresh();
        setOpen(false);
      },
      onError(error){
        toast.error('Failed to create room');
        console.log(error);
      }
    })
  }, [mutate, router])

  return (
    <PopoverForm showSuccess={false} title="New Room"
        preferIcon
        showTitleBeforeChild
        icon={<IconPencil className='w-5 h-5' />}
        open={open}
        setOpen={setOpen}
        width="350px"
        popupClass='top-16'
        height="200px"
        showCloseButton={true} openChild={<ScrumRoomForm onSubmit={handleSubmit} isPending={isPending} />} />

  )
}

export default CreateRoom
