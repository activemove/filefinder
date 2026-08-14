const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const TEMP_EXTENSIONS = new Set([
  '.tmp', '.temp', '.bak', '.old', '.dmp', '.chk', '.log', '.cache'
]);

app.setPath('userData', path.join(process.env.LOCALAPPDATA || os.homedir(), 'FileFinder'));

const APP_MARKERS = new Set([
  'package.json', 'composer.json', 'requirements.txt', 'pyproject.toml',
  'setup.py', 'pom.xml', 'build.gradle', 'cargo.toml', 'go.mod',
  'app.config', 'web.config', 'electron-builder.json'
]);

const PROTECTED_NAMES = new Set([
  '$recycle.bin', 'system volume information', 'windows', 'program files',
  'program files (x86)', 'programdata', 'recovery', 'config.msi'
]);
const PROTECTED_FILES = new Set(['hiberfil.sys', 'pagefile.sys', 'swapfile.sys', 'bootmgr', 'ntldr', 'bootnxt']);
const MEDIA_TYPES = {
  video: new Set(['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm', '.m4v']),
  audio: new Set(['.mp3', '.flac', '.wav', '.aac', '.m4a', '.ogg', '.wma']),
  image: new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tif', '.tiff', '.raw', '.heic']),
  document: new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.odt']),
  archive: new Set(['.zip', '.7z', '.rar', '.tar', '.gz', '.bz2', '.iso'])
};

let splashWindow = null;
let isQuitting = false;
const smokeRoot = process.env.FILEFINDER_SMOKE_ROOT;
const smokeOut = process.env.FILEFINDER_SMOKE_OUT;
if (!smokeRoot || !smokeOut) {
  const singleInstance = app.requestSingleInstanceLock();
  if (!singleInstance) app.quit();
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows().find((window) => window !== splashWindow);
    if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
  });
}

function createSplash(mode = 'loading') {
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
  splashWindow = new BrowserWindow({
    width: 420,
    height: 300,
    center: true,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: true,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  splashWindow.loadFile(path.join(__dirname, '..', 'renderer', 'splash.html'), { query: { mode } });
  splashWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.showInactive();
  });
  splashWindow.on('closed', () => { splashWindow = null; });
  return splashWindow;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: 'FileFinder',
    icon: path.join(__dirname, '..', 'renderer', 'assets', 'filefinder-logo.png'),
    backgroundColor: '#f5f3ee',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) win.show();
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
    splashWindow = null;
  });
  win.on('close', (event) => {
    if (isQuitting) return;
    if (process.env.FILEFINDER_LAUNCHED === '1') {
      isQuitting = true;
      return;
    }
    event.preventDefault();
    isQuitting = true;
    win.hide();
    app.exit(0);
  });
}

app.whenReady().then(async () => {
  if (smokeRoot && smokeOut) {
    try {
      const directory = await listDirectorySafe(smokeRoot);
      const report = await scanFolder(smokeRoot, { maxFiles: 80000, hashLimitMb: 2048, includeHidden: true });
      await fs.promises.writeFile(smokeOut, JSON.stringify({
        smokeRoot,
        items: directory.items.map((item) => ({ name: item.name, kind: item.kind, size: item.size, protected: item.protected, cloud: item.cloud || null })),
        totals: report.totals,
        largestFiles: report.largestFiles.slice(0, 10),
        tempFiles: report.tempFiles.slice(0, 10),
        duplicateGroups: report.duplicateGroups.slice(0, 10).map((group) => ({ count: group.count, size: group.size, wastedBytes: group.wastedBytes, files: group.files }))
      }, null, 2), 'utf8');
      app.exit(0);
    } catch (error) {
      await fs.promises.writeFile(smokeOut, JSON.stringify({ smokeRoot, error: error.message }, null, 2), 'utf8');
      app.exit(1);
    }
    return;
  }
  if (process.env.FILEFINDER_LAUNCHED !== '1') createSplash('loading');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Scegli una cartella da analizzare'
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('select-workspace-folders', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'multiSelections'], title: 'Aggiungi cartelle al workspace' });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('select-container', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'], title: 'Scegli cartella contenitore' });
  return result.canceled || !result.filePaths.length ? null : result.filePaths[0];
});

