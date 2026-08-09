export type BookFormat = "physical" | "ebook" | "audio";
export type Theme = "system" | "light" | "dark";
export type View = "home" | "library" | "settings";
export type ScanMode = "barcode" | "text";

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
  addedAt?: string;
};

export const formatLabels: Record<BookFormat, string> = {
  physical: "Fysisk bok",
  ebook: "E-bok",
  audio: "Ljudbok",
};
