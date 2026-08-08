// @vitest-environment jsdom

// Owner correction, 2026-08-08: the account UI must be the simplest possible
// beta door — email + the one shared password, immediate access. No
// register/sign-in distinction, no confirm-password field, no password-length
// copy, no activation-code field, no admin language, no price.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SyncCard from "../SyncCard";

let meResponse: { authenticated: boolean; account: unknown };
let fetchCalls: { url: string; init?: RequestInit }[] = [];

beforeEach(() => {
  meResponse = { authenticated: false, account: null };
  fetchCalls = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetchCalls.push({ url, init });

      if (url.endsWith("/api/sync/auth/me")) {
        return new Response(JSON.stringify(meResponse), { status: 200 });
      }

      if (url.endsWith("/api/sync/auth/beta")) {
        const body = JSON.parse(String(init?.body ?? "{}"));
        if (body.password === "beta-fixture-password-1") {
          return new Response(
            JSON.stringify({
              account: {
                id: "user-1",
                email: body.email,
                syncActive: true,
                entitlementKinds: ["beta"],
              },
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({ error: "That email or password is not valid." }),
          { status: 401 },
        );
      }

      if (url.endsWith("/api/sync/progress")) {
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }

      if (url.endsWith("/api/sync/auth/logout")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      return new Response(JSON.stringify({}), { status: 200 });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the signed-out card is the simplest possible door", () => {
  it("shows exactly Email, Password, and one submit button", async () => {
    render(<SyncCard />);
    await screen.findByLabelText("Email");

    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Save on any device" }),
    ).toBeTruthy();
  });

  it("has no confirm-password field", async () => {
    render(<SyncCard />);
    await screen.findByLabelText("Email");

    expect(screen.queryByLabelText(/confirm/i)).toBeNull();
    expect(screen.getAllByLabelText(/password/i)).toHaveLength(1);
  });

  it("carries no password-length rule, activation-code field, or admin language", async () => {
    render(<SyncCard />);
    await screen.findByLabelText("Email");

    expect(screen.queryByText(/12 characters/i)).toBeNull();
    expect(screen.queryByLabelText(/activation code/i)).toBeNull();
    expect(screen.queryByText(/activation/i)).toBeNull();
    expect(screen.queryByText(/admin/i)).toBeNull();
  });

  it("shows no price or billing copy", async () => {
    render(<SyncCard />);
    await screen.findByLabelText("Email");

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/\$\s?\d/);
    expect(text).not.toMatch(/\b(checkout|pricing|billing|premium)\b/i);
  });

  it("has no separate register/sign-in entry points", async () => {
    render(<SyncCard />);
    await screen.findByLabelText("Email");

    expect(screen.queryByRole("button", { name: "Set up sync" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Create account" })).toBeNull();
  });
});

describe("submitting the door", () => {
  it("posts to the beta endpoint with exactly email and password", async () => {
    const user = userEvent.setup();
    render(<SyncCard />);

    await user.type(await screen.findByLabelText("Email"), "owner@example.com");
    await user.type(screen.getByLabelText("Password"), "beta-fixture-password-1");
    await user.click(screen.getByRole("button", { name: "Save on any device" }));

    await waitFor(() =>
      expect(fetchCalls.some((c) => c.url.endsWith("/api/sync/auth/beta"))).toBe(
        true,
      ),
    );

    const call = fetchCalls.find((c) => c.url.endsWith("/api/sync/auth/beta"))!;
    const body = JSON.parse(String(call.init?.body));
    expect(Object.keys(body).sort()).toEqual(["email", "password"]);
    expect(body.email).toBe("owner@example.com");
    expect(body.password).toBe("beta-fixture-password-1");
  });

  it("shows the account as signed in and active after success", async () => {
    const user = userEvent.setup();
    render(<SyncCard />);

    await user.type(await screen.findByLabelText("Email"), "owner@example.com");
    await user.type(screen.getByLabelText("Password"), "beta-fixture-password-1");
    await user.click(screen.getByRole("button", { name: "Save on any device" }));

    await screen.findByText(/Signed in as/);
    expect(screen.getByText(/owner@example.com/)).toBeTruthy();
    expect(screen.getByText(/Save on any device is on for this account/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });

  it("shows a generic error and no account on a wrong password", async () => {
    const user = userEvent.setup();
    render(<SyncCard />);

    await user.type(await screen.findByLabelText("Email"), "owner@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-guess");
    await user.click(screen.getByRole("button", { name: "Save on any device" }));

    await screen.findByText("That email or password is not valid.");
    expect(screen.queryByText(/Signed in as/)).toBeNull();
    expect(screen.getByLabelText("Email")).toBeTruthy();
  });
});

describe("signing out", () => {
  it("returns the card to the email/password door", async () => {
    meResponse = {
      authenticated: true,
      account: {
        id: "user-1",
        email: "owner@example.com",
        syncActive: true,
        entitlementKinds: ["beta"],
      },
    };

    const user = userEvent.setup();
    render(<SyncCard />);

    await screen.findByText(/Signed in as/);
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await screen.findByLabelText("Email");
    expect(screen.queryByText(/Signed in as/)).toBeNull();
  });
});
