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
    <div className="flex flex-col justify-between  min-w-[250px] mr-[8px] h-full ">
      <div className="flex flex-col gap-[4px] px-0 ">
        {items.map((item, index) => {
          const { label, href, disabled = false, optionsMenu } = item;
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
  optionsMenu
}: {
  href: string;
  label: string;
  isActive: boolean;
  isDisabled: boolean;
  optionsMenu?: React.ReactNode;
}) {
  return (
    <div className="w-full flex items-center justify-between gap-x-10">
      <Link
        href={href}
        onClick={(e) => {
          if (isDisabled) {
            e.preventDefault();
            return;
          }
        }}
        className={cn(
          "p-2 flex-1 w-full  py-3 rounded-md hover:bg-neutral-200 dark:hover:bg-accent text-sm text-secondary-foreground hover:text-foreground transition-colors",
          isActive &&
            "bg-accent text-accent-foreground font-medium hover:text-foreground",
          isDisabled && "text-gray-600 cursor-not-allowed hover:text-gray-700"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="leading-none">{label}</div>
        </div>
      </Link>
      {optionsMenu}
    </div>
  );
}
