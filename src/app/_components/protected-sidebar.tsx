"use client";

import NotificationsPopup from "@/app/_components/notifications-popup";
import ThemeSwitcher from "@/app/_components/theme-switcher";
import { FloatingDock } from "@/components/ui/floating-dock";
import {
  IconCards,
  IconHome,
  IconLogin,
  IconReportAnalytics,
  IconUserCircle,
} from "@tabler/icons-react";
import React, { useMemo } from "react";

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
    href: "/scrum-room",
  },
  {
    title: "Sprint Analytics",
    icon: (
      <IconReportAnalytics className="h-full w-full text-neutral-500 dark:text-neutral-300" />
    ),
    href: "#",
  },
  {
    title: "Notifications",
    icon: (
      <NotificationsPopup />
    ),
    href: '#'
  },
  {
    title: "Theme",
    component: <ThemeSwitcher />,
  },
];

type Props = {
  isAuthorized?: boolean;
};

const ProtectedSidebar = ({ isAuthorized = false }: Props) => {
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
    <div className="fixed right-0 bottom-4 z-50 flex h-fit w-full items-end justify-end">
      <FloatingDock items={screens} />
    </div>
  );
};

export default ProtectedSidebar;
