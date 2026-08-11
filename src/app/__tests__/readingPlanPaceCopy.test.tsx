// @vitest-environment jsdom

// Regression guard, Aug 9 2026 (homepage copy simplified Aug 10 2026): the
// About page must accurately present BOTH Bible Reading Plan paces — 1 Year ·
// 52 Weeks and 2 Years · 104 Weeks. It may not claim only the 52-week plan
// exists (the pre-104-week copy this replaces did exactly that). The
// homepage hero card names both paces via its title ("1 or 2 Years") and
// intentionally no longer spells out the week counts there.

import { describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";

import WelcomePage from "../page";
import AboutPage from "../about/page";

afterEach(cleanup);

describe("homepage reading-plan card", () => {
  it("names both the 1-year and 2-year paces via the title", () => {
    render(<WelcomePage />);
    expect(screen.getAllByText(/1 or 2 Years/i).length).toBeGreaterThan(0);
  });

  it("never claims the plan is only 52 weeks", () => {
    render(<WelcomePage />);
    expect(screen.queryByText(/^52-week Bible Reading Plan$/i)).toBeNull();
  });
});

describe("about page reading-plan section", () => {
  it("names both the 1-year and 2-year paces", () => {
    render(<AboutPage />);

    expect(screen.getAllByText(/1 Year/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/52 Weeks/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2 Years/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/104 Weeks/i).length).toBeGreaterThan(0);
  });

  it("never claims to start with only the 52-week board", () => {
    render(<AboutPage />);
    expect(screen.queryByText(/Start here with the 52-week board/i)).toBeNull();
  });

  it("keeps the historical 52 Week Bible Reading Plan source attribution intact", () => {
    render(<AboutPage />);
    expect(screen.getByText(/52 Week Bible Reading Plan/i)).toBeTruthy();
  });
});
