"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type React from "react";

type Item = {
  label: string;
  href: string;
  disabled?: boolean;
  optionsMenu?: React.ReactNode;
  badge?: React.ReactNode;
};

export default function InPageSidebar({
  basePath,
  items,
}: {
  basePath: string;
  items: Item[];
}) {
  const pathname = usePathname();

  return (
    <div className="mr-[8px] flex h-full w-full lg:min-w-[250px] flex-col justify-between">
      <div className="flex flex-col gap-[4px] px-0">
        {items.map((item, index) => {
          const { label, href, disabled = false, optionsMenu, badge } = item;
          const fullHref = `${basePath}${href}`;
          const isActive =
            href === "/"
              ? pathname === basePath || pathname === `${basePath}/`
              : pathname === fullHref;
          return (
            <SidebarLink
              key={index}
              href={fullHref}
              label={label}
              isActive={isActive}
              isDisabled={disabled}
              optionsMenu={optionsMenu}
              badge={badge}
            />
          );
        })}
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  label,
  isActive,
  isDisabled,
  optionsMenu,
  badge,
}: {
  href: string;
  label: string;
  isActive: boolean;
  isDisabled: boolean;
  optionsMenu?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-x-0">
      <Link
        href={href}
        onClick={(e) => {
          if (isDisabled) {
            e.preventDefault();
            return;
          }
        }}
        className={cn(
          "dark:hover:bg-accent text-secondary-foreground hover:text-foreground w-full flex-1 rounded-md p-2 py-3 text-sm transition-colors hover:bg-neutral-200",
          isActive &&
            "bg-accent text-accent-foreground hover:text-foreground font-medium",
          isDisabled && "cursor-not-allowed text-gray-600 hover:text-gray-700",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2",
            badge && "justify-between px-2",
          )}
        >
          <div className="leading-none">{label}</div>
          {badge}
        </div>
      </Link>
      {optionsMenu}
    </div>
  );
}
