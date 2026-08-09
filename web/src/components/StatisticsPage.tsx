import { BarChart3, BookCheck, BookOpen, Library, Star } from "lucide-react";
import type { Book, BookFormat, ReadingStatus } from "../types";
import { useI18n } from "../i18n";

export function StatisticsPage({ books }: { books: Book[] }) {
  const { t } = useI18n();
  const owned = books.filter(book => book.owned !== false);
  const read = books.filter(book => book.readingStatus === "read");
  const pages = read.reduce((sum,book)=>sum+(book.pages || 0),0);
  const statusIds:ReadingStatus[]=["want_to_read","reading","read","dnf","dnf_for_now"];
  const statusNames:Record<ReadingStatus,string>={want_to_read:t("wantToRead"),reading:t("reading"),read:t("read"),dnf:t("dnf"),dnf_for_now:t("dnfForNow")};
  const formats:BookFormat[]=["physical","ebook","audio"];
  const formatNames:Record<BookFormat,string>={physical:t("physical"),ebook:t("ebook"),audio:t("audio")};
  const maxStatus=Math.max(1,...statusIds.map(id=>books.filter(book=>book.readingStatus===id).length));
  return <section className="content stats-page"><div className="content-heading"><div><p>ÖVERSIKT</p><h1>{t("statsTitle")}</h1></div><BarChart3/></div>
    <div className="stat-cards"><article><Library/><strong>{owned.length}</strong><span>{t("totalOwned")}</span></article><article><BookCheck/><strong>{read.length}</strong><span>{t("completed")}</span></article><article><BookOpen/><strong>{books.filter(book=>book.readingStatus==="reading").length}</strong><span>{t("currentlyReading")}</span></article><article><Star/><strong>{pages.toLocaleString()}</strong><span>{t("pagesRead")}</span></article></div>
    <div className="stats-grid"><section className="settings-card"><h2>{t("statuses")}</h2><div className="bar-chart">{statusIds.map(id=>{const count=books.filter(book=>book.readingStatus===id).length;return <div key={id}><span>{statusNames[id]}</span><div><i style={{width:`${count/maxStatus*100}%`}}/></div><strong>{count}</strong></div>})}</div></section><section className="settings-card"><h2>{t("formats")}</h2><div className="format-stats">{formats.map(format=><div key={format}><strong>{owned.filter(book=>book.formats?.includes(format)||book.copies?.some(copy=>copy.format===format)).length}</strong><span>{formatNames[format]}</span></div>)}</div></section></div>
    <section className="settings-card"><h2>{t("ratings")}</h2><div className="rating-summary"><span>💩 {books.filter(book=>book.rating==="bajs").length}</span>{[0,1,2,3,4,5].map(value=><span key={value}>{value}★ {books.filter(book=>typeof book.rating==="number"&&Math.round(book.rating)===value).length}</span>)}</div></section>
    {!books.length&&<p className="muted-center">{t("noStats")}</p>}
  </section>;
}
