const axios = require('axios');
const fs = require('fs');
const path = require('path');
const downloadManager = require('./download-manager');
const AdmZip = require('adm-zip');

const MODRINTH_API = 'https://api.modrinth.com/v2';
const USER_AGENT = 'X3LANIX-Launcher/1.0.0 (x3lanix-custom-launcher)';
const MOD_LOADER = 'fabric';

/**
 * All required mods with their Modrinth slugs and CurseForge fallback URLs
 */
const REQUIRED_MODS = [
  {
    name: 'LiquidBounce Nextgen',
    slug: 'liquidbounce',
    description: 'The premier Minecraft client. Everything you need, all in one.',
    fallbackIcon: 'https://avatar.liquidbounce.net/avatar/lb',
    curseforgeUrl: 'https://liquidbounce.net'
  },
  {
    name: 'Sodium',
    slug: 'sodium',
    description: 'A high-performance rendering engine for Minecraft - greatly improves frame rates and reduces micro-stutter.',
    fallbackIcon: 'https://cdn.modrinth.com/data/AANobbMI/icon.png',
    curseforgeUrl: 'https://www.curseforge.com/minecraft/mc-mods/sodium/download/8756612'
  },
  {
    name: 'Mod Menu',
    slug: 'modmenu',
    description: 'Adds a mod menu to view the list of mods you have installed and configure them.',
    fallbackIcon: 'https://cdn.modrinth.com/data/mOgUt4GM/icon.png',
    curseforgeUrl: 'https://www.curseforge.com/minecraft/mc-mods/modmenu/download/8397851'
  },
  {
    name: 'Lithium',
    slug: 'lithium',
    description: 'A general-purpose optimization mod for Minecraft that improves server and client performance.',
    fallbackIcon: 'https://cdn.modrinth.com/data/gvQqBUqZ/icon.png',
    curseforgeUrl: 'https://www.curseforge.com/minecraft/mc-mods/lithium/download/7740897'
  },
  {
    name: 'Iris Shaders',
    slug: 'iris',
    description: 'A modern shader pack loader compatible with existing OptiFine shaders - beautiful visuals without sacrificing performance.',
    fallbackIcon: 'https://cdn.modrinth.com/data/YL57xq9U/icon.png',
    curseforgeUrl: 'https://www.curseforge.com/minecraft/mc-mods/irisshaders/download/7805348'
  },
  {
    name: 'Fabric API',
    slug: 'fabric-api',
    description: 'Essential hooks and interop mechanisms for Fabric mods - required by most Fabric mods.',
    fallbackIcon: 'https://cdn.modrinth.com/data/P7dR8mSH/icon.png',
    curseforgeUrl: 'https://www.curseforge.com/minecraft/mc-mods/fabric-api/download/8525513'
  },
  {
    name: 'ImmediatelyFast',
    slug: 'immediatelyfast',
    description: 'Speed up immediate mode rendering in Minecraft - improves FPS with negligible impact.',
    fallbackIcon: 'https://cdn.modrinth.com/data/5ZwdcRci/icon.png',
    curseforgeUrl: 'https://www.curseforge.com/minecraft/mc-mods/immediatelyfast/download/8348684'
  },
  {
    name: 'Entity Culling',
    slug: 'entityculling',
    description: 'Uses async path-tracing to skip rendering of Blocks/Entities not visible from your position - big FPS gains.',
    fallbackIcon: 'https://cdn.modrinth.com/data/NNAgCjsB/icon.png',
    curseforgeUrl: 'https://www.curseforge.com/minecraft/mc-mods/entityculling/download/8287102'
  },
  {
    name: 'FerriteCore',
    slug: 'ferrite-core',
    description: 'Memory usage optimizations for Minecraft - reduces RAM consumption significantly.',
    fallbackIcon: 'https://cdn.modrinth.com/data/uXXizFIs/icon.png',
    curseforgeUrl: 'https://www.curseforge.com/minecraft/mc-mods/ferritecore-fabric/download/7524516'
  },
  {
    name: 'Cloth Config API',
    slug: 'cloth-config',
    description: 'Configuration library for Minecraft mods - required by many popular mods to display in-game config screens.',
    fallbackIcon: 'https://cdn.modrinth.com/data/9s6osm5g/icon.png',
    curseforgeUrl: 'https://www.curseforge.com/minecraft/mc-mods/cloth-config/download/7361438'
  }
];

/**
 * Get mod info from Modrinth (icon, description, etc.)
 */
