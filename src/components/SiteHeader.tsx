import Link from "next/link";
import FlowStepButtons from "./FlowStepButtons";

type SiteHeaderProps = {
  className?: string;
};

// Site links live in ChpProductNav (layout.tsx), and the ☀️/🌙 theme switch
// lives in the shared Open Mirror bar — this header keeps only the CHP brand
// row, the YouVersion Bible shortcut, and the Back/Next flow buttons.
export default function SiteHeader({ className = "mb-16" }: SiteHeaderProps) {
  return (
    <header className={className}>
      <nav className="grid grid-cols-3 items-center">
        <Link
          href="/"
          aria-label="Open CrossHeartPray"
          className="justify-self-start font-bold text-slate-100"
        >
          ✝️ ❤️ 🙏
        </Link>

        <a
          href="https://www.bible.com/verse-of-the-day"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open YouVersion Bible App"
          className="justify-self-center"
        >
          <img
            src="/brand/youversion-bible-app.png"
            alt="Holy Bible"
            className="h-10 w-10 rounded-lg"
          />
        </a>

        <span aria-hidden="true" className="justify-self-end" />
      </nav>

      <FlowStepButtons />
    </header>
  );
}
