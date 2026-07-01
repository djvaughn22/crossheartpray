import Link from "next/link";

export default function OpenMirrorBar({ project }: { project: string }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.07]">
      <Link
        href="https://openmirrorllc.com"
        className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-600 hover:text-slate-400 transition"
      >
        Open Mirror LLC
      </Link>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
        {project}
      </span>
    </div>
  );
}
