import { Camera, ChevronRight, Menu, ScanText, Search, X } from "lucide-react";

type Props = {
  query: string; advanced: boolean;
  onQuery: (value: string) => void; onSearch: () => void; onClear: () => void;
  onMenu: () => void; onAdvanced: () => void; onBarcode: () => void; onText: () => void;
};

export function SearchHeader(props: Props) {
  return <>
    <header className="topbar">
      <button className="icon-button menu-button" onClick={props.onMenu} aria-label="Öppna meny"><Menu /></button>
      <form className="search-form" onSubmit={event => { event.preventDefault(); props.onSearch(); }}>
        <Search aria-hidden="true" />
        <input value={props.query} onChange={event => props.onQuery(event.target.value)} placeholder="Sök titel, författare, ISBN eller ASIN" aria-label="Sök böcker" />
        {props.query && <button type="button" className="clear" onClick={props.onClear} aria-label="Rensa sökning"><X /></button>}
      </form>
    </header>
    <div className="advanced-row"><button onClick={props.onAdvanced}>Avancerat <span>{props.advanced ? "−" : "+"}</span></button></div>
    {props.advanced && <section className="advanced-panel">
      <button className="scan-card" onClick={props.onBarcode}><Camera /><span><strong>Skanna en bok</strong><small>ISBN eller streckkod med kameran</small></span><ChevronRight /></button>
      <button className="scan-card" onClick={props.onText}><ScanText /><span><strong>Skanna ISBN/ASIN som text</strong><small>Läs av koden från en läsplatta eller skärm</small></span><ChevronRight /></button>
      <p>Du kan också skriva ISBN eller ASIN direkt i sökfältet.</p>
    </section>}
  </>;
}
