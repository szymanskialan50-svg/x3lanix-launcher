/**
 * X3LANIX LAUNCHER — Java Manager
 * Ported from x3lanix lancher's Rust java/ module
 * Reimplemented in Node.js for Electron
 * 
 * Features:
 *  - Auto-detect Java installations on system
 *  - JVM distribution selection (Temurin, GraalVM, Zulu, System, Custom)
 *  - Download & install Java if not present (Adoptium API)
 *  - Validate Java version for MC compatibility
 */

const { execSync, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const downloadManager = require('./download-manager');

const ADOPTIUM_API = 'https://api.adoptium.net/v3';
const USER_AGENT = 'X3LANIX-Launcher/1.0.0';

// Java distributions we support
const DISTRIBUTIONS = {
  temurin: {
    name: 'Eclipse Temurin',
    description: 'Recommended — high performance, widely tested',
    vendor: 'eclipse'
  },
  graalvm: {
    name: 'GraalVM CE',
    description: 'Advanced JIT — can squeeze extra FPS from MC',
    vendor: 'graalvm-ce'
  },
  zulu: {
    name: 'Azul Zulu',
    description: 'Enterprise-grade — rock-solid stability',
    vendor: 'zulu'
  }
};

/**
 * Detect Java installations on the system
 * Returns array of { path, version, vendor, valid }
 */
async function detectJavaInstallations() {
  const found = [];
  const isWin = process.platform === 'win32';

  // Common Java paths to check
  const searchPaths = isWin ? [
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Java'),
    path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Java'),
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Eclipse Adoptium'),
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Zulu'),
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'GraalVM'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Eclipse Adoptium'),
    path.join(os.homedir(), '.jdks'),
  ] : [
    '/usr/lib/jvm',
    '/usr/local/lib/jvm',
    '/usr/java',
    path.join(os.homedir(), '.jdks'),
    '/Library/Java/JavaVirtualMachines'
  ];

  // Check JAVA_HOME first
  if (process.env.JAVA_HOME) {
    const javaExe = getJavaExe(process.env.JAVA_HOME);
    if (fs.existsSync(javaExe)) {
      const info = await getJavaInfo(javaExe);
      if (info) found.push({ ...info, source: 'JAVA_HOME' });
    }
  }

  // Check PATH
  try {
    const pathJava = isWin ? 'where java' : 'which java';
    const result = execSync(pathJava, { encoding: 'utf-8', timeout: 5000 }).trim();
    const lines = result.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const info = await getJavaInfo(line);
      if (info && !found.some(f => f.path === info.path)) {
        found.push({ ...info, source: 'PATH' });
      }
    }
  } catch (_) { /* java not in PATH */ }

  // Scan common directories
  for (const searchDir of searchPaths) {
    if (!fs.existsSync(searchDir)) continue;
    try {
      const entries = fs.readdirSync(searchDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const javaHome = path.join(searchDir, entry.name);
        const javaExe = getJavaExe(javaHome);
        if (fs.existsSync(javaExe)) {
          const info = await getJavaInfo(javaExe);
          if (info && !found.some(f => f.path === info.path)) {
            found.push({ ...info, source: 'scan' });
          }
        }
      }
    } catch (_) { /* permission denied, skip */ }
  }

  return found;
}

/**
 * Get java/javaw executable path from JAVA_HOME
 */
function getJavaExe(javaHome) {
  const isWin = process.platform === 'win32';
  const binDir = path.join(javaHome, 'bin');
  return path.join(binDir, isWin ? 'javaw.exe' : 'java');
}

/**
 * Get Java version info by running `java -version`
 */
