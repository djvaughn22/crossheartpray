export type BibleReadingPlanDay = {
  week: number;
  daySlug: string;
  dayLabel: string;
  category: string;
  reading: string;
};

export type BibleReadingPlanWeek = {
  week: number;
  days: BibleReadingPlanDay[];
};

export const BIBLE_READING_PLAN_PDF_HREF = "/resources/52-week-bible-reading-plan.pdf";

export const BIBLE_READING_PLAN_SOURCE = "52 Week Bible Reading Plan";

export const BIBLE_READING_PLAN_SOURCE_NOTE =
  "Original PDF source is preserved for download. Progress is saved locally on this device.";


const BIBLE_READING_PLAN_BOOK_CODES: Record<string, string> = {
  Genesis: "GEN", Gen: "GEN",
  Exodus: "EXO", Exod: "EXO", Exo: "EXO", Ex: "EXO",
  Leviticus: "LEV", Lev: "LEV",
  Numbers: "NUM", Num: "NUM",
  Deuteronomy: "DEU", Deut: "DEU", Dt: "DEU",
  Joshua: "JOS", Josh: "JOS", Jos: "JOS",
  Judges: "JDG", Judg: "JDG", Jdg: "JDG",
  Ruth: "RUT",
  "1 Samuel": "1SA", "1 Sam": "1SA", "1Sam": "1SA",
  "2 Samuel": "2SA", "2 Sam": "2SA", "2Sam": "2SA",
  "1 Kings": "1KI", "1 Kgs": "1KI", "1 Ki": "1KI", "1Ki": "1KI",
  "2 Kings": "2KI", "2 Kgs": "2KI", "2 Ki": "2KI", "2Ki": "2KI",
  "1 Chronicles": "1CH", "1 Chr": "1CH", "1Chr": "1CH",
  "2 Chronicles": "2CH", "2 Chr": "2CH", "2Chr": "2CH",
  Ezra: "EZR", Nehemiah: "NEH", Neh: "NEH", Esther: "EST", Esth: "EST",
  Job: "JOB",
  Psalm: "PSA", Psalms: "PSA", Ps: "PSA", Psa: "PSA",
  Proverbs: "PRO", Prov: "PRO", Pr: "PRO",
  Ecclesiastes: "ECC", Eccl: "ECC", Eccles: "ECC",
  "Song of Solomon": "SNG", "Song of Songs": "SNG", Song: "SNG",
  Isaiah: "ISA", Isa: "ISA",
  Jeremiah: "JER", Jer: "JER",
  Lamentations: "LAM", Lam: "LAM",
  Ezekiel: "EZK", Ezek: "EZK", Ezk: "EZK",
  Daniel: "DAN", Dan: "DAN",
  Hosea: "HOS", Hos: "HOS",
  Joel: "JOL",
  Amos: "AMO",
  Obadiah: "OBA", Obad: "OBA",
  Jonah: "JON",
  Micah: "MIC", Mic: "MIC",
  Nahum: "NAM", Nah: "NAM",
  Habakkuk: "HAB", Hab: "HAB",
  Zephaniah: "ZEP", Zeph: "ZEP",
  Haggai: "HAG", Hag: "HAG",
  Zechariah: "ZEC", Zech: "ZEC",
  Malachi: "MAL", Mal: "MAL",
  Matthew: "MAT", Matt: "MAT", Mt: "MAT",
  Mark: "MRK", Mk: "MRK",
  Luke: "LUK", Lk: "LUK",
  John: "JHN", Jn: "JHN",
  Acts: "ACT",
  Romans: "ROM", Rom: "ROM",
  "1 Corinthians": "1CO", "1 Cor": "1CO", "1Cor": "1CO",
  "2 Corinthians": "2CO", "2 Cor": "2CO", "2Cor": "2CO",
  Galatians: "GAL", Gal: "GAL",
  Ephesians: "EPH", Eph: "EPH",
  Philippians: "PHP", Phil: "PHP", Php: "PHP",
  Colossians: "COL", Col: "COL",
  "1 Thessalonians": "1TH", "1 Thess": "1TH", "1 Thes": "1TH", "1Thess": "1TH", "1Thes": "1TH",
  "2 Thessalonians": "2TH", "2 Thess": "2TH", "2 Thes": "2TH", "2Thess": "2TH", "2Thes": "2TH",
  "1 Timothy": "1TI", "1 Tim": "1TI", "1Tim": "1TI",
  "2 Timothy": "2TI", "2 Tim": "2TI", "2Tim": "2TI",
  Titus: "TIT",
  Philemon: "PHM", Philem: "PHM",
  Hebrews: "HEB", Heb: "HEB",
  James: "JAS", Jas: "JAS",
  "1 Peter": "1PE", "1 Pet": "1PE", "1Pet": "1PE",
  "2 Peter": "2PE", "2 Pet": "2PE", "2Pet": "2PE",
  "1 John": "1JN", "1John": "1JN",
  "2 John": "2JN", "2John": "2JN",
  "3 John": "3JN", "3John": "3JN",
  Jude: "JUD",
  Revelation: "REV", Rev: "REV",
};

