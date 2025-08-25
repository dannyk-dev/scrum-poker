import InPageSidebar from '@/app/_components/in-page-sidebar'
import { profileLinks } from '@/lib/constants'
import React from 'react'


const ProfileSidebar = () => {
  return (
    <>
      <div className="hidden lg:block">
          <InPageSidebar
            basePath='/settings'
            items={profileLinks}
          />
      </div>
    </>
  )
}

export default ProfileSidebar
