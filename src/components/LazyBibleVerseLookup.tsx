"use client";
import BibleVerseLookup from "./BibleVerseLookup";

type LazyBibleVerseLookupProps = {
  className?: string;
  initialReference?: string;
  suggestedReferences?: string[];
};

export default function LazyBibleVerseLookup(props: LazyBibleVerseLookupProps) {
  return (
    <section className="mt-20 border-t border-white/10 pt-14">
      <BibleVerseLookup {...props} />
    </section>
  );
}
