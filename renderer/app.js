const state = {
  root: null,
  roots: JSON.parse(localStorage.getItem('filefinder:workspaceRoots') || '[]'),
  report: null,
  activeView: 'explorer',
  currentPath: null,
  directory: null,
  history: [],
  contextItem: null,
  selectedItem: null,
  selectedPaths: new Set(),
  activeScopePaths: JSON.parse(localStorage.getItem('filefinder:activeScopePaths') || '[]'),
  selectionAnchor: null,
  folderSizes: new Map(),
  clickTimer: null,
  sortBy: 'name',
  sortDirection: 1,
  containers: JSON.parse(localStorage.getItem('filefinder:containers') || '[]'),
  draggedPaths: [],
  sizeHydration: 0,
  selectedTemps: new Set(),
  namingFiles: null,
  namingRoot: null
  ,pathReports: new Map()
  ,analysisFindings: new Map()
  ,thumbnailPage: 0
  ,fileClipboard: { paths: [], cut: false }
  ,selectedDuplicates: new Set()
};

const els = {
  pickFolder: document.querySelector('#pickFolder'),
  scanFolder: document.querySelector('#scanFolder'),
  selectedPath: document.querySelector('#selectedPath'),
  status: document.querySelector('#status'),
  emptyState: document.querySelector('#emptyState'),
  exportProtocol: document.querySelector('#exportProtocol'),
  openApps: document.querySelector('#openApps'),
  maxFiles: document.querySelector('#maxFiles'),
  hashLimit: document.querySelector('#hashLimit'),
  viewTitle: document.querySelector('#viewTitle'),
  workspaceRoots: document.querySelector('#workspaceRoots'),
  addWorkspace: document.querySelector('#addWorkspace'),
  tabs: Array.from(document.querySelectorAll('.tab')),
  views: Array.from(document.querySelectorAll('.view')),
  metricFiles: document.querySelector('#metricFiles'),
  metricFolders: document.querySelector('#metricFolders'),
  metricSize: document.querySelector('#metricSize'),
  metricErrors: document.querySelector('#metricErrors'),
  metricRecoverable: document.querySelector('#metricRecoverable'),
  suggestions: document.querySelector('#suggestions'),
  largestFiles: document.querySelector('#largestFiles'),
  extensionChart: document.querySelector('#extensionChart'),
  folderTree: document.querySelector('#folderTree'),
  structureSummary: document.querySelector('#structureSummary'),
  structureRoot: document.querySelector('#structureRoot'),
  structurePlan: document.querySelector('#structurePlan'),
  structureAudit: document.querySelector('#structureAudit'),
  duplicateList: document.querySelector('#duplicateList'),
  tempFiles: document.querySelector('#tempFiles'),
  trashSelected: document.querySelector('#trashSelected'),
  appFolders: document.querySelector('#appFolders'),
  searchInput: document.querySelector('#searchInput'),
  searchType: document.querySelector('#searchType'),
  searchResults: document.querySelector('#searchResults'),
  searchCategory: document.querySelector('#searchCategory'),
  searchMinSize: document.querySelector('#searchMinSize'),
  searchMaxSize: document.querySelector('#searchMaxSize'),
  searchFrom: document.querySelector('#searchFrom'),
  searchTo: document.querySelector('#searchTo'),
  searchSort: document.querySelector('#searchSort'),
  searchContent: document.querySelector('#searchContent'),
  searchStatus: document.querySelector('#searchStatus'),
  addContainer: document.querySelector('#addContainer'),
  containerList: document.querySelector('#containerList'),
  protocolList: document.querySelector('#protocolList'),
  goBack: document.querySelector('#goBack'),
  goComputer: document.querySelector('#goComputer'),
  goUp: document.querySelector('#goUp'),
  refreshFolder: document.querySelector('#refreshFolder'),
  breadcrumbs: document.querySelector('#breadcrumbs'),
  fileBrowser: document.querySelector('#fileBrowser'),
  selectAllItems: document.querySelector('#selectAllItems'),
  contextMenu: document.querySelector('#contextMenu'),
  analysisProgress: document.querySelector('#analysisProgress'),
  progressPhase: document.querySelector('#progressPhase'),
  progressDetail: document.querySelector('#progressDetail'),
  progressBar: document.querySelector('#progressBar'),
  progressCounts: document.querySelector('#progressCounts')
};

Object.assign(els, {
  operationOverlay: document.querySelector('#operationOverlay'), operationTitle: document.querySelector('#operationTitle'),
  operationSource: document.querySelector('#operationSource'), operationDestination: document.querySelector('#operationDestination'),
  operationBar: document.querySelector('#operationBar'), operationStatus: document.querySelector('#operationStatus'),
  operationSpinner: document.querySelector('#operationSpinner'), operationClose: document.querySelector('#operationClose')
  ,inspectorPreview: document.querySelector('#inspectorPreview'), inspectorPreviewImage: document.querySelector('#inspectorPreviewImage'), inspectorPreviewDocument: document.querySelector('#inspectorPreviewDocument'), inspectorPreviewText: document.querySelector('#inspectorPreviewText'), inspectorPreviewMessage: document.querySelector('#inspectorPreviewMessage')
  ,inspectorThumbnails: document.querySelector('#inspectorThumbnails'), previewTitle: document.querySelector('#previewTitle'), thumbnailPage: document.querySelector('#thumbnailPage'), thumbnailPrev: document.querySelector('#thumbnailPrev'), thumbnailNext: document.querySelector('#thumbnailNext')
});
els.thumbnailPrev.addEventListener('click', () => { state.thumbnailPage = Math.max(0, state.thumbnailPage - 1); renderSelectionThumbnails(); });
els.thumbnailNext.addEventListener('click', () => { state.thumbnailPage += 1; renderSelectionThumbnails(); });
els.operationClose.addEventListener('click', () => els.operationOverlay.classList.add('hidden'));

Object.assign(els, {
  selectionBanner: document.querySelector('#selectionBanner'),
  selectionIcon: document.querySelector('#selectionIcon'),
  selectionName: document.querySelector('#selectionName'),
  selectionPath: document.querySelector('#selectionPath'),
  selectionType: document.querySelector('#selectionType'),
  selectionSize: document.querySelector('#selectionSize'),
  selectionModified: document.querySelector('#selectionModified')
});

Object.assign(els, {
  inspectorEmpty: document.querySelector('#inspectorEmpty'),
  inspectorContent: document.querySelector('#inspectorContent'),
  inspectorIcon: document.querySelector('#inspectorIcon'),
  inspectorName: document.querySelector('#inspectorName'),
  inspectorPath: document.querySelector('#inspectorPath'),
  inspectorSizeBar: document.querySelector('#inspectorSizeBar'),
  inspectorSize: document.querySelector('#inspectorSize'),
  inspectorFacts: document.querySelector('#inspectorFacts'),
  inspectorFlags: document.querySelector('#inspectorFlags'),
  inspectOpen: document.querySelector('#inspectOpen'),
  inspectReveal: document.querySelector('#inspectReveal'),
  inspectTrash: document.querySelector('#inspectTrash')
});

Object.assign(els, { sortBy: document.querySelector('#sortBy'), sortDirection: document.querySelector('#sortDirection'), inspectorDonut: document.querySelector('#inspectorDonut'), inspectorPercent: document.querySelector('#inspectorPercent'), inspectorCompare: document.querySelector('#inspectorCompare') });
Object.assign(els, { goCleanup: document.querySelector('#goCleanup'), trashDuplicates: document.querySelector('#trashDuplicates'), tempWaste: document.querySelector('#tempWaste'), duplicateWaste: document.querySelector('#duplicateWaste'), totalWaste: document.querySelector('#totalWaste') });
els.goCleanup.addEventListener('click', () => setView('cleanup'));
els.trashDuplicates.addEventListener('click', async () => {
  const files = Array.from(state.selectedDuplicates);
  if (!files.length) return;
  const fullySelected = state.report.duplicateGroups.find((group) => group.files.every((file) => state.selectedDuplicates.has(file.path)));
  if (fullySelected) { alert('Devi lasciare almeno una copia per ogni gruppo. Deseleziona il file che vuoi conservare.'); return; }
  if (!confirm(`Spostare ${files.length} copie duplicate verificate nel Cestino? Almeno una copia per gruppo verra conservata.`)) return;
  const results = await window.filefinder.deleteTempFiles(files);
  const removed = new Set(results.filter((item) => item.ok).map((item) => item.path));
  const recovered = state.report.files.filter((file) => removed.has(file.path)).reduce((sum, file) => sum + file.size, 0);
  state.report.files = state.report.files.filter((file) => !removed.has(file.path));
  state.report.duplicateGroups = state.report.duplicateGroups.map((group) => ({ ...group, files: group.files.filter((file) => !removed.has(file.path)) })).filter((group) => group.files.length > 1);
  state.selectedDuplicates.clear();
  state.report.protocol.push({ at: new Date().toISOString(), type: 'pulizia-duplicati', path: state.report.root, message: `${removed.size} copie spostate nel Cestino, ${bytes(recovered)} liberati` });
  renderAll();
  setStatus(`${removed.size} copie spostate nel Cestino`);
});
els.sortBy.addEventListener('change', () => { state.sortBy = els.sortBy.value; renderExplorer(); });
els.sortDirection.addEventListener('click', () => { state.sortDirection *= -1; els.sortDirection.innerHTML = state.sortDirection === 1 ? '&#8593;' : '&#8595;'; renderExplorer(); });
els.addContainer.addEventListener('click', async () => {
  const folder = await window.filefinder.selectContainer();
  if (!folder || state.containers.includes(folder)) return;
  state.containers.push(folder);
  saveContainers();
  renderContainers();
});
els.containerList.addEventListener('dragover', (event) => {
  if (event.target.closest('.container-tile')) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'link';
  els.containerList.classList.add('drag-over-empty');
});
els.containerList.addEventListener('dragleave', (event) => {
  if (!els.containerList.contains(event.relatedTarget)) els.containerList.classList.remove('drag-over-empty');
});
els.containerList.addEventListener('drop', (event) => {
  if (event.target.closest('.container-tile')) return;
  event.preventDefault();
  els.containerList.classList.remove('drag-over-empty');
  const source = state.draggedPaths[0] || event.dataTransfer.getData('text/plain');
  const item = state.directory?.items.find((entry) => entry.path === source);
  if (!source || item?.kind !== 'folder' || state.containers.includes(source)) {
    setStatus('Per creare un contenitore trascina qui una cartella.');
    return;
  }
  state.containers.push(source);
  saveContainers();
  renderContainers();
  setStatus(`Contenitore aggiunto: ${item.name}`);
});

document.querySelector('#appCredits').addEventListener('click', () => {
  window.filefinder.openExternal('https://www.damc.it');
});
document.querySelector('#creditsLink').addEventListener('click', () => window.filefinder.openExternal('https://www.damc.it'));
document.querySelector('#licenseLink').addEventListener('click', () => window.filefinder.openExternal('https://opensource.org/license/mit'));
document.querySelector('#downloadLink').addEventListener('click', () => window.filefinder.openExternal('https://www.damc.it/filefinder'));
const creditsDonation = document.createElement('div');
creditsDonation.className = 'credits-donation';
creditsDonation.innerHTML = '<dt>Sostieni FileFinder</dt><dd><button id="donatePayPal" class="donate-button">Dona con PayPal</button><small>Contributo volontario per sviluppo e aggiornamenti.</small></dd>';
document.querySelector('.credits-page dl').append(creditsDonation);
document.querySelector('#donatePayPal').addEventListener('click', () => window.filefinder.openExternal('https://www.paypal.com/donate/?hosted_button_id=YPKJW5VY5CQEJ'));
document.querySelector('#clearActivity').addEventListener('click', () => { els.protocolList.innerHTML = empty('Dettagli nascosti. Le nuove attivita appariranno qui.'); });

const firstRunNotice = document.querySelector('#firstRunNotice');
const acceptResponsibility = document.querySelector('#acceptResponsibility');
const acceptTelemetry = document.querySelector('#acceptTelemetry');
const acceptNotice = document.querySelector('#acceptNotice');
if (localStorage.getItem('filefinder:responsibilityAccepted') !== '1') firstRunNotice.classList.remove('hidden');
acceptResponsibility.addEventListener('change', () => { acceptNotice.disabled = !acceptResponsibility.checked; });
acceptNotice.addEventListener('click', () => {
  if (!acceptResponsibility.checked) return;
  localStorage.setItem('filefinder:responsibilityAccepted', '1');
  localStorage.setItem('filefinder:responsibilityAcceptedAt', new Date().toISOString());
  localStorage.setItem('filefinder:telemetryConsent', acceptTelemetry.checked ? '1' : '0');
  firstRunNotice.classList.add('hidden');
  renderCredits();
  if (acceptTelemetry.checked) sendUsageEvent('first_open');
});

function sendUsageEvent(event) {
  if (localStorage.getItem('filefinder:telemetryConsent') !== '1') return;
  let installationId = localStorage.getItem('filefinder:installationId');
  if (!installationId) { installationId = crypto.randomUUID(); localStorage.setItem('filefinder:installationId', installationId); }
  window.filefinder.sendTelemetry({ event, installationId }).catch(() => {});
}

