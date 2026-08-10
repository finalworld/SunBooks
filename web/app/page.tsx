import { useCallback, useEffect, useRef, useState } from "react";
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { deleteUser, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from "firebase/auth";
import { auth, db, googleProvider } from "../src/lib/firebase";
import { findBooks } from "../src/lib/books";
import type { Book, ScanMode, Theme, View } from "../src/types";
import { LoginPage } from "../src/components/LoginPage";
import { SearchHeader } from "../src/components/SearchHeader";
import { HomeHero } from "../src/components/HomeHero";
import { SettingsPage } from "../src/components/SettingsPage";
import { BookList } from "../src/components/BookList";
import { NavigationDrawer } from "../src/components/NavigationDrawer";
import { BookDetails } from "../src/components/BookDetails";
import { BookScanner } from "../src/components/BookScanner";
import { StatisticsPage } from "../src/components/StatisticsPage";
import { BookEasterEgg } from "../src/components/BookEasterEgg";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState<View>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [library, setLibrary] = useState<Book[]>([]);
  const [selected, setSelected] = useState<Book | null>(null);
  const [selectedSource, setSelectedSource] = useState<"library" | "search">("search");
  const [libraryScope, setLibraryScope] = useState<{ kind:"author" | "category"; value:string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [scanMode, setScanMode] = useState<ScanMode | null>(null);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("sunbooks-theme") as Theme) || "system");
  const [easterEgg,setEasterEgg]=useState(false);
  const logoTaps=useRef<number[]>([]);

  useEffect(() => onAuthStateChanged(auth, current => { setUser(current); setAuthReady(true); }), []);
  useEffect(() => {
    getRedirectResult(auth).catch(() => setAuthError("Google-inloggningen kunde inte slutföras. Försök igen eller öppna SunBooks direkt i Safari."));
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("sunbooks-theme", theme); }, [theme]);
  useEffect(() => {
    if (!user) { setLibrary([]); return; }
    getDocs(collection(db, "users", user.uid, "books"))
      .then(snapshot => setLibrary(snapshot.docs.map(item => item.data() as Book).sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""))))
      .catch(() => setError("Kunde inte läsa ditt bibliotek."));
  }, [user]);

  const owned = (id: string) => library.find(book => book.id === id);
  const ownedLibrary = library.filter(book => book.owned !== false);
  const scopedLibrary = libraryScope ? ownedLibrary.filter(book => libraryScope.kind === "author" ? book.authors.some(author => author.toLocaleLowerCase() === libraryScope.value.toLocaleLowerCase()) : book.genres?.some(genre => genre.toLocaleLowerCase() === libraryScope.value.toLocaleLowerCase())) : ownedLibrary;
  const visibleBooks = view === "library" ? ownedLibrary : results;
  const showingContent = view === "library" || results.length > 0 || loading || Boolean(error);
  const currentYear = new Date().getFullYear();
  const readThisYear = library.filter(book => book.readingStatus === "read" && (!book.completedAt || new Date(book.completedAt).getFullYear() === currentYear)).length;

  async function searchBooks(nextPage = 1, forced?: string) {
    const term = (forced ?? query).trim();
    if (!term) return;
    setLoading(true); setError(""); setResults([]); setPage(nextPage); setView("home");
    try {
      const found = await findBooks(term, nextPage);
      setResults(found.books); setTotal(found.total);
      if (!found.books.length) setError("Inga böcker hittades. Prova titel, författare eller ISBN.");
    } catch { setError("Kunde inte hämta böcker just nu. Försök igen om en liten stund."); }
    finally { setLoading(false); }
  }

  async function patchBook(book: Book, change: Partial<Book>) {
    if (!user) return;
    const existing = owned(book.id);
    const updated: Book = { ...book, ...change, addedAt: existing?.addedAt || book.addedAt || new Date().toISOString(), updatedAt:new Date().toISOString() };
    if (!existing) updated.owned = Boolean(updated.formats?.length || updated.copies?.length);
    if ("formats" in change || "copies" in change) updated.owned = Boolean(updated.formats?.length || updated.copies?.length);
    const clean = JSON.parse(JSON.stringify(updated)) as Book;
    await setDoc(doc(db, "users", user.uid, "books", book.id), clean);
    setLibrary(current => [clean, ...current.filter(item => item.id !== book.id)]);
    setSelected(current => current?.id === book.id ? clean : current);
  }

  async function removeBook(book: Book) {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "books", book.id));
    setLibrary(current => current.filter(item => item.id !== book.id)); setSelected(null);
  }

  async function importBooks(books:Book[]){if(!user)return;for(const book of books){const clean=JSON.parse(JSON.stringify(book)) as Book;await setDoc(doc(db,"users",user.uid,"books",clean.id),clean)}setLibrary(current=>{const map=new Map(current.map(book=>[book.id,book]));books.forEach(book=>map.set(book.id,book));return Array.from(map.values())})}
  async function deleteLibrary(){if(!user)return;await Promise.all(library.map(book=>deleteDoc(doc(db,"users",user.uid,"books",book.id))));setLibrary([]);setSelected(null)}
  async function deleteAccount(){await deleteLibrary();if(auth.currentUser)await deleteUser(auth.currentUser)}

  async function toggleFavorite(book: Book) {
    const saved = owned(book.id);
    if (!saved) { setSelected(book); return; }
    await patchBook(saved, { favorite:!saved.favorite });
  }

  async function login() {
    setAuthError("");
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (isIOS) await signInWithRedirect(auth, googleProvider);
      else await signInWithPopup(auth, googleProvider);
    }
    catch { setAuthError("Inloggningen avbröts eller kunde inte öppnas. Försök igen i Safari om du använder en inbyggd webbläsare."); }
  }

  const closeScanner = useCallback(() => setScanMode(null), []);
  const scannerError = useCallback((message: string) => setError(message), []);
  const scannedCode = useCallback((code: string) => {
    setScanMode(null); setQuery(code); searchBooks(1, code);
    if (navigator.vibrate) navigator.vibrate(80);
  // searchBooks intentionally uses the current setters and no stale state when forced code is supplied.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function navigate(next: View) {
    setView(next); setMenuOpen(false);
    if (next === "library") setLibraryScope(null);
    if (next === "home") { setResults([]); setError(""); }
  }

  function selectBook(book:Book, source:"library" | "search"){setSelectedSource(source);setSelected(book)}
  function selectAuthor(author:string){setSelected(null);if(selectedSource==="library"){setLibraryScope({kind:"author",value:author});setView("library")}else{setQuery(author);void searchBooks(1,author)}}
  function selectCategory(category:string){if(selectedSource!=="library")return;setSelected(null);setLibraryScope({kind:"category",value:category});setView("library")}

  function logoTap(){const now=Date.now();logoTaps.current=[...logoTaps.current.filter(time=>now-time<1800),now];if(logoTaps.current.length>=7){logoTaps.current=[];setEasterEgg(true)}}

  if (!authReady) return <main className="center"><div className="loader" /></main>;
  if (!user) return <LoginPage onLogin={login} error={authError} />;

  return <main className="app-shell">
    <SearchHeader query={query} advanced={advanced} onQuery={setQuery} onSearch={() => searchBooks(1)} onClear={() => { setQuery(""); setResults([]); setError(""); }} onMenu={() => setMenuOpen(true)} onAdvanced={() => setAdvanced(value => !value)} onBarcode={() => { setAdvanced(false); setError(""); setScanMode("barcode"); }} onText={() => { setAdvanced(false); setError(""); setScanMode("text"); }} />
    {!showingContent && view === "home" && <HomeHero libraryCount={ownedLibrary.length} readCount={readThisYear} onLogoTap={logoTap} />}
    {view === "settings" && <SettingsPage theme={theme} setTheme={setTheme} user={user} books={library} onImport={importBooks} onDeleteLibrary={deleteLibrary} onDeleteAccount={deleteAccount} />}
    {view === "stats" && <StatisticsPage books={library}/>} 
    {view === "library" && <BookList view={view} books={scopedLibrary} library={ownedLibrary} loading={false} error="" total={scopedLibrary.length} page={1} onPage={()=>undefined} onSelect={book=>selectBook(book,"library")} onFavorite={toggleFavorite} />}
    {view === "home" && showingContent && <BookList view={view} books={results} library={ownedLibrary} loading={loading} error={error} total={total} page={page} onPage={searchBooks} onSelect={book=>selectBook(book,"search")} onFavorite={toggleFavorite} />}
    {menuOpen && <NavigationDrawer user={user} count={ownedLibrary.length} onClose={() => setMenuOpen(false)} onNavigate={navigate} onSignOut={() => signOut(auth)} />}
    {selected && <BookDetails book={selected} saved={owned(selected.id)} source={selectedSource} onClose={() => setSelected(null)} onPatch={patchBook} onRemove={removeBook} onAuthor={selectAuthor} onCategory={selectCategory} />}
    {scanMode && <BookScanner mode={scanMode} onCode={scannedCode} onClose={closeScanner} onError={scannerError} />}
    {easterEgg&&<BookEasterEgg onClose={()=>setEasterEgg(false)}/>} 
  </main>;
}
