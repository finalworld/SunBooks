export type BookFormat = "physical" | "ebook" | "audio";
export type Theme = "system" | "light" | "dark";
export type View = "home" | "library" | "settings";
export type ScanMode = "barcode" | "text";
export type ReadingStatus = "want_to_read" | "reading" | "read" | "dnf" | "dnf_for_now";

export type Book = {
  id: string;
  title: string;
  authors: string[];
  cover?: string;
  isbn?: string;
  year?: number;
  pages?: number;
  genres?: string[];
  languages?: string[];
  formats?: BookFormat[];
  favorite?: boolean;
  readingStatus?: ReadingStatus;
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