async function renderCredits() {
  const accepted = localStorage.getItem('filefinder:responsibilityAccepted') === '1';
  const acceptedAt = localStorage.getItem('filefinder:responsibilityAcceptedAt');
  const telemetry = localStorage.getItem('filefinder:telemetryConsent') === '1';
  document.querySelector('#creditsResponsibility').textContent = accepted
    ? `Accettata${acceptedAt ? ` il ${new Date(acceptedAt).toLocaleString('it-IT')}` : ''}`
    : 'Non ancora accettata';
  document.querySelector('#creditsTelemetry').textContent = telemetry ? 'Consentite' : 'Non consentite';
  try {
    const info = await window.filefinder.appInfo();
    document.querySelector('#creditsVersion').textContent = `${info.version} · Windows x64 portabile`;
  } catch (_error) { document.querySelector('#creditsVersion').textContent = 'Versione non disponibile'; }
}
renderCredits();
sendUsageEvent('app_start');

const aiUi = createAiControls();
createContextAiPanels();
const originalNameToken = document.querySelector('[data-token="{nome}"]');
if (originalNameToken && !document.querySelector('[data-token="{nome_file}"]')) {
  const nameFileToken = document.createElement('button');
  nameFileToken.dataset.token = '{nome_file}'; nameFileToken.textContent = '{nome_file}';
  originalNameToken.before(nameFileToken);
}
createManualPage();

function createManualPage() {
  const creditsTab = document.querySelector('[data-view="credits"]');
  const tab = document.createElement('button');
  tab.className = 'tab'; tab.dataset.view = 'manual'; tab.innerHTML = '<span>?</span> Manuale';
  creditsTab.before(tab); els.tabs.splice(els.tabs.length - 1, 0, tab);
  const section = document.createElement('section'); section.id = 'manual'; section.className = 'view hidden';
  section.innerHTML = `<section class="manual-page"><header><h2>Manuale d'uso</h2><p>Procedure essenziali per organizzare il filesystem senza perdere il controllo delle operazioni.</p></header><nav class="manual-index"><a href="#manual-explore">Esplorare</a><a href="#manual-select">Selezionare</a><a href="#manual-space">Spazio</a><a href="#manual-duplicates">Duplicati</a><a href="#manual-cleanup">Pulizia</a><a href="#manual-structure">Struttura</a><a href="#manual-naming">Protocollazione</a><a href="#manual-ai">AI locale</a></nav><div class="manual-grid"><article id="manual-explore"><span>01</span><h3>Esplorare</h3><p>Apri una cartella oppure parti da Questo PC. Un clic seleziona, doppio clic entra in una cartella o apre un file, triplo clic apre la cartella con Windows.</p></article><article id="manual-select"><span>02</span><h3>Selezionare</h3><p>Ctrl + clic aggiunge o rimuove singoli elementi. Shift + clic seleziona un intervallo. La casella nell'intestazione seleziona o deseleziona tutto.</p></article><article id="manual-space"><span>03</span><h3>Capire lo spazio</h3><p>Il pannello laterale confronta la selezione con la dimensione totale conosciuta della cartella. Panoramica mostra file grandi, tipi pesanti e spazio potenzialmente recuperabile.</p></article><article id="manual-duplicates"><span>04</span><h3>Duplicati</h3><p>I duplicati certi hanno stessa dimensione e stesso SHA-256. Seleziona le copie da eliminare lasciandone almeno una per gruppo.</p></article><article id="manual-cleanup"><span>05</span><h3>Pulizia sicura</h3><p>Verde indica basso rischio; arancione richiede controllo manuale; protetto non e selezionabile. FileFinder usa il Cestino quando Windows lo consente.</p></article><article id="manual-structure"><span>06</span><h3>Struttura professionale</h3><p>Confronta albero attuale e proposta. La logica consigliata raggruppa per ambito, cliente, anno e classe documentale senza spostare nulla automaticamente.</p></article><article id="manual-naming"><span>07</span><h3>Protocollazione</h3><p>Controlla sempre l'anteprima. {nome_file} conserva il nome originale; {cliente} funziona solo quando riconosciuto. I nomi gia coerenti non vengono rinominati.</p></article><article id="manual-ai"><span>08</span><h3>AI locale</h3><p>Qwen2.5 lavora offline. I suggerimenti aiutano a classificare e cercare, ma non autorizzano eliminazioni automatiche.</p></article></div><aside class="manual-warning"><strong>Regola fondamentale</strong><span>Prima di spostare, rinominare o eliminare grandi quantita di dati, verifica l'anteprima e mantieni un backup aggiornato.</span></aside></section>`;
  document.querySelector('.workspace').append(section); els.views.push(section);
  tab.addEventListener('click', () => setView('manual'));
}
async function refreshAiStatus(attempt = 0) {
  const status = await window.filefinder.aiStatus();
  aiUi.searchButton.disabled = !status.available;
  aiUi.namingButton.disabled = !status.available;
  const message = status.available ? 'AI locale attiva · Qwen2.5 offline' : status.downloaded ? 'AI locale in avvio...' : 'AI locale non scaricata';
  aiUi.searchLabel.textContent = message;
  aiUi.namingLabel.textContent = message;
  aiUi.searchLabel.classList.toggle('active', status.available);
  aiUi.namingLabel.classList.toggle('active', status.available);
  
  document.querySelectorAll('.ai-health').forEach((badge) => {
    badge.classList.toggle('ready', status.available);
    badge.classList.toggle('loading', !status.available && status.downloaded && attempt < 30);
    badge.classList.toggle('error', !status.available && !status.downloaded);
    const strong = badge.querySelector('strong');
    if (status.available) {
      strong.textContent = 'AI locale funzionante - Qwen2.5 offline';
    } else if (status.downloaded && attempt < 30) {
      strong.textContent = 'AI locale in caricamento...';
    } else if (!status.downloaded) {
      strong.innerHTML = 'AI locale non scaricata <button id="btnDownloadAiInApp" class="mini-button" style="margin-left: 8px; font-size: 0.75rem;">Scarica AI (1.1GB)</button>';
      const btn = strong.querySelector('#btnDownloadAiInApp');
      if (btn) {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.textContent = 'Scaricamento 0%...';
          window.filefinder.onAiDownloadProgress((prog) => {
            btn.textContent = `Scaricamento ${prog.percent}%...`;
          });
          try {
            await window.filefinder.downloadAI();
            strong.textContent = 'Download completato! Avvio AI...';
            setTimeout(() => refreshAiStatus(0), 3000);
          } catch (err) {
            btn.disabled = false;
            btn.textContent = 'Riprova Download AI';
            alert('Errore durante il download dell AI: ' + err.message);
          }
        });
      }
    } else {
      strong.textContent = 'AI locale non disponibile';
    }
  });
  if (!status.available && status.downloaded && attempt < 30) setTimeout(() => refreshAiStatus(attempt + 1), 1000);
}

function createAiControls() {
  const searchStrip = document.createElement('div'); searchStrip.className = 'ai-strip';
  const searchLabel = document.createElement('span'); const searchButton = document.createElement('button');
  searchButton.className = 'mini-button'; searchButton.textContent = 'Interpreta ricerca'; searchButton.disabled = true;
  searchStrip.append(searchLabel, searchButton); els.searchStatus.after(searchStrip);
  const namingStrip = document.createElement('div'); namingStrip.className = 'ai-strip';
  const namingLabel = document.createElement('span'); const namingButton = document.createElement('button');
  namingButton.className = 'ghost-action'; namingButton.textContent = 'Suggerisci formula AI'; namingButton.disabled = true;
  namingStrip.append(namingLabel, namingButton); document.querySelector('.naming-help').before(namingStrip);
  searchButton.addEventListener('click', interpretSearchWithAi);
  namingButton.addEventListener('click', suggestNamingWithAi);
  return { searchLabel, searchButton, namingLabel, namingButton };
}

function createContextAiPanels() {
  const labels = {
    explorer: ['Assistente Esplora', 'Spiega la selezione e suggerisci come organizzarla'],
    dashboard: ['Analisi intelligente', 'Individua dove si concentra lo spazio occupato'],
    tree: ['Organizzazione AI', 'Trova cartelle anomale, profonde o poco ordinate'],
    cleanup: ['Consigli di pulizia AI', 'Valuta candidati, rischi e spazio recuperabile'],
    search: ['Ricerca intelligente', 'Interpreta nome, contenuto, data, tipo e dimensione'],
    naming: ['Protocollazione AI', 'Proponi una formula coerente dai nomi e metadati']
  };
  Object.entries(labels).forEach(([view, copy]) => {
    const section = document.querySelector(`#${view}`);
    if (!section) return;
    const panel = document.createElement('section');
    panel.className = 'context-ai';
    panel.innerHTML = `<div><span class="ai-context-mark">AI</span><p><strong>${copy[0]}</strong><small>${copy[1]}</small></p></div><button class="ghost-action">Analizza</button><output>Seleziona Analizza per ricevere un suggerimento locale.</output>`;
    section.prepend(panel);
    panel.querySelector('button').addEventListener('click', () => runContextAi(view, panel));
  });
}

async function runContextAi(view, panel) {
  const button = panel.querySelector('button');
  const output = panel.querySelector('output');
  const selected = Array.from(state.selectedPaths).map((selectedPath) => state.directory?.items.find((item) => item.path === selectedPath)).filter(Boolean);
  let contextReport = state.report;
  if (view === 'explorer') {
    if (!state.currentPath || state.currentPath === 'Questo PC') { output.textContent = 'Apri una cartella da analizzare.'; button.disabled = false; return; }
    output.textContent = `Analisi esatta di ${state.currentPath} in corso...`;
    contextReport = state.pathReports.get(state.currentPath);
    if (!contextReport) {
      contextReport = await window.filefinder.scanFolder(state.currentPath, { maxFiles: Number(els.maxFiles.value) || 80000, hashLimitMb: Number(els.hashLimit.value) || 2048 });
      state.pathReports.set(state.currentPath, contextReport);
    }
    highlightExplorerFindings(contextReport, new Set(selected.map((item) => item.path)));
  }
  if (view === 'cleanup' && (!state.report || (state.report.roots || [state.report.root]).join('|') !== state.roots.join('|'))) {
    output.textContent = `Analisi del workspace (${state.roots.length || 1} cartelle) in corso...`;
    await analyzeWorkspace();
  }
  const report = contextReport || state.report;
  const context = {
    vista: view, percorso_analizzato: view === 'explorer' ? state.currentPath : report?.root, ambito: view === 'explorer' ? (selected.length ? `${selected.length} elementi selezionati` : 'intera cartella') : 'workspace', selezione: selected.slice(0, 20).map((item) => ({ nome: item.name, tipo: item.kind, dimensione: item.size })),
    totali: report?.totals, fileGrandi: report?.largestFiles?.slice(0, 8), duplicati: report?.duplicateGroups?.slice(0, 5).map((group) => ({ copie: group.count, dimensione: group.size })),
    temporanei: report?.tempFiles?.slice(0, 8), cartelleGrandi: report?.largestFolders?.slice(0, 8)
  };
  button.disabled = true; output.textContent = 'Analisi locale in corso...';
  try {
    const result = await window.filefinder.aiAssist({
      system: 'Sei l assistente locale di FileFinder. Dai massimo 3 consigli brevi, concreti e prudenti in italiano. Non ordinare mai cancellazioni automatiche. Evidenzia file di sistema o app da non toccare. Rispondi esclusivamente come JSON valido nel formato {"text":"testo dei consigli"}.',
      prompt: `Vista ${view}. Dati: ${JSON.stringify(context)}`
    });
    const advice = result.text || result.message || result.motivo || JSON.stringify(result);
    output.textContent = view === 'explorer' ? `Percorso: ${state.currentPath}\n${advice}` : advice;
  } catch (_error) { output.textContent = 'AI locale non disponibile. I dati e gli strumenti normali restano utilizzabili.'; }
  finally { button.disabled = false; }
}

function highlightExplorerFindings(report, selectedPaths = new Set()) {
  const duplicatePaths = new Set((report.duplicateGroups || []).flatMap((group) => group.files.map((file) => file.path)));
  const tempPaths = new Set((report.tempFiles || []).map((file) => file.path));
  const largeThreshold = Math.max(100 * 1024 * 1024, (report.totals?.bytes || 0) * .05);
  state.analysisFindings.clear();
  state.directory.items.forEach((item) => {
    if (selectedPaths.size && !selectedPaths.has(item.path)) return;
    const knownSize = item?.kind === 'folder' ? state.folderSizes.get(item.path)?.size : item?.size;
    const fileReport = (report.files || []).find((file) => file.path === item.path);
    const findings = [];
    if (item.protected) findings.push({ type: 'protected', label: 'Protetto', reason: 'file di sistema o applicazione' });
    if (!item.protected && tempPaths.has(item.path) && fileReport && cleanupAssessment(fileReport).level === 'safe') findings.push({ type: 'safe', label: 'Pulizia sicura', reason: 'temporaneo a basso rischio; usa il Cestino' });
    if (duplicatePaths.has(item.path)) findings.push({ type: 'duplicate', label: 'Duplicato', reason: 'contenuto identico altrove; verificare prima di eliminare' });
    if ((knownSize || 0) >= largeThreshold) findings.push({ type: 'large', label: 'Grande', reason: 'occupa almeno il 5% del percorso analizzato' });
    if (!item.protected && item.kind === 'file' && isUnclearName(item.name)) findings.push({ type: 'naming', label: 'Protocolla', reason: 'nome poco descrittivo' });
    if (!item.protected && item.modifiedAt && Date.now() - new Date(item.modifiedAt).getTime() > 730 * 86400000) findings.push({ type: 'archive', label: 'Archivia', reason: 'non modificato da oltre due anni' });
    if (findings.length) state.analysisFindings.set(item.path, findings);
  });
  renderExplorer();
}

