export function HomeHero({ libraryCount, readCount = 0 }: { libraryCount: number; readCount?: number }) {
  return <section className="hero">
    <img src="/sunbooks-logo.png" alt="SunBooks – böcker och en varm kopp" />
    <p>Böcker jag läst i år</p><strong>{readCount}</strong>
    <span>{libraryCount} {libraryCount === 1 ? "bok" : "böcker"} i biblioteket</span>
  </section>;
}