async function getModInfo(slug) {
  try {
    const response = await axios.get(`${MODRINTH_API}/project/${slug}`, {
      headers: { 'User-Agent': USER_AGENT }
    });
    return {
      name: response.data.title,
      slug: response.data.slug,
      description: response.data.description,
      iconUrl: response.data.icon_url,
      downloads: response.data.downloads,
      categories: response.data.categories
    };
  } catch (err) {
    console.error(`[ModManager] Failed to get info for ${slug}:`, err.message);
    return null;
  }
}

/**
 * Get the download URL for a mod from Modrinth
 * Finds the correct version for Fabric + specific MC Version
 */
async function getModDownloadUrl(slug, mcVersion = '1.21.1') {
  if (slug === 'liquidbounce') {
    try {
      const res = await axios.get('https://api.liquidbounce.net/api/v1/launcher/releases/nextgen/latest', { timeout: 5000 });
      const asset = res.data?.assets?.find(a => a.name.endsWith('.jar'));
      if (asset) {
        return {
          url: asset.browser_download_url,
          filename: asset.name,
          size: asset.size,
          versionNumber: res.data.tag_name || 'latest'
        };
      }
    } catch (err) {
      console.error('[ModManager] Failed to fetch LiquidBounce from API, using fallback direct download.');
    }
    // Fallback to a generic download URL if API fails
    return {
      url: 'https://nightly.link/CCBlueX/LiquidBounce/workflows/build/nextgen/LiquidBounce-Nextgen.zip',
      filename: 'LiquidBounce-Nextgen.jar',
      size: 15000000,
      versionNumber: 'latest'
    };
  }

  try {
    const response = await axios.get(`${MODRINTH_API}/project/${slug}/version`, {
      params: {
        game_versions: `["${mcVersion}"]`,
        loaders: `["${MOD_LOADER}"]`
      },
      headers: { 'User-Agent': USER_AGENT }
    });

    if (!response.data || response.data.length === 0) {
      return null;
    }

    // Get the latest version
    const version = response.data[0];
    const primaryFile = version.files.find(f => f.primary) || version.files[0];

    return {
      url: primaryFile.url,
      filename: primaryFile.filename,
      size: primaryFile.size,
      versionNumber: version.version_number
    };
  } catch (err) {
    console.error(`[ModManager] Failed to get download URL for ${slug}:`, err.message);
    return null;
  }
}

/**
 * Download all required mods into the mods folder
 * @param {string} modsDir - Path to mods/ directory
 * @param {string} mcVersion - Minecraft version
 * @param {function} onProgress - Progress callback
 */
async function downloadAllMods(modsDir, mcVersion = '1.21.1', onProgress = null) {
  if (!fs.existsSync(modsDir)) {
    fs.mkdirSync(modsDir, { recursive: true });
  }

  const results = [];
  let completed = 0;

  for (const mod of REQUIRED_MODS) {
    if (onProgress) {
      onProgress({
        stage: 'downloading',
        currentMod: mod.name,
        modIndex: completed,
        totalMods: REQUIRED_MODS.length,
        overallPercent: Math.round((completed / REQUIRED_MODS.length) * 100)
      });
    }

    try {
      // Try Modrinth first
      const downloadInfo = await getModDownloadUrl(mod.slug, mcVersion);

      if (downloadInfo) {
        const destPath = path.join(modsDir, downloadInfo.filename);

        // Skip if already downloaded
        if (fs.existsSync(destPath)) {
          console.log(`[ModManager] ${mod.name} already exists, skipping`);
          results.push({ name: mod.name, success: true, skipped: true });
          completed++;
          continue;
        }

        await downloadManager.download(
          downloadInfo.url,
          destPath,
          (progress) => {
            if (onProgress) {
              onProgress({
                stage: 'downloading',
                currentMod: mod.name,
                modIndex: completed,
                totalMods: REQUIRED_MODS.length,
                fileProgress: progress,
                overallPercent: Math.round(((completed + progress.percent / 100) / REQUIRED_MODS.length) * 100)
              });
            }
          }
        );

        results.push({ name: mod.name, success: true, filename: downloadInfo.filename });
      } else {
        console.warn(`[ModManager] ${mod.name} not found on Modrinth, skipping`);
        results.push({ name: mod.name, success: false, error: 'Not found on Modrinth' });
      }
    } catch (err) {
      console.error(`[ModManager] Failed to download ${mod.name}:`, err.message);
      results.push({ name: mod.name, success: false, error: err.message });
    }

    completed++;
  }

  if (onProgress) {
    onProgress({
      stage: 'complete',
      overallPercent: 100,
      message: 'All mods processed'
    });
  }

  return results;
}

/**
 * List all installed mods (.jar and .jar.disabled) in the mods folder
 * Also fetches metadata from Modrinth for known mods
 */