function isUnclearName(name) {
  const base = name.replace(/\.[^.]+$/, '').trim();
  return /^\d{5,}$/.test(base) || /^(doc|document|scan|img|image|file|nuovo|new)[-_ ]?\d*$/i.test(base) || /^[a-f0-9]{16,}$/i.test(base) || base.length < 4;
}

async function interpretSearchWithAi() {
  const request = els.searchInput.value.trim();
  if (!request) return;
  aiUi.searchButton.disabled = true; aiUi.searchLabel.textContent = 'AI sta interpretando la richiesta...';
  try {
    const result = await window.filefinder.aiAssist({
      system: 'Sei il parser di ricerca di FileFinder. Rispondi JSON con: query string, category all|document|image|video|audio|archive|other, mode all|large|temp|duplicate|cloud, minMb numero|null, maxMb numero|null, from YYYY-MM-DD|null, to YYYY-MM-DD|null, sort relevance|size-desc|date-desc|date-asc. Non inventare date.',
      prompt: request
    });
    els.searchInput.value = result.query || '';
    if ([...els.searchCategory.options].some((o) => o.value === result.category)) els.searchCategory.value = result.category;
    if ([...els.searchType.options].some((o) => o.value === result.mode)) els.searchType.value = result.mode;
    els.searchMinSize.value = result.minMb ?? ''; els.searchMaxSize.value = result.maxMb ?? '';
    els.searchFrom.value = result.from || ''; els.searchTo.value = result.to || '';
    if ([...els.searchSort.options].some((o) => o.value === result.sort)) els.searchSort.value = result.sort;
    await renderSearch();
  } catch (error) { setStatus(error.message); }
  finally { aiUi.searchButton.disabled = false; aiUi.searchLabel.textContent = 'AI locale attiva · richiesta interpretata'; }
}

async function suggestNamingWithAi() {
  if (!state.directory || state.currentPath === 'Questo PC') return;
  aiUi.namingButton.disabled = true; aiUi.namingLabel.textContent = 'AI sta analizzando nomi e metadati...';
  try {
    const currentFiles = state.namingFiles || [];
    const recognized = currentFiles.length && currentFiles.every((file) => parseProtocolledName(file.name));
    if (recognized) {
      namingEls.formula.value = '[{documento}] {cliente} - NR {numero_documento} {data}.{estensione}';
      renderNamingPreviewSafe();
      aiUi.namingLabel.textContent = currentFiles.length === 1
        ? 'Questo file e gia protocollato correttamente: nessuna rinomina necessaria.'
        : `${currentFiles.length} file seguono gia uno schema documentale coerente.`;
      return;
    }
    const sample = (state.namingFiles || state.directory.items.filter((item) => item.kind === 'file')).slice(0, 20).map((item) => ({ name: item.name, created: item.createdAt, modified: item.modifiedAt }));
    const result = await window.filefinder.aiAssist({
      system: 'Proponi una formula FileFinder usando solo {documento},{cliente},{numero_documento},{cartella},{nome_file},{numero},{data},{tipo},{estensione}. Rispondi JSON {"formula":"...","motivo":"..."}. Usa {cliente} solo se il cliente e riconoscibile con certezza nei nomi. Per raccolte eterogenee o ambigue usa {nome_file}. Se i nomi sono gia chiari e coerenti, mantieni la loro struttura. Conserva sempre l estensione e non inserire comandi shell.',
      prompt: JSON.stringify({ folder: state.currentPath, files: sample })
    });
    if (typeof result.formula === 'string' && /^[-_ .{}a-zA-Z]+$/.test(result.formula)) namingEls.formula.value = result.formula;
    renderNamingPreviewSafe();
    aiUi.namingLabel.textContent = result.motivo || 'Formula proposta dall AI locale';
  } catch (error) { setStatus(error.message); }
  finally { aiUi.namingButton.disabled = false; }
}

refreshAiStatus();

const titles = {
  explorer: 'Esplora',
  dashboard: 'Sintesi',
  tree: 'Cartelle',
  duplicates: 'Duplicati',
  cleanup: 'Pulizia',
  search: 'Ricerca',
  protocol: 'Attivita',
  manual: 'Manuale',
  credits: 'Crediti'
  ,naming: 'Protocollazione'
};

els.pickFolder.addEventListener('click', async () => {
  const folder = await window.filefinder.selectFolder();
  if (!folder) return;
  state.root = folder;
  addWorkspaceRoots([folder]);
  localStorage.setItem('filefinder:lastRoot', folder);
  els.selectedPath.textContent = folder;
  els.scanFolder.disabled = false;
  state.history = [];
  await browseTo(folder, false);
  analyzeWorkspace();
});

els.scanFolder.addEventListener('click', analyzeWorkspace);
document.querySelector('#analyzeCurrent').addEventListener('click', () => analyzeCurrentFolder());
els.addWorkspace.addEventListener('click', async () => addWorkspaceRoots(await window.filefinder.selectWorkspaceFolders()));

async function startAnalysis() {
  if (!state.root) return;
  return analyzeFolder(state.root);
}

async function analyzeWorkspace() {
  if (!state.roots.length) {
    if (state.currentPath && state.currentPath !== 'Questo PC') addWorkspaceRoots([state.currentPath]);
    else { setStatus('Aggiungi almeno una cartella al workspace.'); return null; }
  }
  els.scanFolder.disabled = true;
  els.analysisProgress.classList.remove('hidden');
  els.progressBar.classList.add('working');
  setStatus(`Analisi workspace: ${state.roots.length} cartelle...`);
  try {
    const report = await window.filefinder.scanFolders(state.roots, { maxFiles: Number(els.maxFiles.value) || 80000, hashLimitMb: Number(els.hashLimit.value) || 2048 });
    state.report = report; state.root = report.root;
    window.filefinder.saveIndex(report).catch(() => {});
    state.selectedTemps.clear(); renderAll();
    setStatus(`Workspace analizzato: ${state.roots.length} cartelle`);
    els.progressPhase.textContent = 'Analisi completata'; els.progressDetail.textContent = `${number(report.totals.files)} file elaborati`;
    els.progressBar.classList.remove('working'); els.progressBar.style.width = '100%';
    return report;
  } catch (error) { setStatus(error.message || 'Analisi workspace non riuscita'); return null; }
  finally { els.scanFolder.disabled = false; }
}

function addWorkspaceRoots(roots) {
  const normalized = (roots || []).filter(Boolean);
  state.roots = [...new Set([...state.roots, ...normalized])];
  localStorage.setItem('filefinder:workspaceRoots', JSON.stringify(state.roots));
  renderWorkspaceRoots();
}

function renderWorkspaceRoots() {
  const current = state.currentPath && state.currentPath !== 'Questo PC' ? state.currentPath : '';
  const active = state.activeScopePaths.length ? state.activeScopePaths : state.roots;
  els.workspaceRoots.innerHTML = active.length
    ? active.map((root) => `<span class="workspace-chip" title="${escapeAttr(root)}"><span>${escapeHtml(root)}</span>${state.roots.includes(root) ? `<button data-remove-root="${escapeAttr(root)}" title="Rimuovi dal workspace">&times;</button>` : ''}</span>`).join('')
    : current
      ? `<span class="workspace-chip current" title="Percorso corrente in Esplora"><span>${escapeHtml(current)}</span></span>`
      : '<em>Apri una cartella in Esplora</em>';
  els.workspaceRoots.querySelectorAll('[data-remove-root]').forEach((button) => button.addEventListener('click', () => {
    state.roots = state.roots.filter((root) => root !== button.dataset.removeRoot);
    localStorage.setItem('filefinder:workspaceRoots', JSON.stringify(state.roots)); renderWorkspaceRoots();
  }));
  if (state.selectedPaths.size > 1) {
    els.selectedPath.textContent = `${state.selectedPaths.size} elementi selezionati`;
  } else if (state.selectedPaths.size === 1 && state.selectedItem) {
    els.selectedPath.textContent = state.selectedItem.path;
  } else if (active.length === 1) {
    els.selectedPath.textContent = active[0];
  } else if (active.length > 1) {
    els.selectedPath.textContent = `${active.length} percorsi attivi`;
  } else if (current) {
    els.selectedPath.textContent = current;
  } else {
    els.selectedPath.textContent = 'Nessuna cartella selezionata';
  }
}

function setActiveScope(paths) {
  state.activeScopePaths = [...new Set((paths || []).filter(Boolean))];
  localStorage.setItem('filefinder:activeScopePaths', JSON.stringify(state.activeScopePaths));
  renderWorkspaceRoots();
}

function currentScopeLabel() {
  if (state.selectedPaths.size === 1 && state.selectedItem) return state.selectedItem.name;
  if (state.selectedPaths.size > 1) return `${state.selectedPaths.size} elementi selezionati`;
  if (state.activeScopePaths.length === 1) return state.activeScopePaths[0].split('\\').filter(Boolean).pop() || state.activeScopePaths[0];
  if (state.activeScopePaths.length > 1) return `${state.activeScopePaths.length} percorsi attivi`;
  if (state.currentPath && state.currentPath !== 'Questo PC') return state.currentPath.split('\\').filter(Boolean).pop() || state.currentPath;
  return '';
}

async function analyzeCurrentFolder() {
  if (!state.currentPath || state.currentPath === 'Questo PC') { setStatus('Apri prima una cartella in Esplora.'); return null; }
  addWorkspaceRoots([state.currentPath]);
  state.root = state.currentPath; els.selectedPath.textContent = state.root;
  localStorage.setItem('filefinder:lastRoot', state.root);
  return analyzeWorkspace();
}

async function analyzeFolder(root) {
  els.scanFolder.disabled = true;
  els.analysisProgress.classList.remove('hidden');
  els.progressBar.classList.add('working');
  setStatus('Analisi in sottofondo...');
  try {
    const report = await window.filefinder.scanFolder(root, {
      maxFiles: Number(els.maxFiles.value) || 80000,
      hashLimitMb: Number(els.hashLimit.value) || 2048
    });
    state.report = report;
    window.filefinder.saveIndex(report).catch(() => {});
    state.selectedTemps.clear();
    renderAll();
    setStatus('Analisi completata');
    els.progressPhase.textContent = 'Analisi completata';
    els.progressDetail.textContent = `${number(report.totals.files)} file elaborati`;
    els.progressBar.classList.remove('working');
    els.progressBar.style.width = '100%';
  } catch (error) {
    setStatus(error.message || 'Analisi non riuscita');
  } finally {
    els.scanFolder.disabled = false;
  }
  return state.report;
}

window.filefinder.onScanProgress((progress) => {
  els.analysisProgress.classList.remove('hidden');
  els.progressPhase.textContent = progress.phase;
  els.progressDetail.textContent = progress.path;
  els.progressCounts.textContent = `${number(progress.files)} file, ${number(progress.folders)} cartelle, ${bytes(progress.bytes)}`;
});

els.goBack.addEventListener('click', () => {
  const previous = state.history.pop();
  if (previous === 'Questo PC') browseComputer(false);
  else if (previous) browseTo(previous, false);
});
els.goComputer.addEventListener('click', () => browseComputer());
els.goUp.addEventListener('click', () => {
  if (!state.directory || state.currentPath === 'Questo PC') return;
  if (state.directory.parent) browseTo(state.directory.parent);
  else browseComputer();
});
els.refreshFolder.addEventListener('click', () => state.currentPath && browseTo(state.currentPath, false));

els.exportProtocol.addEventListener('click', async () => {
  if (!state.report) return;
  const saved = await window.filefinder.exportProtocol({
    root: state.report.root,
    generatedAt: new Date().toISOString(),
    totals: state.report.totals,
    suggestions: state.report.suggestions,
    duplicateGroups: state.report.duplicateGroups,
    tempFiles: state.report.tempFiles,
    appFolders: state.report.appFolders,
    events: state.report.protocol
  });
  if (saved) setStatus(`Protocollo salvato: ${saved}`);
});

els.openApps.addEventListener('click', () => window.filefinder.openAppsSettings());

els.trashSelected.addEventListener('click', async () => {
  const files = Array.from(state.selectedTemps);
  if (files.length === 0) return;
  const reviewCount = state.report.tempFiles.filter((file) => files.includes(file.path) && cleanupAssessment(file).level === 'review').length;
  const ok = confirm(reviewCount
    ? `Spostare ${files.length} file nel Cestino? ${reviewCount} sono da verificare manualmente e non sono garantiti come inutili.`
    : `Spostare ${files.length} file a basso rischio nel Cestino?`);
  if (!ok) return;
  setBusy(true, 'Spostamento nel Cestino...');
  const results = await window.filefinder.deleteTempFiles(files);
  const removed = new Set(results.filter((item) => item.ok).map((item) => item.path));
  const recovered = state.report.tempFiles.filter((file) => removed.has(file.path)).reduce((sum, file) => sum + file.size, 0);
  state.report.tempFiles = state.report.tempFiles.filter((file) => !removed.has(file.path));
  state.report.files = state.report.files.filter((file) => !removed.has(file.path));
  state.selectedTemps.clear();
  state.report.protocol.push({ at: new Date().toISOString(), type: 'pulizia-temporanei', path: state.report.root, message: `${removed.size} file spostati nel Cestino, ${bytes(recovered)} liberati` });
  renderCleanup();
  renderSearch();
  setBusy(false, `${removed.size} file spostati nel Cestino`);
});

