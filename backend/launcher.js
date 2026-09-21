const { Client } = require('minecraft-launcher-core');
const path = require('path');
const settings = require('./settings');
const fabricInstaller = require('./fabric-installer');
const javaManager = require('./java-manager');

const launcher = new Client();

/**
 * Install and launch Minecraft with Fabric
 * @param {object} auth - MCLC auth object
 * @param {function} onProgress - Progress callback for download events
 * @param {function} onLog - Game log callback
 */
async function launchGame(auth, onProgress = null, onLog = null) {
  const gameDir = settings.get('gameDirectory');
  if (!gameDir) {
    throw new Error('Game directory not set');
  }

  const mcVersion = settings.get('mcVersion') || '1.21.1';

  // Get Fabric version ID
  const versionId = await fabricInstaller.getFabricVersionId(gameDir, mcVersion);

  // Build JVM args
  const ram = settings.get('ram') || 4028;
  const zgcEnabled = settings.get('zgcEnabled') || false;
  const customJvmArgs = settings.get('jvmArgs') || '';

  let jvmArgs = [
    `-Xms${Math.floor(ram / 2)}M`,
    `-Xmx${ram}M`
  ];

  if (zgcEnabled) {
    jvmArgs.push(
      '-XX:+UseZGC',
      '-XX:+ZGenerational',
      '-XX:+UnlockExperimentalVMOptions',
      '-XX:+AlwaysPreTouch',
      '-XX:+ParallelRefProcEnabled',
      '-XX:+DisableExplicitGC',
      '-XX:MaxGCPauseMillis=10',
      '-XX:GCPauseIntervalMillis=100'
    );
  }

  if (customJvmArgs.trim()) {
    const extraArgs = customJvmArgs.trim().split(/\s+/).filter(a => !jvmArgs.includes(a));
    jvmArgs.push(...extraArgs);
  }

  // Build window options
  const windowWidth = settings.get('windowWidth') || 1280;
  const windowHeight = settings.get('windowHeight') || 720;
  const fullscreen = settings.get('fullscreen') || false;

  // Construct launch options
  const opts = {
    authorization: auth,
    root: gameDir,
    version: {
      number: mcVersion,
      type: 'release',
      custom: versionId
    },
    memory: {
      max: `${ram}M`,
      min: `${Math.floor(ram / 2)}M`
    },
    window: {
      width: windowWidth,
      height: windowHeight,
      fullscreen: fullscreen
    },
    javaPath: null, // Will be resolved below
    overrides: {
      detached: false,
      windowsHide: true
    },
    customArgs: jvmArgs
  };

  // Resolve Java — use java-manager for smart detection
  try {
    const javaDistro = settings.get('javaDistribution') || 'automatic';
    const customJavaPath = settings.get('customJavaPath') || null;
    
    if (javaDistro === 'custom' && customJavaPath) {
      opts.javaPath = customJavaPath;
    } else if (javaDistro !== 'automatic') {
      const resolved = await javaManager.resolveJava(mcVersion, null, javaDistro);
      if (resolved) opts.javaPath = resolved.path;
    } else {
      // Automatic: find best Java for this MC version
      const resolved = await javaManager.resolveJava(mcVersion);
      if (resolved) opts.javaPath = resolved.path;
    }
  } catch (err) {
    console.warn('[Launcher] Java resolution failed, using system default:', err.message);
  }

  // Register event listeners
  if (onProgress) {
    launcher.on('progress', (e) => {
      onProgress({
        type: e.type,
        task: e.task,
        total: e.total
      });
    });

    launcher.on('download-status', (e) => {
      onProgress({
        type: 'download',
        name: e.name,
        current: e.current,
        total: e.total,
        percent: e.total > 0 ? Math.round((e.current / e.total) * 100) : 0
      });
    });
  }

  if (onLog) {
    launcher.on('data', (data) => {
      onLog(data.toString());
    });
  }

  launcher.on('debug', (e) => {
    console.log('[MC Debug]', e);
  });

  // Launch!
  try {
    await launcher.launch(opts);
    return { success: true };
  } catch (err) {
    console.error('[Launcher] Failed to launch:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Install vanilla MC + Fabric (pre-launch setup)
 */
async function installClient(onProgress = null) {
  const gameDir = settings.get('gameDirectory');
  if (!gameDir) {
    throw new Error('Game directory not set');
  }

  if (onProgress) onProgress({ stage: 'fabric', message: 'Installing Fabric Loader...', percent: 0 });

  // Install Fabric
  const fabricResult = await fabricInstaller.installFabric(gameDir, (p) => {
    if (onProgress) {
      onProgress({
        stage: 'fabric',
        message: p.message,
        percent: p.percent || 0
      });
    }
  });

  return {
    success: true,
    fabricVersion: fabricResult.loaderVersion,
    versionId: fabricResult.versionId
  };
}

/**
 * Full reinstall — clears everything and re-downloads
 */
async function reinstallClient(onProgress = null) {
  const gameDir = settings.get('gameDirectory');
  const fs = require('fs');

  // Remove versions folder (will be re-downloaded by MCLC)
  const versionsDir = path.join(gameDir, 'versions');
  if (fs.existsSync(versionsDir)) {
    fs.rmSync(versionsDir, { recursive: true, force: true });
  }

  // Re-install
  return await installClient(onProgress);
}

module.exports = {
  launchGame,
  installClient,
  reinstallClient
};
