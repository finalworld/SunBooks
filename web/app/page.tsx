"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen, Camera, Check, ChevronLeft, ChevronRight, Heart, Library,
  Menu, Monitor, Moon, Search, Settings, Star, Sun, X
} from "lucide-react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { collection, deleteDoc, doc, getDocs, getFirestore, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyASuvaFV9g48N8uzbjX5rC06iqXU2WgU-U",
  authDomain: "sunbooks-fe49c.firebaseapp.com",
  projectId: "sunbooks-fe49c",
  storageBucket: "sunbooks-fe49c.firebasestorage.app",
  messagingSenderId: "278678544545",
  appId: "1:278678544545:web:a02c68d7f53c8ad4bed0e0",
};

const app = getApps()[0] ?? initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

type Format = "physical" | "ebook" | "audio";
type Theme = "system" | "light" | "dark";
type View = "home" | "library" | "settings";
type Book = {
  id: string; title: string; authors: string[]; cover?: string; isbn?: string;
  year?: number; pages?: number; genres?: string[]; languages?: string[];
  formats?: Format[]; favorite?: boolean; addedAt?: string;
};

const labels: Record<Format, string> = { physical: "Fysisk bok", ebook: "E-bok", audio: "Ljudbok" };

function normalizeBook(raw: any): Book {
  const isbn = raw.isbn?.[0];
  return {
    id: String(raw.key || isbn || `${raw.title}-${raw.author_name?.[0] || "okand"}`).replace(/^\/works\//, ""),
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

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [view, setView] = useState<View>("home");
  const [menu, setMenu] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [library, setLibrary] = useState<Book[]>([]);
  const [selected, setSelected] = useState<Book | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [scanner, setScanner] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => typeof window === "undefined" ? "system" : (localStorage.getItem("sunbooks-theme") as Theme) || "system");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setAuthReady(true); }), []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("sunbooks-theme", theme);
  }, [theme]);
  useEffect(() => {
    if (!user) { setLibrary([]); return; }
    getDocs(collection(db, "users", user.uid, "books"))
      .then(s => setLibrary(s.docs.map(d => d.data() as Book).sort((a,b) => (b.addedAt || "").localeCompare(a.addedAt || ""))))
      .catch(() => setError("Kunde inte läsa ditt bibliotek."));
  }, [user]);

  const visibleBooks = view === "library" ? library : results;
  const isSearching = view === "library" || results.length > 0 || loading || !!error;
  const owned = (id: string) => library.find(b => b.id === id);
  const readThisYear = 0;

  async function searchBooks(nextPage = 1, forced?: string) {
    const term = (forced ?? query).trim();
    if (!term) return;
    setLoading(true); setError(""); setResults([]); setPage(nextPage); setView("home");
    try {
      const fields = "key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median,subject,language";
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(term)}&page=${nextPage}&limit=20&fields=${fields}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults((data.docs || []).map(normalizeBook)); setTotal(data.numFound || 0);
      if (!data.docs?.length) setError("Inga böcker hittades. Prova titel, författare eller ISBN.");
    } catch { setError("Kunde inte hämta böcker just nu. Försök igen om en liten stund."); }
    finally { setLoading(false); }
  }

  async function saveBook(book: Book, formats: Format[], favorite = false) {
    if (!user) return;
    const saved = { ...book, formats, favorite, addedAt: owned(book.id)?.addedAt || new Date().toISOString() };
    await setDoc(doc(db, "users", user.uid, "books", book.id), saved);
    setLibrary(prev => [saved, ...prev.filter(b => b.id !== book.id)]);
    setSelected(saved);
  }

  async function removeBook(book: Book) {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "books", book.id));
    setLibrary(prev => prev.filter(b => b.id !== book.id)); setSelected(null);
  }

  async function toggleFavorite(book: Book) {
    const saved = owned(book.id);
    if (!saved) { setSelected(book); return; }
    await saveBook(saved, saved.formats || ["physical"], !saved.favorite);
  }

  async function startScanner() {
    setScanner(true); setAdvanced(false); setError("");
    setTimeout(async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
          if (result) {
            const code = result.getText(); controls.stop(); setScanner(false); setQuery(code); searchBooks(1, code);
            if (navigator.vibrate) navigator.vibrate(80);
          }
        });
      } catch { setScanner(false); setError("Kameran kunde inte öppnas. Kontrollera kamerabehörigheten eller skriv ISBN-numret i sökfältet."); }
    }, 50);
  }

  if (!authReady) return <main className="center"><div className="loader" /></main>;
  if (!user) return <Login onLogin={() => signInWithPopup(auth, provider)} />;

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="icon-button menu-button" onClick={() => setMenu(true)} aria-label="Öppna meny"><Menu /></button>
        <form className="search-form" onSubmit={e => { e.preventDefault(); searchBooks(1); }}>
          <Search aria-hidden="true" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Sök titel, författare, ISBN eller ASIN" aria-label="Sök böcker" />
          {query && <button type="button" className="clear" onClick={() => { setQuery(""); setResults([]); setError(""); }} aria-label="Rensa sökning"><X /></button>}
        </form>
      </header>

      <div className="advanced-row"><button onClick={() => setAdvanced(v => !v)}>Avancerat <span>{advanced ? "−" : "+"}</span></button></div>
      {advanced && <section className="advanced-panel">
        <button className="scan-card" onClick={startScanner}><Camera /><span><strong>Skanna en bok</strong><small>ISBN eller streckkod med kameran</small></span><ChevronRight /></button>
        <p>Du kan också skriva ISBN eller ASIN direkt i sökfältet.</p>
      </section>}

      {!isSearching && view === "home" && <section className="hero">
        <img src="/sunbooks-logo.png" alt="SunBooks – böcker och en varm kopp" />
        <p>Böcker jag läst i år</p><strong>{readThisYear}</strong>
        <span>{library.length} {library.length === 1 ? "bok" : "böcker"} i biblioteket</span>
      </section>}

      {view === "settings" && <SettingsView theme={theme} setTheme={setTheme} user={user} />}

      {(view === "library" || isSearching) && view !== "settings" && <section className="content">
        <div className="content-heading">
          <div><p>{view === "library" ? "DIN SAMLING" : "SÖKRESULTAT"}</p><h1>{view === "library" ? "Mitt bibliotek" : loading ? "Söker…" : `${total.toLocaleString("sv-SE")} träffar`}</h1></div>
          {view === "library" && <Library />}
        </div>
        {error && <div className="message">{error}</div>}
        {loading && <div className="book-list">{Array.from({length: 5}).map((_,i) => <div className="book-row skeleton" key={i} />)}</div>}
        {!loading && <div className="book-list">{visibleBooks.map(book => <article className="book-row" key={book.id} onClick={() => setSelected(owned(book.id) || book)}>
          <div className="cover">{book.cover ? <img src={book.cover} alt={`Omslag till ${book.title}`} /> : <BookOpen />}</div>
          <div className="book-copy"><h2>{book.title}</h2><p>{book.authors.join(", ")}</p><span>{book.year || "Utgivningsår saknas"}{book.pages ? ` · ${book.pages} sidor` : ""}</span></div>
          <button className={`heart ${owned(book.id)?.favorite ? "active" : ""}`} onClick={e => { e.stopPropagation(); toggleFavorite(book); }} aria-label="Favorit"><Heart fill={owned(book.id)?.favorite ? "currentColor" : "none"} /></button>
          {owned(book.id) && <span className="owned" title="Finns i ditt bibliotek"><Check /></span>}
        </article>)}</div>}
        {!loading && !error && visibleBooks.length === 0 && <div className="empty"><Library/><h2>Här är det tomt än</h2><p>Sök efter en bok och lägg till den.</p></div>}
        {view === "home" && total > 20 && <nav className="pagination" aria-label="Sidnumrering">
          <button disabled={page === 1} onClick={() => searchBooks(page - 1)}><ChevronLeft/> Föregående</button><span>Sida {page}</span><button disabled={page * 20 >= total} onClick={() => searchBooks(page + 1)}>Nästa <ChevronRight/></button>
        </nav>}
      </section>}

      {menu && <><button className="scrim" onClick={() => setMenu(false)} aria-label="Stäng meny"/><aside className="drawer">
        <div className="drawer-user"><img src={user.photoURL || "/sunbooks-logo.png"} alt=""/><div><strong>{user.displayName}</strong><span>{user.email}</span></div><button onClick={() => setMenu(false)}><X/></button></div>
        <nav><button onClick={() => {setView("home");setResults([]);setError("");setMenu(false)}}><BookOpen/> Startsida</button><button onClick={() => {setView("library");setMenu(false)}}><Library/> Mitt bibliotek <span>{library.length}</span></button><button onClick={() => {setView("settings");setMenu(false)}}><Settings/> Inställningar</button></nav>
        <button className="signout" onClick={() => signOut(auth)}>Logga ut</button>
      </aside></>}

      {selected && <BookDetails book={selected} saved={owned(selected.id)} onClose={() => setSelected(null)} onSave={saveBook} onRemove={removeBook} />}
      {scanner && <div className="scanner"><button onClick={() => setScanner(false)} aria-label="Stäng kamera"><X/></button><video ref={videoRef} muted playsInline/><div className="scan-frame"/><div className="scan-copy"><strong>Rikta kameran mot streckkoden</strong><span>Skanningen sker automatiskt</span></div></div>}
    </main>
  );
}