els.tabs.forEach((tab) => {
  tab.addEventListener('click', async () => {
    if (tab.dataset.view === 'explorer' && !state.directory) browseComputer();
    else {
      try { await prepareViewScope(tab.dataset.view); }
      catch (error) { setStatus(error.message || 'Impossibile preparare l ambito selezionato'); }
      setView(tab.dataset.view);
    }
  });
});

els.searchInput.addEventListener('input', renderSearch);
els.searchType.addEventListener('change', renderSearch);
['searchCategory', 'searchMinSize', 'searchMaxSize', 'searchFrom', 'searchTo', 'searchSort', 'searchContent'].forEach((key) => els[key].addEventListener('change', renderSearch));

const namingEls = {
  formula: document.querySelector('#namingFormula'), date: document.querySelector('#namingDate'), digits: document.querySelector('#namingDigits'),
  start: document.querySelector('#namingStart'), preview: document.querySelector('#namingPreview'), apply: document.querySelector('#applyNaming'),
  sourceLabel: document.querySelector('#namingSourceLabel'), sourceCount: document.querySelector('#namingSourceCount'),
  chooseFolder: document.querySelector('#chooseNamingFolder'), chooseFiles: document.querySelector('#chooseNamingFiles')
};
['input', 'change'].forEach((eventName) => Object.values(namingEls).slice(0, 4).forEach((element) => element.addEventListener(eventName, renderNamingPreviewSafe)));
document.querySelectorAll('[data-token]').forEach((button) => button.addEventListener('click', () => {
  const input = namingEls.formula; const start = input.selectionStart; input.value = input.value.slice(0, start) + button.dataset.token + input.value.slice(input.selectionEnd); input.focus(); input.selectionStart = input.selectionEnd = start + button.dataset.token.length; renderNamingPreviewSafe();
}));
namingEls.apply.addEventListener('click', applyNaming);
namingEls.chooseFolder.addEventListener('click', async () => {
  const folder = await window.filefinder.selectFolder();
  if (!folder) return;
  try {
    const directory = await window.filefinder.listDirectory(folder);
    state.namingFiles = directory.items.filter((item) => item.kind === 'file' && !item.protected);
    state.namingRoot = folder;
    updateNamingSource();
    renderNamingPreviewSafe();
  } catch (_error) {
    setStatus('La cartella scelta non e accessibile. Prova ad aprirla prima in Windows.');
  }
});
namingEls.chooseFiles.addEventListener('click', async () => {
  const files = await window.filefinder.selectNamingFiles();
  if (!files.length) return;
  state.namingFiles = files.filter((item) => !item.protected);
  state.namingRoot = null;
  updateNamingSource();
  renderNamingPreviewSafe();
});

function updateNamingSource() {
  const files = state.namingFiles || [];
  namingEls.sourceLabel.textContent = state.namingRoot || (files.length === 1 ? files[0].path : `${files.length} file selezionati`);
  namingEls.sourceCount.textContent = `${files.length} file pronti per l'anteprima`;
}

async function browseTo(targetPath, remember = true) {
  if (!targetPath) return;
  if (remember && state.currentPath && state.currentPath !== targetPath) state.history.push(state.currentPath);
  setStatus('Apertura cartella...');
  try {
    state.directory = await window.filefinder.listDirectory(targetPath);
    state.currentPath = state.directory.path;
    state.root = state.currentPath;
    localStorage.setItem('filefinder:lastRoot', state.currentPath);
    els.selectedPath.textContent = state.currentPath;
    els.scanFolder.disabled = false;
    state.selectedItem = null;
    state.selectedPaths.clear();
    setActiveScope([state.currentPath]);
    renderExplorer();
    setView('explorer');
    setStatus(`${number(state.directory.items.length)} elementi`);
  } catch (error) {
    setStatus(error.message || 'Cartella non accessibile');
  }
}

async function browseComputer(remember = true) {
  if (remember && state.currentPath && state.currentPath !== 'Questo PC') state.history.push(state.currentPath);
  setStatus('Ricerca unita...');
  try {
    state.directory = await window.filefinder.listDrives();
    state.currentPath = 'Questo PC';
    state.selectedItem = null;
    state.selectedPaths.clear();
    renderExplorer();
    setView('explorer');
    setStatus(`${number(state.directory.items.length)} unita disponibili`);
  } catch (error) {
    setStatus(error.message || 'Impossibile leggere le unita');
  }
}

function renderExplorer() {
  const directory = state.directory;
  if (!directory) return;
  els.emptyState.classList.add('hidden');
  els.goBack.disabled = state.history.length === 0;
  els.goUp.disabled = directory.path === 'Questo PC';
  renderSelectionBanner();
  renderContainers();
  els.breadcrumbs.innerHTML = breadcrumbParts(directory.path).map((part) =>
    `<button data-browse="${escapeAttr(part.path)}">${escapeHtml(part.label)}</button>`
  ).join('<span>›</span>');
  els.breadcrumbs.querySelectorAll('[data-browse]').forEach((button) => {
    button.addEventListener('click', () => button.dataset.browse === 'Questo PC'
      ? browseComputer()
      : browseTo(button.dataset.browse));
  });

  const duplicatePaths = new Set((state.report?.duplicateGroups || []).flatMap((group) => group.files.map((file) => file.path)));
  const sortedItems = directory.items.slice().sort(compareBrowserItems);
  els.fileBrowser.innerHTML = sortedItems.length ? sortedItems.map((item) => {
    const knownSize = item.kind === 'folder' ? state.folderSizes.get(item.path)?.size : item.size;
    const weightClass = sizeClass(knownSize);
    const duplicate = duplicatePaths.has(item.path);
    const findings = state.analysisFindings.get(item.path) || [];
    const findingClasses = findings.map((finding) => `finding-${finding.type}`).join(' ');
    const badges = findings.map((finding) => `<button class="action-badge ${finding.type}" data-finding="${finding.type}" title="${escapeAttr(finding.reason)}">${escapeHtml(finding.label)}</button>`).join('');
    return `
    <article class="browser-row ${weightClass} ${duplicate ? 'is-duplicate' : ''} ${findingClasses} ${state.selectedPaths.has(item.path) ? 'selected' : ''}" tabindex="0" draggable="${!item.protected}" data-path="${escapeAttr(item.path)}" data-kind="${item.kind}" data-name="${escapeAttr(item.name)}">
      <div class="browser-name"><span class="file-icon">${item.cloud ? '&#9729;' : item.kind === 'drive' ? '&#128421;' : item.kind === 'folder' ? '&#128193;' : '&#128196;'}</span><strong>${escapeHtml(item.name)}</strong></div>
      <span>${item.kind === 'drive' && item.capacity ? `Occupato ${bytes(item.capacity.used)}` : item.modifiedAt ? escapeHtml(new Date(item.modifiedAt).toLocaleString()) : ''}</span>
      <span>${item.kind === 'drive' && item.capacity ? `Libero ${bytes(item.capacity.free)}` : item.cloud ? escapeHtml(item.cloud) : item.kind === 'drive' ? 'Unita' : item.kind === 'folder' ? 'Cartella' : escapeHtml((item.extension || 'File').replace('.', '').toUpperCase())}</span>
      <span class="item-size">${item.kind === 'drive' ? (item.capacity ? `Totale ${bytes(item.capacity.total)}` : 'Capacita cloud') : item.kind === 'folder' ? (knownSize == null ? 'Calcolo...' : bytes(knownSize)) : item.size == null ? '' : bytes(item.size)}</span>
      ${badges ? `<span class="action-badges">${badges}</span>` : duplicate ? '<span class="duplicate-badge" title="File duplicato">Doppio</span>' : ''}
    </article>
  `; }).join('') : empty('La cartella e vuota.');

  els.fileBrowser.querySelectorAll('.browser-row').forEach((row) => {
    row.addEventListener('click', (event) => handleBrowserClick(event, row));
    row.addEventListener('dblclick', () => activateBrowserItem(row));
    row.addEventListener('keydown', (event) => event.key === 'Enter' && activateBrowserItem(row));
    row.addEventListener('contextmenu', (event) => showContextMenu(event, row));
    row.addEventListener('dragstart', (event) => {
      state.draggedPaths = state.selectedPaths.has(row.dataset.path) ? Array.from(state.selectedPaths) : [row.dataset.path];
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', row.dataset.path);
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));
  });
  els.fileBrowser.querySelectorAll('.action-badge').forEach((badge) => {
    badge.addEventListener('click', (event) => {
      event.stopPropagation();
      const row = badge.closest('.browser-row');
      state.selectedPaths.clear();
      state.selectedPaths.add(row.dataset.path);
      state.selectedItem = directory.items.find((item) => item.path === row.dataset.path) || null;
      if (badge.dataset.finding === 'duplicate') setView('duplicates');
      else if (badge.dataset.finding === 'safe') setView('cleanup');
      else if (badge.dataset.finding === 'naming') {
        state.namingRoot = null;
        state.namingFiles = state.selectedItem ? [state.selectedItem] : [];
        updateNamingSource();
        setView('naming');
      } else renderInspector();
    });
  });
  hydrateFolderSizes(directory.items.filter((item) => item.kind === 'folder').slice(0, 100));
}

function saveContainers() {
  localStorage.setItem('filefinder:containers', JSON.stringify(state.containers));
}

function renderContainers() {
  els.containerList.innerHTML = state.containers.length ? state.containers.map((folder, index) => `
    <article class="container-tile container-color-${index % 8}" data-container="${escapeAttr(folder)}"><button class="container-open" title="Apri contenitore"><span>&#128193;</span><strong>${escapeHtml(folder.split('\\').filter(Boolean).pop() || folder)}</strong><small>${escapeHtml(folder)}</small></button><button class="container-remove" title="Rimuovi contenitore">&times;</button></article>
  `).join('') : '<span class="dock-empty">Aggiungi cartelle di destinazione per spostare qui gli elementi.</span>';
  els.containerList.querySelectorAll('.container-tile').forEach((tile) => {
    tile.querySelector('.container-open').addEventListener('click', () => browseTo(tile.dataset.container));
    tile.querySelector('.container-remove').addEventListener('click', () => {
      state.containers = state.containers.filter((folder) => folder !== tile.dataset.container); saveContainers(); renderContainers();
    });
    tile.addEventListener('dragenter', (event) => { event.preventDefault(); tile.classList.add('drag-over'); });
    tile.addEventListener('dragover', (event) => { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; tile.classList.add('drag-over'); });
    tile.addEventListener('dragleave', () => tile.classList.remove('drag-over'));
    tile.addEventListener('drop', async (event) => {
      event.preventDefault(); event.stopPropagation(); tile.classList.remove('drag-over');
      const sources = state.draggedPaths.length ? state.draggedPaths : [event.dataTransfer.getData('text/plain')].filter(Boolean);
      if (!sources.length || !confirm(`Spostare ${sources.length} elemento/i in ${tile.dataset.container}?`)) return;
      setStatus('Spostamento in corso...');
      showOperation(sources, tile.dataset.container);
      const results = [];
      for (let index = 0; index < sources.length; index += 1) {
        els.operationSource.textContent = sources[index];
        els.operationStatus.textContent = `Elemento ${index + 1} di ${sources.length}`;
        results.push(...await window.filefinder.moveItems([sources[index]], tile.dataset.container));
        els.operationBar.classList.remove('working');
        els.operationBar.style.width = `${Math.round(((index + 1) / sources.length) * 100)}%`;
      }
      const moved = new Set(results.filter((item) => item.ok).map((item) => item.source));
      state.directory.items = state.directory.items.filter((item) => !moved.has(item.path));
      renderExplorer();
      const failed = results.length - moved.size;
      finishOperation(moved.size, failed);
      setStatus(`${moved.size} elemento/i spostati${failed ? ` · ${failed} non spostati` : ''}`);
    });
  });
}

function showOperation(sources, destination) {
  els.operationOverlay.classList.remove('hidden');
  els.operationTitle.textContent = sources.length === 1 ? 'Spostamento in corso' : `Spostamento di ${sources.length} elementi`;
  els.operationSource.textContent = sources[0] || '-';
  els.operationDestination.textContent = destination;
  els.operationStatus.textContent = 'Preparazione...';
  els.operationBar.style.width = '36%';
  els.operationBar.classList.add('working');
  els.operationSpinner.classList.remove('hidden');
  els.operationClose.classList.add('hidden');
}

function finishOperation(moved, failed) {
  els.operationBar.classList.remove('working');
  els.operationBar.style.width = '100%';
  els.operationSpinner.classList.add('hidden');
  els.operationTitle.textContent = failed ? 'Operazione completata con avvisi' : 'Operazione completata';
  els.operationStatus.textContent = `${moved} spostati${failed ? `, ${failed} non spostati` : ''}`;
  els.operationClose.classList.remove('hidden');
}

