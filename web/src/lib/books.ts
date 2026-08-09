import type { Book } from "../types";

type OpenLibraryBook = {
  key?: string; title?: string; author_name?: string[]; cover_i?: number;
  isbn?: string[]; first_publish_year?: number; number_of_pages_median?: number;
  subject?: string[]; language?: string[];
};

export function normalizeBook(raw: OpenLibraryBook): Book {
  const isbn = raw.isbn?.[0];
  return {
    id: String(raw.key || isbn || `${raw.title}-${raw.author_name?.[0] || "okänd"}`).replace(/^\/works\//, ""),
    title: raw.title || "Okänd titel",
    authors: raw.author_name?.length ? raw.author_name : ["Okänd författare"],
    cover: raw.cover_i ? `https://covers.openlibrary.org/b/id/${raw.cover_i}-M.jpg` : undefined,
    isbn,
    year: raw.first_publish_year,
    pages: raw.number_of_pages_median,
    genres: raw.subject?.slice(0, 6) || [],
    languages: raw.language?.slice(0, 4) || [],
  };
}

export async function findBooks(term: string, page: number) {
  const fields = "key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median,subject,language";
  const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(term)}&page=${page}&limit=20&fields=${fields}`);
  if (!response.ok) throw new Error("Book search failed");
  const data = await response.json();
  return { books: (data.docs || []).map(normalizeBook), total: data.numFound || 0 } as { books: Book[]; total: number };
}
