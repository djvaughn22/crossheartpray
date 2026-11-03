// The four invitations behind CrossHeartPray: Cross, Heart, and Pray are the
// name, and Share the Good News is the tagline. They describe the mission —
// they are not products, features, or navigation sections.
//
// Each quote is the Berean Standard Bible text word for word; a test checks
// every one against the site's local BSB dataset.

export type CrossHeartPrayInvitation = {
  icon: string;
  word: string;
  invitation: string;
  /** Plain explanation shown before the verse, only where one is needed. */
  note?: string;
  quote: string;
  /** Passage the quote comes from, e.g. "Matthew 11:28". */
  reference: string;
};

export const CROSS_HEART_PRAY_INVITATIONS: CrossHeartPrayInvitation[] = [
  {
    icon: "✝️",
    word: "Cross",
    invitation: "Come to Jesus…",
    quote: "Come to Me, all you who are weary and burdened, and I will give you rest.",
    reference: "Matthew 11:28",
  },
  {
    icon: "❤️",
    word: "Heart",
    invitation: "Receive God's Love…",
    quote:
      "For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.",
    reference: "John 3:16",
  },
  {
    icon: "🙏",
    word: "Pray",
    invitation: "Dear God…",
    quote:
      "Be anxious for nothing, but in everything, by prayer and petition, with thanksgiving, present your requests to God.",
    reference: "Philippians 4:6",
  },
  {
    icon: "🌍",
    word: "Share",
    invitation: "Share the Good News.",
    note: "The Good News is the gospel of Jesus Christ.",
    quote:
      "For what I received I passed on to you as of first importance: that Christ died for our sins according to the Scriptures, that He was buried, that He was raised on the third day according to the Scriptures",
    reference: "1 Corinthians 15:3–4",
  },
];
