"use client";

// AutoBreadcrumbs.tsx (v2)
// Build ShadCN breadcrumbs from the URL while respecting a fixed basePath
// — e.g. if every page lives under `/profile`, the component will treat
// `/profile` as the root and avoid duplicating it.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SlashIcon } from "lucide-react";
import { Fragment } from "react";

/**
 * Props
 * @param basePath   The fixed root path (default "/"). Examples: "/", "/profile".
 * @param items      Optional prettier labels per href (same shape as your sidebar).
 * @param rootLabel  Text for the root crumb (default "Home" if basePath=="/",
 *                   otherwise prettified last segment of basePath).
 */
export interface AutoBreadcrumbsProps {
  basePath?: string;
  rootLabel?: string;
  items?: { label: string; href: string }[];
}

export default function ProfileBreadCrumbs({
  basePath = "/",
  rootLabel,
  items = [],
}: AutoBreadcrumbsProps) {
  const pathname = usePathname();

  basePath = basePath === "/" ? "/" : basePath.replace(/\/$/, "");

  const relative = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname;

  const segments = relative.split("/").filter(Boolean);

  const crumbs: { label: string; href: string }[] = [];
  let running = basePath === "/" ? "" : basePath;

  segments.forEach((seg) => {
    running += `/${seg}`;
    const override = items.find((i) => i.href === running);
    crumbs.push({ href: running, label: override?.label ?? prettify(seg) });
  });

  // Decide root crumb label
  const computedRootLabel =
    rootLabel ??
    (basePath === "/" ? "Home" : prettify(basePath.split("/").pop()!));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Root crumb */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={basePath}>{computedRootLabel}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {crumbs.map((crumb) => (
          <Fragment key={crumb.href}>
            <BreadcrumbSeparator>
              <SlashIcon className="h-3 w-3" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={crumb.href}>{crumb.label}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
function prettify(segment: string) {
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------
// Usage example:
// ---------------------------------------------------------------------
/**
<AutoBreadcrumbs
  basePath="/profile"
  items={[
    { label: "Profile", href: "/profile" },
    { label: "Team", href: "/profile/team" },
    { label: "Settings", href: "/profile/settings" },
  ]}
/>
*/