ipcMain.handle('select-naming-files', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'], title: 'Scegli i file da protocollare' });
  if (result.canceled) return [];
  return Promise.all(result.filePaths.map(async (filePath) => {
    const stat = await fs.promises.stat(filePath);
    return {
      name: path.basename(filePath), path: filePath, kind: 'file',
      extension: path.extname(filePath).toLowerCase(), size: stat.size,
      modifiedAt: stat.mtime.toISOString(), createdAt: stat.birthtime.toISOString(),
      accessedAt: stat.atime.toISOString(), protected: isProtectedPath(filePath)
    };
  }));
});

ipcMain.handle('move-items', async (_event, payload) => {
  const sources = Array.isArray(payload && payload.sources) ? payload.sources : [];
  const destination = payload && payload.destination;
  if (!destination || !fs.existsSync(destination)) throw new Error('Contenitore non accessibile.');
  const results = [];
  for (const source of sources) {
    try {
      if (!source || isProtectedPath(source)) throw new Error('Elemento protetto.');
      const target = path.join(destination, path.basename(source));
      if (path.resolve(source) === path.resolve(target)) throw new Error('Elemento gia presente nel contenitore.');
      if (fs.existsSync(target)) throw new Error('Esiste gia un elemento con lo stesso nome.');
      try {
        await fs.promises.rename(source, target);
      } catch (error) {
        if (error.code !== 'EXDEV') throw error;
        const stat = await fs.promises.stat(source);
        if (stat.isDirectory()) await fs.promises.cp(source, target, { recursive: true, errorOnExist: true });
        else await fs.promises.copyFile(source, target, fs.constants.COPYFILE_EXCL);
        const targetStat = await fs.promises.stat(target);
        if (stat.isFile() && targetStat.size !== stat.size) throw new Error('Verifica copia non riuscita.');
        await fs.promises.rm(source, { recursive: stat.isDirectory(), force: false });
      }
      results.push({ source, target, ok: true });
    } catch (error) {
      results.push({ source, ok: false, error: error.message });
    }
  }
  return results;
});

ipcMain.handle('rename-items', async (_event, operations) => {
  const results = [];
  for (const operation of operations || []) {
    try {
      if (!operation.source || !operation.target || isProtectedPath(operation.source) || PROTECTED_FILES.has(path.basename(operation.source).toLowerCase())) throw new Error('File di sistema protetto.');
      if (fs.existsSync(operation.target)) throw new Error('Il nome di destinazione esiste gia.');
      await fs.promises.rename(operation.source, operation.target);
      results.push({ ...operation, ok: true });
    } catch (error) {
      results.push({ ...operation, ok: false, error: error.message });
    }
  }
  return results;
});

ipcMain.handle('scan-folder', async (ipcEvent, payload) => {
  const root = payload && payload.root;
  const options = Object.assign({
    maxFiles: 80000,
    hashLimitMb: 2048,
    includeHidden: true
  }, payload && payload.options);

  if (!root || !fs.existsSync(root)) {
    throw new Error('Cartella non valida o non accessibile.');
  }

  return scanFolder(root, options, (progress) => {
    if (!ipcEvent.sender.isDestroyed()) ipcEvent.sender.send('scan-progress', progress);
  });
});

ipcMain.handle('scan-folders', async (ipcEvent, payload) => {
  const roots = [...new Set((payload?.roots || []).filter((root) => root && fs.existsSync(root)))];
  if (!roots.length) throw new Error('Aggiungi almeno una cartella al workspace.');
  const options = Object.assign({ maxFiles: 80000, hashLimitMb: 2048, includeHidden: true }, payload?.options);
  const reports = [];
  for (let index = 0; index < roots.length; index += 1) {
    reports.push(await scanFolder(roots[index], options, (progress) => {
      if (!ipcEvent.sender.isDestroyed()) ipcEvent.sender.send('scan-progress', { ...progress, phase: `${index + 1}/${roots.length} - ${progress.phase}` });
    }));
  }
  return mergeReports(roots, reports, options);
});

ipcMain.handle('list-directory', async (_event, targetPath) => {
  return listDirectorySafe(targetPath);
});

