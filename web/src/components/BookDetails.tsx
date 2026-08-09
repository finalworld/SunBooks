import { useState } from "react";
import { BookOpen, Check, Heart, X } from "lucide-react";
import { formatLabels, type Book, type BookFormat } from "../types";

type Props = {
  book: Book; saved?: Book; onClose: () => void;
  onSave: (book: Book, formats: BookFormat[], favorite?: boolean) => void;
  onRemove: (book: Book) => void;
};

export function BookDetails({ book, saved, onClose, onSave, onRemove }: Props) {
  const [formats, setFormats] = useState<BookFormat[]>(saved?.formats || []);
  const [favorite, setFavorite] = useState(saved?.favorite || false);
  const toggle = (format: BookFormat) => setFormats(current => current.includes(format) ? current.filter(value => value !== format) : [...current, format]);

  return <div className="modal-wrap">
    <button className="scrim" onClick={onClose} aria-label="Stäng" />
    <section className="book-modal">
      <button className="modal-close" onClick={onClose} aria-label="Stäng"><X /></button>
      <div className="detail-hero">
        <div className="detail-cover">{book.cover ? <img src={book.cover} alt={`Omslag till ${book.title}`} /> : <BookOpen />}</div>
        <div><p>{book.year || "År saknas"}</p><h1>{book.title}</h1><h2>{book.authors.join(", ")}</h2></div>
      </div>
      <div className="facts">
        {book.pages && <span><strong>{book.pages}</strong>sidor</span>}
        {book.isbn && <span><strong>{book.isbn}</strong>ISBN</span>}
        {book.languages?.[0] && <span><strong>{book.languages[0].toUpperCase()}</strong>språk</span>}
      </div>
      <div className="format-box"><h3>Jag äger den som</h3><p>Välj en eller flera.</p>
        {(Object.keys(formatLabels) as BookFormat[]).map(format => <button className={formats.includes(format) ? "checked" : ""} onClick={() => toggle(format)} key={format}><span>{formats.includes(format) && <Check />}</span>{formatLabels[format]}</button>)}
      </div>
      <button className={`favorite-wide ${favorite ? "active" : ""}`} onClick={() => setFavorite(value => !value)}><Heart fill={favorite ? "currentColor" : "none"} /> {favorite ? "Favorit" : "Lägg till som favorit"}</button>
      <div className="modal-actions">{saved && <button className="remove" onClick={() => onRemove(book)}>Ta bort</button>}<button className="save" disabled={!formats.length} onClick={() => onSave(book, formats, favorite)}>{saved ? "Spara ändringar" : "Lägg till i biblioteket"}</button></div>
    </section>
  </div>;
}
