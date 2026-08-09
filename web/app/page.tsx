import { useCallback, useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from "firebase/auth";
import { auth, db, googleProvider } from "../src/lib/firebase";
import { findBooks } from "../src/lib/books";
import type { Book, BookFormat, ReadingStatus, ScanMode, Theme, View } from "../src/types";
import { LoginPage } from "../src/components/LoginPage";
import { SearchHeader } from "../src/components/SearchHeader";
import { HomeHero } from "../src/components/HomeHero";
import { SettingsPage } from "../src/components/SettingsPage";
import { BookList } from "../src/components/BookList";
import { NavigationDrawer } from "../src/components/NavigationDrawer";
import { BookDetails } from "../src/components/BookDetails";
import { BookScanner } from "../src/components/BookScanner";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [scanMode, setScanMode] = useState<ScanMode | null>(null);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("sunbooks-theme") as Theme) || "system");

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
  const visibleBooks = view === "library" ? library : results;
  const showingContent = view === "library" || results.length > 0 || loading || Boolean(error);

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

  async function saveBook(book: Book, formats: BookFormat[], favorite = false) {
    if (!user) return;
    const saved = { ...book, formats, favorite, addedAt: owned(book.id)?.addedAt || new Date().toISOString() };
    await setDoc(doc(db, "users", user.uid, "books", book.id), saved);
    setLibrary(current => [saved, ...current.filter(item => item.id !== book.id)]); setSelected(saved);
  }

  async function removeBook(book: Book) {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "books", book.id));
    setLibrary(current => current.filter(item => item.id !== book.id)); setSelected(null);
  }

  async function toggleFavorite(book: Book) {
    const saved = owned(book.id);
    if (!saved) { setSelected(book); return; }
    await saveBook(saved, saved.formats || ["physical"], !saved.favorite);
  }

  async function changeReadingStatus(book: Book, readingStatus?: ReadingStatus) {
    if (!user) return;
    const updated = { ...book, readingStatus };
    await setDoc(doc(db, "users", user.uid, "books", book.id), updated);
    setLibrary(current => current.map(item => item.id === book.id ? updated : item));
    setSelected(updated);
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
    if (next === "home") { setResults([]); setError(""); }
  }

  if (!authReady) return <main className="center"><div className="loader" /></main>;
  if (!user) return <LoginPage onLogin={login} error={authError} />;

  return <main className="app-shell">
    <SearchHeader query={query} advanced={advanced} onQuery={setQuery} onSearch={() => searchBooks(1)} onClear={() => { setQuery(""); setResults([]); setError(""); }} onMenu={() => setMenuOpen(true)} onAdvanced={() => setAdvanced(value => !value)} onBarcode={() => { setAdvanced(false); setError(""); setScanMode("barcode"); }} onText={() => { setAdvanced(false); setError(""); setScanMode("text"); }} />
    {!showingContent && view === "home" && <HomeHero libraryCount={library.length} />}
    {view === "settings" && <SettingsPage theme={theme} setTheme={setTheme} user={user} />}
    {(view === "library" || showingContent) && view !== "settings" && <BookList view={view} books={visibleBooks} library={library} loading={loading} error={error} total={total} page={page} onPage={searchBooks} onSelect={setSelected} onFavorite={toggleFavorite} />}
    {menuOpen && <NavigationDrawer user={user} count={library.length} onClose={() => setMenuOpen(false)} onNavigate={navigate} onSignOut={() => signOut(auth)} />}
    {selected && <BookDetails book={selected} saved={owned(selected.id)} onClose={() => setSelected(null)} onSave={saveBook} onStatusChange={changeReadingStatus} onRemove={removeBook} />}
    {scanMode && <BookScanner mode={scanMode} onCode={scannedCode} onClose={closeScanner} onError={scannerError} />}
  </main>;
}