const BIBLE_READING_PLAN_BOOK_NAMES = Object.keys(BIBLE_READING_PLAN_BOOK_CODES).sort(
  (left, right) => right.length - left.length,
);

function bibleReadingPlanRange(reading: string) {
  const normalizedReading = reading.trim().replace(/\./g, "").replace(/\s+/g, " ");
  const bookName = BIBLE_READING_PLAN_BOOK_NAMES.find(
    (name) =>
      normalizedReading === name ||
      normalizedReading.startsWith(`${name} `),
  );

  if (!bookName) {
    return null;
  }

  const remaining = normalizedReading.slice(bookName.length).trim();
  const numbers = remaining.match(/\d+/g) ?? [];
  const startChapter = Number(numbers[0] ?? "1");
  // A reading with no chapter numbers ("Ruth", "Jude") covers the whole book.
  const endChapter = numbers.length
    ? Number(numbers[numbers.length - 1])
    : Number.MAX_SAFE_INTEGER;

  return {
    code: BIBLE_READING_PLAN_BOOK_CODES[bookName],
    startChapter,
    endChapter,
  };
}

type ParsedPlanDay = {
  day: BibleReadingPlanDay;
  code: string;
  startChapter: number;
  endChapter: number;
};

let parsedPlanDaysCache: ParsedPlanDay[] | null = null;

function parsedPlanDays(): ParsedPlanDay[] {
  if (!parsedPlanDaysCache) {
    parsedPlanDaysCache = [];
    for (const week of BIBLE_READING_PLAN_WEEKS) {
      for (const day of week.days) {
        const range = bibleReadingPlanRange(day.reading);
        if (range) {
          parsedPlanDaysCache.push({ day, ...range });
        }
      }
    }
  }
  return parsedPlanDaysCache;
}

export function bibleReadingPlanDayForReference(code: string, chapter: string | number) {
  const passageCode = code.trim().toUpperCase();
  const passageChapter = Number(chapter);

  if (!passageCode || !passageChapter) {
    return null;
  }

  for (const entry of parsedPlanDays()) {
    if (
      entry.code === passageCode &&
      passageChapter >= entry.startChapter &&
      passageChapter <= entry.endChapter
    ) {
      return entry.day;
    }
  }

  return null;
}

export function bibleReadingPlanDayHref(day: BibleReadingPlanDay) {
  return `/bible-reading-plan?week=${day.week}&day=${day.daySlug}#week-${day.week}-${day.daySlug}`;
}

export function bibleReadingPlanHrefForReference(code: string, chapter: string | number) {
  const day = bibleReadingPlanDayForReference(code, chapter);

  if (!day) {
    return "/bible-reading-plan";
  }

  return bibleReadingPlanDayHref(day);
}

export function bibleReadingPlanLabelForReference(code: string, chapter: string | number) {
  const day = bibleReadingPlanDayForReference(code, chapter);

  if (!day) {
    return "Reading Plan";
  }

  return `Lands in Week ${day.week} · ${day.dayLabel}`;
}

