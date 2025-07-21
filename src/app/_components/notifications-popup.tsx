'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import PopoverForm from '@/components/ui/popover-form'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/trpc/react'
import { IconBellRinging } from '@tabler/icons-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

type Props = {}

const NotificationsPopup = (props: Props) => {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();
  const { data: notifications = [], isLoading } = api.game.getNotifications.useQuery();

  api.game.onNotification.useSubscription(undefined, {
    onError(err) {
      console.error(err);
    },
    onData(newNotif) {
      console.log('received notification')
      toast(newNotif.data.message, {
        action: (
          <Button size='sm' variant='outline'>
            View Invite
          </Button>
        )
      })
      utils.game.getNotifications.setData(undefined, (old) => {
        if (!old) return [newNotif.data.message];

        return [newNotif.data.message, ...old]
      })
    }
  })

  return (
    <PopoverForm
            showSuccess={false}
            title="Notifications"
            preferIcon
            icon={(
              <div className='relative'>
                <IconBellRinging className="h-full w-full text-neutral-500 dark:text-neutral-300" />
                <Badge variant='default'  className='absolute px-2 py-0 -top-5 -right-5'>{notifications.length}</Badge>
              </div>
            )}
            open={open}
            setOpen={setOpen}
            width="200px"
            popupClass='-top-28'
            height="175px"
            showCloseButton={true}
            openChild={
              <div className="p-2">
                {isLoading ? (
                  <Spinner />
                ) : (
                  notifications.length > 0 ? notifications.map((notif) => (
                    <p key={notif.id}>
                      {notif.message}
                    </p>
                  )) : (
                    <p>No data found</p>
                  )
                )}
              </div>
            } />
  )
}

export default NotificationsPopup