ipcMain.handle('list-drives', async () => {
  const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const drives = (await Promise.all(letters.map(async (letter) => {
    const drivePath = `${letter}:\\`;
    try {
      const stat = await fs.promises.stat(drivePath);
      if (!stat.isDirectory()) return null;
      let capacity = null;
      try {
        const info = await fs.promises.statfs(drivePath);
        const total = Number(info.blocks) * Number(info.bsize);
        const free = Number(info.bavail) * Number(info.bsize);
        capacity = { total, free, used: total - free, usedPercent: total ? ((total - free) / total) * 100 : 0 };
      } catch (_error) {}
      return {
        name: letter === 'C' ? `Disco locale (${letter}:)` : `Unita (${letter}:)`,
        path: drivePath,
        kind: 'drive',
        extension: '',
        size: null,
        modifiedAt: null,
        capacity
      };
    } catch (_error) {
      return null;
    }
  }))).filter(Boolean);

  const cloudCandidates = [
    process.env.OneDrive,
    process.env.OneDriveConsumer,
    process.env.OneDriveCommercial
  ].filter(Boolean);

  // Google Drive normally exposes a virtual drive containing "My Drive" or
  // "Il mio Drive". Include that root alongside OneDrive in Questo PC.
  for (const drive of drives) {
    for (const child of ['My Drive', 'Il mio Drive', 'Shared drives', 'Drive condivisi']) {
      cloudCandidates.push(path.join(drive.path, child));
    }
  }

  const seen = new Set();
  const cloudRoots = [];
  for (const candidate of cloudCandidates) {
    if (!candidate) continue;
    const normalized = path.resolve(candidate);
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const stat = await fs.promises.stat(normalized);
      if (!stat.isDirectory()) continue;
      const provider = detectCloud(normalized) || (/(my drive|il mio drive|shared drives|drive condivisi)/i.test(normalized) ? 'Google Drive' : 'Cloud');
      cloudRoots.push({
        name: `${provider} - ${path.basename(normalized)}`,
        path: normalized,
        kind: 'folder',
        extension: '',
        size: null,
        modifiedAt: stat.mtime.toISOString(),
        cloud: provider,
        category: 'folder'
      });
    } catch (_error) {}
  }

  return { path: 'Questo PC', parent: null, truncated: false, items: [...cloudRoots, ...drives] };
});

ipcMain.handle('folder-size', async (_event, folderPath) => {
  const started = Date.now();
  const stack = [folderPath];
  let size = 0;
  let files = 0;
  let folders = 0;
  let partial = false;

  while (stack.length) {
    if (files >= 20000 || Date.now() - started > 1800) {
      partial = true;
      break;
    }
    const current = stack.pop();
    let entries;
    try { entries = await fs.promises.readdir(current, { withFileTypes: true }); } catch (_error) { continue; }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        folders += 1;
        stack.push(fullPath);
      } else if (entry.isFile()) {
        try {
          const stat = await fs.promises.stat(fullPath);
          size += stat.size;
          files += 1;
        } catch (_error) {}
      }
    }
  }
  return { path: folderPath, size, files, folders, partial };
});

ipcMain.handle('open-path', async (_event, targetPath) => {
  return shell.openPath(targetPath);
});

ipcMain.handle('reveal-path', async (_event, targetPath) => {
  shell.showItemInFolder(targetPath);
  return true;
});

ipcMain.handle('preview-image', async (_event, targetPath) => {
  const extension = path.extname(targetPath || '').toLowerCase();
  const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp' }[extension];
  if (!mime) return { available: false, reason: 'Formato non supportato dal visualizzatore integrato.' };
  try {
    const stat = await fs.promises.stat(targetPath);
    if (!stat.isFile() || stat.size > 25 * 1024 * 1024) return { available: false, reason: 'Anteprima non caricata: immagine oltre 25 MB.' };
    const data = await fs.promises.readFile(targetPath);
    return { available: true, dataUrl: `data:${mime};base64,${data.toString('base64')}` };
  } catch (_error) { return { available: false, reason: 'Immagine non disponibile localmente o non leggibile.' }; }
});

