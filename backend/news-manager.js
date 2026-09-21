/**
 * X3LANIX LAUNCHER — News Manager
 * Ported from x3lanix lancher's blog posts / news system
 * Reimplemented for x3lanix with local + remote news support
 * 
 * Features:
 *  - Local news/announcements from bundled JSON
 *  - Remote news from configurable URL
 *  - Changelog display
 *  - News caching
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

const USER_AGENT = 'X3LANIX-Launcher/1.0.0';
const NEWS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

let _newsCache = null;
let _newsCacheTime = 0;

/**
 * Built-in announcements — these are always shown
 * Can be updated with each launcher release
 */
const BUILTIN_NEWS = [];

/**
 * Fetch news from remote URL (if configured)
 * Expected JSON format: [{ id, title, description, date, type, icon, color, url }]
 */
async function fetchRemoteNews(remoteUrl) {
  if (!remoteUrl) return [];

  try {
    const response = await axios.get(remoteUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 8000
    });

    if (Array.isArray(response.data)) {
      return response.data.map(item => ({
        id: item.id || `remote-${Date.now()}`,
        title: item.title || 'News',
        description: item.description || '',
        date: item.date || new Date().toISOString().split('T')[0],
        type: item.type || 'news',
        icon: item.icon || '📰',
        color: item.color || '#ffffff',
        url: item.url || null,
        remote: true
      }));
    }
    return [];
  } catch (err) {
    console.warn('[NewsManager] Failed to fetch remote news:', err.message);
    return [];
  }
}

/**
 * Load local news from a JSON file in the game directory
 */
function loadLocalNews(gameDir) {
  if (!gameDir) return [];

  const newsFile = path.join(gameDir, '.x3lanix', 'news.json');
  if (!fs.existsSync(newsFile)) return [];

  try {
    const data = JSON.parse(fs.readFileSync(newsFile, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[NewsManager] Failed to load local news:', err.message);
    return [];
  }
}

/**
 * Get all news items — combines builtin + remote + local
 * Sorted by date (newest first), deduplicated by id
 */
async function getAllNews(remoteUrl = null, gameDir = null) {
  // Return cache if fresh
  if (_newsCache && (Date.now() - _newsCacheTime) < NEWS_CACHE_TTL) {
    return _newsCache;
  }

  const [remoteNews, localNews] = await Promise.all([
    fetchRemoteNews(remoteUrl),
    Promise.resolve(loadLocalNews(gameDir))
  ]);

  // Combine: remote > local > builtin (remote overrides by id)
  const allNews = [...remoteNews, ...localNews, ...BUILTIN_NEWS];
  
  // Deduplicate by id
  const seen = new Set();
  const deduped = allNews.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  // Sort by date descending
  deduped.sort((a, b) => new Date(b.date) - new Date(a.date));

  _newsCache = deduped;
  _newsCacheTime = Date.now();

  return deduped;
}

/**
 * Get changelog for a specific version
 * Returns a formatted string
 */
function getChangelog(version = '1.0.0') {
  const changelog = {
    '1.0.0': [
      '• Initial release of x3lanix client',
      '• Fabric 1.21.1 support',
      '• Auto-mod installation (Sodium, Lithium, Iris, etc.)',
      '• Microsoft & Offline authentication',
      '• Custom resource pack injection',
      '• 3D skin viewer with animations',
      '• Multilingual support (PL/EN/RU)',
      '• Drag & drop mod management',
      '• Game console with log coloring'
    ],
    '1.1.0': [
      '• Version selector — choose your MC version',
      '• Java auto-detection & download',
      '• News & announcements panel',
      '• Concurrent downloads setting',
      '• Keep launcher running option',
      '• JVM distribution selector',
      '• Improved progress reporting',
      '• First run welcome screen'
    ]
  };

  return changelog[version] || changelog['1.0.0'];
}

/**
 * Clear news cache
 */
function clearCache() {
  _newsCache = null;
  _newsCacheTime = 0;
}

module.exports = {
  getAllNews,
  fetchRemoteNews,
  loadLocalNews,
  getChangelog,
  clearCache,
  BUILTIN_NEWS
};
