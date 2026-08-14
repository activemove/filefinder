# FileFinder

FileFinder è un'applicazione Windows portabile per esplorare, analizzare, pulire e riorganizzare file e cartelle con interfaccia HTML ed intelligenza artificiale locale offline (Qwen2.5).

- **Sito Ufficiale Prodotto**: [https://www.dandreaconsulenze.com/filefinder/](https://www.dandreaconsulenze.com/filefinder/)
- **Sviluppato da**: D'Andrea Consulenze (DAMC) — [https://www.dandreaconsulenze.com](https://www.dandreaconsulenze.com) | [https://www.damc.it](https://www.damc.it)

## Stato attuale

- **Versione corrente**: 1.0.9 Portabile Windows x64
- **Launcher rapido**: `FileFinder.exe`
- **Core applicazione**: `FileFinder-core.exe`
- **AI locale integrata**: Qwen2.5 offline via `llama-server`

## Funzioni principali

- Esplora stile filesystem con click, doppio click, menu contestuale e ordinamenti
- Ambito persistente tra `Panoramica`, `Struttura`, `Duplicati`, `Pulizia` e `Protocollazione`
- Analisi reale di dimensioni, file grandi, duplicati SHA-256, temporanei e cartelle app/progetto
- Contenitori drag and drop per spostare file e cartelle senza ricaricare la vista
- Anteprima locale per immagini, PDF, testo, DOCX e XLSX quando il file è disponibile offline
- Protocollazione e rinomina massiva basata su formula e metadati
- AI locale offline (Qwen2.5 1.5B) per assistenza contestuale, ricerca avanzata e suggerimenti
- Protocollo attività esportabile in JSON

## Avvio

1. Avvia `FileFinder.exe`.
2. Apri una cartella oppure entra in `Questo PC`.
3. Seleziona file o cartelle in `Esplora`.
4. Passa a `Panoramica`, `Struttura`, `Duplicati`, `Pulizia` o `Protocollazione`: useranno lo stesso ambito attivo.

## Note

- I file protetti di sistema non vengono proposti per rinomina o pulizia.
- Le eliminazioni passano dal Cestino di Windows.
- I file cloud solo online possono non avere anteprima o dimensione completa finché non diventano disponibili offline.

## Sviluppo & Licenza

Usa Electron 31 e C# Native Launcher. Distribuito sotto licenza **MIT Open Source**.

