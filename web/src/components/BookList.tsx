import { BookOpen, Check, ChevronLeft, ChevronRight, Heart, Library } from "lucide-react";
import type { Book, View } from "../types";

type Props = {
  view: View; books: Book[]; library: Book[]; loading: boolean; error: string;
  total: number; page: number; onPage: (page: number) => void;
  onSelect: (book: Book) => void; onFavorite: (book: Book) => void;
};

export function BookList({ view, books, library, loading, error, total, page, onPage, onSelect, onFavorite }: Props) {
  const owned = (id: string) => library.find(book => book.id === id);
  return <section className="content">
    <div className="content-heading"><div><p>{view === "library" ? "DIN SAMLING" : "SÖKRESULTAT"}</p><h1>{view === "library" ? "Mitt bibliotek" : loading ? "Söker…" : `${total.toLocaleString("sv-SE")} träffar`}</h1></div>{view === "library" && <Library />}</div>
    {error && <div className="message">{error}</div>}
    {loading && <div className="book-list">{Array.from({ length: 5 }).map((_, index) => <div className="book-row skeleton" key={index} />)}</div>}
    {!loading && <div className="book-list">{books.map(book => <article className="book-row" key={book.id} onClick={() => onSelect(owned(book.id) || book)}>
      <div className="cover">{book.cover ? <img src={book.cover} alt={`Omslag till ${book.title}`} /> : <BookOpen />}</div>
      <div className="book-copy"><h2>{book.title}</h2><p>{book.authors.join(", ")}</p><span>{book.year || "Utgivningsår saknas"}{book.pages ? ` · ${book.pages} sidor` : ""}</span></div>
      <button className={`heart ${owned(book.id)?.favorite ? "active" : ""}`} onClick={event => { event.stopPropagation(); onFavorite(book); }} aria-label="Favorit"><Heart fill={owned(book.id)?.favorite ? "currentColor" : "none"} /></button>
      {owned(book.id) && <span className="owned" title="Finns i ditt bibliotek"><Check /></span>}
    </article>)}</div>}
    {!loading && !error && books.length === 0 && <div className="empty"><Library /><h2>Här är det tomt än</h2><p>Sök efter en bok och lägg till den.</p></div>}
    {view === "home" && total > 20 && <nav className="pagination" aria-label="Sidnumrering"><button disabled={page === 1} onClick={() => onPage(page - 1)}><ChevronLeft /> Föregående</button><span>Sida {page}</span><button disabled={page * 20 >= total} onClick={() => onPage(page + 1)}>Nästa <ChevronRight /></button></nav>}
  </section>;
}
