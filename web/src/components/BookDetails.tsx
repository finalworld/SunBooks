import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, Heart, Plus, Star, Trash2, X } from "lucide-react";
import { formatLabels, readingStatusLabels, type Book, type BookCopy, type BookFormat, type ReadingStatus } from "../types";
import { getBookDetails } from "../lib/books";
import { useI18n } from "../i18n";

type Props = {
  book: Book; saved?: Book; onClose: () => void;
  onPatch: (book: Book, patch: Partial<Book>) => Promise<void>;
  onRemove: (book: Book) => void;
};

const ratingValues = Array.from({ length: 21 }, (_, index) => index * .25);

export function BookDetails({ book, saved, onClose, onPatch, onRemove }: Props) {
  const { t } = useI18n();
  const [onlineDetails, setOnlineDetails] = useState<Partial<Book>>({});
  const [draft, setDraft] = useState<Book>(saved || book);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [newTag, setNewTag] = useState("");
  const reviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { getBookDetails(book).then(details => { setOnlineDetails(details); if (Object.keys(details).length) setDraft(current => ({ ...current, ...details })); }).catch(() => undefined); }, [book.id]);
  useEffect(() => { if (saved) setDraft(current => ({ ...current, ...saved })); }, [saved]);
  useEffect(() => () => { if (reviewTimer.current) clearTimeout(reviewTimer.current); }, []);

  async function patch(change: Partial<Book>) {
    const next = { ...draft, ...change };
    setDraft(next); setSaving(true); setSavedFlash(false);
    try { await onPatch(next, change); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1200); }
    finally { setSaving(false); }
  }

  function changeReview(value: string) {
    setDraft(current => ({ ...current, review: value }));
    if (reviewTimer.current) clearTimeout(reviewTimer.current);
    setSaving(true);
    reviewTimer.current = setTimeout(() => patch({ review: value }), 800);
  }

  function toggleFormat(format: BookFormat) {
    const current = draft.formats || [];
    patch({ formats: current.includes(format) ? current.filter(item => item !== format) : [...current, format] });
  }

  function chooseStatus(status: ReadingStatus) {
    const readingStatus = draft.readingStatus === status ? undefined : status;
    const change: Partial<Book> = { readingStatus };
    if (readingStatus === "read") change.completedAt = draft.completedAt || new Date().toISOString();
    else change.completedAt = undefined;
    if (readingStatus === "reading") change.startedAt = draft.startedAt || new Date().toISOString();
    patch(change);
  }

  function addCopy() {
    const copy: BookCopy = { id: crypto.randomUUID(), format: "physical" };
    patch({ copies: [...(draft.copies || []), copy] });
  }

  function updateCopy(id: string, change: Partial<BookCopy>) {
    patch({ copies: (draft.copies || []).map(copy => copy.id === id ? { ...copy, ...change } : copy) });
  }

  function removeCopy(id: string) { patch({ copies: (draft.copies || []).filter(copy => copy.id !== id) }); }
  function addTag() { const value = newTag.trim(); if (!value) return; patch({ tags: Array.from(new Set([...(draft.tags || []), value])) }); setNewTag(""); }
  function startNewReading(){const sessions=[...(draft.sessions||[])];if(draft.startedAt||draft.completedAt||draft.readingStatus)sessions.push({id:crypto.randomUUID(),startedAt:draft.startedAt||draft.addedAt||new Date().toISOString(),finishedAt:draft.completedAt,status:draft.readingStatus,rating:draft.rating});patch({sessions,readingStatus:"reading",startedAt:new Date().toISOString(),completedAt:undefined,progressValue:0,rating:undefined})}
  function removeLatestSession(){patch({sessions:(draft.sessions||[]).slice(0,-1)})}

  const details = { ...book, ...onlineDetails, ...draft };
  const statusLabels: Record<ReadingStatus, string> = { want_to_read:t("wantToRead"), reading:t("reading"), read:t("read"), dnf:t("dnf"), dnf_for_now:t("dnfForNow") };
  const formatNames: Record<BookFormat, string> = { physical:t("physical"), ebook:t("ebook"), audio:t("audio") };

  return <div className="modal-wrap">
    <button className="scrim" onClick={onClose} aria-label={t("close")} />
    <section className="book-modal">
      <div className="autosave-status">{saving ? <><span className="mini-loader" />{t("saving")}</> : savedFlash ? <><Check />{t("saved")}</> : null}</div>
      <button className="modal-close" onClick={onClose} aria-label={t("close")}><X /></button>
      <div className="detail-hero"><div className="detail-cover">{details.cover ? <img src={details.cover} alt={`${t("coverOf")} ${details.title}`} /> : <BookOpen />}</div><div><p>{details.year || t("yearMissing")}</p><h1>{details.title}</h1><h2>{details.authors.join(", ")}</h2></div></div>
      <div className="facts">{details.pages && <span><strong>{details.pages}</strong>{t("pages")}</span>}{details.isbn && <span><strong>{details.isbn}</strong>{t("isbn")}</span>}{details.languages?.[0] && <span><strong>{details.languages[0].toUpperCase()}</strong>{t("languageShort")}</span>}{details.addedAt&&<span><strong>{new Date(details.addedAt).toLocaleDateString()}</strong>{t("added")}</span>}</div>

      <section className="detail-section status-section"><h3>{t("readingStatus")}</h3><p>{t("statusHelp")}</p><div className="status-options">{(Object.keys(readingStatusLabels) as ReadingStatus[]).map(status => <button className={draft.readingStatus === status ? "selected" : ""} onClick={() => chooseStatus(status)} key={status}>{draft.readingStatus === status && <Check />}{statusLabels[status]}</button>)}</div></section>

      <section className="detail-section rating-section"><h3>{t("myRating")}</h3><div className="rating-control"><Star fill="currentColor" /><select value={draft.rating ?? ""} onChange={event => patch({ rating: event.target.value === "" ? undefined : event.target.value === "bajs" ? "bajs" : Number(event.target.value) })}><option value="">{t("noRating")}</option><option value="bajs">💩 {t("bajs")}</option>{ratingValues.map(value => <option value={value} key={value}>{value.toFixed(2)} ★</option>)}</select></div></section>

      <section className="detail-section progress-section"><div className="section-title-row"><h3>{t("progress")}</h3><button onClick={startNewReading}><Plus/>{t("startNew")}</button></div><div className="progress-controls"><select value={draft.progressMode || "pages"} onChange={event => patch({ progressMode: event.target.value as "pages" | "percent" })}><option value="pages">{t("progressPages")}</option><option value="percent">{t("progressPercent")}</option></select><input type="number" min="0" max={draft.progressMode === "percent" ? 100 : details.pages} value={draft.progressValue ?? ""} onChange={event => patch({ progressValue: event.target.value ? Number(event.target.value) : undefined })}/><label>{t("started")}<input type="date" value={draft.startedAt?.slice(0,10)||""} onChange={event=>patch({startedAt:event.target.value?new Date(`${event.target.value}T12:00:00`).toISOString():undefined})}/></label><label>{t("finished")}<input type="date" value={draft.completedAt?.slice(0,10)||""} onChange={event=>patch({completedAt:event.target.value?new Date(`${event.target.value}T12:00:00`).toISOString():undefined})}/></label><button onClick={() => patch({ progressValue: undefined, startedAt: undefined })}>{t("clearProgress")}</button></div>{draft.sessions?.length?<div className="session-list">{draft.sessions.map(session=><div key={session.id}><span>{new Date(session.startedAt).toLocaleDateString()} {session.finishedAt?`– ${new Date(session.finishedAt).toLocaleDateString()}`:""}</span>{session.rating!==undefined&&<strong>{session.rating==="bajs"?"💩":`${Number(session.rating).toFixed(2)} ★`}</strong>}</div>)}<button onClick={removeLatestSession}><Trash2/>{t("removeLatest")}</button></div>:null}</section>

      <section className="detail-section review-section"><h3>{t("privateReview")}</h3><p>{t("reviewPrivate")}</p><textarea value={draft.review || ""} onChange={event => changeReview(event.target.value)} onBlur={() => { if (reviewTimer.current) { clearTimeout(reviewTimer.current); reviewTimer.current = null; patch({ review: draft.review || "" }); } }} placeholder={t("reviewPlaceholder")} /></section>

      <section className="detail-section format-section"><h3>{t("ownedAs")}</h3><p>{t("chooseMultiple")}</p><div className="format-quick-options">{(Object.keys(formatLabels) as BookFormat[]).map(format => <button className={(draft.formats || []).includes(format) ? "checked" : ""} onClick={() => toggleFormat(format)} key={format}><span>{(draft.formats || []).includes(format) && <Check />}</span>{formatNames[format]}</button>)}</div></section>

      <section className="detail-section copies-section"><div className="section-title-row"><h3>{t("copies")}</h3><button onClick={addCopy}><Plus />{t("addCopy")}</button></div>{(draft.copies || []).map(copy => <div className="copy-card" key={copy.id}><select value={copy.format} onChange={event => updateCopy(copy.id, { format:event.target.value as BookFormat })}>{(Object.keys(formatNames) as BookFormat[]).map(format => <option key={format} value={format}>{formatNames[format]}</option>)}</select><input value={copy.provider || ""} onChange={event => updateCopy(copy.id, { provider:event.target.value })} placeholder={t("provider")} /><input value={copy.device || ""} onChange={event => updateCopy(copy.id, { device:event.target.value })} placeholder={t("device")} /><input value={copy.note || ""} onChange={event => updateCopy(copy.id, { note:event.target.value })} placeholder={t("note")} /><button className="copy-remove" onClick={() => removeCopy(copy.id)}><Trash2 /></button></div>)}</section>

      <section className="detail-section tags-section"><h3>{t("tags")}</h3><div className="tag-input"><input value={newTag} onChange={event => setNewTag(event.target.value)} onKeyDown={event => { if (event.key === "Enter") addTag(); }} /><button onClick={addTag}><Plus />{t("addTag")}</button></div><div className="category-chips">{(draft.tags || []).map(tag => <button key={tag} onClick={() => patch({ tags:(draft.tags || []).filter(item => item !== tag) })}>{tag}<X /></button>)}</div></section>

      <section className="detail-section description-section"><h3>{t("about")}</h3><p>{details.description || t("noDescription")}</p></section>
      <section className="detail-section categories-section"><h3>{t("categories")}</h3>{details.genres?.length ? <div className="category-chips">{details.genres.map(genre => <span key={genre}>{genre}</span>)}</div> : <p>{t("noCategories")}</p>}</section>

      <button className={`favorite-wide ${draft.favorite ? "active" : ""}`} onClick={() => patch({ favorite:!draft.favorite })}><Heart fill={draft.favorite ? "currentColor" : "none"} /> {draft.favorite ? t("favorite") : t("addFavorite")}</button>
      <button className="danger-wide" onClick={() => setConfirmRemove(true)}><Trash2 />{t("remove")}</button>
      {confirmRemove && <div className="confirm-box"><strong>{t("removeBook")}</strong><p>{t("removeConfirm")}</p><div><button onClick={() => setConfirmRemove(false)}>{t("cancel")}</button><button className="danger" onClick={() => onRemove(details)}>{t("confirmRemove")}</button></div></div>}
    </section>
  </div>;
}
