import { useMemo, useState } from "react";
import { BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, Heart, Library, SlidersHorizontal, X } from "lucide-react";
import type { Book, BookFormat, ReadingStatus, View } from "../types";
import { ReadingStatusBadge } from "./ReadingStatusBadge";
import { useI18n } from "../i18n";
import { MediaBadges, RatingIndicator } from "./BookIndicators";

type Props = { view: View; books: Book[]; library: Book[]; loading: boolean; error: string; total: number; page: number; onPage: (page: number) => void; onSelect: (book: Book) => void; onFavorite: (book: Book) => void };
type Sort = "recent" | "title" | "author" | "year" | "pages";

export function BookList({ view, books, library, loading, error, total, page, onPage, onSelect, onFavorite }: Props) {
  const { t, language } = useI18n();
  const [filtersOpen,setFiltersOpen] = useState(() => localStorage.getItem("sunbooks-filters-open") === "true");
  const [status,setStatus] = useState<ReadingStatus | "all">("all");
  const [format,setFormat] = useState<BookFormat | "all">("all");
  const [sort,setSort] = useState<Sort>("recent");
  const [favorites,setFavorites] = useState(false);
  const [genre,setGenre]=useState("all");const [bookLanguage,setBookLanguage]=useState("all");const[fromYear,setFromYear]=useState("");const[toYear,setToYear]=useState("");const[minPages,setMinPages]=useState("");const[maxPages,setMaxPages]=useState("");
  const [libraryPage,setLibraryPage] = useState(1);
  const owned = (id:string) => library.find(book => book.id === id && book.owned !== false);
  const statusName:Record<ReadingStatus,string>={want_to_read:t("wantToRead"),reading:t("reading"),read:t("read"),dnf:t("dnf"),dnf_for_now:t("dnfForNow")};
  const formatName:Record<BookFormat,string>={physical:t("physical"),ebook:t("ebook"),audio:t("audio")};

  const filtered = useMemo(() => {
    if (view !== "library") return books;
    const result = books.filter(book => (status === "all" || book.readingStatus === status) && (format === "all" || book.formats?.includes(format) || book.copies?.some(copy => copy.format === format)) && (genre === "all" || book.genres?.includes(genre)) && (bookLanguage === "all" || book.languages?.includes(bookLanguage)) && (!fromYear || (book.year||0)>=Number(fromYear)) && (!toYear || (book.year||9999)<=Number(toYear)) && (!minPages || (book.pages||0)>=Number(minPages)) && (!maxPages || (book.pages||999999)<=Number(maxPages)) && (!favorites || book.favorite));
    result.sort((a,b) => sort === "title" ? a.title.localeCompare(b.title,language) : sort === "author" ? (a.authors[0] || "").localeCompare(b.authors[0] || "",language) : sort === "year" ? (b.year || 0)-(a.year || 0) : sort === "pages" ? (b.pages || 0)-(a.pages || 0) : (b.addedAt || "").localeCompare(a.addedAt || ""));
    return result;
  },[books,view,status,format,genre,bookLanguage,fromYear,toYear,minPages,maxPages,favorites,sort,language]);
  const genres=useMemo(()=>Array.from(new Set(books.flatMap(book=>book.genres||[]))).sort((a,b)=>a.localeCompare(b,language)).slice(0,100),[books,language]);
  const languages=useMemo(()=>Array.from(new Set(books.flatMap(book=>book.languages||[]))).sort(),[books]);
  const shown = view === "library" ? filtered.slice((libraryPage-1)*20,libraryPage*20) : filtered;
  const pageCount = view === "library" ? Math.ceil(filtered.length/20) : Math.ceil(total/20);

  function toggleFilters(){const next=!filtersOpen;setFiltersOpen(next);localStorage.setItem("sunbooks-filters-open",String(next));}
  function clearFilters(){setStatus("all");setFormat("all");setGenre("all");setBookLanguage("all");setFromYear("");setToYear("");setMinPages("");setMaxPages("");setSort("recent");setFavorites(false);setLibraryPage(1);}

  return <section className="content">
    <div className="content-heading"><div><p>{view === "library" ? t("collection") : t("searchResults")}</p><h1>{view === "library" ? t("library") : loading ? t("searching") : `${total.toLocaleString(language === "sv" ? "sv-SE" : "en-US")} ${t("hits")}`}</h1></div>{view === "library" && <Library />}</div>
    {view === "library" && <><button className="filter-toggle" onClick={toggleFilters}><SlidersHorizontal />{t("filters")}<ChevronDown className={filtersOpen ? "rotated" : ""} /></button>{filtersOpen && <div className="filter-panel"><select value={status} onChange={event => {setStatus(event.target.value as typeof status);setLibraryPage(1)}}><option value="all">{t("allStatuses")}</option>{Object.entries(statusName).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><select value={format} onChange={event => {setFormat(event.target.value as typeof format);setLibraryPage(1)}}><option value="all">{t("allFormats")}</option>{Object.entries(formatName).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><select value={genre} onChange={event=>setGenre(event.target.value)}><option value="all">{t("allGenres")}</option>{genres.map(value=><option key={value}>{value}</option>)}</select><select value={bookLanguage} onChange={event=>setBookLanguage(event.target.value)}><option value="all">{t("allLanguages")}</option>{languages.map(value=><option key={value}>{value.toUpperCase()}</option>)}</select><input type="number" placeholder={t("fromYear")} value={fromYear} onChange={event=>setFromYear(event.target.value)}/><input type="number" placeholder={t("toYear")} value={toYear} onChange={event=>setToYear(event.target.value)}/><input type="number" placeholder={t("minPages")} value={minPages} onChange={event=>setMinPages(event.target.value)}/><input type="number" placeholder={t("maxPages")} value={maxPages} onChange={event=>setMaxPages(event.target.value)}/><select value={sort} onChange={event => setSort(event.target.value as Sort)}><option value="recent">{t("sortRecent")}</option><option value="title">{t("sortTitle")}</option><option value="author">{t("sortAuthor")}</option><option value="year">{t("sortYear")}</option><option value="pages">{t("sortPages")}</option></select><label className="favorite-filter"><input type="checkbox" checked={favorites} onChange={event => setFavorites(event.target.checked)} /><Heart />{t("favoritesOnly")}</label><button className="clear-filters" onClick={clearFilters}><X />{t("clearFilters")}</button><small>{filtered.length} {t("results")}</small></div>}</>}
    {error && <div className="message">{error}</div>}
    {loading && <div className="book-list">{Array.from({length:5}).map((_,index)=><div className="book-row skeleton" key={index}/>)}</div>}
    {!loading && <div className="book-list">{shown.map(book => {const saved=owned(book.id);const display=saved||book;return <article className="book-row" key={book.id} onClick={() => onSelect(display)}><div className="cover">{book.cover?<img src={book.cover} alt={`${t("coverOf")} ${book.title}`}/>:<BookOpen/>}</div><div className="book-copy"><h2>{book.title}</h2><p>{book.authors.join(", ")}</p><div className="book-meta">{book.year || t("unknownYear")}{book.pages?` · ${book.pages} ${t("pages")}`:""}</div>{view === "library" && <div className="book-row-badges"><ReadingStatusBadge status={display.readingStatus}/><MediaBadges book={display} compact/></div>}</div><button className={`heart ${saved?.favorite?"active":""}`} onClick={event=>{event.stopPropagation();onFavorite(display)}} aria-label={t("favorite")}><Heart fill={saved?.favorite?"currentColor":"none"}/></button>{view === "library"&&<RatingIndicator rating={display.rating}/>} {saved&&<span className="owned" title={t("bookInLibrary")}><Check/></span>}</article>})}</div>}
    {!loading&&!error&&shown.length===0&&<div className="empty"><Library/><h2>{t("noBooks")}</h2><p>{t("noBooksHelp")}</p></div>}
    {pageCount>1&&<nav className="pagination" aria-label={t("page")}><button disabled={(view === "library" ? libraryPage : page)===1} onClick={()=>view === "library"?setLibraryPage(libraryPage-1):onPage(page-1)}><ChevronLeft/>{t("previous")}</button><span>{t("page")} {view === "library"?libraryPage:page} / {pageCount}</span><button disabled={(view === "library" ? libraryPage : page)>=pageCount} onClick={()=>view === "library"?setLibraryPage(libraryPage+1):onPage(page+1)}>{t("next")}<ChevronRight/></button></nav>}
  </section>;
}