ipcMain.handle('preview-document', async (_event, targetPath) => {
  const extension = path.extname(targetPath || '').toLowerCase();
  try {
    const stat = await fs.promises.stat(targetPath);
    if (!stat.isFile() || stat.size > 30 * 1024 * 1024) return { available: false, reason: 'Documento oltre il limite anteprima di 30 MB.' };
    if (extension === '.pdf') {
      const data = await fs.promises.readFile(targetPath);
      return { available: true, kind: 'pdf', dataUrl: `data:application/pdf;base64,${data.toString('base64')}` };
    }
    if (['.txt', '.log', '.csv', '.json', '.xml', '.md', '.ini'].includes(extension)) {
      const handle = await fs.promises.open(targetPath, 'r');
      const buffer = Buffer.alloc(Math.min(stat.size, 256 * 1024));
      await handle.read(buffer, 0, buffer.length, 0); await handle.close();
      return { available: true, kind: 'text', text: buffer.toString('utf8').replace(/\0/g, '').slice(0, 120000) };
    }
    if (extension === '.docx') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: targetPath });
      return { available: true, kind: 'text', text: result.value.slice(0, 120000) };
    }
    if (extension === '.xlsx') {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook(); await workbook.xlsx.readFile(targetPath);
      const sections = [];
      workbook.worksheets.slice(0, 5).forEach((sheet) => {
        const rows = [];
        sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => { if (rowNumber <= 80) rows.push(row.values.slice(1, 21).map((value) => typeof value === 'object' ? value.text || value.result || JSON.stringify(value) : value ?? '').join('\t')); });
        sections.push(`[${sheet.name}]\n${rows.join('\n')}`);
      });
      return { available: true, kind: 'text', text: sections.join('\n\n').slice(0, 120000) };
    }
    return { available: false, reason: 'Per DOC/XLS legacy usa Apri con Windows e il relativo preview handler.' };
  } catch (_error) { return { available: false, reason: 'Anteprima documento non disponibile o file solo online.' }; }
});

ipcMain.handle('copy-items', async (_event, payload) => {
  const sources = payload?.sources || [];
  const destination = payload?.destination;
  const results = [];
  for (const source of sources) {
    try {
      if (!destination || isProtectedPath(source)) throw new Error('Operazione non consentita.');
      const target = path.join(destination, path.basename(source));
      if (fs.existsSync(target)) throw new Error('Esiste gia un elemento con lo stesso nome.');
      const stat = await fs.promises.stat(source);
      if (stat.isDirectory()) await fs.promises.cp(source, target, { recursive: true, errorOnExist: true });
      else await fs.promises.copyFile(source, target, fs.constants.COPYFILE_EXCL);
      results.push({ source, target, ok: true });
    } catch (error) { results.push({ source, ok: false, error: error.message }); }
  }
  return results;
});

ipcMain.handle('print-path', async (_event, targetPath) => {
  const stat = await fs.promises.stat(targetPath);
  if (!stat.isFile()) throw new Error('La stampa e disponibile solo per i file.');
  spawn('rundll32.exe', ['shell32.dll,ShellExec_RunDLL', 'print', targetPath], { detached: true, windowsHide: true }).unref();
  return true;
});

ipcMain.handle('open-apps-settings', async () => {
  await shell.openExternal('ms-settings:appsfeatures');
  return true;
});

ipcMain.handle('open-external', async (_event, url) => {
  let parsed;
  try { parsed = new URL(url); } catch (_error) { throw new Error('Collegamento non valido.'); }
  const allowedHosts = new Set(['www.damc.it', 'damc.it', 'opensource.org', 'www.paypal.com', 'paypal.com']);
  if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname.toLowerCase())) throw new Error('Collegamento esterno non autorizzato.');
  await shell.openExternal(parsed.toString());
  return true;
});

ipcMain.handle('delete-temp-files', async (_event, files) => {
  const results = [];
  for (const filePath of files || []) {
    try {
      await shell.trashItem(filePath);
      results.push({ path: filePath, ok: true });
    } catch (error) {
      results.push({ path: filePath, ok: false, error: error.message });
    }
  }
  return results;
});

