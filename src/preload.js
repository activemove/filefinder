const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('filefinder', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectWorkspaceFolders: () => ipcRenderer.invoke('select-workspace-folders'),
  selectContainer: () => ipcRenderer.invoke('select-container'),
  selectNamingFiles: () => ipcRenderer.invoke('select-naming-files'),
  moveItems: (sources, destination) => ipcRenderer.invoke('move-items', { sources, destination }),
  copyItems: (sources, destination) => ipcRenderer.invoke('copy-items', { sources, destination }),
  renameItems: (operations) => ipcRenderer.invoke('rename-items', operations),
  scanFolder: (root, options) => ipcRenderer.invoke('scan-folder', { root, options }),
  scanFolders: (roots, options) => ipcRenderer.invoke('scan-folders', { roots, options }),
  listDirectory: (targetPath) => ipcRenderer.invoke('list-directory', targetPath),
  listDrives: () => ipcRenderer.invoke('list-drives'),
  folderSize: (folderPath) => ipcRenderer.invoke('folder-size', folderPath),
  onScanProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('scan-progress', listener);
    return () => ipcRenderer.removeListener('scan-progress', listener);
  },
  openPath: (targetPath) => ipcRenderer.invoke('open-path', targetPath),
  revealPath: (targetPath) => ipcRenderer.invoke('reveal-path', targetPath),
  previewImage: (targetPath) => ipcRenderer.invoke('preview-image', targetPath),
  previewDocument: (targetPath) => ipcRenderer.invoke('preview-document', targetPath),
  printPath: (targetPath) => ipcRenderer.invoke('print-path', targetPath),
  openAppsSettings: () => ipcRenderer.invoke('open-apps-settings'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  deleteTempFiles: (files) => ipcRenderer.invoke('delete-temp-files', files),
  exportProtocol: (protocol) => ipcRenderer.invoke('export-protocol', protocol)
  ,saveIndex: (report) => ipcRenderer.invoke('save-index', report)
  ,loadIndex: () => ipcRenderer.invoke('load-index')
  ,searchFileContent: (query, files) => ipcRenderer.invoke('search-file-content', { query, files })
  ,aiStatus: () => ipcRenderer.invoke('ai-status')
  ,appInfo: () => ipcRenderer.invoke('app-info')
  ,aiAssist: (payload) => ipcRenderer.invoke('ai-assist', payload)
  ,sendTelemetry: (payload) => ipcRenderer.invoke('telemetry-event', payload)
});
