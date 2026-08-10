import type { Book } from "../types";

type OpenLibraryBook = {
  key?: string; title?: string; author_name?: string[]; cover_i?: number;
  isbn?: string[]; first_publish_year?: number; number_of_pages_median?: number;
  subject?: string[]; language?: string[]; series?: string[];
};

export function parseAmazonBookLink(value: string): { asin: string; searchTerm: string } | null {
  let url: URL;
  try { url = new URL(value.trim()); } catch { return null; }
  if (!/(^|\.)(amazon\.[a-z.]+|amzn\.(to|eu))$/i.test(url.hostname)) return null;

  const asin = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i)?.[1]
    || url.searchParams.get("asin")?.match(/^[A-Z0-9]{10}$/i)?.[0];
  if (!asin) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  const marker = parts.findIndex((part, index) => part.toLowerCase() === "dp" || (part.toLowerCase() === "gp" && parts[index + 1]?.toLowerCase() === "product"));
  const slug = marker > 0 ? parts[marker - 1] : "";
  const title = decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\b(?:kindle|ebook|paperback|hardcover|audible|edition)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { asin: asin.toUpperCase(), searchTerm: title.length >= 3 ? title : asin.toUpperCase() };
}

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
    seriesName: raw.series?.[0],
  };
}

export async function findBooks(term: string, page: number) {
  const amazon = parseAmazonBookLink(term);
  const searchTerm = amazon?.searchTerm || term;
  const fields = "key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median,subject,language,series";
  if (amazon && page === 1) {
    const words = searchTerm.split(/\s+/);
    const bookNumberIndex = words.findIndex((word, index) => /^book$/i.test(word) && /^\d+$/i.test(words[index + 1] || ""));
    const titleWords = bookNumberIndex > 0 ? words.slice(0, bookNumberIndex) : words;
    const candidates = Array.from({ length: titleWords.length }, (_, index) => titleWords.slice(0, titleWords.length - index).join(" "));
    const normalizeTitle = (value: string) => value.toLocaleLowerCase().replace(/^(?:the|a|an)\s+/, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

    for (const candidate of candidates) {
      if (candidate.length < 3) continue;
      const exactResponse = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(candidate)}&page=1&limit=20&fields=${fields}`);
      if (!exactResponse.ok) continue;
      const exactData = await exactResponse.json();
      const exactBooks = (exactData.docs || []).map(normalizeBook).filter((book: Book) => normalizeTitle(book.title) === normalizeTitle(candidate));
      if (exactBooks.length) return { books: exactBooks, total: exactBooks.length } as { books: Book[]; total: number };
    }
  }
  const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchTerm)}&page=${page}&limit=20&fields=${fields}`);
  if (!response.ok) throw new Error("Book search failed");
  const data = await response.json();
  return { books: (data.docs || []).map(normalizeBook), total: data.numFound || 0 } as { books: Book[]; total: number };
}

export async function getBookDetails(book: Book): Promise<Partial<Book>> {
  if (!/^OL\d+W$/i.test(book.id)) return {};
  const response = await fetch(`https://openlibrary.org/works/${encodeURIComponent(book.id)}.json`);
  if (!response.ok) return {};
  const data = await response.json();
  const description = typeof data.description === "string" ? data.description : data.description?.value;
  return {
    description: description?.trim() || undefined,
    genres: data.subjects?.slice(0, 12) || book.genres,
  };
}