ipcMain.handle('export-protocol', async (_event, protocol) => {
  const defaultPath = path.join(os.homedir(), 'Desktop', `filefinder-protocollo-${Date.now()}.json`);
  const result = await dialog.showSaveDialog({
    title: 'Salva protocollo',
    defaultPath,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (result.canceled || !result.filePath) return null;
  await fs.promises.writeFile(result.filePath, JSON.stringify(protocol, null, 2), 'utf8');
  return result.filePath;
});

ipcMain.handle('save-index', async (_event, report) => {
  const indexPath = path.join(app.getPath('userData'), 'filesystem-index.json');
  await fs.promises.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.promises.writeFile(indexPath, JSON.stringify(report), 'utf8');
  return true;
});

ipcMain.handle('load-index', async () => {
  const indexPath = path.join(app.getPath('userData'), 'filesystem-index.json');
  try { return JSON.parse(await fs.promises.readFile(indexPath, 'utf8')); } catch (_error) { return null; }
});

ipcMain.handle('search-file-content', async (_event, payload) => {
  const query = String(payload && payload.query || '').toLowerCase();
  const candidates = Array.isArray(payload && payload.files) ? payload.files.slice(0, 1500) : [];
  const readable = new Set(['.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm', '.css', '.js', '.ts', '.log', '.ini', '.yaml', '.yml', '.rtf']);
  const matches = [];
  if (query.length < 3) return matches;
  for (const file of candidates) {
    if (!readable.has(String(file.extension).toLowerCase()) || file.size > 1024 * 1024 || isProtectedPath(file.path)) continue;
    try {
      const content = await fs.promises.readFile(file.path, 'utf8');
      if (content.toLowerCase().includes(query)) matches.push(file.path);
    } catch (_error) {}
  }
  return matches;
});

ipcMain.handle('ai-status', async () => {
  try {
    const response = await fetch('http://127.0.0.1:11435/health', { signal: AbortSignal.timeout(1500) });
    return { available: response.ok, model: 'Qwen2.5 1.5B locale' };
  } catch (_error) { return { available: false, model: null }; }
});

ipcMain.handle('app-info', () => ({
  version: app.getVersion(),
  license: 'MIT',
  website: 'https://www.damc.it',
  downloadUrl: 'https://www.damc.it/filefinder'
}));

ipcMain.handle('telemetry-event', async (_event, payload) => {
  try {
    const configPath = path.join(process.env.FILEFINDER_HOME || path.dirname(process.execPath), 'telemetry.json');
    const config = JSON.parse(await fs.promises.readFile(configPath, 'utf8'));
    if (!config.endpoint || !config.endpoint.startsWith('https://')) return false;
    const eventName = ['first_open', 'app_start'].includes(payload?.event) ? payload.event : null;
    if (!eventName || !/^[a-f0-9-]{36}$/i.test(payload.installationId || '')) return false;
    const response = await fetch(config.endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(4000),
      body: JSON.stringify({ event: eventName, installation_id: payload.installationId, app_version: app.getVersion(), locale: app.getLocale(), platform: process.platform, arch: process.arch })
    });
    return response.ok;
  } catch (_error) { return false; }
});

ipcMain.handle('ai-assist', async (_event, payload) => {
  const response = await fetch('http://127.0.0.1:11435/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'qwen2.5-local', temperature: 0.1, max_tokens: 500, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: payload.system }, { role: 'user', content: payload.prompt }] }),
    signal: AbortSignal.timeout(120000)
  });
  if (!response.ok) throw new Error('AI locale non disponibile.');
  const data = await response.json();
  const content = data.choices[0].message.content;
  const json = content.match(/\{[\s\S]*\}/);
  if (!json) throw new Error('Risposta AI non interpretabile.');
  return JSON.parse(json[0]);
});

async function mergeReports(roots, reports, options) {
  const files = reports.flatMap((report) => report.files);
  const protocol = reports.flatMap((report) => report.protocol);
  const sizeGroups = new Map();
  files.forEach((file) => addSizeGroup(sizeGroups, file.size, file));
  const duplicateGroups = await findDuplicates(sizeGroups, options.hashLimitMb, protocol);
  const extensionMap = new Map();
  reports.flatMap((report) => report.extensionStats).forEach((item) => {
    const current = extensionMap.get(item.extension) || { extension: item.extension, count: 0, size: 0 };
    current.count += item.count; current.size += item.size; extensionMap.set(item.extension, current);
  });
  const extensionStats = Array.from(extensionMap.values()).sort((a, b) => b.size - a.size);
  const tempFiles = reports.flatMap((report) => report.tempFiles).sort((a, b) => b.size - a.size);
  const appFolders = reports.flatMap((report) => report.appFolders);
  const largestFiles = reports.flatMap((report) => report.largestFiles).sort((a, b) => b.size - a.size).slice(0, 500);
  const largestFolders = reports.flatMap((report) => report.largestFolders).sort((a, b) => b.size - a.size).slice(0, 500);
  const totals = reports.reduce((sum, report) => ({
    files: sum.files + report.totals.files, folders: sum.folders + report.totals.folders,
    bytes: sum.bytes + report.totals.bytes, skipped: sum.skipped + report.totals.skipped, errors: sum.errors + report.totals.errors
  }), { files: 0, folders: 0, bytes: 0, skipped: 0, errors: 0 });
  const tree = { name: 'Workspace', path: 'Workspace', size: totals.bytes, fileCount: totals.files, dirCount: totals.folders, protected: false, children: reports.map((report) => report.tree) };
  return {
    root: roots.length === 1 ? roots[0] : `Workspace (${roots.length} cartelle)`, roots,
    startedAt: reports[0].startedAt, finishedAt: reports[reports.length - 1].finishedAt,
    totals, tree, files, largestFiles, largestFolders, extensionStats, duplicateGroups,
    tempFiles, appFolders, suggestions: buildSuggestions('Workspace', tree, duplicateGroups, tempFiles, appFolders, extensionStats),
    errors: reports.flatMap((report) => report.errors), protocol
  };
}

