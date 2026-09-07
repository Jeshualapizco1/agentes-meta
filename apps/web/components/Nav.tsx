"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { NavMenu, type NavigationLink } from "./NavMenu";
import { AppShell } from "./AppShell";
import { navigationHref, type NavigationRole } from "@/lib/nav-context";
const NextNavigationLink: NavigationLink = ({ href = "/hoy", ...props }) => <Link href={href} {...props} />;
export function PrivateShell({ children, email, role }: { children: ReactNode; email: string; role: NavigationRole }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return <AppShell pathname={pathname} brandHref={navigationHref("/hoy", pathname, search)} email={email} role={role}
    navigation={<NavMenu pathname={pathname} search={search} role={role} Link={NextNavigationLink} />}>{children}</AppShell>;
}