export const BIBLE_READING_PLAN_WEEKS: BibleReadingPlanWeek[] = [
  {
    "week": 1,
    "days": [
      {
        "week": 1,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Rom 1-2"
      },
      {
        "week": 1,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Gen 1-3"
      },
      {
        "week": 1,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Josh 1-5"
      },
      {
        "week": 1,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 1-2"
      },
      {
        "week": 1,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 1-2"
      },
      {
        "week": 1,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Isa 1-6"
      },
      {
        "week": 1,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Matt 1-2"
      }
    ]
  },
  {
    "week": 2,
    "days": [
      {
        "week": 2,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Rom 3-4"
      },
      {
        "week": 2,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Gen 4-7"
      },
      {
        "week": 2,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Josh 6-10"
      },
      {
        "week": 2,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 3-5"
      },
      {
        "week": 2,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 3-4"
      },
      {
        "week": 2,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Isa 7-11"
      },
      {
        "week": 2,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Matt 3-4"
      }
    ]
  },
  {
    "week": 3,
    "days": [
      {
        "week": 3,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Rom 5-6"
      },
      {
        "week": 3,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Gen 8-11"
      },
      {
        "week": 3,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Josh 11-15"
      },
      {
        "week": 3,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 6-8"
      },
      {
        "week": 3,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 5-6"
      },
      {
        "week": 3,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Isa 12-17"
      },
      {
        "week": 3,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Matt 5-7"
      }
    ]
  },
  {
    "week": 4,
    "days": [
      {
        "week": 4,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Rom 7-8"
      },
      {
        "week": 4,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Gen 12-15"
      },
      {
        "week": 4,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Josh 16-20"
      },
      {
        "week": 4,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 9-11"
      },
      {
        "week": 4,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 7-8"
      },
      {
        "week": 4,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Isa 18-22"
      },
      {
        "week": 4,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Matt 8-10"
      }
    ]
  },
  {
    "week": 5,
    "days": [
      {
        "week": 5,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Rom 9-10"
      },
      {
        "week": 5,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Gen 16-19"
      },
      {
        "week": 5,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Josh 21-24"
      },
      {
        "week": 5,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 12-14"
      },
      {
        "week": 5,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 9-10"
      },
      {
        "week": 5,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Isa 23-28"
      },
      {
        "week": 5,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Matt 11-13"
      }
    ]
  },
  {
    "week": 6,
    "days": [
      {
        "week": 6,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Rom 11-12"
      },
      {
        "week": 6,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Gen 20-23"
      },
      {
        "week": 6,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Judg 1-6"
      },
      {
        "week": 6,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 15-17"
      },
      {
        "week": 6,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 11-12"
      },
      {
        "week": 6,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Isa 29-33"
      },
      {
        "week": 6,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Matt 14-16"
      }
    ]
  },
  {
    "week": 7,
    "days": [
      {
        "week": 7,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Rom 13-14"
      },
      {
        "week": 7,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Gen 24-27"
      },
      {
        "week": 7,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Judg 7-11"
      },
      {
        "week": 7,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 18-20"
      },
      {
        "week": 7,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 13-14"
      },
      {
        "week": 7,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Isa 34-39"
      },
      {
        "week": 7,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Matt 17-19"
      }
    ]
  },
  {
    "week": 8,
    "days": [
      {
        "week": 8,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Rom 15-16"
      },
      {
        "week": 8,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Gen 28-31"
      },
      {
        "week": 8,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Judg 12-16"
      },
      {
        "week": 8,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 21-23"
      },
      {
        "week": 8,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 15-16"
      },
      {
        "week": 8,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Isa 40-44"
      },
      {
        "week": 8,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Matt 20-22"
      }
    ]
  },
  {
    "week": 9,
    "days": [
      {
        "week": 9,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "1Cor 1-2"
      },
      {
        "week": 9,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Gen 32-35"
      },
      {
        "week": 9,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Judg 17-21"
      },
      {
        "week": 9,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 24-26"
      },
      {
        "week": 9,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 17-18"
      },
      {
        "week": 9,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Isa 45-50"
      },
      {
        "week": 9,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Matt 23-25"
      }
    ]
  },
  {
    "week": 10,
    "days": [
      {
        "week": 10,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "1Cor 3-4"
      },
      {
        "week": 10,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Gen 36-39"
      },
      {
        "week": 10,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Ruth"
      },
      {
        "week": 10,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 27-29"
      },
      {
        "week": 10,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 19-20"
      },
      {
        "week": 10,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Isa 51-55"
      },
      {
        "week": 10,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Matt 26-28"
      }
    ]
  },
  {
    "week": 11,
    "days": [
      {
        "week": 11,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "1Cor 5-6"
      },
      {
        "week": 11,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Gen 40-43"
      },
      {
        "week": 11,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Sam 1-5"
      },
      {
        "week": 11,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 30-32"
      },
      {
        "week": 11,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 21-22"
      },
      {
        "week": 11,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Isa 56-61"
      },
      {
        "week": 11,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Mark 1-2"
      }
    ]
  },
  {
    "week": 12,
    "days": [
      {
        "week": 12,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "1Cor 7-8"
      },
      {
        "week": 12,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Gen 44-47"
      },
      {
        "week": 12,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Sam 6-10"
      },
      {
        "week": 12,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 33-35"
      },
      {
        "week": 12,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 23-24"
      },
      {
        "week": 12,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Isa 62-66"
      },
      {
        "week": 12,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Mark 3-4"
      }
    ]
  },
  {
    "week": 13,
    "days": [
      {
        "week": 13,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "1Cor 9-10"
      },
      {
        "week": 13,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Gen 48-50"
      },
      {
        "week": 13,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Sam 11-15"
      },
      {
        "week": 13,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 36-38"
      },
      {
        "week": 13,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 25-26"
      },
      {
        "week": 13,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Jer 1-6"
      },
      {
        "week": 13,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Mark 5-6"
      }
    ]
  },
  {
    "week": 14,
    "days": [
      {
        "week": 14,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "1Cor 11-12"
      },
      {
        "week": 14,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Ex 1-4"
      },
      {
        "week": 14,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Sam 16-20"
      },
      {
        "week": 14,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 39-41"
      },
      {
        "week": 14,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 27-28"
      },
      {
        "week": 14,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Jer 7-11"
      },
      {
        "week": 14,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Mark 7-8"
      }
    ]
  },
  {
    "week": 15,
    "days": [
      {
        "week": 15,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "1Cor 13-14"
      },
      {
        "week": 15,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Ex 5-8"
      },
      {
        "week": 15,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Sam 21-25"
      },
      {
        "week": 15,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 42-44"
      },
      {
        "week": 15,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 29-30"
      },
      {
        "week": 15,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Jer 12-16"
      },
      {
        "week": 15,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Mark 9-10"
      }
    ]
  },
  {
    "week": 16,
    "days": [
      {
        "week": 16,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "1Cor 15-16"
      },
      {
        "week": 16,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Ex 9-12"
      },
      {
        "week": 16,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Sam 26-31"
      },
      {
        "week": 16,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 45-47"
      },
      {
        "week": 16,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 31-32"
      },
      {
        "week": 16,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Jer 17-21"
      },
      {
        "week": 16,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Mark 11-12"
      }
    ]
  },
  {
    "week": 17,
    "days": [
      {
        "week": 17,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "2Cor 1-3"
      },
      {
        "week": 17,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Ex 13-16"
      },
      {
        "week": 17,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Sam 1-4"
      },
      {
        "week": 17,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 48-50"
      },
      {
        "week": 17,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 33-34"
      },
      {
        "week": 17,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Jer 22-26"
      },
      {
        "week": 17,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Mark 13-14"
      }
    ]
  },
  {
    "week": 18,
    "days": [
      {
        "week": 18,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "2Cor 4-5"
      },
      {
        "week": 18,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Ex 17-20"
      },
      {
        "week": 18,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Sam 5-9"
      },
      {
        "week": 18,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 51-53"
      },
      {
        "week": 18,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 35-36"
      },
      {
        "week": 18,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Jer 27-31"
      },
      {
        "week": 18,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Mark 15-16"
      }
    ]
  },
  {
    "week": 19,
    "days": [
      {
        "week": 19,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "2Cor 6-8"
      },
      {
        "week": 19,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Ex 21-24"
      },
      {
        "week": 19,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Sam 10-14"
      },
      {
        "week": 19,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 54-56"
      },
      {
        "week": 19,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 37-38"
      },
      {
        "week": 19,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Jer 32-36"
      },
      {
        "week": 19,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Luke 1-2"
      }
    ]
  },
  {
    "week": 20,
    "days": [
      {
        "week": 20,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "2Cor 9-10"
      },
      {
        "week": 20,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Ex 25-28"
      },
      {
        "week": 20,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Sam 15-19"
      },
      {
        "week": 20,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 57-59"
      },
      {
        "week": 20,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 39-40"
      },
      {
        "week": 20,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Jer 37-41"
      },
      {
        "week": 20,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Luke 3-4"
      }
    ]
  },
  {
    "week": 21,
    "days": [
      {
        "week": 21,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "2Cor 11-13"
      },
      {
        "week": 21,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Ex 29-32"
      },
      {
        "week": 21,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Sam 20-24"
      },
      {
        "week": 21,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 60-62"
      },
      {
        "week": 21,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Job 41-42"
      },
      {
        "week": 21,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Jer 42-46"
      },
      {
        "week": 21,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Luke 5-6"
      }
    ]
  },
  {
    "week": 22,
    "days": [
      {
        "week": 22,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Gal 1-3"
      },
      {
        "week": 22,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Ex 33-36"
      },
      {
        "week": 22,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Ki 1-4"
      },
      {
        "week": 22,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 63-65"
      },
      {
        "week": 22,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 1"
      },
      {
        "week": 22,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Jer 47-52"
      },
      {
        "week": 22,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Luke 7-8"
      }
    ]
  },
  {
    "week": 23,
    "days": [
      {
        "week": 23,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Gal 4-6"
      },
      {
        "week": 23,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Ex 37-40"
      },
      {
        "week": 23,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Ki 5-9"
      },
      {
        "week": 23,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 66-68"
      },
      {
        "week": 23,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 2-3"
      },
      {
        "week": 23,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Lamentations"
      },
      {
        "week": 23,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Luke 9-10"
      }
    ]
  },
  {
    "week": 24,
    "days": [
      {
        "week": 24,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Eph 1-3"
      },
      {
        "week": 24,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Lev 1-3"
      },
      {
        "week": 24,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Ki 10-13"
      },
      {
        "week": 24,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 69-71"
      },
      {
        "week": 24,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 4"
      },
      {
        "week": 24,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Ezek 1-6"
      },
      {
        "week": 24,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Luke 11-12"
      }
    ]
  },
  {
    "week": 25,
    "days": [
      {
        "week": 25,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Eph 4-6"
      },
      {
        "week": 25,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Lev 4-6"
      },
      {
        "week": 25,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Ki 14-18"
      },
      {
        "week": 25,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 72-74"
      },
      {
        "week": 25,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 5-6"
      },
      {
        "week": 25,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Ezek 7-12"
      },
      {
        "week": 25,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Luke 13-14"
      }
    ]
  },
  {
    "week": 26,
    "days": [
      {
        "week": 26,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Phil 1-2"
      },
      {
        "week": 26,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Lev 7-9"
      },
      {
        "week": 26,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Ki 19-22"
      },
      {
        "week": 26,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 75-77"
      },
      {
        "week": 26,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 7"
      },
      {
        "week": 26,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Ezek 13-18"
      },
      {
        "week": 26,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Luke 15-16"
      }
    ]
  },
  {
    "week": 27,
    "days": [
      {
        "week": 27,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Phil 3-4"
      },
      {
        "week": 27,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Lev 10-12"
      },
      {
        "week": 27,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Ki 1-5"
      },
      {
        "week": 27,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 78-80"
      },
      {
        "week": 27,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 8-9"
      },
      {
        "week": 27,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Ezek 19-24"
      },
      {
        "week": 27,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Luke 17-18"
      }
    ]
  },
  {
    "week": 28,
    "days": [
      {
        "week": 28,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Col 1-2"
      },
      {
        "week": 28,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Lev 13-15"
      },
      {
        "week": 28,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Ki 6-10"
      },
      {
        "week": 28,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 81-83"
      },
      {
        "week": 28,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 10"
      },
      {
        "week": 28,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Ezek 25-30"
      },
      {
        "week": 28,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Luke 19-20"
      }
    ]
  },
  {
    "week": 29,
    "days": [
      {
        "week": 29,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Col 3-4"
      },
      {
        "week": 29,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Lev 16-18"
      },
      {
        "week": 29,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Ki 11-15"
      },
      {
        "week": 29,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 84-86"
      },
      {
        "week": 29,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 11-12"
      },
      {
        "week": 29,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Ezek 31-36"
      },
      {
        "week": 29,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Luke 21-22"
      }
    ]
  },
  {
    "week": 30,
    "days": [
      {
        "week": 30,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "1Thes 1-3"
      },
      {
        "week": 30,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Lev 19-21"
      },
      {
        "week": 30,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Ki 16-20"
      },
      {
        "week": 30,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 87-89"
      },
      {
        "week": 30,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 13"
      },
      {
        "week": 30,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Ezek 37-42"
      },
      {
        "week": 30,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Luke 23-24"
      }
    ]
  },
  {
    "week": 31,
    "days": [
      {
        "week": 31,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "1Thes 4-5"
      },
      {
        "week": 31,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Lev 22-24"
      },
      {
        "week": 31,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Ki 21-25"
      },
      {
        "week": 31,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 90-92"
      },
      {
        "week": 31,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 14-15"
      },
      {
        "week": 31,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Ezek 43-48"
      },
      {
        "week": 31,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "John 1-2"
      }
    ]
  },
  {
    "week": 32,
    "days": [
      {
        "week": 32,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "2Thes"
      },
      {
        "week": 32,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Lev 25-27"
      },
      {
        "week": 32,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Chr 1-4"
      },
      {
        "week": 32,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 93-95"
      },
      {
        "week": 32,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 16"
      },
      {
        "week": 32,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Dan 1-6"
      },
      {
        "week": 32,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "John 3-4"
      }
    ]
  },
  {
    "week": 33,
    "days": [
      {
        "week": 33,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "1Tim 1-3"
      },
      {
        "week": 33,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Num 1-4"
      },
      {
        "week": 33,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Chr 5-9"
      },
      {
        "week": 33,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 96-98"
      },
      {
        "week": 33,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 17-18"
      },
      {
        "week": 33,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Dan 7-12"
      },
      {
        "week": 33,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "John 5-6"
      }
    ]
  },
  {
    "week": 34,
    "days": [
      {
        "week": 34,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "1Tim 4-6"
      },
      {
        "week": 34,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Num 5-8"
      },
      {
        "week": 34,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Chr 10-14"
      },
      {
        "week": 34,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 99-101"
      },
      {
        "week": 34,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 19"
      },
      {
        "week": 34,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Hosea 1-7"
      },
      {
        "week": 34,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "John 7-9"
      }
    ]
  },
  {
    "week": 35,
    "days": [
      {
        "week": 35,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "2Tim 1-2"
      },
      {
        "week": 35,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Num 9-12"
      },
      {
        "week": 35,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Chr 15-19"
      },
      {
        "week": 35,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 102-104"
      },
      {
        "week": 35,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 20-21"
      },
      {
        "week": 35,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Hosea 8-14"
      },
      {
        "week": 35,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "John 10-12"
      }
    ]
  },
  {
    "week": 36,
    "days": [
      {
        "week": 36,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "2Tim 3-4"
      },
      {
        "week": 36,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Num 13-16"
      },
      {
        "week": 36,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Chr 20-24"
      },
      {
        "week": 36,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 105-107"
      },
      {
        "week": 36,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 22"
      },
      {
        "week": 36,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Joel"
      },
      {
        "week": 36,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "John 13-15"
      }
    ]
  },
  {
    "week": 37,
    "days": [
      {
        "week": 37,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Titus"
      },
      {
        "week": 37,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Num 17-20"
      },
      {
        "week": 37,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "1Chr 25-29"
      },
      {
        "week": 37,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 108-110"
      },
      {
        "week": 37,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 23-24"
      },
      {
        "week": 37,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Amos 1-4"
      },
      {
        "week": 37,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "John 16-18"
      }
    ]
  },
  {
    "week": 38,
    "days": [
      {
        "week": 38,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Philemon"
      },
      {
        "week": 38,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Num 21-24"
      },
      {
        "week": 38,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Chr 1-5"
      },
      {
        "week": 38,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 111-113"
      },
      {
        "week": 38,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 25"
      },
      {
        "week": 38,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Amos 5-9"
      },
      {
        "week": 38,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "John 19-21"
      }
    ]
  },
  {
    "week": 39,
    "days": [
      {
        "week": 39,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Heb 1-4"
      },
      {
        "week": 39,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Num 25-28"
      },
      {
        "week": 39,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Chr 6-10"
      },
      {
        "week": 39,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 114-116"
      },
      {
        "week": 39,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 26-27"
      },
      {
        "week": 39,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Obadiah"
      },
      {
        "week": 39,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Acts 1-2"
      }
    ]
  },
  {
    "week": 40,
    "days": [
      {
        "week": 40,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Heb 5-7"
      },
      {
        "week": 40,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Num 29-32"
      },
      {
        "week": 40,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Chr 11-15"
      },
      {
        "week": 40,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 117-118"
      },
      {
        "week": 40,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 28"
      },
      {
        "week": 40,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Jonah"
      },
      {
        "week": 40,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Acts 3-4"
      }
    ]
  },
  {
    "week": 41,
    "days": [
      {
        "week": 41,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Heb 8-10"
      },
      {
        "week": 41,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Num 33-36"
      },
      {
        "week": 41,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Chr 16-20"
      },
      {
        "week": 41,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 119"
      },
      {
        "week": 41,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 29-30"
      },
      {
        "week": 41,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Micah"
      },
      {
        "week": 41,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Acts 5-6"
      }
    ]
  },
  {
    "week": 42,
    "days": [
      {
        "week": 42,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Heb 11-13"
      },
      {
        "week": 42,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Deut 1-3"
      },
      {
        "week": 42,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Chr 21-24"
      },
      {
        "week": 42,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 120-121"
      },
      {
        "week": 42,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Prov 31"
      },
      {
        "week": 42,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Nahum"
      },
      {
        "week": 42,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Acts 7-8"
      }
    ]
  },
  {
    "week": 43,
    "days": [
      {
        "week": 43,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "James 1-3"
      },
      {
        "week": 43,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Deut 4-6"
      },
      {
        "week": 43,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Chr 25-28"
      },
      {
        "week": 43,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 122-124"
      },
      {
        "week": 43,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Eccl 1-2"
      },
      {
        "week": 43,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Habakkuk"
      },
      {
        "week": 43,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Acts 9-10"
      }
    ]
  },
  {
    "week": 44,
    "days": [
      {
        "week": 44,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "James 4-5"
      },
      {
        "week": 44,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Deut 7-9"
      },
      {
        "week": 44,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Chr 29-32"
      },
      {
        "week": 44,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 125-127"
      },
      {
        "week": 44,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Eccl 3-4"
      },
      {
        "week": 44,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Zephaniah"
      },
      {
        "week": 44,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Acts 11-12"
      }
    ]
  },
  {
    "week": 45,
    "days": [
      {
        "week": 45,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "1Pet 1-3"
      },
      {
        "week": 45,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Deut 10-12"
      },
      {
        "week": 45,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "2Chr 33-36"
      },
      {
        "week": 45,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 128-130"
      },
      {
        "week": 45,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Eccl 5-6"
      },
      {
        "week": 45,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Haggai"
      },
      {
        "week": 45,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Acts 13-14"
      }
    ]
  },
  {
    "week": 46,
    "days": [
      {
        "week": 46,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "1Pet 4-5"
      },
      {
        "week": 46,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Deut 13-15"
      },
      {
        "week": 46,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Ezra 1-5"
      },
      {
        "week": 46,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 131-133"
      },
      {
        "week": 46,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Eccl 7-8"
      },
      {
        "week": 46,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Zechariah 1-7"
      },
      {
        "week": 46,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Acts 15-16"
      }
    ]
  },
  {
    "week": 47,
    "days": [
      {
        "week": 47,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "2Pet"
      },
      {
        "week": 47,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Deut 16-19"
      },
      {
        "week": 47,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Ezra 6-10"
      },
      {
        "week": 47,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 134-136"
      },
      {
        "week": 47,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Eccl 9-10"
      },
      {
        "week": 47,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Zechariah 8-14"
      },
      {
        "week": 47,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Acts 17-18"
      }
    ]
  },
  {
    "week": 48,
    "days": [
      {
        "week": 48,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "1John 1-3"
      },
      {
        "week": 48,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Deut 20-22"
      },
      {
        "week": 48,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Neh 1-4"
      },
      {
        "week": 48,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 137-139"
      },
      {
        "week": 48,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Eccl 11-12"
      },
      {
        "week": 48,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Malachi"
      },
      {
        "week": 48,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Acts 19-20"
      }
    ]
  },
  {
    "week": 49,
    "days": [
      {
        "week": 49,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "1John 4-5"
      },
      {
        "week": 49,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Deut 23-25"
      },
      {
        "week": 49,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Neh 5-9"
      },
      {
        "week": 49,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 140-142"
      },
      {
        "week": 49,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Song 1-2"
      },
      {
        "week": 49,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Rev 1-6"
      },
      {
        "week": 49,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Acts 21-22"
      }
    ]
  },
  {
    "week": 50,
    "days": [
      {
        "week": 50,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "2John"
      },
      {
        "week": 50,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Deut 26-28"
      },
      {
        "week": 50,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Neh 10-13"
      },
      {
        "week": 50,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 143-145"
      },
      {
        "week": 50,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Song 3-4"
      },
      {
        "week": 50,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Rev 7-11"
      },
      {
        "week": 50,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Acts 23-24"
      }
    ]
  },
  {
    "week": 51,
    "days": [
      {
        "week": 51,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "3John"
      },
      {
        "week": 51,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Deut 29-31"
      },
      {
        "week": 51,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Esther 1-5"
      },
      {
        "week": 51,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 146-148"
      },
      {
        "week": 51,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Song 5-6"
      },
      {
        "week": 51,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Rev 12-17"
      },
      {
        "week": 51,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Acts 25-26"
      }
    ]
  },
  {
    "week": 52,
    "days": [
      {
        "week": 52,
        "daySlug": "sunday",
        "dayLabel": "Sunday",
        "category": "Epistles",
        "reading": "Jude"
      },
      {
        "week": 52,
        "daySlug": "monday",
        "dayLabel": "Monday",
        "category": "The Law",
        "reading": "Deut 32-34"
      },
      {
        "week": 52,
        "daySlug": "tuesday",
        "dayLabel": "Tuesday",
        "category": "History",
        "reading": "Esther 6-10"
      },
      {
        "week": 52,
        "daySlug": "wednesday",
        "dayLabel": "Wednesday",
        "category": "Psalms",
        "reading": "Ps 149-150"
      },
      {
        "week": 52,
        "daySlug": "thursday",
        "dayLabel": "Thursday",
        "category": "Poetry",
        "reading": "Song 7-8"
      },
      {
        "week": 52,
        "daySlug": "friday",
        "dayLabel": "Friday",
        "category": "Prophecy",
        "reading": "Rev 18-22"
      },
      {
        "week": 52,
        "daySlug": "saturday",
        "dayLabel": "Saturday",
        "category": "Gospels",
        "reading": "Acts 27-28"
      }
    ]
  }
];