async function listInstalledMods(modsDir) {
  if (!fs.existsSync(modsDir)) {
    return [];
  }

  const files = fs.readdirSync(modsDir);
  const mods = [];

  for (const file of files) {
    const isJar = file.endsWith('.jar');
    const isDisabled = file.endsWith('.jar.disabled');

    if (!isJar && !isDisabled) continue;

    const fullPath = path.join(modsDir, file);
    const stats = fs.statSync(fullPath);

    // Try to match against known mods for metadata
    let modInfo = null;
    const matchedMod = REQUIRED_MODS.find(m => {
      const lowerFile = file.toLowerCase();
      return lowerFile.includes(m.slug.replace('-', '')) ||
             lowerFile.includes(m.name.toLowerCase().replace(/\s/g, ''));
    });

    if (matchedMod) {
      try {
        modInfo = await getModInfo(matchedMod.slug);
      } catch (_) {}
      // Use hardcoded fallbacks if API fails
      if (!modInfo) {
        modInfo = {
          name: matchedMod.name,
          description: matchedMod.description || '',
          iconUrl: matchedMod.fallbackIcon || null
        };
      }
    } else {
       // Extract metadata from jar if it's not a known mod
       try {
         const zip = new AdmZip(fullPath);
         const zipEntries = zip.getEntries();
         let fabricModJsonEntry = zipEntries.find(entry => entry.entryName === 'fabric.mod.json');
         
         if (fabricModJsonEntry) {
           const fabricModJson = JSON.parse(zip.readAsText(fabricModJsonEntry));
           modInfo = {
             name: fabricModJson.name || file.replace(/\.jar(\.disabled)?$/, ''),
             description: fabricModJson.description || ''
           };
           
           // Try to extract icon
           let iconPath = fabricModJson.icon;
           if (iconPath) {
             // icon path might be an array or string
             if (Array.isArray(iconPath)) {
                iconPath = iconPath[0];
             }
             
             // Remove leading slash if present
             if (iconPath.startsWith('/')) {
                iconPath = iconPath.substring(1);
             }
             
             const iconEntry = zipEntries.find(entry => entry.entryName === iconPath);
             if (iconEntry) {
               const iconBuffer = zip.readFile(iconEntry);
               if (iconBuffer) {
                  // Determine MIME type based on extension
                  let mimeType = 'image/png';
                  if (iconPath.endsWith('.jpg') || iconPath.endsWith('.jpeg')) mimeType = 'image/jpeg';
                  else if (iconPath.endsWith('.gif')) mimeType = 'image/gif';
                  else if (iconPath.endsWith('.webp')) mimeType = 'image/webp';
                  
                  modInfo.iconUrl = `data:${mimeType};base64,${iconBuffer.toString('base64')}`;
               }
             }
           }
         }
       } catch (err) {
         console.warn(`[ModManager] Failed to extract metadata from ${file}:`, err.message);
       }
    }

    mods.push({
      filename: file,
      path: fullPath,
      enabled: isJar,
      size: stats.size,
      sizeMB: (stats.size / 1048576).toFixed(1),
      name: modInfo?.name || file.replace(/\.jar(\.disabled)?$/, ''),
      description: modInfo?.description || '',
      iconUrl: modInfo?.iconUrl || null
    });
  }

  return mods;
}

/**
 * Toggle a mod on/off by renaming .jar <-> .jar.disabled
 */
function toggleMod(modPath) {
  const ext = path.extname(modPath);
  let newPath;

  if (modPath.endsWith('.jar.disabled')) {
    // Enable: remove .disabled
    newPath = modPath.replace('.jar.disabled', '.jar');
  } else if (modPath.endsWith('.jar')) {
    // Disable: add .disabled
    newPath = modPath + '.disabled';
  } else {
    throw new Error('Not a valid mod file: ' + modPath);
  }

  fs.renameSync(modPath, newPath);

  return {
    oldPath: modPath,
    newPath,
    enabled: newPath.endsWith('.jar')
  };
}

/**
 * Delete all mods (for reinstall)
 */
function clearMods(modsDir) {
  if (!fs.existsSync(modsDir)) return;

  const files = fs.readdirSync(modsDir);
  for (const file of files) {
    if (file.endsWith('.jar') || file.endsWith('.jar.disabled')) {
      fs.unlinkSync(path.join(modsDir, file));
    }
  }
}

module.exports = {
  REQUIRED_MODS,
  getModInfo,
  getModDownloadUrl,
  downloadAllMods,
  listInstalledMods,
  toggleMod,
  clearMods
};
