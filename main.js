const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const settings = require('./backend/settings');
const auth = require('./backend/auth');
const launcher = require('./backend/launcher');
const fabricInstaller = require('./backend/fabric-installer');
const modManager = require('./backend/mod-manager');
const versionManager = require('./backend/version-manager');
const javaManager = require('./backend/java-manager');
const newsManager = require('./backend/news-manager');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 800,
    minHeight: 550,
    frame: false,
    transparent: false,
    resizable: true,
    backgroundColor: '#000000',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Uncomment for dev tools:
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

// ═══════════════════════════════════════════════════════
//  WINDOW CONTROLS
// ═══════════════════════════════════════════════════════
ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

// ═══════════════════════════════════════════════════════
//  DIALOG
// ═══════════════════════════════════════════════════════
ipcMain.handle('dialog:select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Game Directory',
    properties: ['openDirectory', 'createDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const dir = result.filePaths[0];
    settings.set('gameDirectory', dir);
    settings.set('firstLaunch', false);
    return { success: true, path: dir };
  }
  return { success: false };
});

// ═══════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════
ipcMain.handle('auth:microsoft-login', async () => {
  return await auth.microsoftLogin();
});

ipcMain.handle('auth:app-login', async (_, username, password) => {
  return await auth.appLogin(username, password);
});

ipcMain.handle('auth:offline-login', async (_, username) => {
  return auth.offlineLogin(username);
});

ipcMain.handle('auth:random-username', async () => {
  return auth.randomUsername();
});

ipcMain.handle('auth:get-stored', async () => {
  return auth.getStoredAuth();
});

// ═══════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════
ipcMain.handle('settings:get-all', async () => {
  return settings.getAll();
});

ipcMain.handle('settings:get', async (_, key) => {
  return settings.get(key);
});

ipcMain.handle('settings:set', async (_, key, value) => {
  settings.set(key, value);
  return true;
});

ipcMain.handle('settings:set-multiple', async (_, obj) => {
  settings.setMultiple(obj);
  return true;
});