async function listDirectorySafe(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) throw new Error('Cartella non valida o non accessibile.');
  const entries = await fs.promises.readdir(targetPath, { withFileTypes: true });
  const items = await Promise.all(entries.slice(0, 2500).map(async (entry) => {
    const fullPath = path.join(targetPath, entry.name);
    try {
      const stat = await fs.promises.stat(fullPath);
      const kind = stat.isDirectory() ? 'folder' : 'file';
      return {
        name: entry.name,
        path: fullPath,
        kind,
        extension: kind === 'folder' ? '' : path.extname(entry.name).toLowerCase(),
        size: kind === 'folder' ? null : stat.size,
        modifiedAt: stat.mtime.toISOString(),
        createdAt: stat.birthtime.toISOString(),
        accessedAt: stat.atime.toISOString(),
        protected: isProtectedPath(fullPath),
        cloud: detectCloud(fullPath),
        category: kind === 'folder' ? 'folder' : classifyExtension(path.extname(entry.name).toLowerCase())
      };
    } catch (_error) {
      return { name: entry.name, path: fullPath, kind: entry.isDirectory() ? 'folder' : 'file', size: null };
    }
  }));
  items.sort((a, b) => a.kind === b.kind
    ? a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })
    : (a.kind === 'folder' ? -1 : 1));
  return {
    path: targetPath,
    parent: path.dirname(targetPath) === targetPath ? null : path.dirname(targetPath),
    truncated: entries.length > items.length,
    items
  };
}

async function scanFolder(root, options, onProgress = () => {}) {
  const startedAt = new Date().toISOString();
  const rootNode = createDirNode(root, path.basename(root) || root);
  const files = [];
  const errors = [];
  const extensions = new Map();
  const tempFiles = [];
  const appFolders = [];
  const sizeGroups = new Map();
  const protocol = [];
  let dirCount = 0;
  let skipped = 0;
  let lastProgressAt = 0;

  protocol.push(event('scan-start', root, 'Analisi avviata'));

  async function walk(currentPath, node, depth) {
    dirCount += 1;
    emitProgress('Lettura cartelle', currentPath);
    let entries;

    try {
      entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      errors.push({ path: currentPath, message: error.message });
      protocol.push(event('read-error', currentPath, error.message));
      return;
    }

    detectAppFolder(currentPath, entries, appFolders);

    for (const entry of entries) {
      if (files.length >= options.maxFiles) {
        skipped += 1;
        continue;
      }

      const fullPath = path.join(currentPath, entry.name);
      if (!options.includeHidden && entry.name.startsWith('.')) continue;

      try {
        if (entry.isDirectory()) {
          const child = createDirNode(fullPath, entry.name);
          node.children.push(child);
          if (isProtectedPath(fullPath) && path.dirname(fullPath) === path.parse(fullPath).root) {
            child.protected = true;
            skipped += 1;
            protocol.push(event('protected-skip', fullPath, 'Area protetta mostrata ma non analizzata'));
            continue;
          }
          await walk(fullPath, child, depth + 1);
          node.size += child.size;
          node.fileCount += child.fileCount;
          node.dirCount += child.dirCount + 1;
        } else if (entry.isFile()) {
          const stat = await fs.promises.stat(fullPath);
          const ext = path.extname(entry.name).toLowerCase() || '[senza estensione]';
          const item = {
            name: entry.name,
            path: fullPath,
            directory: currentPath,
            extension: ext,
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            createdAt: stat.birthtime.toISOString()
          };

          files.push(item);
          node.size += stat.size;
          node.fileCount += 1;
          addExtension(extensions, ext, stat.size);
          addSizeGroup(sizeGroups, stat.size, item);

          if (isTempCandidate(item)) tempFiles.push(item);
          emitProgress('Indicizzazione file', fullPath);
        }
      } catch (error) {
        errors.push({ path: fullPath, message: error.message });
        protocol.push(event('stat-error', fullPath, error.message));
      }
    }
  }

  function emitProgress(phase, currentPath, force = false) {
    const now = Date.now();
    if (!force && now - lastProgressAt < 120) return;
    lastProgressAt = now;
    onProgress({ phase, path: currentPath, files: files.length, folders: dirCount, bytes: rootNode.size });
  }

  await walk(root, rootNode, 0);
  emitProgress('Confronto duplicati', root, true);
  rootNode.children.sort((a, b) => b.size - a.size);

  const duplicateGroups = await findDuplicates(sizeGroups, options.hashLimitMb, protocol);
  const largestFiles = files.slice().sort((a, b) => b.size - a.size).slice(0, 120);
  const largestFolders = flattenFolders(rootNode).sort((a, b) => b.size - a.size).slice(0, 120);
  const extensionStats = Array.from(extensions.values()).sort((a, b) => b.size - a.size);
  const suggestions = buildSuggestions(root, rootNode, duplicateGroups, tempFiles, appFolders, extensionStats);

  const finishedAt = new Date().toISOString();
  protocol.push(event('scan-end', root, 'Analisi completata'));
  emitProgress('Completata', root, true);

  return {
    root,
    startedAt,
    finishedAt,
    totals: {
      files: files.length,
      folders: dirCount,
      bytes: rootNode.size,
      skipped,
      errors: errors.length
    },
    tree: pruneTree(rootNode, 4),
    files,
    largestFiles,
    largestFolders,
    extensionStats,
    duplicateGroups,
    tempFiles: tempFiles.sort((a, b) => b.size - a.size),
    appFolders,
    suggestions,
    errors,
    protocol
  };
}

