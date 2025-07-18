'use client'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
// import { Button } from '@/components/ui/stateful-button'
import { roomSchema, type TRoomSchema } from '@/lib/schemas/room.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import React from 'react'
import { useForm } from 'react-hook-form'

type Props = {
  onSubmit: (payload: TRoomSchema) => void;
  defaultValues?: TRoomSchema;
  isPending?: boolean;
  isSuccess?: boolean;
}

const ScrumRoomForm = ({onSubmit, isPending = false, isSuccess = false}: Props) => {
  const form = useForm<TRoomSchema>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: ''
    }
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Room Name</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Meeting Room" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button size="sm" className='w-full' isLoading={isPending} type="submit">Confirm</Button>
      </form>
    </Form>
  )
}

export default ScrumRoomForm
