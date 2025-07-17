'use client'

import { FloatingDock } from '@/components/ui/floating-dock';
import { IconCards, IconHome, IconLogin, IconReportAnalytics, IconUserCircle } from '@tabler/icons-react';
import React, { useMemo } from 'react'


const tabLinks = [
    {
      title: "Home",
      icon: (
        <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/",
    },

    {
      title: "Scrum Poker",
      icon: (
        <IconCards className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
    },
    {
      title: "Sprint Analytics",
      icon: (
        <IconReportAnalytics className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: '#'
    },
  ];

type Props = {
  isAuthorized?: boolean;
}

const ProtectedSidebar =  ({ isAuthorized }: Props) => {
  const screens = useMemo(() => {
    if (isAuthorized) {
      return [
        ...tabLinks,
        {
          title: "Profile",
          icon: (
            <IconUserCircle className="h-full w-full text-neutral-500 dark:text-neutral-300" />
          ),
          href: "/profile",
        },
      ];
    } else {
      return [
        ...tabLinks,
        {
          title: "Login",
          icon: (
            <IconLogin className="h-full w-full text-neutral-500 dark:text-neutral-300" />
          ),
          href: "/api/auth/signin",
        },
      ];
    }
  }, [isAuthorized]);


  return (
    <div className="flex items-end justify-end  h-fit w-full fixed bottom-8 right-0 z-50">
      <FloatingDock items={screens} />
    </div>

  )
}

export default ProtectedSidebar
