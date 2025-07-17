import InPageSidebar from '@/app/_components/in-page-sidebar'
import { profileLinks } from '@/lib/constants'
import React from 'react'


const ProfileSidebar = () => {
  return (
    <InPageSidebar
      basePath='/profile'
      items={profileLinks}
    />
  )
}

export default ProfileSidebar
