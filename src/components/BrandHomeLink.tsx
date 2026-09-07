"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

type BrandHomeLinkProps = Omit<ComponentProps<typeof Link>, "href" | "scroll">;

function shouldKeepNativeLinkBehavior(event: MouseEvent<HTMLAnchorElement>) {
  return event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

export default function BrandHomeLink({ children, onClick: onLinkClick, ...props }: BrandHomeLinkProps) {
  const pathname = usePathname() || "/";

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onLinkClick?.(event);
    if (event.defaultPrevented) return;
    if (pathname !== "/" || shouldKeepNativeLinkBehavior(event)) return;
    event.preventDefault();
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.history.replaceState(null, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior });
  };

  return <Link href="/" scroll onClick={onClick} {...props}>{children}</Link>;
}
