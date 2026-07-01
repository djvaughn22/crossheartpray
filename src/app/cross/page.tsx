import LazyBibleVerseLookup from "../../components/LazyBibleVerseLookup";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export default function CrossPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-6xl px-6 py-8">
        <SiteHeader />

        <div className="text-center">
          <div className="mb-8 text-7xl">✝️</div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-zinc-500">
            Step 1
          </p>
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
            Cross
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-xl font-semibold leading-9 text-emerald-100 sm:text-2xl sm:leading-10">
            Jesus, Son of God
          </p>
        </div>

        

<section className="mt-16 rounded-[2rem] border border-emerald-200/15 bg-emerald-300/10 px-8 py-12 text-center text-slate-100">
  <p className="text-sm font-bold uppercase tracking-[0.35em] text-emerald-100">
    The Cross
  </p>

  <div className="mx-auto mt-10 grid max-w-4xl gap-10 md:grid-cols-3">
    <div>
      <div className="text-4xl">✝️</div>
      <h2 className="mt-5 text-2xl font-bold">Jesus Died</h2>

    </div>

    <div>
      <div className="text-4xl">⬇️</div>
      <h2 className="mt-5 text-2xl font-bold">He Descended</h2>

    </div>

    <div>
      <div className="text-4xl">☀️</div>
      <h2 className="mt-5 text-2xl font-bold">He Rose Again</h2>

    </div>
  </div>
</section>



        <div className="mt-12 flex flex-col justify-center gap-4 sm:flex-row">
          <a
            href="/heart"
            className="rounded-full border border-white/15 bg-white/10 px-8 py-3 text-center font-semibold text-slate-100 transition hover:bg-white/15"
          >
            Next: Heart
          </a>
        </div>

        <LazyBibleVerseLookup
          initialReference="Galatians 2:20"
          suggestedReferences={["Romans 5:8", "1 Peter 2:24", "Isaiah 53:5"]}
        />
      </section>
  <SiteFooter />
</main>
  );
}