function Login({onLogin}:{onLogin:()=>void}) {
  return <main className="login"><div className="login-card"><img src="/sunbooks-logo.png" alt="SunBooks"/><p>Din egen bokhylla, alltid nära.</p><button onClick={onLogin}><span className="google-g">G</span> Fortsätt med Google</button><small>Dina böcker sparas privat på ditt konto.</small></div></main>;
}

function SettingsView({theme,setTheme,user}:{theme:Theme;setTheme:(t:Theme)=>void;user:User}) {
  return <section className="content settings-page"><div className="content-heading"><div><p>ANPASSA</p><h1>Inställningar</h1></div><Settings/></div><div className="settings-card"><h2>Tema</h2><p>Välj hur SunBooks ska se ut.</p><div className="theme-options">{([['system','Följ enheten',Monitor],['light','Ljust beige',Sun],['dark','Mörkgrått',Moon]] as const).map(([id,label,Icon])=><button className={theme===id?'selected':''} onClick={()=>setTheme(id)} key={id}><Icon/><span>{label}</span>{theme===id&&<Check/>}</button>)}</div></div><div className="settings-card account"><h2>Konto</h2><p>{user.email}</p><span>Google-konto</span></div></section>;
}

function BookDetails({book,saved,onClose,onSave,onRemove}:{book:Book;saved?:Book;onClose:()=>void;onSave:(b:Book,f:Format[],fav?:boolean)=>void;onRemove:(b:Book)=>void}) {
  const [formats,setFormats]=useState<Format[]>(saved?.formats || []);
  const [favorite,setFavorite]=useState(saved?.favorite || false);
  const toggle=(f:Format)=>setFormats(x=>x.includes(f)?x.filter(v=>v!==f):[...x,f]);
  return <div className="modal-wrap"><button className="scrim" onClick={onClose} aria-label="Stäng"/><section className="book-modal"><button className="modal-close" onClick={onClose}><X/></button><div className="detail-hero"><div className="detail-cover">{book.cover?<img src={book.cover} alt=""/>:<BookOpen/>}</div><div><p>{book.year || "År saknas"}</p><h1>{book.title}</h1><h2>{book.authors.join(", ")}</h2></div></div><div className="facts">{book.pages&&<span><strong>{book.pages}</strong>sidor</span>}{book.isbn&&<span><strong>{book.isbn}</strong>ISBN</span>}{book.languages?.[0]&&<span><strong>{book.languages[0].toUpperCase()}</strong>språk</span>}</div><div className="format-box"><h3>Jag äger den som</h3><p>Välj en eller flera.</p>{(Object.keys(labels) as Format[]).map(f=><button className={formats.includes(f)?'checked':''} onClick={()=>toggle(f)} key={f}><span>{formats.includes(f)&&<Check/>}</span>{labels[f]}</button>)}</div><button className={`favorite-wide ${favorite?'active':''}`} onClick={()=>setFavorite(v=>!v)}><Heart fill={favorite?'currentColor':'none'}/> {favorite?'Favorit':'Lägg till som favorit'}</button><div className="modal-actions">{saved&&<button className="remove" onClick={()=>onRemove(book)}>Ta bort</button>}<button className="save" disabled={!formats.length} onClick={()=>onSave(book,formats,favorite)}>{saved?'Spara ändringar':'Lägg till i biblioteket'}</button></div></section></div>;
}
