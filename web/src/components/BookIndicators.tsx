import { BookOpen, Headphones, Star, Tablet } from "lucide-react";
import type { Book, BookFormat } from "../types";
import { useI18n } from "../i18n";

export function mediaCount(book: Book, format: BookFormat) {
  const copies = book.copies?.filter(copy => copy.format === format).length || 0;
  return copies || (book.formats?.includes(format) ? 1 : 0);
}

export function MediaBadges({ book, compact = false }: { book: Book; compact?: boolean }) {
  const { t } = useI18n();
  const items = [
    ["physical", BookOpen, t("physical")],
    ["audio", Headphones, t("audio")],
    ["ebook", Tablet, t("ebook")],
  ] as const;
  return <span className={`media-badges ${compact ? "compact" : ""}`}>{items.map(([format, Icon, label]) => {
    const count = mediaCount(book, format);
    return count ? <span className="media-badge" title={`${label} (${count})`} key={format}><Icon /><b>({count})</b>{!compact && <em>{label}</em>}</span> : null;
  })}</span>;
}

export function RatingIndicator({ rating }: { rating?: number | "bajs" }) {
  if (rating === undefined) return null;
  if (rating === "bajs") return <span className="rating-indicator poop" title="BAJS">💩</span>;
  const percent = Math.max(0, Math.min(100, (rating / 5) * 100));
  return <span className="rating-indicator" title={`${rating.toFixed(2)} / 5`}><span className="rating-star"><Star className="rating-star-empty" /><span style={{ width: `${percent}%` }}><Star className="rating-star-fill" fill="currentColor" /></span></span><b>{rating.toString()}</b></span>;
}
