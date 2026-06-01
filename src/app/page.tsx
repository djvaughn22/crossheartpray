"use client";

import { useState } from "react";

export default function Home() {
  const [problem, setProblem] = useState("");
  const [showReflection, setShowReflection] = useState(false);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <div className="mb-6 text-6xl">✝️❤️🙏</div>

        <h1 className="text-5xl font-bold tracking-tight">
          CrossHeartPray
        </h1>

        <p className="mt-6 max-w-2xl text-xl text-zinc-300">
          Bring your burden to Christ.
          <br />
          Receive God's love.
          <br />
          Reflect through Scripture.
          <br />
          Pray and take the next faithful step.
        </p>

        <div className="mt-12 w-full rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-left shadow-2xl">
          <label className="text-sm font-semibold text-zinc-300">
            What is weighing on your heart today?
          </label>

          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            className="mt-4 min-h-36 w-full rounded-2xl border border-zinc-800 bg-black p-4 text-white outline-none"
            placeholder="I don't feel enough, I'm afraid, I'm angry, I can't forgive..."
          />

          <button
            onClick={() => setShowReflection(true)}
            className="mt-5 rounded-full bg-white px-8 py-3 font-semibold text-black"
          >
            Begin Reflection
          </button>
        </div>

        {showReflection && (
          <div className="mt-10 w-full space-y-6 text-left">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-2xl font-bold">✝️ Cross</h2>

              <p className="mt-4 text-zinc-300">
                Before trying to fix this yourself, bring it to Christ.
              </p>

              <p className="mt-4 text-zinc-400">
                Jesus laid down His life for you so your worth, peace, and
                identity do not depend on solving this problem perfectly.
              </p>

              <p className="mt-4 text-zinc-400">
                You are not loved because you are enough.
              </p>

              <p className="mt-4 text-zinc-400">
                You are loved because Christ is enough for you.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-2xl font-bold">❤️ Heart</h2>

              <p className="mt-4 text-zinc-300">
                God already sees what is happening inside your heart.
              </p>

              <p className="mt-4 text-zinc-400">
                This may involve fear, shame, anger, grief, loneliness, pride,
                hurt, or the desire to control the outcome.
              </p>

              <p className="mt-4 text-zinc-400">
                Be honest before God.
              </p>

              <p className="mt-4 text-zinc-400">
                You do not have to pretend to be stronger than you are.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-2xl font-bold">📖 Scripture</h2>

              <p className="mt-4 text-zinc-300">
                "Come to me, all who labor and are heavy laden, and I will give
                you rest."
              </p>

              <p className="mt-2 text-zinc-500">
                Matthew 11:28
              </p>

              <p className="mt-4 text-zinc-400">
                Jesus is not inviting only the strong, impressive, or put
                together.
              </p>

              <p className="mt-4 text-zinc-400">
                He invites the weary to come to Him.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-2xl font-bold">🙏 Prayer</h2>

              <p className="mt-4 whitespace-pre-line text-zinc-300">
                Father,

                {"\n\n"}

                Thank You for loving me through Jesus Christ.

                {"\n\n"}

                I confess that I am trying to carry what I cannot carry on my
                own.

                {"\n\n"}

                Help me bring this burden to You.

                {"\n\n"}

                Teach me to receive Your love, trust Your will, and take the
                next faithful step.

                {"\n\n"}

                Amen.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-2xl font-bold">
                👣 Next Faithful Step
              </h2>

              <p className="mt-4 text-zinc-300">
                Pause.
              </p>

              <p className="mt-2 text-zinc-300">
                Pray honestly.
              </p>

              <p className="mt-2 text-zinc-300">
                Name what you are feeling.
              </p>

              <p className="mt-2 text-zinc-300">
                Choose one small faithful action today instead of trying to
                solve everything at once.
              </p>
            </div>
          </div>
        )}

        <div className="mt-12 max-w-3xl text-center text-sm text-zinc-500">
          CrossHeartPray provides biblical reflection and prayer guidance. It is
          not pastoral counseling, medical advice, legal advice, or a substitute
          for your local church, trusted relationships, or professional care
          when needed.
        </div>
      </section>
    </main>
  );
}