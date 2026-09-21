const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose secure IPC bridge to renderer process
 * Everything the UI needs goes through here
 */
contextBridge.exposeInMainWorld('x3lanix', {
  // ═══════════════════════════════════════
  //  AUTH
  // ═══════════════════════════════════════
  auth: {
    appLogin: (user, pass) => ipcRenderer.invoke('auth:app-login', user, pass),
    microsoftLogin: () => ipcRenderer.invoke('auth:microsoft-login'),
    offlineLogin: (username) => ipcRenderer.invoke('auth:offline-login', username),
    randomUsername: () => ipcRenderer.invoke('auth:random-username'),
    getStoredAuth: () => ipcRenderer.invoke('auth:get-stored')
  },

  // ═══════════════════════════════════════
  //  LAUNCHER
  // ═══════════════════════════════════════
  launcher: {
    install: () => ipcRenderer.invoke('launcher:install'),
    launch: () => ipcRenderer.invoke('launcher:launch'),
    reinstall: () => ipcRenderer.invoke('launcher:reinstall'),
    onProgress: (callback) => {
      ipcRenderer.on('launcher:progress', (_, data) => callback(data));
    },
    onLog: (callback) => {
      ipcRenderer.on('launcher:log', (_, data) => callback(data));
    }
  },

  // ═══════════════════════════════════════
  //  MODS
  // ═══════════════════════════════════════
  mods: {
    downloadAll: () => ipcRenderer.invoke('mods:download-all'),
    list: () => ipcRenderer.invoke('mods:list'),
    toggle: (modPath) => ipcRenderer.invoke('mods:toggle', modPath),
    clear: () => ipcRenderer.invoke('mods:clear'),
    add: () => ipcRenderer.invoke('mods:add'),
    addFiles: (filePaths) => ipcRenderer.invoke('mods:add-files', filePaths),
    delete: (modPath) => ipcRenderer.invoke('mods:delete', modPath),
    onProgress: (callback) => {
      ipcRenderer.on('mods:progress', (_, data) => callback(data));
    }
  },

  // ═══════════════════════════════════════
  //  SETTINGS
  // ═══════════════════════════════════════
  settings: {
    getAll: () => ipcRenderer.invoke('settings:get-all'),
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    setMultiple: (obj) => ipcRenderer.invoke('settings:set-multiple', obj)
  },

  // ═══════════════════════════════════════
  //  DIALOG
  // ═══════════════════════════════════════
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:select-directory')
  },

  // ═══════════════════════════════════════
  //  WINDOW CONTROLS
  // ═══════════════════════════════════════
  window: {
    close: () => ipcRenderer.invoke('window:close'),
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize')
  },

  // ═══════════════════════════════════════
  //  VERSION MANAGER (from x3lanix lancher)
  // ═══════════════════════════════════════
  versions: {
    getRecommended: () => ipcRenderer.invoke('versions:get-recommended'),
    getAll: (includeSnapshots) => ipcRenderer.invoke('versions:get-all', includeSnapshots),
    getSummary: (mcVersion) => ipcRenderer.invoke('versions:get-summary', mcVersion),
    getFabricLoaders: (mcVersion) => ipcRenderer.invoke('versions:get-fabric-loaders', mcVersion)
  },

  // ═══════════════════════════════════════
  //  JAVA MANAGER (from x3lanix lancher)
  // ═══════════════════════════════════════
  java: {
    detect: () => ipcRenderer.invoke('java:detect'),
    getDistributions: () => ipcRenderer.invoke('java:get-distributions'),
    getSystemMemory: () => ipcRenderer.invoke('java:get-system-memory'),
    resolve: (mcVersion) => ipcRenderer.invoke('java:resolve', mcVersion),
    selectFile: () => ipcRenderer.invoke('java:select-file')
  },

  // ═══════════════════════════════════════
  //  NEWS MANAGER (from x3lanix lancher)
  // ═══════════════════════════════════════
  news: {
    getAll: () => ipcRenderer.invoke('news:get-all'),
    getChangelog: (version) => ipcRenderer.invoke('news:get-changelog', version)
  }
});