function compareBrowserItems(a, b) {
  if (a.kind === 'folder' && b.kind !== 'folder') return -1;
  if (a.kind !== 'folder' && b.kind === 'folder') return 1;
  let left;
  let right;
  if (state.sortBy === 'size') {
    left = a.kind === 'folder' ? state.folderSizes.get(a.path)?.size ?? -1 : a.size ?? -1;
    right = b.kind === 'folder' ? state.folderSizes.get(b.path)?.size ?? -1 : b.size ?? -1;
  } else if (state.sortBy === 'type') {
    left = a.kind === 'folder' ? 'cartella' : a.extension || 'file';
    right = b.kind === 'folder' ? 'cartella' : b.extension || 'file';
  } else if (state.sortBy === 'date') {
    left = a.modifiedAt || '';
    right = b.modifiedAt || '';
  } else {
    left = a.name.toLowerCase();
    right = b.name.toLowerCase();
  }
  return (typeof left === 'number' ? left - right : String(left).localeCompare(String(right), 'it')) * state.sortDirection;
}

function handleBrowserClick(event, row) {
  selectBrowserItem(row, event);
  if (event.detail >= 3) {
    clearTimeout(state.clickTimer);
    window.filefinder.openPath(row.dataset.path);
  }
}

function selectBrowserItem(row, event = {}) {
  const item = state.directory.items.find((entry) => entry.path === row.dataset.path);
  if (!item) return;
  state.selectedItem = item;
  const rows = Array.from(els.fileBrowser.querySelectorAll('.browser-row'));
  if (event.shiftKey && state.selectionAnchor) {
    const anchorIndex = rows.findIndex((entry) => entry.dataset.path === state.selectionAnchor);
    const currentIndex = rows.indexOf(row);
    if (anchorIndex >= 0 && currentIndex >= 0) {
      if (!event.ctrlKey) state.selectedPaths.clear();
      rows.slice(Math.min(anchorIndex, currentIndex), Math.max(anchorIndex, currentIndex) + 1).forEach((entry) => state.selectedPaths.add(entry.dataset.path));
    }
  } else if (event.ctrlKey) {
    if (state.selectedPaths.has(item.path)) state.selectedPaths.delete(item.path); else state.selectedPaths.add(item.path);
    state.selectionAnchor = item.path;
  } else {
    const onlySelected = state.selectedPaths.size === 1 && state.selectedPaths.has(item.path);
    state.selectedPaths.clear();
    if (!onlySelected) state.selectedPaths.add(item.path);
    state.selectionAnchor = item.path;
  }
  if (!state.selectedPaths.has(item.path)) {
    const remaining = Array.from(state.selectedPaths).pop();
    state.selectedItem = remaining ? state.directory.items.find((entry) => entry.path === remaining) : null;
  }
  setActiveScope(state.selectedPaths.size ? Array.from(state.selectedPaths) : [state.currentPath]);
  els.fileBrowser.querySelectorAll('.browser-row').forEach((entry) => entry.classList.toggle('selected', state.selectedPaths.has(entry.dataset.path)));
  renderSelectionBanner();
  renderInspector();
  state.thumbnailPage = 0;
  renderSelectionThumbnails();
  updateSelectAllState();
}

els.selectAllItems.addEventListener('change', () => {
  state.selectedPaths.clear();
  if (els.selectAllItems.checked) state.directory.items.forEach((item) => state.selectedPaths.add(item.path));
  state.selectedItem = els.selectAllItems.checked ? state.directory.items[0] : null;
  setActiveScope(state.selectedPaths.size ? Array.from(state.selectedPaths) : [state.currentPath]);
  renderExplorer(); renderInspector(); renderSelectionThumbnails(); updateSelectAllState();
});
els.fileBrowser.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === 'a') { event.preventDefault(); els.selectAllItems.checked = true; els.selectAllItems.dispatchEvent(new Event('change')); }
});
function updateSelectAllState() {
  const count = state.directory?.items.length || 0;
  els.selectAllItems.checked = count > 0 && state.selectedPaths.size === count;
  els.selectAllItems.indeterminate = state.selectedPaths.size > 0 && state.selectedPaths.size < count;
}

function renderSelectionBanner() {
  const item = state.selectedItem;
  els.selectionBanner.classList.toggle('hidden', !item);
  if (!item) return;
  const folderInfo = state.folderSizes.get(item.path);
  const itemSize = item.kind === 'folder' ? folderInfo?.size : item.size;
  els.selectionIcon.innerHTML = item.kind === 'drive' ? '&#128421;' : item.kind === 'folder' ? '&#128193;' : '&#128196;';
  els.selectionName.textContent = item.name;
  els.selectionPath.textContent = item.path;
  els.selectionType.textContent = item.kind === 'drive' ? 'Unita' : item.kind === 'folder' ? 'Cartella' : (item.extension || 'File').replace('.', '').toUpperCase();
  els.selectionSize.textContent = itemSize == null ? 'Calcolo...' : `${folderInfo?.partial ? 'oltre ' : ''}${bytes(itemSize)}`;
  els.selectionModified.textContent = item.modifiedAt ? new Date(item.modifiedAt).toLocaleString() : '-';
}

function renderInspector() {
  const item = state.selectedItem;
  els.inspectorEmpty.classList.toggle('hidden', !!item);
  els.inspectorContent.classList.toggle('hidden', !item);
  if (!item) return;
  if (state.selectedPaths.size > 1) {
    renderMultiInspector();
    return;
  }
  renderImagePreview(item);
  const folderInfo = state.folderSizes.get(item.path);
  const itemSize = item.kind === 'folder' ? folderInfo?.size : item.size;
  const duplicates = (state.report?.duplicateGroups || []).filter((group) => group.files.some((file) => file.path === item.path));
  const temp = (state.report?.tempFiles || []).some((file) => file.path === item.path);
  const directoryTotal = visibleDirectoryTotal();
  const ratio = itemSize == null || !directoryTotal ? 0 : Math.max(.1, Math.min(100, itemSize / directoryTotal * 100));
  els.inspectorIcon.innerHTML = item.kind === 'drive' ? '&#128421;' : item.kind === 'folder' ? '&#128193;' : '&#128196;';
  els.inspectorName.textContent = item.name;
  els.inspectorPath.textContent = item.path;
  els.inspectorSize.textContent = itemSize == null ? 'Calcolo dimensione...' : `${folderInfo?.partial ? 'Oltre ' : ''}${bytes(itemSize)}`;
  els.inspectorSizeBar.style.width = `${ratio}%`;
  els.inspectorSizeBar.className = sizeClass(itemSize);
  const roundedRatio = ratio < 1 ? Math.round(ratio * 10) / 10 : Math.round(ratio);
  els.inspectorDonut.style.background = `conic-gradient(var(--accent) 0 ${roundedRatio}%, var(--line) ${roundedRatio}% 100%)`;
  els.inspectorPercent.textContent = `${roundedRatio}%`;
  els.inspectorCompare.textContent = itemSize == null ? 'Calcolo in corso' : `${roundedRatio}% dei ${bytes(directoryTotal)} conosciuti nella cartella`;
  const facts = [
    ['Tipo', item.kind === 'drive' ? 'Unita' : item.kind === 'folder' ? 'Cartella' : (item.extension || 'File').replace('.', '').toUpperCase()],
    ['Modificato', item.modifiedAt ? new Date(item.modifiedAt).toLocaleString() : '-'],
    ['File contenuti', folderInfo ? number(folderInfo.files) : '-'],
    ['Sottocartelle', folderInfo ? number(folderInfo.folders) : '-'],
    ['Spazio liberabile', itemSize == null ? '-' : `${bytes(itemSize)}${item.cloud ? ' nel cloud' : ''}`],
    ['Percorso', item.path]
  ];
  els.inspectorFacts.innerHTML = facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
  els.inspectorFlags.innerHTML = [
    duplicates.length ? `<span class="flag duplicate">Duplicato: ${duplicates[0].count} copie</span>` : '',
    temp ? '<span class="flag temp">File probabilmente inutile</span>' : '',
    itemSize >= 1024 ** 3 ? '<span class="flag heavy">Elemento molto grande</span>' : ''
  ].join('');
  els.inspectOpen.textContent = item.kind === 'folder' || item.kind === 'drive' ? 'Entra nella cartella' : 'Apri con Windows';
  els.inspectTrash.classList.toggle('hidden', !temp && duplicates.length === 0);
}

let thumbnailGeneration = 0;
async function renderSelectionThumbnails() {
  const generation = ++thumbnailGeneration;
  const supported = Array.from(state.selectedPaths).map((selectedPath) => state.directory?.items.find((item) => item.path === selectedPath)).filter((item) => item?.kind === 'file' && ['.jpg','.jpeg','.png','.gif','.webp','.bmp','.pdf','.txt','.docx','.xlsx'].includes(item.extension));
  els.inspectorThumbnails.classList.toggle('hidden', supported.length < 2);
  if (supported.length < 2) return;
  state.thumbnailPage = Math.min(state.thumbnailPage, supported.length - 1);
  const item = supported[state.thumbnailPage];
  els.previewTitle.textContent = item.name;
  els.thumbnailPage.textContent = `${state.thumbnailPage + 1}/${supported.length}`;
  els.thumbnailPrev.disabled = state.thumbnailPage === 0;
  els.thumbnailNext.disabled = state.thumbnailPage >= supported.length - 1;
  await renderImagePreview(item);
  if (generation !== thumbnailGeneration) return;
}

let previewGeneration = 0;
async function renderImagePreview(item) {
  const generation = ++previewGeneration;
  els.inspectorPreview.classList.add('hidden');
  els.inspectorPreviewImage.removeAttribute('src');
  els.inspectorPreviewDocument.removeAttribute('src');
  els.inspectorPreviewText.textContent = '';
  [els.inspectorPreviewImage, els.inspectorPreviewDocument, els.inspectorPreviewText].forEach((element) => element.classList.add('hidden'));
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.tif', '.tiff', '.raw'];
  const documentExtensions = ['.pdf', '.txt', '.log', '.csv', '.json', '.xml', '.md', '.ini', '.docx', '.xlsx', '.doc', '.xls'];
  if (item.kind !== 'file' || (!imageExtensions.includes(item.extension) && !documentExtensions.includes(item.extension))) return;
  els.inspectorPreview.classList.remove('hidden');
  els.inspectorPreviewMessage.textContent = item.cloud ? 'Caricamento anteprima cloud...' : 'Caricamento anteprima...';
  const result = await previewWithTimeout(item, 10000);
  if (generation !== previewGeneration || !state.selectedPaths.has(item.path)) return;
  if (result.available) {
    if (result.kind === 'pdf') {
      els.inspectorPreviewDocument.src = `${result.dataUrl}#page=1&view=Fit&toolbar=0&navpanes=0`;
      els.inspectorPreviewDocument.classList.remove('hidden');
    }
    else if (result.kind === 'text') { els.inspectorPreviewText.textContent = result.text; els.inspectorPreviewText.classList.remove('hidden'); }
    else { els.inspectorPreviewImage.src = result.dataUrl; els.inspectorPreviewImage.classList.remove('hidden'); }
    els.inspectorPreviewMessage.textContent = '';
  } else {
    els.inspectorPreviewImage.classList.add('hidden');
    els.inspectorPreviewMessage.textContent = result.reason;
  }
}

function previewWithTimeout(item, timeoutMs = 10000) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const request = (imageExtensions.includes(item.extension)
    ? window.filefinder.previewImage(item.path)
    : window.filefinder.previewDocument(item.path)).catch(() => ({ available: false, reason: 'Anteprima non disponibile o file non leggibile.' }));
  const timeout = new Promise((resolve) => setTimeout(() => resolve({
    available: false,
    reason: item.cloud
      ? 'Il file e solo online o OneDrive non ha completato il download. Rendilo disponibile offline e riprova.'
      : 'Anteprima non pronta entro 10 secondi. Apri il file con Windows.'
  }), timeoutMs));
  return Promise.race([request, timeout]);
}

