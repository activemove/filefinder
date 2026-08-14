# Distribuzione e aggiornamenti FileFinder

## Pacchetto portabile

Distribuire una cartella ZIP contenente almeno:

- `FileFinder.exe`
- `FileFinder-core.exe`
- cartella `ai` completa
- `filefinder.ico` e `filefinder-logo.png`
- `LICENSE`

L'utente estrae la cartella in una posizione scrivibile e avvia `FileFinder.exe`. Non e richiesta installazione. Non distribuire indici locali, log, file temporanei o dati analizzati.

## Servizi gratuiti consigliati

1. **GitHub Releases**: ospita ZIP, manifest e note di rilascio. Adatto a versioni del programma e modelli AI separati.
2. **GitHub Pages**: pagina pubblica gratuita con istruzioni, privacy, licenza e link alla release stabile.
3. **Cloudflare Pages**: specchio gratuito della pagina download. I file grandi restano preferibilmente nelle GitHub Releases.

Il modello AI supera spesso i limiti dei normali repository Git. Pubblicarlo come asset di una Release separata oppure dividerlo in archivi numerati.

### GitHub

GitHub Releases accetta fino a 1000 asset per release; ogni asset deve restare sotto 2 GiB. Il modello GGUF attuale puo quindi essere pubblicato come asset separato senza inserirlo nella cronologia Git. Il repository normale blocca invece i file oltre 100 MiB.

### Microsoft Store

Nel nuovo flusso avviato da `storedeveloper.microsoft.com` la registrazione e gratuita per account Individual e Company, previa verifica dell'identita. Per FileFinder e consigliato creare un pacchetto **MSIX**: Microsoft applica la firma durante la pubblicazione e gestisce gli aggiornamenti. La versione portabile EXE puo essere pubblicata come applicazione Win32, ma l'installer e i relativi file PE devono essere firmati con un certificato attendibile; per questo MSIX e la strada iniziale piu semplice.

Prima della candidatura allo Store:

1. assegnare una versione stabile almeno `1.0.0`;
2. generare MSIX x64 e verificare installazione/disinstallazione in Windows Sandbox;
3. dichiarare accesso al filesystem, elaborazione locale e modello AI incluso;
4. pubblicare privacy policy e condizioni su GitHub Pages o `www.damc.it`;
5. preparare icona Store, screenshot, descrizione, requisiti e contatto assistenza;
6. verificare che la dimensione del pacchetto con modello AI rispetti i limiti indicati da Partner Center;
7. inviare la release alla certificazione e mantenere GitHub Releases come canale portabile alternativo.

## Versionamento

Usare versioni distinte:

- applicazione: `FileFinder 1.0.0`
- motore AI: `llama.cpp b10173`
- modello: `Qwen2.5-1.5B Q4_K_M 1.0`

Ogni release deve includere SHA-256, dimensione, data, compatibilita minima e note. Non sostituire un file gia pubblicato mantenendo lo stesso numero di versione.

## Aggiornamento programma

1. Chiudere FileFinder dal tray con **Chiudi tutto**.
2. Fare una copia di `FileFinder.exe` e `FileFinder-core.exe` nella cartella `backup`.
3. Scaricare la nuova release e verificare SHA-256.
4. Sostituire esclusivamente i due eseguibili e gli asset dichiarati nelle note.
5. Avviare FileFinder e verificare versione, AI e apertura di una cartella di prova.
6. In caso di errore, chiudere tutto e ripristinare il backup.

Gli indici in `%LOCALAPPDATA%\FileFinder` non devono essere cancellati salvo incompatibilita dichiarata.

## Aggiornamento AI

1. Chiudere FileFinder e verificare che `llama-server.exe` non sia attivo.
2. Salvare una copia della cartella `ai`.
3. Verificare hash e nome esatto del nuovo modello GGUF.
4. Sostituire runtime e modello come gruppo compatibile, senza mescolare DLL di release diverse.
5. Aggiornare il nome modello nel launcher se cambia il file GGUF.
6. Avviare e attendere il segno verde **AI locale funzionante**.
7. Provare Ricerca AI e Protocollazione AI prima della distribuzione.

## Sicurezza della release

- Pubblicare sempre gli SHA-256 su una pagina HTTPS separata dall'archivio.
- Conservare almeno una release precedente per rollback.
- Non effettuare aggiornamenti automatici silenziosi.
- Mostrare all'utente versione, dimensione e modifiche prima del download.
- Firmare gli eseguibili con Authenticode quando sara disponibile un certificato; la distribuzione gratuita senza firma puo generare avvisi SmartScreen.
