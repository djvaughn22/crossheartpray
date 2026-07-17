import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bible Bingo 7",
  description:
    "Deal seven Scripture cards — one for each lane of the week — with each card linked back to the Bible Reading Plan and the Bible app.",
};

export default function ExploreBibleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
