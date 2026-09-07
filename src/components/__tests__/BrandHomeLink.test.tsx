// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

let pathname = "/daily-hope";

vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));

import BrandHomeLink from "../BrandHomeLink";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  pathname = "/daily-hope";
});

describe("BrandHomeLink", () => {
  it("keeps a semantic Home link from an interior route", () => {
    render(<BrandHomeLink>Home</BrandHomeLink>);
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
  });

  it("scrolls to the top on Home and removes a fragment", () => {
    pathname = "/";
    window.history.replaceState(null, "", "/#section");
    window.scrollTo = vi.fn();
    window.matchMedia = vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia;
    render(<BrandHomeLink>Home</BrandHomeLink>);
    expect(fireEvent.click(screen.getByRole("link", { name: "Home" }))).toBe(false);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    expect(window.location.hash).toBe("");
  });

  it("uses instant scrolling for reduced motion and leaves modified clicks native", () => {
    pathname = "/";
    window.scrollTo = vi.fn();
    window.matchMedia = vi.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia;
    render(<BrandHomeLink>Home</BrandHomeLink>);
    const link = screen.getByRole("link", { name: "Home" });
    expect(fireEvent.click(link, { metaKey: true })).toBe(true);
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(fireEvent.click(link)).toBe(false);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
    link.focus();
    expect(document.activeElement).toBe(link);
  });
});
