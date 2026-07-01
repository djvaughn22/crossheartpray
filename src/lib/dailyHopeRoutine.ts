import {
  LOCAL_BIBLE_VERSES,
  type LocalBibleVerse,
} from "./localBibleVerses";

export type DailyHopePrayerCard = {
  title: string;
  body: string;
};

export type DailyHopeReferenceItem = {
  id: string;
  label: string;
  refs: string[];
};

export type DailyHopePassageItem = {
  id: string;
  label: string;
  passages: LocalBibleVerse[];
  missingRefs: string[];
};

export type DailyHopeDay = {
  day: string;
  slug: string;
  items: DailyHopePassageItem[];
};

export const dailyHopeOpeningPrayers: DailyHopePrayerCard[] = [
  {
    title: "Sinner Prayer",
    body: `Father, I know that I have broken your laws and my sins have separated me from you. I am truly sorry, and now I want to turn away from my past sinful life toward you. Please forgive me, and help me avoid sinning again. I believe that your Son, Jesus Christ died for my sins, was resurrected from the dead, is alive, and hears my prayer. I invite Jesus to become the Lord of my life, to rule and reign in my heart from this day forward. Please send your Holy Spirit to help me obey You, and to do Your will for the rest of my life. In Jesus' name I pray, Amen.`,
  },
  {
    title: "Salvation Prayer",
    body: `God, I recognize that I have not lived my life for You up until now. I have been living for myself and that is wrong. I need You in my life. I want You in my life. I acknowledge the completed work of Your Son Jesus Christ in giving His life for me on the cross at Calvary, and I long to receive the forgiveness You have made freely available to me through this sacrifice. Come into my life now, Lord. Take up residence in my heart and be my King, my Lord, and my Savior. From this day forward, I will no longer be controlled by sin, or the desire to please myself, but I will follow You all the days of my life. Those days are in Your hands. I ask this in Jesus' precious and holy name. Amen.`,
  },
];

export const dailyHopeClosingPrayer: DailyHopePrayerCard = {
  title: "Live in the Moment Prayer",
  body: `Lord, help me to live in the moment; not looking back on some great victory or big mistake, nor looking ahead at something that may never happen. May I live this day to the fullest, and always keep a heavenly perspective. I pray I will not look back on this life with any regrets, knowing that I made the most of every opportunity. In Jesus name, Amen.`,
};

export const dailyHopeVerseGroups: {
  day: string;
  slug: string;
  items: DailyHopeReferenceItem[];
}[] = [
  {
    day: "Sunday",
    slug: "sunday",
    items: [
      {
        id: "sunday-romans-5-3-5",
        label: "Romans 5:3-5",
        refs: ["Romans 5:3", "Romans 5:4", "Romans 5:5"],
      },
      {
        id: "sunday-psalm-39-7",
        label: "Psalm 39:7",
        refs: ["Psalm 39:7"],
      },
    ],
  },
  {
    day: "Monday",
    slug: "monday",
    items: [
      {
        id: "monday-1-peter-3-15",
        label: "1 Peter 3:15",
        refs: ["1 Peter 3:15"],
      },
      {
        id: "monday-deuteronomy-31-6",
        label: "Deuteronomy 31:6",
        refs: ["Deuteronomy 31:6"],
      },
    ],
  },
  {
    day: "Tuesday",
    slug: "tuesday",
    items: [
      {
        id: "tuesday-1-peter-1-3",
        label: "1 Peter 1:3",
        refs: ["1 Peter 1:3"],
      },
      {
        id: "tuesday-romans-15-4",
        label: "Romans 15:4",
        refs: ["Romans 15:4"],
      },
    ],
  },
  {
    day: "Wednesday",
    slug: "wednesday",
    items: [
      {
        id: "wednesday-proverbs-23-18",
        label: "Proverbs 23:18",
        refs: ["Proverbs 23:18"],
      },
      {
        id: "wednesday-1-corinthians-13-13",
        label: "1 Corinthians 13:13",
        refs: ["1 Corinthians 13:13"],
      },
    ],
  },
  {
    day: "Thursday",
    slug: "thursday",
    items: [
      {
        id: "thursday-psalm-31-24",
        label: "Psalm 31:24",
        refs: ["Psalm 31:24"],
      },
      {
        id: "thursday-jeremiah-17-7",
        label: "Jeremiah 17:7",
        refs: ["Jeremiah 17:7"],
      },
      {
        id: "thursday-hebrews-11-1",
        label: "Hebrews 11:1",
        refs: ["Hebrews 11:1"],
      },
    ],
  },
  {
    day: "Friday",
    slug: "friday",
    items: [
      {
        id: "friday-mark-9-23",
        label: "Mark 9:23",
        refs: ["Mark 9:23"],
      },
      {
        id: "friday-romans-8-25",
        label: "Romans 8:25",
        refs: ["Romans 8:25"],
      },
      {
        id: "friday-isaiah-41-10",
        label: "Isaiah 41:10",
        refs: ["Isaiah 41:10"],
      },
    ],
  },
  {
    day: "Saturday",
    slug: "saturday",
    items: [
      {
        id: "saturday-romans-8-24-25",
        label: "Romans 8:24-25",
        refs: ["Romans 8:24", "Romans 8:25"],
      },
      {
        id: "saturday-proverbs-13-12",
        label: "Proverbs 13:12",
        refs: ["Proverbs 13:12"],
      },
    ],
  },
];

const versesByLabel = new Map(
  LOCAL_BIBLE_VERSES.map((verse) => [verse.label, verse]),
);

function lookupVerse(reference: string) {
  const directMatch = versesByLabel.get(reference);

  if (directMatch) {
    return directMatch;
  }

  const psalmsAlias = reference.replace(/^Psalm /, "Psalms ");
  return versesByLabel.get(psalmsAlias) ?? null;
}

export function getDailyHopeDays(): DailyHopeDay[] {
  return dailyHopeVerseGroups.map((group) => ({
    day: group.day,
    slug: group.slug,
    items: group.items.map((item) => {
      const passages = item.refs
        .map((reference) => lookupVerse(reference))
        .filter((verse): verse is LocalBibleVerse => Boolean(verse));

      const missingRefs = item.refs.filter((reference) => !lookupVerse(reference));

      return {
        id: item.id,
        label: item.label,
        passages,
        missingRefs,
      };
    }),
  }));
}

export function getDailyHopeMissingReferences() {
  return getDailyHopeDays().flatMap((day) =>
    day.items.flatMap((item) => item.missingRefs),
  );
}