function createDirNode(fullPath, name) {
  return {
    name,
    path: fullPath,
    size: 0,
    fileCount: 0,
    dirCount: 0,
    children: [],
    protected: false
  };
}

function isProtectedPath(targetPath) {
  const parsed = path.parse(targetPath);
  const relative = targetPath.slice(parsed.root.length).split(path.sep).filter(Boolean);
  return relative.length > 0 && PROTECTED_NAMES.has(relative[0].toLowerCase());
}

function isApplicationPath(targetPath) {
  const lower = targetPath.toLowerCase();
  return lower.includes('\\program files\\') || lower.includes('\\program files (x86)\\') ||
    lower.includes('\\programdata\\') || lower.includes('\\windowsapps\\') ||
    lower.includes('\\appdata\\local\\programs\\');
}

function detectCloud(targetPath) {
  const lower = targetPath.toLowerCase();
  if (lower.includes('\\onedrive')) return 'OneDrive';
  if (lower.includes('\\google drive') || lower.includes('\\my drive')) return 'Google Drive';
  if (lower.includes('\\dropbox')) return 'Dropbox';
  if (lower.includes('\\icloud')) return 'iCloud';
  return null;
}

function classifyExtension(extension) {
  for (const [category, extensions] of Object.entries(MEDIA_TYPES)) {
    if (extensions.has(extension)) return category;
  }
  return 'other';
}

function addExtension(map, extension, size) {
  if (!map.has(extension)) map.set(extension, { extension, count: 0, size: 0 });
  const item = map.get(extension);
  item.count += 1;
  item.size += size;
}

function addSizeGroup(map, size, item) {
  if (size <= 0) return;
  const key = String(size);
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(item);
}

function isTempCandidate(file) {
  const lower = file.path.toLowerCase();
  if (TEMP_EXTENSIONS.has(file.extension)) return true;
  if (lower.includes('\\temp\\') || lower.includes('\\tmp\\') || lower.includes('\\cache\\')) return true;
  if (file.name.startsWith('~') || file.name.endsWith('.download') || file.name.endsWith('.crdownload')) return true;
  return false;
}

