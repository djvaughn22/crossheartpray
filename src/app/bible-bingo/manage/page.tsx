// Manage Bible Bingo 7 emails. Static segment, so it wins over the
// /bible-bingo/[boardId] share route. Reached from the "Manage email
// settings" link in every Bible Bingo 7 email; never indexed.

import Link from "next/link";
import BibleBingoEmailManage from "../../../components/BibleBingoEmailManage";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";

export const metadata = {
  title: "Bible Bingo 7 Emails",
  description: "Manage your Bible Bingo 7 reading emails.",
  robots: {
    index: false,
    follow: false,
  },
};

type PageProps = {
  searchParams?: Promise<{ token?: string | string[]; action?: string | string[] }>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BibleBingoEmailManagePage({ searchParams }: PageProps) {
  const resolved = searchParams ? await searchParams : {};
  const token = firstValue(resolved.token) ?? null;
  const intent = firstValue(resolved.action) ?? null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <SiteHeader />

        <section className="py-12">
          <div className="mx-auto max-w-xl text-center">
            <p className="mb-6 flex items-center justify-center gap-8 text-5xl">
              <span>✝️</span>
              <span>❤️</span>
              <span>🙏</span>
            </p>
            <h1 className="font-serif text-4xl font-black tracking-tight text-white">
              Bible Bingo 7 Emails
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm font-semibold leading-6 text-slate-300">
              Change how often your seven readings arrive, pause, resume, or
              unsubscribe.
            </p>
          </div>

          <div className="mt-8">
            {token ? (
              <BibleBingoEmailManage token={token} intent={intent} />
            ) : (
              <div className="mx-auto max-w-lg rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 text-center">
                <p className="text-sm font-semibold leading-6 text-slate-300">
                  To manage your subscription, open the “Manage email settings”
                  link at the bottom of any of your Bible Bingo 7 emails. That
                  link is your secure key — no password needed.
                </p>
                <Link
                  href="/explorebible"
                  className="mt-5 inline-flex min-h-11 items-center rounded-full border border-emerald-200/25 bg-emerald-300/10 px-5 py-2 text-sm font-bold text-emerald-50 transition hover:bg-emerald-300/20"
                >
                  Open Bible Bingo 7
                </Link>
              </div>
            )}
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
