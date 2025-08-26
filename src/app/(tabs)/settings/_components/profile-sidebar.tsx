import InPageSidebar from '@/app/_components/in-page-sidebar'
import { profileLinks } from '@/lib/constants'
import React from 'react'


const ProfileSidebar = () => {
  return (
    <>
      <div className="hidden lg:block lg:sticky top-0 left-0">
          <InPageSidebar
            basePath='/settings'
            items={profileLinks}
          />
      </div>
    </>
  )
}

export default ProfileSidebar
