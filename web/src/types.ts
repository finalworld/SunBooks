export type BookFormat = "physical" | "ebook" | "audio";
export type Theme = "light" | "dark" | "horror" | "romance" | "fantasy" | "scifi" | "mystery" | "drama" | "historical" | "adventure";
export type Language = "sv" | "en";
export type View = "home" | "library" | "discover" | "stats" | "settings";
export type ScanMode = "barcode" | "text";
export type ReadingStatus = "want_to_read" | "reading" | "read" | "dnf" | "dnf_for_now";
export type ProgressMode = "pages" | "percent";

export type Shelf = {
  id: string;
  name: string;
  custom?: boolean;
  createdAt?: string;
};

export type BookCopy = {
  id: string;
  format: BookFormat;
  provider?: string;
  device?: string;
  note?: string;
};

export type ReadingSession = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status?: ReadingStatus;
  rating?: number | "bajs";
};

export type Book = {
  id: string;
  title: string;
  authors: string[];
  cover?: string;
  isbn?: string;
  asin?: string;
  year?: number;
  pages?: number;
  genres?: string[];
  description?: string;
  languages?: string[];
  formats?: BookFormat[];
  favorite?: boolean;
  owned?: boolean;
  readingStatus?: ReadingStatus;
  completedAt?: string;
  startedAt?: string;
  progressMode?: ProgressMode;
  progressValue?: number;
  rating?: number | "bajs";
  review?: string;
  reviewPublic?: boolean;
  reviewSpoiler?: boolean;
  seriesName?: string;
  seriesPosition?: number;
  copies?: BookCopy[];
  tags?: string[];
  sessions?: ReadingSession[];
  shelfIds?: string[];
  updatedAt?: string;
  addedAt?: string;
};

export const readingStatusLabels: Record<ReadingStatus, string> = {
  want_to_read: "Vill läsa",
  reading: "Läser",
  read: "Läst",
  dnf: "DNF",
  dnf_for_now: "DNF for now",
};

export const formatLabels: Record<BookFormat, string> = {
  physical: "Fysisk bok",
  ebook: "E-bok",
  audio: "Ljudbok",
};
