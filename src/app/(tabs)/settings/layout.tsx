import ProfileBreadCrumbs from '@/app/(tabs)/settings/_components/profile-breadcrumbs'
import ProfileSidebar from '@/app/(tabs)/settings/_components/profile-sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { profileLinks } from '@/lib/constants'
import React, { type PropsWithChildren } from 'react'

const ProfileLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="w-full md:w-[90%] md:mx-auto min-h-screen flex items-center justify-center pb-14">
      <Card className='relative z-10 w-full max-w-screen gap-y-6 shadow-2xl md:h-[85vh] 2xl:h-[85vh] md:max-h-[85vh]'>
      <CardHeader>
        <CardTitle className='text-xl font-semibold px-2'>My Profile</CardTitle>
        <CardDescription className='px-2'>
          <ProfileBreadCrumbs items={profileLinks} />
        </CardDescription>
      </CardHeader>
      <CardContent className='overflow-y-auto'>
        <div className="flex gap-x-6 items-start ">
          <ProfileSidebar />
          <ScrollArea className='md:min-h-[80vh] flex-1' >
            {children}
          {/* <ScrollAreaS */}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}

export default ProfileLayout
