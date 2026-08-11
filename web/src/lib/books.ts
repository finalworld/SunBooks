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

function extractAsin(value: string) {
  return parseAmazonBookLink(value)?.asin || value.trim().match(/^(?:B0[A-Z0-9]{8}|[A-Z0-9]{10})$/i)?.[0]?.toUpperCase();
}

function displayAmazonAuthor(value: string) {
  const parts=value.split(",").map(part=>part.trim()).filter(Boolean);
  return parts.length===2 ? `${parts[1]} ${parts[0]}` : value.trim();
}

async function resolveAmazonBook(asin:string):Promise<Book|null>{
  try{
    const response=await fetch(`https://r.jina.ai/https://www.amazon.com/dp/${encodeURIComponent(asin)}`);
    if(!response.ok)return null;
    const markdown=await response.text();
    const amazonTitle=markdown.match(/^Title:\s*Amazon\.[^:]+:\s*(.+)$/im)?.[1]?.trim();
    if(!amazonTitle)return null;
    const parsed=amazonTitle.match(/^(.*?)\s+(?:eBook|Kindle Edition)\s*:\s*(.+?)\s*:\s*Kindle Store\s*$/i);
    if(!parsed)return null;
    const title=parsed[1].trim();
    const author=displayAmazonAuthor(parsed[2]);
    const imageUrls=Array.from(markdown.matchAll(/https:\/\/m\.media-amazon\.com\/images\/I\/[^)\s]+?\.(?:jpe?g|png)/gi),match=>match[0]);
    const rawCover=imageUrls.find(url=>/_SY\d+_/i.test(url))||imageUrls[0];
    const cover=rawCover?.replace(/\._[^.]+(?=\.(?:jpe?g|png)$)/i,"");
    return {id:`amazon-${asin}`,title,authors:[author],cover,asin,languages:["eng"]};
  }catch{return null}
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
  const asin=extractAsin(term);
  const searchTerm = amazon?.searchTerm || term;
  const fields = "key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median,subject,language,series";
  if(asin&&page===1){
    const amazonBook=await resolveAmazonBook(asin);
    if(amazonBook){
      const exactResponse=await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(amazonBook.title)}&author=${encodeURIComponent(amazonBook.authors[0])}&page=1&limit=20&fields=${fields}`);
      if(exactResponse.ok){
        const exactData=await exactResponse.json();
        const normalizedTitle=amazonBook.title.toLocaleLowerCase().replace(/^(?:the|a|an)\s+/,"").replace(/[^\p{L}\p{N}]+/gu," ").trim();
        const matches=(exactData.docs||[]).map(normalizeBook).filter((book:Book)=>book.title.toLocaleLowerCase().replace(/^(?:the|a|an)\s+/,"").replace(/[^\p{L}\p{N}]+/gu," ").trim()===normalizedTitle).map((book:Book)=>({...book,asin}));
        if(matches.length)return{books:matches,total:matches.length} as {books:Book[];total:number};
      }
      return{books:[amazonBook],total:1};
    }
  }
  if (amazon && page === 1) {
    const words = searchTerm.split(/\s+/);
    const bookNumberIndex = words.findIndex((word, index) => /^book$/i.test(word) && /^\d+$/i.test(words[index + 1] || ""));
    const titleWords = bookNumberIndex > 0 ? words.slice(0, bookNumberIndex) : words;
    const candidates = Array.from({ length: titleWords.length }, (_, index) => titleWords.slice(0, titleWords.length - index).join(" "));
    const normalizeTitle = (value: string) => value.toLocaleLowerCase().replace(/^(?:the|a|an)\s+/, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

    // Amazon commonly ends its URL slug with the author's name. Try every
    // sensible title/author split before falling back to title-only matches.
    if (bookNumberIndex < 0 && words.length >= 3) {
      for (let split = 1; split <= words.length - 2; split++) {
        const title = words.slice(0, split).join(" ");
        const author = words.slice(split).join(" ");
        const authorResponse = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&page=1&limit=20&fields=${fields}`);
        if (!authorResponse.ok) continue;
        const authorData = await authorResponse.json();
        const authorBooks = (authorData.docs || []).map(normalizeBook).filter((book: Book) => normalizeTitle(book.title) === normalizeTitle(title));
        if (authorBooks.length) return { books: authorBooks, total: authorBooks.length } as { books: Book[]; total: number };
      }
    }

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
