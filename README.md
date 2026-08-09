# SunBooks

Androidapp för att söka efter böcker och hålla ordning på ett personligt bibliotek.

## Version 0.1.1

- fungerande sökning via Open Library utan API-nyckel
- sökresultat med omslag, titel och författare
- ISBN-streckkodsskanning samt OCR för ISBN/ASIN-text
- bokdetaljer och permanent lokalt sparade val för fysisk bok, e-bok och ljudbok
- Mitt bibliotek, Statistik och Inställningar
- ljust beige och mörkgrått tema
- 20 sökresultat per sida
- responsiv startsida för större systemtext

## Bygga

Öppna projektet i Android Studio eller kör:

```powershell
.\gradlew.bat assembleDebug
```

Firebase/Google-inloggning aktiveras i ett senare steg när projektets `google-services.json` finns.
