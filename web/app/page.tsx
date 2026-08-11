import { useCallback, useEffect, useRef, useState } from "react";
import { collection, collectionGroup, deleteDoc, doc, getCountFromServer, getDocs, limit, query as firestoreQuery, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { deleteUser, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from "firebase/auth";
import { auth, db, googleProvider } from "../src/lib/firebase";
import { findBooks } from "../src/lib/books";
import type { Book, ScanMode, Shelf, Theme, View } from "../src/types";
import { LoginPage } from "../src/components/LoginPage";
import { SearchHeader } from "../src/components/SearchHeader";
import { HomeHero } from "../src/components/HomeHero";
import { SettingsPage, type InstallMode } from "../src/components/SettingsPage";
import { BookList } from "../src/components/BookList";
import { NavigationDrawer } from "../src/components/NavigationDrawer";
import { BookDetails } from "../src/components/BookDetails";
import { BookScanner } from "../src/components/BookScanner";
import { StatisticsPage } from "../src/components/StatisticsPage";
import { BookEasterEgg } from "../src/components/BookEasterEgg";
import { DiscoverPage } from "../src/components/DiscoverPage";
import { useI18n } from "../src/i18n";

type InstallPromptEvent = Event & { prompt:()=>Promise<void>; userChoice:Promise<{outcome:"accepted"|"dismissed"}> };
const ADMIN_EMAILS=["finalworld@gmail.com","sanja.kropsu@gmail.com"];

export default function Home() {
  const {t}=useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState<View>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [library, setLibrary] = useState<Book[]>([]);
  const [customShelves,setCustomShelves]=useState<Shelf[]>([]);
  const [userCount,setUserCount]=useState<number|null>(null);
  const [totalBookCount,setTotalBookCount]=useState<number|null>(null);
  const [community,setCommunity]=useState<Book[]>([]);
  const [communityLoading,setCommunityLoading]=useState(false);
  const [installPrompt,setInstallPrompt]=useState<InstallPromptEvent|null>(null);
  const [installed,setInstalled]=useState(()=>window.matchMedia("(display-mode: standalone)").matches);
  const [selected, setSelected] = useState<Book | null>(null);
  const [selectedSource, setSelectedSource] = useState<"library" | "search" | "discover">("search");
  const [libraryScope, setLibraryScope] = useState<{ kind:"author" | "category"; value:string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [scanMode, setScanMode] = useState<ScanMode | null>(null);
  const [theme, setTheme] = useState<Theme>(() => { const saved=localStorage.getItem("sunbooks-theme") as Theme|null; return saved&&saved!==("system" as Theme)?saved:"light"; });
  const [easterEgg,setEasterEgg]=useState(false);
  const logoTaps=useRef<number[]>([]);
  const lastSearchTerm=useRef("");
  const searchRequest=useRef(0);

  useEffect(() => onAuthStateChanged(auth, current => { setUser(current); setAuthReady(true); if(current)void setDoc(doc(db,"profiles",current.uid),{email:current.email?.toLowerCase()||"",displayName:current.displayName||"",lastSeenAt:serverTimestamp()},{merge:true}).then(async()=>{if(current.email&&ADMIN_EMAILS.includes(current.email.toLowerCase())){const result=await getCountFromServer(collection(db,"profiles"));setUserCount(result.data().count)}}); }), []);
  useEffect(() => {
    getRedirectResult(auth).catch(() => setAuthError(t("loginRetry")));
  }, [t]);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("sunbooks-theme", theme); }, [theme]);
  useEffect(() => {
    if (!user) { setLibrary([]);setCustomShelves([]); return; }
    Promise.all([getDocs(collection(db, "users", user.uid, "books")),getDocs(collection(db,"users",user.uid,"shelves"))])
      .then(([bookSnapshot,shelfSnapshot]) => {setLibrary(bookSnapshot.docs.map(item => item.data() as Book).sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || "")));setCustomShelves(shelfSnapshot.docs.map(item=>item.data() as Shelf).sort((a,b)=>a.name.localeCompare(b.name)))})
      .catch(() => setError("Kunde inte läsa ditt bibliotek."));
  }, [user]);
  useEffect(()=>{const handler=(event:Event)=>{event.preventDefault();setInstallPrompt(event as InstallPromptEvent)};const installedHandler=()=>{setInstalled(true);setInstallPrompt(null)};window.addEventListener("beforeinstallprompt",handler);window.addEventListener("appinstalled",installedHandler);return()=>{window.removeEventListener("beforeinstallprompt",handler);window.removeEventListener("appinstalled",installedHandler)}},[]);
  useEffect(()=>{
    const term=query.trim();
    if(term.length<=3){searchRequest.current+=1;lastSearchTerm.current="";setResults([]);setTotal(0);setError("");setLoading(false);return}
    if(term===lastSearchTerm.current)return;
    const timer=window.setTimeout(()=>void searchBooks(1,term),450);
    return()=>window.clearTimeout(timer);
    // searchBooks is a function declaration and always receives the forced current term.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[query]);

  const isAdmin=Boolean(user?.email&&ADMIN_EMAILS.includes(user.email.toLowerCase()));
  useEffect(()=>{if(!isAdmin){setUserCount(null);setTotalBookCount(null);return}Promise.all([getCountFromServer(collection(db,"profiles")),getCountFromServer(collectionGroup(db,"books"))]).then(([users,books])=>{setUserCount(users.data().count);setTotalBookCount(books.data().count)}).catch(()=>{setUserCount(null);setTotalBookCount(null)})},[isAdmin]);
  const defaultShelves:Shelf[]=[{id:"status:want_to_read",name:t("wantToRead")},{id:"status:reading",name:t("reading")},{id:"status:read",name:t("read")},{id:"status:dnf",name:t("dnf")},{id:"status:dnf_for_now",name:t("dnfForNow")}];
  const shelves=[...defaultShelves,...customShelves];
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const installMode:InstallMode=installed||window.matchMedia("(display-mode: standalone)").matches?"installed":isIOS?"ios":installPrompt?"available":"manual";

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
    const requestId=++searchRequest.current;
    lastSearchTerm.current=term;
    window.scrollTo({ top:0, behavior:"smooth" });
    setLoading(true); setError(""); setResults([]); setPage(nextPage); setView("home");
    try {
      const found = await findBooks(term, nextPage);
      if(requestId!==searchRequest.current)return;
      setResults(found.books); setTotal(found.total);
      if (!found.books.length) setError("Inga böcker hittades. Prova titel, författare eller ISBN.");
    } catch { if(requestId===searchRequest.current)setError("Kunde inte hämta böcker just nu. Försök igen om en liten stund."); }
    finally { if(requestId===searchRequest.current)setLoading(false); }
  }

  async function patchBook(book: Book, change: Partial<Book>) {
    if (!user) return;
    const existing = owned(book.id);
    const updated: Book = { ...book, ...change, addedAt: existing?.addedAt || book.addedAt || new Date().toISOString(), updatedAt:new Date().toISOString() };
    if (!existing) updated.owned = Boolean(updated.formats?.length || updated.copies?.length);
    if ("formats" in change || "copies" in change) updated.owned = Boolean(updated.formats?.length || updated.copies?.length);
    const clean = JSON.parse(JSON.stringify(updated)) as Book;
    await setDoc(doc(db, "users", user.uid, "books", book.id), clean);
    const publicEntry:Book={id:clean.id,title:clean.title,authors:clean.authors,cover:clean.cover,isbn:clean.isbn,year:clean.year,pages:clean.pages,genres:clean.genres,languages:clean.languages,owned:clean.owned,readingStatus:clean.readingStatus,rating:clean.rating,reviewPublic:clean.reviewPublic,reviewSpoiler:clean.reviewSpoiler,review:clean.reviewPublic?clean.review:undefined,updatedAt:clean.updatedAt};
    await setDoc(doc(db,"communityBooks",clean.id,"contributions",user.uid),JSON.parse(JSON.stringify(publicEntry)));
    setLibrary(current => [clean, ...current.filter(item => item.id !== book.id)]);
    setSelected(current => current?.id === book.id ? clean : current);
  }

  async function removeBook(book: Book) {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "books", book.id));
    await deleteDoc(doc(db,"communityBooks",book.id,"contributions",user.uid));
    setLibrary(current => current.filter(item => item.id !== book.id)); setSelected(null);
  }

  async function importBooks(books:Book[]){if(!user)return;for(const book of books){const clean=JSON.parse(JSON.stringify(book)) as Book;await setDoc(doc(db,"users",user.uid,"books",clean.id),clean)}setLibrary(current=>{const map=new Map(current.map(book=>[book.id,book]));books.forEach(book=>map.set(book.id,book));return Array.from(map.values())})}
  async function deleteLibrary(){if(!user)return;await Promise.all(library.map(book=>deleteDoc(doc(db,"users",user.uid,"books",book.id))));setLibrary([]);setSelected(null)}
  async function deleteAccount(){if(!user)return;await deleteLibrary();await Promise.all(customShelves.map(shelf=>deleteDoc(doc(db,"users",user.uid,"shelves",shelf.id))));await deleteDoc(doc(db,"profiles",user.uid));if(auth.currentUser)await deleteUser(auth.currentUser)}
  async function createShelf(name:string){if(!user)throw new Error("Not signed in");const existing=customShelves.find(shelf=>shelf.name.toLocaleLowerCase()===name.toLocaleLowerCase());if(existing)return existing;const shelf: Shelf={id:crypto.randomUUID(),name,custom:true,createdAt:new Date().toISOString()};await setDoc(doc(db,"users",user.uid,"shelves",shelf.id),shelf);setCustomShelves(current=>[...current,shelf].sort((a,b)=>a.name.localeCompare(b.name)));return shelf}
  async function deleteShelf(shelf:Shelf){if(!user||!shelf.custom)return;const affected=library.filter(book=>book.shelfIds?.includes(shelf.id));if(!window.confirm(`${t("deleteShelfConfirm")}\n\n${shelf.name}\n${affected.length} ${t("shelfBooksAffected")}`))return;const batch=writeBatch(db);batch.delete(doc(db,"users",user.uid,"shelves",shelf.id));affected.forEach(book=>batch.update(doc(db,"users",user.uid,"books",book.id),{shelfIds:(book.shelfIds||[]).filter(id=>id!==shelf.id),updatedAt:new Date().toISOString()}));await batch.commit();setCustomShelves(current=>current.filter(item=>item.id!==shelf.id));setLibrary(current=>current.map(book=>book.shelfIds?.includes(shelf.id)?{...book,shelfIds:book.shelfIds.filter(id=>id!==shelf.id)}:book))}
  async function installApp(){if(!installPrompt)return;await installPrompt.prompt();const choice=await installPrompt.userChoice;if(choice.outcome==="accepted")setInstallPrompt(null)}

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
    catch (error) {
      const code = (error as {code?:string})?.code || "";
      if (code === "auth/popup-blocked") {
        try { await signInWithRedirect(auth, googleProvider); }
        catch { setAuthError(t(isIOS ? "loginSafari" : "loginRetry")); }
      } else if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setAuthError(t("loginCancelled"));
      } else if (code === "auth/network-request-failed") {
        setAuthError(t("loginNetwork"));
      } else {
        setAuthError(t(isIOS ? "loginSafari" : "loginRetry"));
      }
    }
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
    if(next==="discover"){setCommunityLoading(true);getDocs(firestoreQuery(collectionGroup(db,"contributions"),limit(500))).then(snapshot=>setCommunity(snapshot.docs.map(item=>item.data() as Book))).finally(()=>setCommunityLoading(false))}
  }

  function selectBook(book:Book, source:"library" | "search" | "discover"){setSelectedSource(source);setSelected(book)}
  function selectAuthor(author:string){setSelected(null);if(selectedSource==="library"){setLibraryScope({kind:"author",value:author});setView("library")}else{setQuery(author);void searchBooks(1,author)}}
  function selectCategory(category:string){if(selectedSource!=="library")return;setSelected(null);setLibraryScope({kind:"category",value:category});setView("library")}

  function logoTap(){const now=Date.now();logoTaps.current=[...logoTaps.current.filter(time=>now-time<1800),now];if(logoTaps.current.length>=7){logoTaps.current=[];setEasterEgg(true)}}

  if (!authReady) return <main className="center"><div className="loader" /></main>;
  if (!user) return <LoginPage onLogin={login} error={authError} />;

  return <main className="app-shell">
    <SearchHeader query={query} advanced={advanced} onQuery={setQuery} onSearch={() => searchBooks(1)} onClear={() => { setQuery(""); setResults([]); setError(""); }} onMenu={() => setMenuOpen(true)} onAdvanced={() => setAdvanced(value => !value)} onBarcode={() => { setAdvanced(false); setError(""); setScanMode("barcode"); }} onText={() => { setAdvanced(false); setError(""); setScanMode("text"); }} />
    {!showingContent && view === "home" && <HomeHero libraryCount={ownedLibrary.length} readCount={readThisYear} onLogoTap={logoTap} />}
    {view === "settings" && <SettingsPage theme={theme} setTheme={setTheme} user={user} books={library} shelves={shelves} installMode={installMode} onInstall={()=>void installApp()} isAdmin={isAdmin} userCount={userCount} totalBookCount={totalBookCount} onCreateShelf={createShelf} onDeleteShelf={deleteShelf} onImport={importBooks} onDeleteLibrary={deleteLibrary} onDeleteAccount={deleteAccount} />}
    {view === "stats" && <StatisticsPage books={library}/>} 
    {view === "discover" && <DiscoverPage entries={community} loading={communityLoading} onSelect={book=>selectBook(book,"discover")}/>}
    {view === "library" && <BookList view={view} books={scopedLibrary} library={library} shelves={shelves} loading={false} error="" total={scopedLibrary.length} page={1} onPage={()=>undefined} onSelect={book=>selectBook(book,"library")} onFavorite={toggleFavorite} onCreateShelf={createShelf} onDeleteShelf={deleteShelf} />}
    {view === "home" && showingContent && <BookList view={view} books={results} library={library} shelves={shelves} loading={loading} error={error} total={total} page={page} onPage={searchBooks} onSelect={book=>selectBook(book,"search")} onFavorite={toggleFavorite} onCreateShelf={createShelf} onDeleteShelf={deleteShelf} />}
    {menuOpen && <NavigationDrawer user={user} count={ownedLibrary.length} onClose={() => setMenuOpen(false)} onNavigate={navigate} onSignOut={() => signOut(auth)} />}
    {selected && <BookDetails book={selected} saved={library.find(book=>book.id===selected.id)} source={selectedSource} communityReviews={community.filter(item=>item.id===selected.id&&item.reviewPublic&&item.review)} onClose={() => setSelected(null)} onPatch={patchBook} onRemove={removeBook} onAuthor={selectAuthor} onCategory={selectCategory} onSeries={series=>{setSelected(null);setQuery(series);void searchBooks(1,series)}} shelves={shelves} onCreateShelf={createShelf} />}
    {scanMode && <BookScanner mode={scanMode} onCode={scannedCode} onClose={closeScanner} onError={scannerError} />}
    {easterEgg&&<BookEasterEgg onClose={()=>setEasterEgg(false)}/>} 
  </main>;
}
