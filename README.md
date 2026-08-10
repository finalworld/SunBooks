# SunBooks

## Android web shell

The `shell` module is a minimal Trusted Web Activity that launches
`https://sunbooks-fe49c.web.app/` as an Android app. It uses the separately
stored signing configuration in `shell-signing.properties`; the signing key and
properties must be preserved to publish compatible updates.

Build the signed APK with `gradlew :shell:assembleRelease`.

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
