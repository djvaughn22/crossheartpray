// Internal preview & approval screen for the Daily Bible Bingo Instagram
// system. Protected by SOCIAL_ADMIN_KEY: open /admin/social?key=YOUR_KEY.
// Without the right key (or if SOCIAL_ADMIN_KEY is unset) this page 404s.

import { notFound } from "next/navigation";
import AdminSocialPanel from "../../../components/AdminSocialPanel";
import {
  addDaysToDateKey,
  buildDailyBibleBingoPost,
  chicagoDateKey,
  DAILY_BIBLE_BINGO_TIMEZONE,
} from "../../../lib/dailyBibleBingo";
import {
  missingCredentials,
  readPublishConfig,
} from "../../../lib/instagramPublisher";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ key?: string | string[] }>;
};

function maskedAccountId(accountId: string) {
  if (!accountId) return "not configured";
  if (accountId.length <= 4) return "…" + accountId;
  return `…${accountId.slice(-4)}`;
}

export default async function AdminSocialPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const providedKey = Array.isArray(resolved.key) ? resolved.key[0] : resolved.key;
  const adminKey = process.env.SOCIAL_ADMIN_KEY?.trim();

  if (!adminKey || providedKey !== adminKey) {
    notFound();
  }

  const today = chicagoDateKey();
  const tomorrow = addDaysToDateKey(today, 1);
  const config = readPublishConfig();
  const missing = missingCredentials(config);

  const days = [
    { label: "Today", post: buildDailyBibleBingoPost(today) },
    { label: "Tomorrow", post: buildDailyBibleBingoPost(tomorrow) },
  ];

  return (
    <main className="chp-lively-dark-page min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-black tracking-tight text-white">
          Daily Bible Bingo — Instagram admin
        </h1>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm font-semibold leading-6 text-slate-300">
          <p>
            Destination account:{" "}
            <span className="text-white">{maskedAccountId(config.accountId)}</span>
          </p>
          <p>
            Credentials:{" "}
            {missing.length ? (
              <span className="text-yellow-200">
                missing {missing.join(", ")} — publishing unavailable
              </span>
            ) : (
              <span className="text-emerald-200">configured</span>
            )}
          </p>
          <p>
            Automatic publishing:{" "}
            {config.autopublishEnabled ? (
              <span className="text-emerald-200">ENABLED</span>
            ) : (
              <span className="text-yellow-200">
                PAUSED (set INSTAGRAM_AUTOPUBLISH_ENABLED=true in Vercel to enable)
              </span>
            )}
          </p>
          <p className="text-slate-400">
            Daily boundary: midnight {DAILY_BIBLE_BINGO_TIMEZONE}. Use “Check
            status” below to see publication state, Instagram media ID, and
            errors for a date.
          </p>
        </div>

        {days.map(({ label, post }) => (
          <section
            key={post.date}
            className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5"
          >
            <h2 className="text-lg font-black text-white">
              {label} — {post.fullDate}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Board: {post.references.join(" · ")}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Live page: <a className="text-emerald-200" href={post.pagePath}>{post.pagePath}</a>
              {" · "}
              <a className="text-emerald-200" href={post.boardPath}>exact board</a>
            </p>

            <AdminSocialPanel
              adminKey={adminKey}
              date={post.date}
              caption={post.caption}
              imagePath={post.imagePath}
              imageFileName={post.imageFileName}
            />
          </section>
        ))}
      </div>
    </main>
  );
}
