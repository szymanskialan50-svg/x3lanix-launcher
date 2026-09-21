/**
 * X3LANIX LAUNCHER — Version Manager
 * Ported from x3lanix lancher's Rust version.rs / prelauncher.rs
 * Reimplemented in Node.js for Electron
 * 
 * Features:
 *  - Fetch available MC versions from Mojang manifest
 *  - Fetch Fabric Loader versions per MC version
 *  - Version selection & caching
 *  - Changelog generation
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const MOJANG_VERSION_MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const FABRIC_META = 'https://meta.fabricmc.net/v2';
const USER_AGENT = 'X3LANIX-Launcher/1.0.0 (x3lanix-custom-launcher)';

// Cache to avoid hammering APIs
let _versionCache = null;
let _versionCacheTime = 0;
let _fabricCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all available MC versions from Mojang
 * Returns releases only by default, pass includeSnapshots=true for all
 */
async function getMinecraftVersions(includeSnapshots = false) {
  // Return cache if fresh
  if (_versionCache && (Date.now() - _versionCacheTime) < CACHE_TTL) {
    return includeSnapshots
      ? _versionCache
      : _versionCache.filter(v => v.type === 'release');
  }

  try {
    const response = await axios.get(MOJANG_VERSION_MANIFEST, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000
    });

    const versions = response.data.versions.map(v => ({
      id: v.id,
      type: v.type,
      url: v.url,
      releaseTime: v.releaseTime,
      date: new Date(v.releaseTime).toLocaleDateString()
    }));

    _versionCache = versions;
    _versionCacheTime = Date.now();

    return includeSnapshots
      ? versions
      : versions.filter(v => v.type === 'release');
  } catch (err) {
    console.error('[VersionManager] Failed to fetch MC versions:', err.message);
    // Return cached data if available, even if stale
    if (_versionCache) return _versionCache.filter(v => includeSnapshots || v.type === 'release');
    throw err;
  }
}

/**
 * Get MC versions that have Fabric support
 * This queries Fabric Meta for the game versions list
 */
async function getFabricSupportedVersions() {
  try {
    const response = await axios.get(`${FABRIC_META}/versions/game`, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    });

    return response.data
      .filter(v => v.stable)
      .map(v => ({
        id: v.version,
        stable: v.stable
      }));
  } catch (err) {
    console.error('[VersionManager] Failed to fetch Fabric game versions:', err.message);
    return [];
  }
}

/**
 * Get available Fabric Loader versions for a specific MC version
 * Returns array of { version, stable, build } objects
 */
async function getFabricLoaderVersions(mcVersion) {
  const cacheKey = `fabric-${mcVersion}`;
  const cached = _fabricCache.get(cacheKey);
  if (cached && (Date.now() - cached.time) < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await axios.get(`${FABRIC_META}/versions/loader/${mcVersion}`, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    });

    const loaders = response.data.map(entry => ({
      version: entry.loader.version,
      stable: entry.loader.stable,
      build: entry.loader.build
    }));

    _fabricCache.set(cacheKey, { data: loaders, time: Date.now() });
    return loaders;
  } catch (err) {
    console.error(`[VersionManager] Failed to fetch Fabric loaders for ${mcVersion}:`, err.message);
    return [];
  }
}

/**
 * Get the latest stable Fabric Loader version for a given MC version
 */
async function getLatestFabricLoader(mcVersion) {
  const loaders = await getFabricLoaderVersions(mcVersion);
  const stable = loaders.find(l => l.stable);
  return stable || loaders[0] || null;
}

/**
 * Get the full Fabric version profile JSON for installation
 * This is what gets written to versions/<id>/<id>.json
 */
async function getFabricVersionProfile(mcVersion, loaderVersion) {
  const url = `${FABRIC_META}/versions/loader/${mcVersion}/${loaderVersion}/profile/json`;
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000
    });
    return response.data;
  } catch (err) {
    console.error('[VersionManager] Failed to fetch Fabric profile:', err.message);
    throw err;
  }
}

/**
 * Build a version summary object for display in the UI
 * Combines MC version + Fabric loader info
 */
async function getVersionSummary(mcVersion) {
  const loader = await getLatestFabricLoader(mcVersion);
  if (!loader) {
    return {
      mcVersion,
      fabricLoader: null,
      versionId: null,
      displayName: `Minecraft ${mcVersion}`,
      fabricSupported: false
    };
  }

  const versionId = `fabric-loader-${loader.version}-${mcVersion}`;
  return {
    mcVersion,
    fabricLoader: loader.version,
    versionId,
    displayName: `Minecraft ${mcVersion} + Fabric ${loader.version}`,
    fabricSupported: true
  };
}

/**
 * Get a curated list of recommended MC versions for the launcher
 * Shows recent releases that support Fabric
 */
async function getRecommendedVersions(limit = 10) {
  try {
    const [mcVersions, fabricVersions] = await Promise.all([
      getMinecraftVersions(false),
      getFabricSupportedVersions()
    ]);

    const fabricIds = new Set(fabricVersions.map(v => v.id));
    
    return mcVersions
      .filter(v => fabricIds.has(v.id))
      .slice(0, limit)
      .map(v => ({
        id: v.id,
        date: v.date,
        releaseTime: v.releaseTime,
        hasFabric: true
      }));
  } catch (err) {
    console.error('[VersionManager] Failed to get recommended versions:', err.message);
    // Fallback: return hardcoded recent versions
    return [
      { id: '1.21.1', date: '2024-08-08', hasFabric: true },
      { id: '1.21', date: '2024-06-13', hasFabric: true },
      { id: '1.20.6', date: '2024-04-29', hasFabric: true },
      { id: '1.20.4', date: '2023-12-07', hasFabric: true },
      { id: '1.20.1', date: '2023-06-12', hasFabric: true }
    ];
  }
}

/**
 * Clear all caches (useful after settings change)
 */
function clearCache() {
  _versionCache = null;
  _versionCacheTime = 0;
  _fabricCache.clear();
}

module.exports = {
  getMinecraftVersions,
  getFabricSupportedVersions,
  getFabricLoaderVersions,
  getLatestFabricLoader,
  getFabricVersionProfile,
  getVersionSummary,
  getRecommendedVersions,
  clearCache
};