// ═══════════════════════════════════════════════════════
//  LAUNCHER
// ═══════════════════════════════════════════════════════
ipcMain.handle('launcher:install', async () => {
  try {
    const result = await launcher.installClient((progress) => {
      if (mainWindow) {
        mainWindow.webContents.send('launcher:progress', progress);
      }
    });
    return result;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('launcher:launch', async () => {
  try {
    const authObj = auth.getStoredAuth();
    if (!authObj) {
      return { success: false, error: 'Not logged in' };
    }

    const result = await launcher.launchGame(
      authObj,
      (progress) => {
        if (mainWindow) {
          mainWindow.webContents.send('launcher:progress', progress);
        }
      },
      (log) => {
        if (mainWindow) {
          mainWindow.webContents.send('launcher:log', log);
        }
      }
    );
    return result;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('launcher:reinstall', async () => {
  try {
    const result = await launcher.reinstallClient((progress) => {
      if (mainWindow) {
        mainWindow.webContents.send('launcher:progress', progress);
      }
    });
    return result;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ═══════════════════════════════════════════════════════
//  MODS
// ═══════════════════════════════════════════════════════
ipcMain.handle('mods:download-all', async () => {
  try {
    const gameDir = settings.get('gameDirectory');
    if (!gameDir) {
      return { success: false, error: 'Game directory not set' };
    }

    const mcVersion = settings.get('mcVersion') || '1.21.1';
    const modsDir = path.join(gameDir, 'mods');
    const results = await modManager.downloadAllMods(modsDir, mcVersion, (progress) => {
      if (mainWindow) {
        mainWindow.webContents.send('mods:progress', progress);
      }
    });

    return { success: true, results };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mods:list', async () => {
  try {
    const gameDir = settings.get('gameDirectory');
    if (!gameDir) return [];

    const modsDir = path.join(gameDir, 'mods');
    return await modManager.listInstalledMods(modsDir);
  } catch (err) {
    console.error('[Main] Failed to list mods:', err);
    return [];
  }
});

ipcMain.handle('mods:toggle', async (_, modPath) => {
  try {
    return modManager.toggleMod(modPath);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('game:launch', async () => {
  const gameDir = settings.get('gameDirectory');
  if (!gameDir) return { success: false, error: 'No game directory configured' };

  try {
    const fs = require('fs');
    
    // Inject Custom X3LANIX Resource Pack
    const rpSource = path.join(__dirname, 'backend', 'x3lanix-pack');
    const rpDest = path.join(gameDir, 'resourcepacks', 'x3lanix-pack');
    if (fs.existsSync(rpSource)) {
      if (!fs.existsSync(path.join(gameDir, 'resourcepacks'))) {
        fs.mkdirSync(path.join(gameDir, 'resourcepacks'), { recursive: true });
      }
      // Simple copy recursive
      fs.cpSync(rpSource, rpDest, { recursive: true });
      
      // Force it in options.txt
      const optionsPath = path.join(gameDir, 'options.txt');
      if (fs.existsSync(optionsPath)) {
        let options = fs.readFileSync(optionsPath, 'utf-8');
        if (!options.includes('x3lanix-pack')) {
          if (options.includes('resourcePacks:')) {
            options = options.replace(/resourcePacks:\[(.*)\]/, (match, p1) => {
              const currentPacks = p1 ? p1.split(',') : [];
              if (!currentPacks.includes('"file/x3lanix-pack"')) {
                currentPacks.unshift('"file/x3lanix-pack"');
              }
              return `resourcePacks:[${currentPacks.join(',')}]`;
            });
          } else {
            options += '\nresourcePacks:["file/x3lanix-pack"]';
          }
          fs.writeFileSync(optionsPath, options);
        }
      } else {
        fs.writeFileSync(optionsPath, 'resourcePacks:["file/x3lanix-pack"]\n');
      }
    }

    const { launchMinecraft } = require('./backend/mc-launcher');
    await launchMinecraft(gameDir, settings);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mods:clear', async () => {
  try {
    const gameDir = settings.get('gameDirectory');
    if (!gameDir) return;

    const modsDir = path.join(gameDir, 'mods');
    modManager.clearMods(modsDir);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mods:add', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Wybierz modyfikację (.jar)',
      filters: [{ name: 'Minecraft Mods', extensions: ['jar'] }],
      properties: ['openFile', 'multiSelections']
    });

    if (result.canceled || result.filePaths.length === 0) return { success: false };

    const gameDir = settings.get('gameDirectory');
    if (!gameDir) return { success: false, error: 'No game directory' };
    
    const modsDir = path.join(gameDir, 'mods');
    const fs = require('fs');
    if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

    for (const filePath of result.filePaths) {
      const fileName = path.basename(filePath);
      const dest = path.join(modsDir, fileName);
      fs.copyFileSync(filePath, dest);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mods:delete', async (_, modPath) => {
  try {
    const fs = require('fs');
    if (fs.existsSync(modPath)) {
      fs.unlinkSync(modPath);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mods:add-files', async (_, filePaths) => {
  try {
    if (!filePaths || filePaths.length === 0) return { success: false };

    const gameDir = settings.get('gameDirectory');
    if (!gameDir) return { success: false, error: 'No game directory' };

    const modsDir = path.join(gameDir, 'mods');
    const fs = require('fs');
    if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

    let added = 0;
    for (const filePath of filePaths) {
      if (!filePath.toLowerCase().endsWith('.jar')) continue;
      const fileName = path.basename(filePath);
      const dest = path.join(modsDir, fileName);
      fs.copyFileSync(filePath, dest);
      added++;
    }

    return { success: added > 0, count: added };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ═══════════════════════════════════════════════════════
//  VERSION MANAGER (ported from x3lanix lancher)
// ═══════════════════════════════════════════════════════
ipcMain.handle('versions:get-recommended', async () => {
  try {
    return await versionManager.getRecommendedVersions(15);
  } catch (err) {
    console.error('[Main] Failed to get versions:', err);
    return [];
  }
});

ipcMain.handle('versions:get-all', async (_, includeSnapshots) => {
  try {
    return await versionManager.getMinecraftVersions(includeSnapshots || false);
  } catch (err) {
    console.error('[Main] Failed to get all versions:', err);
    return [];
  }
});

ipcMain.handle('versions:get-summary', async (_, mcVersion) => {
  try {
    return await versionManager.getVersionSummary(mcVersion);
  } catch (err) {
    return { mcVersion, fabricSupported: false, error: err.message };
  }
});

ipcMain.handle('versions:get-fabric-loaders', async (_, mcVersion) => {
  try {
    return await versionManager.getFabricLoaderVersions(mcVersion);
  } catch (err) {
    return [];
  }
});

// ═══════════════════════════════════════════════════════
//  JAVA MANAGER (ported from x3lanix lancher)
// ═══════════════════════════════════════════════════════
ipcMain.handle('java:detect', async () => {
  try {
    return await javaManager.detectJavaInstallations();
  } catch (err) {
    console.error('[Main] Java detection failed:', err);
    return [];
  }
});

ipcMain.handle('java:get-distributions', async () => {
  return javaManager.getAvailableDistributions();
});

ipcMain.handle('java:get-system-memory', async () => {
  return javaManager.getSystemMemoryMB();
});

ipcMain.handle('java:resolve', async (_, mcVersion) => {
  try {
    const distro = settings.get('javaDistribution') || 'automatic';
    const customPath = settings.get('customJavaPath') || null;
    const resolved = await javaManager.resolveJava(
      mcVersion || '1.21.1',
      distro === 'custom' ? customPath : null,
      distro === 'automatic' ? 'temurin' : distro
    );
    return resolved;
  } catch (err) {
    return null;
  }
});

ipcMain.handle('java:select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Java Executable',
    filters: [
      { name: 'Java', extensions: ['exe'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const javaPath = result.filePaths[0];
    settings.set('customJavaPath', javaPath);
    return { success: true, path: javaPath };
  }
  return { success: false };
});

// ═══════════════════════════════════════════════════════
//  NEWS MANAGER (ported from x3lanix lancher)
// ═══════════════════════════════════════════════════════
ipcMain.handle('news:get-all', async () => {
  try {
    const newsUrl = settings.get('newsUrl') || null;
    const gameDir = settings.get('gameDirectory') || null;
    return await newsManager.getAllNews(newsUrl, gameDir);
  } catch (err) {
    console.error('[Main] Failed to get news:', err);
    return newsManager.BUILTIN_NEWS;
  }
});

ipcMain.handle('news:get-changelog', async (_, version) => {
  return newsManager.getChangelog(version || '1.1.0');
});