function detectAppFolder(folderPath, entries, appFolders) {
  const names = new Set(entries.map((entry) => entry.name.toLowerCase()));
  const markers = Array.from(APP_MARKERS).filter((marker) => names.has(marker));
  const lower = folderPath.toLowerCase();

  if (markers.length > 0 || lower.includes('\\program files') || lower.includes('\\appdata\\local\\programs')) {
    appFolders.push({
      path: folderPath,
      name: path.basename(folderPath) || folderPath,
      markers,
      uninstallHint: lower.includes('\\program files') || lower.includes('\\appdata\\local\\programs')
        ? 'Probabile cartella applicazione: verificare da Impostazioni > App prima di eliminare.'
        : 'Probabile progetto/app locale: controllare i marker prima di spostare o eliminare.'
    });
  }
}

async function findDuplicates(sizeGroups, hashLimitMb, protocol) {
  const duplicateGroups = [];
  const hashLimit = hashLimitMb * 1024 * 1024;

  for (const [size, group] of sizeGroups.entries()) {
    if (group.length < 2 || Number(size) > hashLimit) continue;

    const hashes = new Map();
    for (const file of group) {
      try {
        const hash = await hashFile(file.path);
        if (!hashes.has(hash)) hashes.set(hash, []);
        hashes.get(hash).push(Object.assign({}, file, { sha256: hash }));
      } catch (error) {
        protocol.push(event('hash-error', file.path, error.message));
      }
    }

    for (const files of hashes.values()) {
      if (files.length > 1) {
        if (files.some((file) => isProtectedPath(file.path) || isApplicationPath(file.path))) continue;
        duplicateGroups.push({
          size: Number(size),
          wastedBytes: Number(size) * (files.length - 1),
          count: files.length,
          files
        });
      }
    }
  }

  return duplicateGroups.sort((a, b) => b.wastedBytes - a.wastedBytes);
}

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function flattenFolders(node, out = []) {
  out.push({
    name: node.name,
    path: node.path,
    size: node.size,
    fileCount: node.fileCount,
    dirCount: node.dirCount
  });
  for (const child of node.children) flattenFolders(child, out);
  return out;
}

function pruneTree(node, maxDepth, depth = 0) {
  return {
    name: node.name,
    path: node.path,
    size: node.size,
    fileCount: node.fileCount,
    dirCount: node.dirCount,
    protected: node.protected,
    children: depth >= maxDepth
      ? []
      : node.children
        .slice()
        .sort((a, b) => b.size - a.size)
        .slice(0, 80)
        .map((child) => pruneTree(child, maxDepth, depth + 1))
  };
}

function buildSuggestions(root, tree, duplicates, tempFiles, appFolders, extensionStats) {
  const suggestions = [];
  const duplicateWaste = duplicates.reduce((sum, group) => sum + group.wastedBytes, 0);
  const tempWaste = tempFiles.reduce((sum, file) => sum + file.size, 0);
  const heavyExtensions = extensionStats.slice(0, 5).map((item) => item.extension).join(', ');

  if (duplicateWaste > 0) {
    suggestions.push({
      title: 'Ridurre i duplicati',
      detail: `Ci sono ${duplicates.length} gruppi di file identici. Spazio recuperabile stimato: ${formatBytes(duplicateWaste)}.`
    });
  }

  if (tempWaste > 0) {
    suggestions.push({
      title: 'Pulire temporanei',
      detail: `Trovati ${tempFiles.length} file candidati temporanei per ${formatBytes(tempWaste)}. Usare il Cestino per una pulizia reversibile.`
    });
  }

  if (tree.children.length > 25) {
    suggestions.push({
      title: 'Raggruppare la radice',
      detail: 'La cartella iniziale contiene molte sottocartelle. Conviene creare macro-cartelle per anno, progetto, cliente o tipo di materiale.'
    });
  }

  if (appFolders.length > 0) {
    suggestions.push({
      title: 'Gestire app con Windows',
      detail: `Rilevate ${appFolders.length} cartelle compatibili con app o progetti. Per programmi installati, preferire Impostazioni > App.`
    });
  }

  if (heavyExtensions) {
    suggestions.push({
      title: 'Ottimizzare ricerca indicizzata',
      detail: `Le estensioni piu pesanti sono ${heavyExtensions}. Indicizzarle per nome, percorso, dimensione e data velocizza le ricerche future.`
    });
  }

  suggestions.push({
    title: 'Protocollo scansioni',
    detail: `Salvare il protocollo dopo ogni analisi di ${root} per confrontare crescita, pulizie e nuove duplicazioni.`
  });

  return suggestions;
}

function event(type, targetPath, message) {
  return {
    at: new Date().toISOString(),
    type,
    path: targetPath,
    message
  };
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}
