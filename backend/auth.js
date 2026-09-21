const { Auth } = require('msmc');
const { v4: uuidv4 } = require('crypto');
const settings = require('./settings');

/**
 * Microsoft OAuth authentication flow
 * Opens an Electron BrowserWindow for MS login
 * Returns MCLC-compatible auth object
 */
async function microsoftLogin() {
  try {
    const authManager = new Auth('select_account');

    // Launch Microsoft login in an Electron popup window
    const xboxManager = await authManager.launch('electron');

    // Get Minecraft token from Xbox
    const mcToken = await xboxManager.getMinecraft();

    // Check if user owns Minecraft
    if (!mcToken.isDemo()) {
      // Build MCLC auth object
      const authObj = mcToken.mclc();

      // Persist auth data
      settings.set('authType', 'microsoft');
      settings.set('username', authObj.name);
      settings.set('uuid', authObj.uuid);
      settings.set('accessToken', authObj.access_token);

      return {
        success: true,
        auth: authObj,
        username: authObj.name,
        uuid: authObj.uuid
      };
    } else {
      return {
        success: false,
        error: 'This Microsoft account does not own Minecraft.'
      };
    }
  } catch (err) {
    console.error('[Auth] Microsoft login failed:', err);
    return {
      success: false,
      error: err.message || 'Microsoft login failed or was cancelled.'
    };
  }
}

/**
 * API-based App Login
 * Authenticates against x3lanix-api to grant launcher access
 */
async function appLogin(username, password) {
  if (!username || !password) {
    return { success: false, error: 'Nazwa użytkownika i hasło są wymagane.' };
  }
  
  try {
    const axios = require('axios');
    const response = await axios.get('https://server735439.nazwa.pl/index.html/euijghfiuewsgffrenvfuiregbyhfcvreyufvyshvafyefvyt32f673r4t67234tr5673yeufyueguyey.php');
    
    // Decrypt logic: Remove random padding (every 2nd and 3rd char), then Base64 decode
    const lines = typeof response.data === 'string' ? response.data.split('\n') : [];
    let found = false;
    
    for (let line of lines) {
      if (!line.trim()) continue;
      try {
        let base64 = '';
        const trimmedLine = line.trim();
        for (let i = 0; i < trimmedLine.length; i += 3) {
          base64 += trimmedLine[i];
        }
        
        const decoded = Buffer.from(base64, 'base64').toString('utf-8');
        const [savedUser, savedPass] = decoded.split(':');
        
        if (savedUser === username && savedPass === password) {
          found = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (found) {
      return { success: true, username: username };
    } else {
      return { success: false, error: 'Logowanie nie powiodło się. Nieprawidłowe dane.' };
    }
  } catch (err) {
    console.error('AppLogin Error:', err);
    let errorMsg = 'Błąd połączenia z serwerem logowania. (' + (err.message || 'Brak') + ')';
    if (err.response && err.response.data && err.response.data.error) {
      errorMsg = err.response.data.error;
    }
    return { success: false, error: errorMsg };
  }
}

/**
 * Offline login — no authentication needed
 * Creates a fake auth object for MCLC
 */
function offlineLogin(username) {
  if (!username || username.trim().length === 0) {
    username = 'Player';
  }

  // Sanitize username (3-16 chars, alphanumeric + underscore)
  username = username.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 16);
  if (username.length < 3) username = 'Player';

  // Generate a deterministic offline UUID from username
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update('OfflinePlayer:' + username).digest('hex');
  const uuid = [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '3' + hash.substring(13, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-');

  const authObj = {
    access_token: '0',
    client_token: '0',
    uuid: uuid,
    name: username,
    user_properties: '{}',
    meta: {
      type: 'offline',
      demo: false
    }
  };

  // Persist
  settings.set('authType', 'offline');
  settings.set('username', username);
  settings.set('uuid', uuid);
  settings.set('accessToken', '0');

  return {
    success: true,
    auth: authObj,
    username,
    uuid
  };
}

/**
 * Generate a random valid Minecraft username
 */
function randomUsername() {
  const adjectives = ['Dark', 'Shadow', 'Storm', 'Frost', 'Iron', 'Steel', 'Night', 'Void', 'Neo', 'Cyber'];
  const nouns = ['Wolf', 'Knight', 'Blade', 'Hawk', 'Fox', 'Raven', 'Viper', 'Ghost', 'Reaper', 'Phoenix'];
  const num = Math.floor(Math.random() * 999);
  return adjectives[Math.floor(Math.random() * adjectives.length)] +
         nouns[Math.floor(Math.random() * nouns.length)] +
         num;
}

/**
 * Get stored auth or null
 */
function getStoredAuth() {
  const authType = settings.get('authType');
  const username = settings.get('username');
  const uuid = settings.get('uuid');
  const accessToken = settings.get('accessToken');

  if (!username || !uuid) return null;

  return {
    access_token: accessToken || '0',
    client_token: '0',
    uuid,
    name: username,
    user_properties: '{}',
    meta: {
      type: authType || 'offline',
      demo: false
    }
  };
}

module.exports = {
  microsoftLogin,
  offlineLogin,
  appLogin,
  randomUsername,
  getStoredAuth
};
