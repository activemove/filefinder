# FileFinder

FileFinder e un'app Windows portabile per esplorare, analizzare e riorganizzare file e cartelle con interfaccia HTML.

## Stato attuale

- build portabile corrente: `dist\FileFinder 1.0.0.exe`
- launcher rapido: `FileFinder.exe`
- core applicazione: `FileFinder-core.exe`
- AI locale integrata: Qwen2.5 offline

## Funzioni principali

- Esplora stile filesystem con click, doppio click, menu contestuale e ordinamenti
- Ambito persistente tra `Panoramica`, `Struttura`, `Duplicati`, `Pulizia` e `Protocollazione`
- Analisi reale di dimensioni, file grandi, duplicati, temporanei e cartelle app/progetto
- Contenitori drag and drop per spostare file e cartelle senza ricaricare la vista
- Anteprima locale per immagini, PDF, testo, DOCX e XLSX quando il file e disponibile offline
- Protocollazione e rinomina massiva basata su formula e metadati
- Protocollo attivita esportabile in JSON

## Avvio

1. Avvia `FileFinder.exe`.
2. Apri una cartella oppure entra in `Questo PC`.
3. Seleziona file o cartelle in `Esplora`.
4. Passa a `Panoramica`, `Struttura`, `Duplicati`, `Pulizia` o `Protocollazione`: useranno lo stesso ambito attivo.

## Note

- I file protetti di sistema non vengono proposti per rinomina o pulizia.
- Le eliminazioni passano dal Cestino di Windows.
- I file cloud solo online possono non avere anteprima o dimensione completa finche non diventano disponibili offline.

## Sviluppo

Usa Electron 31 e `electron-builder` per generare la build portabile Windows.
