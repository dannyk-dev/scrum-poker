import ProfileBreadCrumbs from '@/app/(tabs)/profile/_components/profile-breadcrumbs'
import ProfileSidebar from '@/app/(tabs)/profile/_components/profile-sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { profileLinks } from '@/lib/constants'
import React, { type PropsWithChildren } from 'react'

const ProfileLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="w-3/4 mx-auto min-h-screen flex items-center justify-center">
      <Card className='w-full min-h-[450px] max-h-[600px] z-10'>
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
