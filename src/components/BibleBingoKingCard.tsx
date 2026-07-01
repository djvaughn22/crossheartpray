type BibleBingoKingCardProps = {
  className?: string;
};

export default function BibleBingoKingCard({
  className = "h-16 w-12",
}: BibleBingoKingCardProps) {
  return (
    <span
      aria-label="King of Hearts Bible Bingo card"
      className={`relative inline-flex shrink-0 items-center justify-center rounded-[0.65rem] border border-rose-200 bg-white text-rose-700 shadow-xl shadow-black/25 ${className}`}
    >
      <span className="absolute left-1.5 top-1 text-[0.7rem] font-black leading-none">
        K
      </span>
      <span className="absolute left-1.5 top-3.5 text-[0.72rem] font-black leading-none">
        ♥
      </span>
      <span className="text-2xl font-black leading-none">♥</span>
      <span className="absolute bottom-1 right-1.5 rotate-180 text-[0.7rem] font-black leading-none">
        K
      </span>
      <span className="absolute bottom-3.5 right-1.5 rotate-180 text-[0.72rem] font-black leading-none">
        ♥
      </span>
    </span>
  );
}