async function renderMultiInspector() {
  const paths = Array.from(state.selectedPaths);
  const items = paths.map((selectedPath) => state.directory.items.find((item) => item.path === selectedPath)).filter(Boolean);
  const folders = items.filter((item) => item.kind === 'folder');
  const files = items.filter((item) => item.kind === 'file');
  const folderInfo = folders.map((folder) => state.folderSizes.get(folder.path)).filter(Boolean);
  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0) + folderInfo.reduce((sum, info) => sum + (info.size || 0), 0);
  const pending = folders.length - folderInfo.length;
  const internalFiles = folderInfo.reduce((sum, info) => sum + (info.files || 0), 0);
  const internalFolders = folderInfo.reduce((sum, info) => sum + (info.folders || 0), 0);
  els.inspectorIcon.innerHTML = '&#10064;';
  els.inspectorName.textContent = `${items.length} elementi selezionati`;
  els.inspectorPath.textContent = items.slice(0, 3).map((item) => item.name).join('  |  ') + (items.length > 3 ? `  +${items.length - 3}` : '');
  els.inspectorSize.textContent = `${pending ? 'Almeno ' : ''}${bytes(totalSize)}`;
  const directoryTotal = visibleDirectoryTotal();
  const selectionRatio = directoryTotal ? Math.min(100, totalSize / directoryTotal * 100) : 0;
  els.inspectorSizeBar.style.width = `${pending ? Math.max(3, selectionRatio) : selectionRatio}%`;
  els.inspectorSizeBar.className = pending ? 'working' : '';
  els.inspectorDonut.style.background = `conic-gradient(var(--accent) 0 ${selectionRatio}%, var(--line) ${selectionRatio}% 100%)`;
  const displayedRatio = selectionRatio < 1 ? Math.round(selectionRatio * 10) / 10 : Math.round(selectionRatio);
  els.inspectorPercent.textContent = pending ? '...' : `${displayedRatio}%`;
  els.inspectorCompare.textContent = pending ? `${pending} dimensioni in calcolo` : `${bytes(totalSize)} su ${bytes(directoryTotal)} = ${displayedRatio}% della cartella`;
  const facts = [
    ['File selezionati', number(files.length)], ['Cartelle selezionate', number(folders.length)],
    ['File contenuti', number(internalFiles)], ['Sottocartelle', number(internalFolders)],
    ['Spazio liberabile', `${bytes(totalSize)}${items.some((item) => item.cloud) ? ' nel cloud' : ''}`]
  ];
  els.inspectorFacts.innerHTML = facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
  els.inspectorFlags.innerHTML = items.slice(0, 8).map((entry) => `<span class="flag">${entry.kind === 'folder' ? 'Cartella' : 'File'}: ${escapeHtml(entry.name)}</span>`).join('');
  els.inspectTrash.classList.add('hidden');
  if (pending) hydrateFolderSizes(folders);
}

function visibleDirectoryTotal() {
  return (state.directory?.items || []).reduce((sum, entry) => sum + (entry.kind === 'folder' ? state.folderSizes.get(entry.path)?.size || 0 : entry.size || 0), 0);
}

els.inspectOpen.addEventListener('click', () => {
  if (!state.selectedItem) return;
  if (state.selectedItem.kind === 'folder' || state.selectedItem.kind === 'drive') browseTo(state.selectedItem.path);
  else window.filefinder.openPath(state.selectedItem.path);
});
els.inspectReveal.addEventListener('click', () => state.selectedItem && window.filefinder.revealPath(state.selectedItem.path));
els.inspectTrash.addEventListener('click', async () => {
  const item = state.selectedItem;
  if (!item || !confirm(`Spostare ${item.name} nel Cestino?`)) return;
  const [result] = await window.filefinder.deleteTempFiles([item.path]);
  if (result?.ok) {
    state.directory.items = state.directory.items.filter((entry) => entry.path !== item.path);
    state.selectedItem = null;
    renderExplorer();
    setStatus('Elemento spostato nel Cestino');
  }
});

async function hydrateFolderSizes(folders) {
  const browsingPath = state.currentPath;
  const hydration = ++state.sizeHydration;
  const pending = folders.filter((folder) => !state.folderSizes.has(folder.path));
  let calculated = false;
  async function calculate(folder) {
    if (state.currentPath !== browsingPath || hydration !== state.sizeHydration) return;
    try {
      state.folderSizes.set(folder.path, await window.filefinder.folderSize(folder.path));
      calculated = true;
    } catch (_error) {
      state.folderSizes.set(folder.path, { size: 0, files: 0, folders: 0, unavailable: true });
    }
    const row = Array.from(els.fileBrowser.querySelectorAll('.browser-row')).find((entry) => entry.dataset.path === folder.path);
    if (!row) return;
    const info = state.folderSizes.get(folder.path);
    row.querySelector('.item-size').textContent = info.unavailable ? 'Non indicizzata' : `${info.partial ? '> ' : ''}${bytes(info.size)}`;
    row.classList.remove('size-large', 'size-huge');
    row.classList.add(sizeClass(info.size));
    if (state.selectedItem?.path === folder.path) renderSelectionBanner();
    if (state.selectedItem?.path === folder.path) renderInspector();
  }
  const queue = pending.slice();
  const workers = Array.from({ length: Math.min(6, queue.length) }, async () => {
    while (queue.length && state.currentPath === browsingPath && hydration === state.sizeHydration) await calculate(queue.shift());
  });
  await Promise.all(workers);
  if (calculated && state.sortBy === 'size' && state.currentPath === browsingPath && hydration === state.sizeHydration) renderExplorer();
}

function sizeClass(size) {
  if (size >= 1024 ** 3) return 'size-huge';
  if (size >= 250 * 1024 ** 2) return 'size-large';
  return '';
}

function activateBrowserItem(row) {
  if (row.dataset.kind === 'folder' || row.dataset.kind === 'drive') browseTo(row.dataset.path);
  else window.filefinder.openPath(row.dataset.path);
}

function showContextMenu(event, row) {
  event.preventDefault();
  state.contextItem = { path: row.dataset.path, kind: row.dataset.kind };
  els.contextMenu.style.left = `${Math.min(event.clientX, window.innerWidth - 230)}px`;
  els.contextMenu.style.top = `${Math.max(8, Math.min(event.clientY, window.innerHeight - 370))}px`;
  els.contextMenu.classList.remove('hidden');
}

els.contextMenu.addEventListener('click', async (event) => {
  const item = state.contextItem;
  const command = event.target.dataset.command;
  if (!item || !command) return;
  if (command === 'open') (item.kind === 'folder' || item.kind === 'drive') ? browseTo(item.path) : window.filefinder.openPath(item.path);
  if (command === 'reveal') window.filefinder.revealPath(item.path);
  if (command === 'copy-path') await navigator.clipboard.writeText(item.path);
  const selected = state.selectedPaths.has(item.path) ? Array.from(state.selectedPaths) : [item.path];
  if (command === 'copy' || command === 'cut') {
    state.fileClipboard = { paths: selected, cut: command === 'cut' };
    setStatus(`${selected.length} elemento/i ${command === 'cut' ? 'pronti da spostare' : 'copiati'}`);
  }
  if (command === 'paste') {
    const destination = item.kind === 'folder' || item.kind === 'drive' ? item.path : state.currentPath;
    if (!state.fileClipboard.paths.length) setStatus('Nessun elemento da incollare.');
    else {
      showOperation(state.fileClipboard.paths, destination);
      const results = state.fileClipboard.cut
        ? await window.filefinder.moveItems(state.fileClipboard.paths, destination)
        : await window.filefinder.copyItems(state.fileClipboard.paths, destination);
      const ok = results.filter((result) => result.ok).length;
      finishOperation(ok, results.length - ok);
      if (state.fileClipboard.cut) state.fileClipboard = { paths: [], cut: false };
      await browseTo(state.currentPath, false);
    }
  }
  if (command === 'rename') {
    const current = item.path.split('\\').pop();
    const next = prompt('Nuovo nome', current);
    if (next && next !== current) {
      const target = `${pathParent(item.path)}\\${next.replace(/[<>:"/\\|?*]/g, '_')}`;
      const [result] = await window.filefinder.renameItems([{ source: item.path, target }]);
      setStatus(result.ok ? 'Elemento rinominato.' : result.error);
      if (result.ok) await browseTo(state.currentPath, false);
    }
  }
  if (command === 'delete') {
    const entry = state.directory.items.find((candidate) => candidate.path === item.path);
    if (entry?.protected) setStatus('Elemento protetto: eliminazione bloccata.');
    else if (confirm(`Spostare ${selected.length} elemento/i nel Cestino?`)) {
      const results = await window.filefinder.deleteTempFiles(selected);
      setStatus(`${results.filter((result) => result.ok).length} elemento/i spostati nel Cestino.`);
      await browseTo(state.currentPath, false);
    }
  }
  if (command === 'print') {
    try { await window.filefinder.printPath(item.path); setStatus('Richiesta di stampa inviata a Windows.'); }
    catch (error) { setStatus(error.message || 'Stampa non disponibile.'); }
  }
  els.contextMenu.classList.add('hidden');
});
document.addEventListener('click', () => els.contextMenu.classList.add('hidden'));

function breadcrumbParts(fullPath) {
  if (fullPath === 'Questo PC') return [{ label: 'Questo PC', path: 'Questo PC' }];
  const pieces = fullPath.replace(/\\/g, '/').split('/').filter(Boolean);
  const drive = pieces[0] && /^[A-Za-z]:$/.test(pieces[0]) ? pieces.shift() : '';
  const result = [{ label: 'Questo PC', path: 'Questo PC' }];
  let current = drive ? `${drive}\\` : '\\';
  if (drive) result.push({ label: drive, path: current });
  for (const piece of pieces) {
    current = current.endsWith('\\') ? `${current}${piece}` : `${current}\\${piece}`;
    result.push({ label: piece, path: current });
  }
  return result;
}

async function prepareViewScope(view) {
  if (view === 'explorer' || view === 'search' || view === 'protocol' || view === 'manual' || view === 'credits') return;
  const selectedItems = Array.from(state.selectedPaths).map((selectedPath) => state.directory?.items.find((item) => item.path === selectedPath)).filter(Boolean);
  const scopePaths = selectedItems.length ? selectedItems.map((item) => item.path) : state.activeScopePaths.length ? state.activeScopePaths : [state.currentPath].filter(Boolean);
  setActiveScope(scopePaths);

  if (view === 'naming') {
    const directFiles = selectedItems.filter((item) => item.kind === 'file' && !item.protected);
    const folders = selectedItems.filter((item) => item.kind === 'folder' && !item.protected);
    if (directFiles.length) {
      state.namingFiles = directFiles;
      state.namingRoot = null;
    } else if (folders.length === 1) {
      const directory = await window.filefinder.listDirectory(folders[0].path);
      state.namingRoot = folders[0].path;
      state.namingFiles = directory.items.filter((item) => item.kind === 'file' && !item.protected);
    } else if (!selectedItems.length && state.currentPath && state.currentPath !== 'Questo PC') {
      const directory = await window.filefinder.listDirectory(state.currentPath);
      state.namingRoot = state.currentPath;
      state.namingFiles = directory.items.filter((item) => item.kind === 'file' && !item.protected);
    }
    updateNamingSource();
    renderNamingPreviewSafe();
    return;
  }

  if (!['dashboard', 'tree', 'duplicates', 'cleanup'].includes(view)) return;
  const folderRoots = [...new Set(selectedItems.length
    ? selectedItems.map((item) => item.kind === 'folder' ? item.path : pathParent(item.path))
    : scopePaths)];
  const signature = folderRoots.join('|');
  if (!folderRoots.length || state.report?.scopeSignature === signature) return;
  setStatus(`Analisi ambito: ${scopePaths.length} elementi...`);
  const report = await window.filefinder.scanFolders(folderRoots, { maxFiles: Number(els.maxFiles.value) || 80000, hashLimitMb: Number(els.hashLimit.value) || 2048 });
  report.scopeSignature = signature;
  if (selectedItems.length && selectedItems.every((item) => item.kind === 'file')) {
    const selectedFiles = new Set(selectedItems.filter((item) => item.kind === 'file').map((item) => item.path));
    report.largestFiles = report.largestFiles.filter((file) => selectedFiles.has(file.path));
    report.tempFiles = report.tempFiles.filter((file) => selectedFiles.has(file.path));
    report.duplicateGroups = report.duplicateGroups.map((group) => ({ ...group, files: group.files.filter((file) => selectedFiles.has(file.path)) })).filter((group) => group.files.length > 1);
  }
  state.report = report;
  renderDashboard(); renderTree(); renderDuplicates(); renderCleanup(); renderSearch(); renderProtocol();
  setStatus(`Ambito pronto: ${scopePaths.length} elementi`);
}

function setView(view) {
  state.activeView = view;
  const scope = currentScopeLabel();
  els.viewTitle.textContent = scope && view !== 'explorer' ? `${titles[view]} - ${scope}` : titles[view];
  els.tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.view === view));
  els.views.forEach((section) => section.classList.toggle('hidden', section.id !== view));
  if (state.report) els.emptyState.classList.add('hidden');
  if (view === 'naming') renderNamingPreviewSafe();
}

