import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import React from 'react'

const ProfilePage = () => {
  return (
    <div className='w-full px-4 flex flex-col gap-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>
            Sign out
          </CardTitle>
          <CardDescription className='w-full flex flex-col md:flex-row items-center justify-between'>
              <p>This will disconnect your jira account.</p>
            <div className="w-max">
              <Button variant='destructive' asChild>
                <Link href='/api/auth/signout'>
                  Sign out
                </Link>
              </Button>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

export default ProfilePage
