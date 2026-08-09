# SunBooks

SunBooks är ett personligt bibliotek för att söka, skanna och hålla ordning på böcker.

## Webbversion

Den publicerade webbappen finns på [sunbooks-fe49c.web.app](https://sunbooks-fe49c.web.app).

- Google-inloggning
- privat bibliotek per användare i Firebase Firestore
- sökning via Open Library med 20 resultat per sida
- ISBN- och streckkodsskanning med mobilens kamera
- bokdetaljer och flera ägda format: fysisk bok, e-bok och ljudbok
- favoriter, Mitt bibliotek samt ljust, mörkt och systemstyrt tema
- responsiv layout för dator, Android och iPhone

Bygg webbversionen med:

```powershell
cd web
pnpm install
pnpm test
```

## Android

Den tidigare Android-appen finns kvar i samma projekt och har inte tagits bort. Bygg den med Android Studio eller:

```powershell
.\gradlew.bat assembleDebug
```