function namingOperations() {
  const files = (state.namingFiles || []).filter((file) => !['hiberfil.sys', 'pagefile.sys', 'swapfile.sys', 'bootmgr', 'ntldr', 'bootnxt'].includes(file.name.toLowerCase()));
  if (!files.length) return [];
  const digits = Math.max(1, Number(namingEls.digits.value) || 2);
  const first = Number(namingEls.start.value) || 1;
  const sourceFolder = state.namingRoot || pathParent(files[0].path);
  const folder = sourceFolder.split('\\').filter(Boolean).pop() || 'ROOT';
  return files.map((file, index) => {
    const dateValue = namingEls.date.value === 'today' ? new Date() : new Date(namingEls.date.value === 'created' ? file.createdAt : file.modifiedAt);
    const metadataDate = Number.isNaN(dateValue.getTime()) ? '' : `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`;
    const ext = (file.extension || '').replace('.', '');
    const base = file.name.replace(/\.[^.]+$/, '');
    const recognized = parseProtocolledName(file.name);
    const values = {
      documento: recognized?.documento || searchCategory(file.extension),
      cliente: recognized?.cliente || '',
      numero_documento: recognized?.numeroDocumento || String(first + index).padStart(digits, '0'),
      cartella: folder,
      nome: base,
      nome_file: base,
      numero: String(first + index).padStart(digits, '0'),
      data: recognized?.data || metadataDate,
      tipo: searchCategory(file.extension),
      estensione: ext
    };
    const requestedTokens = Array.from(namingEls.formula.value.matchAll(/\{([a-z_]+)\}/gi), (match) => match[1].toLowerCase());
    const unresolved = requestedTokens.filter((token) => !Object.prototype.hasOwnProperty.call(values, token) || !values[token]);
    let newName = namingEls.formula.value.replace(/\{(documento|cliente|numero_documento|cartella|nome_file|nome|numero|data|tipo|estensione)\}/gi, (_match, token) => values[token.toLowerCase()] || '');
    newName = newName.replace(/[<>:"/\\|?*]/g, '_').replace(/_+/g, '_').replace(/^\s+|\s+$/g, '');
    const target = `${pathParent(file.path)}\\${newName}`;
    return { source: file.path, target, oldName: file.name, newName, unresolved, invalid: unresolved.length > 0, unchanged: file.path.toLowerCase() === target.toLowerCase() };
  });
}

function parseProtocolledName(fileName) {
  const base = String(fileName || '').replace(/\.[^.]+$/, '').trim();
  const match = base.match(/^\[([^\]]+)\]\s+(.+?)\s+-\s+NR\s+([^\s]+)\s+(\d{4}-\d{2}-\d{2})$/i);
  if (!match) return null;
  return { documento: match[1].trim(), cliente: match[2].trim(), numeroDocumento: match[3].trim(), data: match[4] };
}

function pathParent(filePath) {
  const end = filePath.lastIndexOf('\\');
  return end > 2 ? filePath.slice(0, end) : filePath.slice(0, 3);
}

function renderNamingPreview() {
  const operations = namingOperations();
  namingEls.apply.disabled = !operations.some((item) => !item.unchanged && item.newName);
  if (!operations.length) namingEls.preview.innerHTML = empty('Scegli esplicitamente una cartella o uno o piu file da protocollare.');
  else namingEls.preview.innerHTML = operations.slice(0, 300).map((item) => `<div class="rename-row ${item.unchanged ? 'unchanged' : ''}"><span title="${escapeAttr(item.source)}"><strong>${escapeHtml(item.oldName)}</strong><small>${escapeHtml(pathParent(item.source))}</small></span><b>&rarr;</b><strong>${escapeHtml(item.newName || 'Nome non valido')}</strong></div>`).join('');
  namingEls.preview.innerHTML = operations.length ? operations.slice(0, 300).map((item) => `<div class="rename-row ${item.unchanged ? 'unchanged' : ''}"><span>${escapeHtml(item.oldName)}</span><b>→</b><strong>${escapeHtml(item.newName || 'Nome non valido')}</strong></div>`).join('') : empty('Apri una cartella con file per creare l’anteprima.');
  if (!operations.length) namingEls.preview.innerHTML = empty('Scegli esplicitamente una cartella o uno o piu file da protocollare.');
  else namingEls.preview.innerHTML = operations.slice(0, 300).map((item) => `<div class="rename-row ${item.unchanged ? 'unchanged' : ''}"><span title="${escapeAttr(item.source)}"><strong>${escapeHtml(item.oldName)}</strong><small>${escapeHtml(pathParent(item.source))}</small></span><b>&rarr;</b><strong>${escapeHtml(item.newName || 'Nome non valido')}</strong></div>`).join('');
}

function renderNamingPreviewSafe() {
  const operations = namingOperations();
  namingEls.apply.disabled = operations.some((item) => item.invalid) || !operations.some((item) => !item.unchanged && item.newName);
  if (!operations.length) {
    namingEls.preview.innerHTML = empty('Scegli esplicitamente una cartella o uno o piu file da protocollare.');
    return;
  }
  namingEls.preview.innerHTML = operations.slice(0, 300).map((item) => `<div class="rename-row ${item.unchanged ? 'unchanged' : ''} ${item.invalid ? 'invalid' : ''}"><span title="${escapeAttr(item.source)}"><strong>${escapeHtml(item.oldName)}</strong><small>${escapeHtml(pathParent(item.source))}</small></span><b>${item.unchanged ? '&#10003;' : item.invalid ? '!' : '&rarr;'}</b><strong>${item.unchanged ? 'Gia protocollato correttamente' : item.invalid ? `Dato non riconosciuto: ${escapeHtml(item.unresolved.map((token) => `{${token}}`).join(', '))}. Usa {nome_file} o seleziona file omogenei.` : escapeHtml(item.newName || 'Nome non valido')}</strong></div>`).join('');
}

async function applyNaming() {
  const operations = namingOperations().filter((item) => !item.invalid && !item.unchanged && item.newName);
  if (!operations.length || !confirm(`Rinominare ${operations.length} file secondo la formula scelta?`)) return;
  const results = await window.filefinder.renameItems(operations);
  const renamed = results.filter((item) => item.ok);
  state.report?.protocol.push({ at: new Date().toISOString(), type: 'protocollazione', path: state.currentPath, message: `${renamed.length} file rinominati con formula ${namingEls.formula.value}` });
  if (state.currentPath && state.currentPath !== 'Questo PC') await browseTo(state.currentPath, false);
  setStatus(`${renamed.length} file rinominati`);
  renderNamingPreviewSafe();
}

function setBusy(isBusy, message) {
  els.scanFolder.disabled = isBusy || !state.root;
  els.pickFolder.disabled = isBusy;
  if (message) setStatus(message);
}

function setStatus(message) {
  els.status.textContent = message;
}

function renderAll() {
  els.emptyState.classList.add('hidden');
  els.exportProtocol.disabled = false;
  setView(state.activeView);
  renderExplorer();
  renderDashboard();
  renderTree();
  renderDuplicates();
  renderCleanup();
  renderSearch();
  renderProtocol();
}

function renderDashboard() {
  const report = state.report;
  els.metricFiles.textContent = number(report.totals.files);
  els.metricFolders.textContent = number(report.totals.folders);
  els.metricSize.textContent = bytes(report.totals.bytes);
  const duplicateWaste = report.duplicateGroups.reduce((sum, group) => sum + group.wastedBytes, 0);
  const tempWaste = report.tempFiles.reduce((sum, file) => sum + file.size, 0);
  els.metricRecoverable.textContent = bytes(duplicateWaste + tempWaste);

  els.suggestions.innerHTML = report.suggestions.map((item) => `
    <article class="suggestion">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `).join('');

  renderRows(els.largestFiles, report.largestFiles.slice(0, 30));
  drawExtensionChart(report.extensionStats.slice(0, 8));
}

function renderTree() {
  const plan = buildStructurePlan(state.report);
  els.structureRoot.textContent = state.report.root;
  els.structureSummary.innerHTML = `
    <article><span>Percorso analizzato</span><strong>${escapeHtml(shortPath(state.report.root))}</strong></article>
    <article><span>Contenuto reale</span><strong>${number(state.report.totals.files)} file · ${number(state.report.totals.folders)} cartelle</strong></article>
    <article><span>Qualita struttura</span><strong class="quality-${plan.quality.level}">${plan.quality.score}/100 · ${escapeHtml(plan.quality.label)}</strong></article>`;
  els.folderTree.innerHTML = renderTreeNode(state.report.tree);
  els.folderTree.querySelectorAll('[data-tree-path]').forEach((row) => row.addEventListener('click', () => browseTo(row.dataset.treePath)));
  els.structurePlan.innerHTML = renderSuggestedTree(plan);
  els.structureAudit.innerHTML = plan.audit.map((item) => `<article class="audit-item ${item.level}"><span>${item.icon}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p></div><b>${number(item.count)}</b></article>`).join('');
}

function shortPath(value) {
  const parts = String(value || '').split('\\').filter(Boolean);
  return parts.length > 3 ? `...\\${parts.slice(-3).join('\\')}` : value;
}

function buildStructurePlan(report) {
  const files = report.files || [];
  const unclear = files.filter((file) => isUnclearName(file.name));
  const dated = files.filter((file) => /(?:19|20)\d{2}[-_.]?\d{2}[-_.]?\d{2}/.test(file.name));
  const protocolled = files.map((file) => ({ file, parsed: parseProtocolledName(file.name) })).filter((item) => item.parsed);
  const extensions = new Set(files.map((file) => file.extension).filter(Boolean));
  const categories = new Map();
  files.forEach((file) => {
    const parsed = parseProtocolledName(file.name);
    const year = parsed?.data?.slice(0, 4) || String(new Date(file.modifiedAt || 0).getFullYear());
    const validYear = /^(19|20)\d{2}$/.test(year) ? year : 'Senza data';
    const client = parsed?.cliente || null;
    const document = parsed?.documento || professionalDocumentClass(file.name, file.extension);
    const key = client ? `Clienti|${client}|${validYear}|${document}` : `Archivio|${validYear}|${document}`;
    categories.set(key, (categories.get(key) || 0) + 1);
  });
  const recommended = Array.from(categories, ([path, count]) => ({ path: path.split('|'), count })).sort((a, b) => b.count - a.count).slice(0, 18);
  const overloaded = (report.largestFolders || []).filter((folder) => folder.fileCount > 250).length;
  const score = Math.max(20, 100 - Math.min(35, unclear.length * 3) - Math.min(20, overloaded * 5) - (files.length && dated.length / files.length < .35 ? 15 : 0) - (report.tree?.children?.length > 25 ? 10 : 0));
  const quality = score >= 80 ? { score, level: 'good', label: 'Buona' } : score >= 55 ? { score, level: 'review', label: 'Da migliorare' } : { score, level: 'poor', label: 'Critica' };
  const audit = [
    { icon: 'Aa', level: unclear.length ? 'review' : 'good', title: 'Nomi non descrittivi', detail: unclear.length ? 'File difficili da trovare o identificare senza aprirli.' : 'I nomi analizzati sono sufficientemente descrittivi.', count: unclear.length },
    { icon: 'Y', level: dated.length < files.length * .35 ? 'review' : 'good', title: 'Data nel nome', detail: 'La data ISO YYYY-MM-DD rende ordinamento e conservazione coerenti.', count: dated.length },
    { icon: 'P', level: protocolled.length ? 'good' : 'review', title: 'Documenti gia protocollati', detail: 'Schema riconosciuto: documento, cliente, numero e data.', count: protocolled.length },
    { icon: '!', level: overloaded ? 'review' : 'good', title: 'Cartelle sovraccariche', detail: 'Oltre 250 file nella stessa cartella riducono leggibilita e controllo.', count: overloaded },
    { icon: 'T', level: extensions.size > 12 ? 'review' : 'good', title: 'Tipi di file mescolati', detail: `${extensions.size} estensioni diverse rilevate nell ambito.`, count: extensions.size }
  ];
  return { quality, audit, recommended };
}

function professionalDocumentClass(name, extension) {
  const value = String(name || '').toLowerCase();
  if (/credit[ _-]?note|nota[ _-]?credito/.test(value)) return 'Note di credito';
  if (/fattur|invoice/.test(value)) return 'Fatture';
  if (/preventiv|quote|offerta/.test(value)) return 'Preventivi';
  if (/contratt|contract/.test(value)) return 'Contratti';
  if (/ordine|order/.test(value)) return 'Ordini';
  const category = searchCategory(extension);
  return { document: 'Documenti', image: 'Immagini', video: 'Video', audio: 'Audio', archive: 'Archivi' }[category] || 'Altri documenti';
}

function renderSuggestedTree(plan) {
  if (!plan.recommended.length) return empty('Nessun file disponibile per costruire una proposta reale.');
  const roots = new Map();
  plan.recommended.forEach((entry) => {
    let level = roots;
    entry.path.forEach((part, index) => {
      if (!level.has(part)) level.set(part, { count: 0, children: new Map() });
      const node = level.get(part); node.count += entry.count;
      if (index < entry.path.length - 1) level = node.children;
    });
  });
  const renderLevel = (nodes, depth = 0) => Array.from(nodes, ([name, node]) => `<div class="proposal-node" style="--depth:${depth}"><span>&#128193;</span><strong>${escapeHtml(name)}</strong><b>${number(node.count)} file</b></div>${renderLevel(node.children, depth + 1)}`).join('');
  return `<div class="proposal-note"><strong>Logica consigliata</strong><span>Ambito &gt; cliente &gt; anno &gt; classe documentale. Date ISO e nomi coerenti restano ordinabili anche fuori dall app.</span></div>${renderLevel(roots)}`;
}

function renderTreeNode(node) {
  const children = node.children && node.children.length
    ? `<div class="tree-children">${node.children.map(renderTreeNode).join('')}</div>`
    : '';

  return `
    <article class="tree-node ${node.protected ? 'tree-protected' : ''}">
      <div class="tree-line" data-tree-path="${escapeAttr(node.path)}">
        <span class="tree-folder">${node.protected ? '&#128274;' : '&#128193;'}</span>
        <strong title="${escapeAttr(node.path)}">${escapeHtml(node.name)}</strong>
        <div class="tree-sizebar"><span style="width:${Math.max(2, Math.min(100, node.size / Math.max(1, state.report.totals.bytes) * 100))}%"></span></div>
        <span class="meta">${bytes(node.size)} · ${number(node.fileCount)} file</span>
      </div>
      ${children}
    </article>
  `;
}

function renderDuplicates() {
  const groups = state.report.duplicateGroups;
  if (groups.length === 0) {
    els.duplicateList.innerHTML = empty('Nessun duplicato identico trovato nei limiti scelti.');
    return;
  }

  els.duplicateList.innerHTML = groups.map((group) => `
    <article class="stack-item">
      <strong>${group.count} file ${escapeHtml(((group.files[0]?.extension || '').replace('.', '') || 'senza estensione').toUpperCase())} identici · ${bytes(group.wastedBytes)} recuperabili</strong>
      <p>${bytes(group.size)} ciascuno · Identita verificata SHA-256 <code>${escapeHtml((group.files[0]?.sha256 || '').slice(0, 12))}...</code></p>
      <div class="table-list">
        ${group.files.map((file) => `<article class="row check-row"><input type="checkbox" data-duplicate="${escapeAttr(file.path)}" title="Seleziona questa copia da spostare nel Cestino" ${state.selectedDuplicates.has(file.path) ? 'checked' : ''}/><div class="row-main"><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(file.path)}</span></div><span class="meta">${bytes(file.size)}</span><button class="mini-button" data-reveal="${escapeAttr(file.path)}">Mostra</button></article>`).join('')}
      </div>
    </article>
  `).join('');
  els.duplicateList.querySelectorAll('[data-duplicate]').forEach((input) => input.addEventListener('change', () => {
    if (input.checked) state.selectedDuplicates.add(input.dataset.duplicate); else state.selectedDuplicates.delete(input.dataset.duplicate);
    els.trashDuplicates.disabled = state.selectedDuplicates.size === 0;
  }));
  els.trashDuplicates.disabled = state.selectedDuplicates.size === 0;
  wirePathButtons(els.duplicateList);
}

