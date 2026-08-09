import { useEffect, useState } from "react";
import { BookOpen, Check, Heart, X } from "lucide-react";
import { formatLabels, readingStatusLabels, type Book, type BookFormat, type ReadingStatus } from "../types";
import { getBookDetails } from "../lib/books";

type Props = {
  book: Book; saved?: Book; onClose: () => void;
  onSave: (book: Book, formats: BookFormat[], favorite?: boolean) => void;
  onStatusChange: (book: Book, status?: ReadingStatus) => void;
  onRemove: (book: Book) => void;
};

export function BookDetails({ book, saved, onClose, onSave, onStatusChange, onRemove }: Props) {
  const [onlineDetails, setOnlineDetails] = useState<Partial<Book>>({});
  const [formats, setFormats] = useState<BookFormat[]>(saved?.formats || []);
  const [favorite, setFavorite] = useState(saved?.favorite || false);
  const [readingStatus, setReadingStatus] = useState<ReadingStatus | undefined>(saved?.readingStatus);
  const toggle = (format: BookFormat) => setFormats(current => current.includes(format) ? current.filter(value => value !== format) : [...current, format]);
  const detailedBook = { ...book, ...onlineDetails };

  useEffect(() => { getBookDetails(book).then(setOnlineDetails).catch(() => undefined); }, [book]);

  function chooseStatus(status: ReadingStatus) {
    const next = readingStatus === status ? undefined : status;
    setReadingStatus(next);
    if (saved) onStatusChange({ ...saved, ...onlineDetails }, next);
  }

  return <div className="modal-wrap">
    <button className="scrim" onClick={onClose} aria-label="Stäng" />
    <section className="book-modal">
      <button className="modal-close" onClick={onClose} aria-label="Stäng"><X /></button>
      <div className="detail-hero">
        <div className="detail-cover">{book.cover ? <img src={book.cover} alt={`Omslag till ${book.title}`} /> : <BookOpen />}</div>
        <div><p>{book.year || "År saknas"}</p><h1>{book.title}</h1><h2>{book.authors.join(", ")}</h2></div>
      </div>
      <div className="facts">
        {detailedBook.pages && <span><strong>{detailedBook.pages}</strong>sidor</span>}
        {detailedBook.isbn && <span><strong>{detailedBook.isbn}</strong>ISBN</span>}
        {detailedBook.languages?.[0] && <span><strong>{detailedBook.languages[0].toUpperCase()}</strong>språk</span>}
      </div>
      <section className="detail-section description-section"><h3>Om boken</h3>{detailedBook.description ? <p>{detailedBook.description}</p> : <p>Ingen beskrivning finns tillgänglig för den här boken.</p>}</section>
      <section className="detail-section categories-section">
        <h3>Kategorier</h3>
        {detailedBook.genres?.length ? <div className="category-chips">{detailedBook.genres.map(genre => <span key={genre}>{genre}</span>)}</div> : <p>Inga kategorier angivna för den här boken.</p>}
      </section>
      <section className="detail-section status-section">
        <h3>Lässtatus</h3><p>Välj var du befinner dig med boken.</p>
        <div className="status-options">{(Object.keys(readingStatusLabels) as ReadingStatus[]).map(status => <button className={readingStatus === status ? "selected" : ""} onClick={() => chooseStatus(status)} key={status}>{readingStatus === status && <Check />}{readingStatusLabels[status]}</button>)}</div>
        {!saved && <small className="status-hint">Statusen sparas direkt när boken finns i ditt bibliotek.</small>}
      </section>
      <div className="format-box"><h3>Jag äger den som</h3><p>Välj en eller flera.</p>
        {(Object.keys(formatLabels) as BookFormat[]).map(format => <button className={formats.includes(format) ? "checked" : ""} onClick={() => toggle(format)} key={format}><span>{formats.includes(format) && <Check />}</span>{formatLabels[format]}</button>)}
      </div>
      <button className={`favorite-wide ${favorite ? "active" : ""}`} onClick={() => setFavorite(value => !value)}><Heart fill={favorite ? "currentColor" : "none"} /> {favorite ? "Favorit" : "Lägg till som favorit"}</button>
      <div className="modal-actions">{saved && <button className="remove" onClick={() => onRemove(book)}>Ta bort</button>}<button className="save" disabled={!formats.length} onClick={() => onSave({ ...detailedBook, readingStatus }, formats, favorite)}>{saved ? "Spara övriga ändringar" : "Lägg till i biblioteket"}</button></div>
    </section>
  </div>;
}
