'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import ComboboxUsers from '@/components/ui/user-combobox'
import { invitePlayerSchema, type TInvitePlayerSchema } from '@/lib/schemas/players.schema'
import { api } from '@/trpc/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { IconSend } from '@tabler/icons-react'
import type { Room } from 'prisma/interfaces'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

type Props = {
  room: Room
}

const InvitePlayers = ({ room }: Props) => {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = api.player.invitePlayers.useMutation();

  const form = useForm<TInvitePlayerSchema>({
    resolver: zodResolver(invitePlayerSchema),
    defaultValues: {
      emails: []
    }
  });

  const onSubmit = (values: TInvitePlayerSchema) => {
    mutate({
      ...values,
      roomId: room.id
    }, {
      onSuccess() {
        toast('Invitations sent successfully!');
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <IconSend />
          Invite Players
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite players to room</DialogTitle>
        </DialogHeader>
        <Form {...form} >
          <form className='space-y-6 mt-4' onSubmit={form.handleSubmit(onSubmit)}>
            <FormField control={form.control} name='emails' render={({field}) => (
              <FormItem>
                <FormLabel>Player Emails</FormLabel>
                <FormControl>
                  <ComboboxUsers value={field.value} onValueChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />

            <Button className='w-full' type='submit' isLoading={isPending}>
              <IconSend />
              Invite All
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default InvitePlayers