function renderCleanup() {
  const temps = state.report.tempFiles;
  document.querySelector('#cleanupRoot').textContent = state.report.root;
  document.querySelector('#cleanupIndexedAt').textContent = `Analizzata il ${new Date(state.report.finishedAt).toLocaleString()} - ${number(state.report.totals.files)} file e ${number(state.report.totals.folders)} cartelle`;
  const tempBytes = temps.filter((file) => cleanupAssessment(file).level === 'safe').reduce((sum, file) => sum + file.size, 0);
  const duplicateBytes = state.report.duplicateGroups.reduce((sum, group) => sum + group.wastedBytes, 0);
  els.tempWaste.textContent = bytes(tempBytes);
  els.duplicateWaste.textContent = bytes(duplicateBytes);
  els.totalWaste.textContent = bytes(tempBytes + duplicateBytes);
  els.trashSelected.disabled = state.selectedTemps.size === 0;
  els.tempFiles.innerHTML = temps.length ? temps.slice(0, 250).map((file) => {
    const assessment = cleanupAssessment(file);
    return `
    <article class="row check-row">
      <input type="checkbox" data-temp="${escapeAttr(file.path)}" ${assessment.level === 'protected' ? 'disabled title="File protetto"' : 'title="Seleziona per spostare nel Cestino"'} ${state.selectedTemps.has(file.path) ? 'checked' : ''} />
      <div class="row-main">
        <strong title="${escapeAttr(file.name)}">${escapeHtml(file.name)}</strong>
        <span title="${escapeAttr(file.path)}">${escapeHtml(file.path)}</span>
        <small class="cleanup-reason ${assessment.level}">${escapeHtml(assessment.label)} - ${escapeHtml(assessment.reason)}</small>
      </div>
      <span class="meta">${bytes(file.size)}</span>
      <button class="mini-button" data-reveal="${escapeAttr(file.path)}">Mostra</button>
    </article>
  `; }).join('') : empty('Nessun candidato eliminabile a basso rischio trovato in questa cartella.');

  els.tempFiles.querySelectorAll('[data-temp]').forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) state.selectedTemps.add(input.dataset.temp);
      else state.selectedTemps.delete(input.dataset.temp);
      els.trashSelected.disabled = state.selectedTemps.size === 0;
    });
  });
  wirePathButtons(els.tempFiles);

  const apps = state.report.appFolders;
  els.appFolders.innerHTML = apps.length ? apps.slice(0, 120).map((item) => `
    <article class="stack-item">
      <strong title="${escapeAttr(item.path)}">${escapeHtml(item.name)}</strong>
      <p>${escapeHtml(item.uninstallHint)}</p>
      <p>${escapeHtml(item.path)}</p>
      <button class="mini-button" data-reveal="${escapeAttr(item.path)}">Mostra</button>
    </article>
  `).join('') : empty('Nessuna cartella applicazione rilevata.');
  wirePathButtons(els.appFolders);
}

function cleanupAssessment(file) {
  const lower = file.path.toLowerCase();
  const name = file.name.toLowerCase();
  if (file.protected || /\\(windows|program files|program files \(x86\)|programdata)\\/.test(lower) || ['hiberfil.sys', 'pagefile.sys', 'swapfile.sys'].includes(name)) {
    return { level: 'protected', label: 'Protetto', reason: 'file di sistema o applicazione: non eliminare da FileFinder' };
  }
  if (/\\(temp|tmp)\\/.test(lower) && /\.(tmp|temp|dmp|chk|crdownload|download)$/.test(name)) {
    return { level: 'safe', label: 'Basso rischio', reason: 'file temporaneo in una cartella temporanea; eliminazione reversibile tramite Cestino' };
  }
  if (/\\cache\\/.test(lower)) return { level: 'review', label: 'Da verificare', reason: 'cache ricreabile, ma potrebbe rallentare o disconnettere l applicazione' };
  if (/\.(bak|old|log)$/.test(name)) return { level: 'review', label: 'Da verificare', reason: 'potrebbe essere un backup o un registro ancora utile' };
  return { level: 'review', label: 'Da verificare', reason: 'FileFinder non puo garantirne l inutilita senza controllo manuale' };
}

let searchGeneration = 0;
async function renderSearch() {
  if (!state.report) return;
  const generation = ++searchGeneration;
  const query = els.searchInput.value.trim().toLowerCase();
  const mode = els.searchType.value;
  const tempSet = new Set(state.report.tempFiles.map((file) => file.path));
  const duplicateSet = new Set(state.report.duplicateGroups.flatMap((group) => group.files.map((file) => file.path)));
  let files = state.report.files.filter((file) => !file.path.toLowerCase().includes('\\$recycle.bin\\'));

  if (mode === 'large') {
    const threshold = Math.max(10 * 1024 * 1024, state.report.totals.bytes * 0.005);
    files = files.filter((file) => file.size >= threshold);
  }
  if (mode === 'temp') {
    files = files.filter((file) => tempSet.has(file.path));
  }
  if (mode === 'duplicate') files = files.filter((file) => duplicateSet.has(file.path));
  if (mode === 'cloud') files = files.filter((file) => /\\(onedrive|google drive|dropbox|icloud)\\/i.test(file.path));
  if (els.searchCategory.value !== 'all') files = files.filter((file) => searchCategory(file.extension) === els.searchCategory.value);
  const minSize = (Number(els.searchMinSize.value) || 0) * 1024 * 1024;
  const maxSize = (Number(els.searchMaxSize.value) || Infinity) * 1024 * 1024;
  files = files.filter((file) => file.size >= minSize && file.size <= maxSize);
  if (els.searchFrom.value) files = files.filter((file) => new Date(file.modifiedAt) >= new Date(`${els.searchFrom.value}T00:00:00`));
  if (els.searchTo.value) files = files.filter((file) => new Date(file.modifiedAt) <= new Date(`${els.searchTo.value}T23:59:59`));
  if (query) {
    files = files.filter((file) =>
      file.name.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query) ||
      file.extension.toLowerCase().includes(query)
    );
  }

  if (query && els.searchContent.checked) {
    els.searchStatus.textContent = 'Ricerca nel contenuto dei file leggibili...';
    const contentPaths = new Set(await window.filefinder.searchFileContent(query, state.report.files));
    if (generation !== searchGeneration) return;
    const visible = new Set(files.map((file) => file.path));
    files = state.report.files.filter((file) => visible.has(file.path) || contentPaths.has(file.path));
  }

  if (els.searchSort.value === 'size-desc') files.sort((a, b) => b.size - a.size);
  if (els.searchSort.value === 'date-desc') files.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  if (els.searchSort.value === 'date-asc') files.sort((a, b) => new Date(a.modifiedAt) - new Date(b.modifiedAt));

  renderRows(els.searchResults, files.slice(0, 300));
  els.searchStatus.textContent = `${number(files.length)} risultati${files.length > 300 ? ' · mostrati i primi 300' : ''}`;
}

function searchCategory(extension) {
  const ext = String(extension).toLowerCase();
  if (['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.txt','.odt','.rtf'].includes(ext)) return 'document';
  if (['.jpg','.jpeg','.png','.gif','.webp','.tif','.tiff','.raw','.heic'].includes(ext)) return 'image';
  if (['.mp4','.mkv','.avi','.mov','.wmv','.webm','.m4v'].includes(ext)) return 'video';
  if (['.mp3','.flac','.wav','.aac','.m4a','.ogg','.wma'].includes(ext)) return 'audio';
  if (['.zip','.7z','.rar','.tar','.gz','.bz2','.iso'].includes(ext)) return 'archive';
  return 'other';
}

function renderProtocol() {
  const report = state.report;
  const protectedCount = report.protocol.filter((item) => item.type === 'protected-skip').length;
  const rows = [
    { at: report.finishedAt, type: 'Analisi completata', path: report.root, message: `${number(report.totals.files)} file, ${number(report.totals.folders)} cartelle, ${bytes(report.totals.bytes)}` },
    ...(protectedCount ? [{ at: report.finishedAt, type: 'Aree protette', path: report.root, message: `${number(protectedCount)} aree di sistema saltate in sicurezza` }] : []),
    ...report.protocol.filter((item) => item.type.startsWith('pulizia-')).map((item) => ({ ...item, type: 'Spazio liberato' }))
  ];

  els.protocolList.innerHTML = rows.map((item) => `
    <article class="protocol-row"><span class="activity-dot"></span><div>
      <strong>${escapeHtml(item.type)}</strong><time>${escapeHtml(new Date(item.at).toLocaleString())}</time>
      <p>${escapeHtml(item.message)}</p><span>${escapeHtml(item.path)}</span></div>
    </article>
  `).join('');
}

function renderRows(container, files) {
  container.innerHTML = files.length ? files.map(fileRow).join('') : empty('Nessun risultato da mostrare.');
  wirePathButtons(container);
}

function fileRow(file) {
  return `
    <article class="row">
      <div class="row-main">
        <strong title="${escapeAttr(file.name)}">${escapeHtml(file.name)}</strong>
        <span title="${escapeAttr(file.path)}">${escapeHtml(file.path)}</span>
      </div>
      <span class="meta">${bytes(file.size)}</span>
      <button class="mini-button" data-reveal="${escapeAttr(file.path)}">Mostra</button>
    </article>
  `;
}

function wirePathButtons(container) {
  container.querySelectorAll('[data-reveal]').forEach((button) => {
    button.addEventListener('click', () => window.filefinder.revealPath(button.dataset.reveal));
  });
}

function drawExtensionChart(items) {
  const total = items.reduce((sum, item) => sum + item.size, 0) || 1;
  els.extensionChart.innerHTML = items.map((item) => {
    const percent = Math.max(1, item.size / total * 100);
    return `<div class="type-bar"><div class="type-label"><strong>${escapeHtml(item.extension)}</strong><span>${bytes(item.size)} · ${number(item.count)} file · ${percent.toFixed(1)}%</span></div><div class="type-track"><div style="width:${percent}%"></div></div></div>`;
  }).join('');
}

function empty(message) {
  return `<article class="stack-item"><p>${escapeHtml(message)}</p></article>`;
}

function bytes(value) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = Number(value) || 0;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function number(value) {
  return new Intl.NumberFormat('it-IT').format(value || 0);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

window.addEventListener('resize', () => {
  if (state.report) drawExtensionChart(state.report.extensionStats.slice(0, 8));
});

async function restoreLastFolder() {
  const cached = await window.filefinder.loadIndex();
  if (cached) {
    state.report = cached;
    if (!state.roots.length && cached.roots?.length) { state.roots = cached.roots; localStorage.setItem('filefinder:workspaceRoots', JSON.stringify(state.roots)); renderWorkspaceRoots(); }
    for (const folder of cached.largestFolders || []) state.folderSizes.set(folder.path, { size: folder.size, files: folder.fileCount, folders: folder.dirCount, indexed: true });
    renderAll();
    setStatus(`Indice del ${new Date(cached.finishedAt).toLocaleString()}`);
  }
  const lastRoot = localStorage.getItem('filefinder:lastRoot');
  if (!lastRoot) {
    await browseComputer(false);
    return;
  }
  state.root = lastRoot;
  els.selectedPath.textContent = lastRoot;
  els.scanFolder.disabled = false;
  await browseTo(lastRoot, false);
  if (!state.directory) await browseComputer(false);
}

renderWorkspaceRoots();
restoreLastFolder();
