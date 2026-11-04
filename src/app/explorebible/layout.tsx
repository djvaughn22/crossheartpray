import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bible Bingo 7",
  description:
    "Deal seven Scripture cards — one for each lane of the week — with each card opening its chapter right here and linking back to the Bible Reading Plan.",
};

export default function ExploreBibleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
