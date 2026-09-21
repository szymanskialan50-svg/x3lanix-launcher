const axios = require('axios');
const fs = require('fs');
const path = require('path');
const downloadManager = require('./download-manager');

const FABRIC_META = 'https://meta.fabricmc.net/v2';
const MC_VERSION = '1.21.1';

/**
 * Get the latest Fabric loader version for MC 1.21.1
 */
async function getLatestLoaderVersion(mcVer = MC_VERSION) {
  const response = await axios.get(`${FABRIC_META}/versions/loader/${mcVer}`, {
    headers: { 'User-Agent': 'X3LANIX-Launcher/1.0.0' }
  });

  if (!response.data || response.data.length === 0) {
    throw new Error('No Fabric loader versions found for MC ' + mcVer);
  }

  // First entry is the latest stable
  return response.data[0].loader.version;
}

/**
 * Get the full version profile JSON from Fabric Meta
 */
async function getVersionProfile(loaderVersion, mcVer = MC_VERSION) {
  const url = `${FABRIC_META}/versions/loader/${mcVer}/${loaderVersion}/profile/json`;
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'X3LANIX-Launcher/1.0.0' }
  });
  return response.data;
}

/**
 * Install Fabric for MC 1.21.1 into the game directory
 * @param {string} gameDir - Root game directory
 * @param {function} onProgress - Progress callback
 */
async function installFabric(gameDir, onProgress = null, mcVer = MC_VERSION) {
  if (onProgress) onProgress({ stage: 'fetching', message: 'Fetching Fabric loader info...' });

  const loaderVersion = await getLatestLoaderVersion(mcVer);
  const versionId = `fabric-loader-${loaderVersion}-${mcVer}`;

  if (onProgress) onProgress({ stage: 'profile', message: `Fabric Loader ${loaderVersion}` });

  const profile = await getVersionProfile(loaderVersion, mcVer);

  // Create version directory
  const versionDir = path.join(gameDir, 'versions', versionId);
  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
  }

  // Write version JSON
  const versionJsonPath = path.join(versionDir, `${versionId}.json`);
  fs.writeFileSync(versionJsonPath, JSON.stringify(profile, null, 2));

  if (onProgress) onProgress({ stage: 'libraries', message: 'Downloading Fabric libraries...' });

  // Download all Fabric libraries
  const libraries = profile.libraries || [];
  const mavenUrls = [
    'https://maven.fabricmc.net/',
    'https://maven.quiltmc.org/repository/release/',
    'https://repo.maven.apache.org/maven2/'
  ];

  let downloadedLibs = 0;
  for (const lib of libraries) {
    const libName = lib.name; // e.g. "net.fabricmc:fabric-loader:0.16.0"
    const libPath = mavenNameToPath(libName);
    const destPath = path.join(gameDir, 'libraries', libPath);

    if (fs.existsSync(destPath)) {
      downloadedLibs++;
      continue; // Already downloaded
    }

    // Try each Maven repo
    let downloaded = false;
    for (const baseUrl of mavenUrls) {
      try {
        const url = lib.url || baseUrl;
        const fullUrl = url.endsWith('/') ? url + libPath : url + '/' + libPath;
        await downloadManager.download(fullUrl, destPath);
        downloaded = true;
        break;
      } catch (err) {
        continue; // Try next mirror
      }
    }

    downloadedLibs++;
    if (onProgress) {
      onProgress({
        stage: 'libraries',
        message: `Libraries ${downloadedLibs}/${libraries.length}`,
        percent: Math.round((downloadedLibs / libraries.length) * 100)
      });
    }
  }

  if (onProgress) onProgress({ stage: 'complete', message: 'Fabric installed!', percent: 100 });

  return {
    versionId,
    loaderVersion,
    profile
  };
}

/**
 * Convert Maven artifact name to file path
 * e.g. "net.fabricmc:fabric-loader:0.16.0" -> "net/fabricmc/fabric-loader/0.16.0/fabric-loader-0.16.0.jar"
 */
function mavenNameToPath(name) {
  const parts = name.split(':');
  const group = parts[0].replace(/\./g, '/');
  const artifact = parts[1];
  const version = parts[2];
  return `${group}/${artifact}/${version}/${artifact}-${version}.jar`;
}

/**
 * Check if Fabric is already installed
 */
async function isFabricInstalled(gameDir, mcVer = MC_VERSION) {
  try {
    const loaderVersion = await getLatestLoaderVersion(mcVer);
    const versionId = `fabric-loader-${loaderVersion}-${mcVer}`;
    const versionJson = path.join(gameDir, 'versions', versionId, `${versionId}.json`);
    return fs.existsSync(versionJson);
  } catch {
    return false;
  }
}

/**
 * Get the Fabric version ID string for launching
 */
async function getFabricVersionId(gameDir, mcVer = MC_VERSION) {
  const loaderVersion = await getLatestLoaderVersion(mcVer);
  return `fabric-loader-${loaderVersion}-${mcVer}`;
}

module.exports = {
  installFabric,
  isFabricInstalled,
  getFabricVersionId,
  getLatestLoaderVersion,
  MC_VERSION
};
