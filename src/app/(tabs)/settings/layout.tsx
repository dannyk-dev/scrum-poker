import ProfileBreadCrumbs from '@/app/(tabs)/settings/_components/profile-breadcrumbs'
import ProfileSidebar from '@/app/(tabs)/settings/_components/profile-sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { profileLinks } from '@/lib/constants'
import React, { type PropsWithChildren } from 'react'

const ProfileLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="w-full md:w-3/4 md:mx-auto min-h-screen flex items-center justify-center">
      <Card className='relative z-10 w-full max-w-screen gap-y-6 shadow-2xl md:h-[80vh] 2xl:h-[85vh] md:max-h-[80vh]'>
      <CardHeader>
        <CardTitle className='text-xl font-semibold px-2'>My Profile</CardTitle>
        <CardDescription className='px-2'>
          <ProfileBreadCrumbs items={profileLinks} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-x-6 items-center">
          <ProfileSidebar />
          {children}
        </div>
      </CardContent>
    </Card>
    </div>
  )
}

export default ProfileLayout