async function getJavaInfo(javaPath) {
  return new Promise((resolve) => {
    try {
      // java -version outputs to stderr (classic java weirdness)
      execFile(javaPath, ['-version'], { timeout: 10000 }, (err, stdout, stderr) => {
        const output = stderr || stdout || '';
        
        // Parse version string
        // e.g.: openjdk version "21.0.2" 2024-01-16
        // or:   java version "1.8.0_292"
        const versionMatch = output.match(/(?:openjdk|java) version "(\d+)(?:\.(\d+))?(?:\.(\d+))?/i);
        if (!versionMatch) {
          resolve(null);
          return;
        }

        const major = parseInt(versionMatch[1]);
        const minor = parseInt(versionMatch[2] || '0');
        const patch = parseInt(versionMatch[3] || '0');
        
        // Detect vendor
        let vendor = 'unknown';
        const lowerOutput = output.toLowerCase();
        if (lowerOutput.includes('temurin') || lowerOutput.includes('adoptium')) vendor = 'temurin';
        else if (lowerOutput.includes('graalvm')) vendor = 'graalvm';
        else if (lowerOutput.includes('zulu')) vendor = 'zulu';
        else if (lowerOutput.includes('corretto')) vendor = 'corretto';
        else if (lowerOutput.includes('openjdk')) vendor = 'openjdk';
        else if (lowerOutput.includes('oracle')) vendor = 'oracle';

        // MC 1.20+ needs Java 17+, MC 1.21+ needs Java 21+
        const is64bit = output.includes('64-Bit') || output.includes('amd64') || output.includes('aarch64');

        resolve({
          path: javaPath,
          version: `${major}.${minor}.${patch}`,
          majorVersion: major,
          vendor,
          is64bit,
          valid: major >= 17 // Minimum for modern MC
        });
      });
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * Download Java from Adoptium API
 * @param {string} distribution - 'temurin', 'graalvm', etc.
 * @param {number} javaVersion - Major version (17, 21, etc.)
 * @param {string} installDir - Where to install
 * @param {function} onProgress - Progress callback
 */
async function downloadJava(distribution = 'temurin', javaVersion = 21, installDir, onProgress = null) {
  const arch = os.arch() === 'x64' ? 'x64' : 'aarch64';
  const osName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux';
  const ext = process.platform === 'win32' ? 'zip' : 'tar.gz';

  // Adoptium API endpoint
  const url = `${ADOPTIUM_API}/binary/latest/${javaVersion}/ga/${osName}/${arch}/jdk/hotspot/normal/${distribution}`;

  console.log(`[JavaManager] Downloading Java ${javaVersion} (${distribution}) from Adoptium...`);
  console.log(`[JavaManager] URL: ${url}`);

  const destFile = path.join(installDir, `java-${javaVersion}-${distribution}.${ext}`);
  
  if (!fs.existsSync(installDir)) {
    fs.mkdirSync(installDir, { recursive: true });
  }

  try {
    await downloadManager.download(url, destFile, onProgress);

    // Extract
    if (onProgress) onProgress({ stage: 'extracting', percent: 95, message: 'Extracting Java...' });

    if (ext === 'zip') {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(destFile);
      zip.extractAllTo(installDir, true);
    } else {
      // tar.gz on Linux/Mac
      execSync(`tar -xzf "${destFile}" -C "${installDir}"`, { timeout: 60000 });
    }

    // Clean up archive
    try { fs.unlinkSync(destFile); } catch (_) {}

    // Find the extracted JDK directory
    const entries = fs.readdirSync(installDir).filter(e => {
      return e.startsWith('jdk-') || e.startsWith('graalvm-') || e.startsWith('zulu');
    });

    const jdkDir = entries.length > 0 ? path.join(installDir, entries[entries.length - 1]) : installDir;
    const javaExe = getJavaExe(jdkDir);

    if (fs.existsSync(javaExe)) {
      console.log(`[JavaManager] Java installed at: ${jdkDir}`);
      return { success: true, javaHome: jdkDir, javaPath: javaExe };
    } else {
      return { success: false, error: 'Java executable not found after extraction' };
    }
  } catch (err) {
    console.error('[JavaManager] Download failed:', err.message);
    // Clean up on failure
    try { fs.unlinkSync(destFile); } catch (_) {}
    return { success: false, error: err.message };
  }
}

/**
 * Get the best Java for a specific Minecraft version
 * MC 1.20.5+ needs Java 21, MC 1.17-1.20.4 needs Java 17, older needs Java 8
 */
function getRequiredJavaVersion(mcVersion) {
  const parts = mcVersion.split('.').map(Number);
  const major = parts[0] || 1;
  const minor = parts[1] || 0;
  const patch = parts[2] || 0;

  if (major >= 1 && minor >= 21) return 21;       // 1.21+
  if (major >= 1 && minor >= 20 && patch >= 5) return 21;  // 1.20.5+
  if (major >= 1 && minor >= 17) return 17;        // 1.17-1.20.4
  return 8;                                        // Older
}

/**
 * Find or download the best Java for a given MC version
 * @param {string} mcVersion - Minecraft version
 * @param {string} customPath - User-set custom Java path (optional)
 * @param {string} preferredDistro - Preferred distribution (optional)
 * @param {function} onProgress - Progress callback (optional)
 */
async function resolveJava(mcVersion, customPath = null, preferredDistro = 'temurin', onProgress = null) {
  // If user has custom path, validate and use it
  if (customPath && fs.existsSync(customPath)) {
    const info = await getJavaInfo(customPath);
    if (info && info.valid) {
      return { path: customPath, ...info, source: 'custom' };
    }
  }

  const requiredVersion = getRequiredJavaVersion(mcVersion);
  
  // Search for existing installations
  const installations = await detectJavaInstallations();
  
  // Find best match: right version, preferred distro
  const perfect = installations.find(j => j.majorVersion === requiredVersion && j.vendor === preferredDistro);
  if (perfect) return { ...perfect, source: 'detected' };

  // Any matching version
  const anyMatch = installations.find(j => j.majorVersion >= requiredVersion && j.valid);
  if (anyMatch) return { ...anyMatch, source: 'detected' };

  // None found — need to download
  console.log(`[JavaManager] No suitable Java ${requiredVersion} found. Downloading...`);
  
  const installDir = path.join(os.homedir(), '.x3lanix', 'java', `${preferredDistro}-${requiredVersion}`);
  const result = await downloadJava(preferredDistro, requiredVersion, installDir, onProgress);
  
  if (result.success) {
    return {
      path: result.javaPath,
      version: `${requiredVersion}.0.0`,
      majorVersion: requiredVersion,
      vendor: preferredDistro,
      valid: true,
      source: 'downloaded'
    };
  }

  // Last resort: try system java
  return null;
}

/**
 * Get system memory in MB (for RAM slider max)
 */
function getSystemMemoryMB() {
  return Math.floor(os.totalmem() / (1024 * 1024));
}

/**
 * Get available distributions for UI dropdown
 */
function getAvailableDistributions() {
  return Object.entries(DISTRIBUTIONS).map(([key, val]) => ({
    id: key,
    ...val
  }));
}

module.exports = {
  detectJavaInstallations,
  getJavaInfo,
  downloadJava,
  getRequiredJavaVersion,
  resolveJava,
  getSystemMemoryMB,
  getAvailableDistributions,
  DISTRIBUTIONS
};
