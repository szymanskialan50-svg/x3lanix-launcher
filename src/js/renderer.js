/**
 * X3LANIX LAUNCHER — Main Renderer
 * Controls all UI state, screen transitions, and IPC communication
 */

// ═══════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════
let currentScreen = null;
let currentTab = 'tab-play';
let appSettings = {};
let isLoggedIn = false;
let authResult = null;

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[X3LANIX] Renderer init');

  // Load settings
  appSettings = await window.x3lanix.settings.getAll();
  console.log('[X3LANIX] Settings loaded:', appSettings);

  // Set language
  if (window.i18n) {
    window.i18n.setLanguage(appSettings.language || 'PL');
  }

  // Bind all event listeners
  bindTitlebar();
  bindLanguageScreen();
  bindAppLoginScreen();
  bindDirectoryScreen();
  bindLoginScreen();
  bindDownloadScreen();
  bindMainMenu();
  bindSettings();
  bindMods();
  bindAccount();
  bindConsole();

  // Apply saved settings to UI
  applySettingsToUI();

  // Update all i18n text
  updateI18n();
  
  // ALWAYS show language selection first (as requested)
  showScreen('screen-language');
});

// ═══════════════════════════════════════════════════════
//  CONTINUE LOGIC (After Language)
// ═══════════════════════════════════════════════════════
function continueAfterLanguage() {
  if (appSettings.appLoginRemember && appSettings.appLoggedIn) {
    if (appSettings.firstLaunch || !appSettings.gameDirectory) {
      showScreen('screen-directory');
    } else if (!appSettings.username || appSettings.username === 'Player') {
      showScreen('screen-login');
    } else {
      isLoggedIn = true;
      showScreen('screen-main');
      onMainMenuReady();
    }
  } else {
    showScreen('screen-app-login');
  }
}

// ═══════════════════════════════════════════════════════
//  SCREEN TRANSITIONS
// ═══════════════════════════════════════════════════════
function showScreen(screenId) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });

  // Show target
  const target = document.getElementById(screenId);
  if (target) {
    target.style.display = screenId === 'screen-main' ? 'flex' : 'block';
    // Small delay for CSS transition to work
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.classList.add('active');
      });
    });
  }

  currentScreen = screenId;
  console.log('[X3LANIX] Screen:', screenId);
}

// ═══════════════════════════════════════════════════════
//  i18n
// ═══════════════════════════════════════════════════════
function updateI18n() {
  if (!window.i18n) return;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = window.i18n.t(key);
    if (text) {
      // Handle HTML content vs text content
      if (text.includes('<') && text.includes('>')) {
         el.innerHTML = text;
      } else {
         el.textContent = text;
      }
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const text = window.i18n.t(key);
    if (text) el.placeholder = text;
  });

  // Update RAM label dynamically
  const ramLabel = document.getElementById('ram-label');
  const ramValue = document.getElementById('ram-value');
  if (ramLabel && ramValue) {
    const t = window.i18n.t;
    ramLabel.innerHTML = `${t('settings_ram')}: <span id="ram-value">${ramValue.textContent}</span> ${t('settings_ram_unit')}`;
  }

  // Update subtitle dynamically
  const subtitle = document.getElementById('login-subtitle');
  if (subtitle && document.getElementById('login-account-item').style.display !== 'none') {
    subtitle.textContent = `X3LANIX | 1 ${window.i18n ? (window.i18n.getLanguage() === 'PL' ? 'konto' : window.i18n.getLanguage() === 'RU' ? 'аккаунт' : 'account') : 'account'}`;
  }
}

// ═══════════════════════════════════════════════════════
//  LANGUAGE SELECT SCREEN
// ═══════════════════════════════════════════════════════
function bindLanguageScreen() {
  const langBtns = document.querySelectorAll('.lang-btn-setup');
  const btnContinue = document.getElementById('btn-lang-continue');

  langBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const lang = btn.getAttribute('data-lang');
      
      langBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (window.i18n) window.i18n.setLanguage(lang);
      await window.x3lanix.settings.set('language', lang);
      appSettings.language = lang;
      updateI18n();
    });
  });

  btnContinue?.addEventListener('click', async () => {
    await window.x3lanix.settings.set('languageConfigured', true);
    appSettings.languageConfigured = true;
    continueAfterLanguage();
  });
}

// ═══════════════════════════════════════════════════════
//  APP LOGIN SCREEN
// ═══════════════════════════════════════════════════════
function bindAppLoginScreen() {
  const btnLogin = document.getElementById('btn-app-login');
  const userIn = document.getElementById('app-login-username');
  const passIn = document.getElementById('app-login-password');
  const rememberCheckbox = document.getElementById('app-login-remember');
  
  if (rememberCheckbox) {
    rememberCheckbox.checked = appSettings.appLoginRemember === true;
  }

  btnLogin?.addEventListener('click', async () => {
    const user = userIn.value.trim();
    const pass = passIn.value;
    if (!user || !pass) return;

    btnLogin.disabled = true;
    btnLogin.textContent = '...';

    const result = await window.x3lanix.auth.appLogin(user, pass);
    if (result && result.success) {
      appSettings.appLoggedIn = true;
      
      if (rememberCheckbox && rememberCheckbox.checked) {
        await window.x3lanix.settings.set('appLoginRemember', true);
        appSettings.appLoginRemember = true;
      } else {
        await window.x3lanix.settings.set('appLoginRemember', false);
        appSettings.appLoginRemember = false;
      }

      if (appSettings.firstLaunch || !appSettings.gameDirectory) {
        showScreen('screen-directory');
      } else {
        showScreen('screen-login');
      }
    } else {
      alert(result?.error || 'Logowanie nie powiodło się.');
    }
    
    btnLogin.disabled = false;
    btnLogin.textContent = 'Log In';
  });
}

// ═══════════════════════════════════════════════════════
//  TITLEBAR
// ═══════════════════════════════════════════════════════
function bindTitlebar() {
  document.getElementById('btn-minimize')?.addEventListener('click', () => {
    window.x3lanix.window.minimize();
  });

  document.getElementById('btn-close')?.addEventListener('click', () => {
    window.x3lanix.window.close();
  });
}

// ═══════════════════════════════════════════════════════
//  DIRECTORY SELECT SCREEN
// ═══════════════════════════════════════════════════════
function bindDirectoryScreen() {
  const btnSelect = document.getElementById('btn-select-dir');
  const btnContinue = document.getElementById('btn-dir-continue');
  const pathText = document.getElementById('dir-path-text');

  btnSelect?.addEventListener('click', async () => {
    const result = await window.x3lanix.dialog.selectDirectory();
    if (result.success) {
      pathText.textContent = result.path;
      pathText.style.color = '#ffffff';
      btnContinue.disabled = false;
      appSettings.gameDirectory = result.path;
    }
  });

  btnContinue?.addEventListener('click', () => {
    showScreen('screen-login');
  });
}

// ═══════════════════════════════════════════════════════
//  LOGIN SCREEN
// ═══════════════════════════════════════════════════════
function bindLoginScreen() {
  const usernameInput = document.getElementById('login-username');
  const btnRandom = document.getElementById('btn-random');
  const btnMicrosoft = document.getElementById('btn-microsoft');
  const btnOffline = document.getElementById('btn-offline');
  const btnContinue = document.getElementById('btn-login-continue');
  const noAccounts = document.getElementById('login-no-accounts');
  const accountItem = document.getElementById('login-account-item');
  const accountName = document.getElementById('login-account-name');
  const accountAvatar = document.getElementById('login-account-avatar');
  const subtitle = document.getElementById('login-subtitle');

  // Random username
  btnRandom?.addEventListener('click', async () => {
    const name = await window.x3lanix.auth.randomUsername();
    usernameInput.value = name;
  });

  // Microsoft login
  btnMicrosoft?.addEventListener('click', async () => {
    btnMicrosoft.disabled = true;
    btnMicrosoft.textContent = '...';

    const result = await window.x3lanix.auth.microsoftLogin();

    if (result.success) {
      authResult = result;
      isLoggedIn = true;
      appSettings.authType = 'microsoft';
      appSettings.username = result.username;
      appSettings.uuid = result.uuid;
      appSettings.accessToken = result.auth.access_token;
      showLoggedInAccount(result.username, result.uuid);
      btnContinue.disabled = false;
    } else {
      alert(result.error || 'Microsoft login failed');
    }

    btnMicrosoft.disabled = false;
    btnMicrosoft.textContent = window.i18n ? window.i18n.t('login_microsoft') : 'Microsoft';
  });

  // Offline login
  btnOffline?.addEventListener('click', async () => {
    const passwordInput = document.getElementById('login-password');
    const username = usernameInput.value.trim();
    const password = passwordInput ? passwordInput.value : '';

    btnOffline.disabled = true;
    btnOffline.textContent = '...';

    const result = await window.x3lanix.auth.offlineLogin(username, password);

    if (result.success) {
      authResult = result;
      isLoggedIn = true;
      appSettings.authType = 'offline';
      appSettings.username = result.username;
      appSettings.uuid = result.uuid;
      appSettings.accessToken = '0';
      showLoggedInAccount(result.username, result.uuid);
      btnContinue.disabled = false;
    } else {
      alert(result.error || 'Login failed');
    }

    btnOffline.disabled = false;
    btnOffline.textContent = window.i18n ? window.i18n.t('login_offline') : 'Token';
  });

  // Continue to download
  btnContinue?.addEventListener('click', () => {
    if (isLoggedIn) {
      showScreen('screen-downloading');
      startDownloadSequence();
    }
  });

  function showLoggedInAccount(username, uuid) {
    noAccounts.style.display = 'none';
    accountItem.style.display = 'flex';
    accountName.textContent = username;

    // Set avatar
    const avatarUrl = `https://crafatar.com/avatars/${uuid}?size=64&default=MHF_Steve&overlay`;
    accountAvatar.style.backgroundImage = `url(${avatarUrl})`;

    // Update subtitle
    subtitle.textContent = `X3LANIX | 1 ${window.i18n ? (window.i18n.getLanguage() === 'PL' ? 'konto' : window.i18n.getLanguage() === 'RU' ? 'аккаунт' : 'account') : 'account'}`;
  }
}

// ═══════════════════════════════════════════════════════
//  DOWNLOADING SCREEN
// ═══════════════════════════════════════════════════════
function bindDownloadScreen() {
  const btnCancel = document.getElementById('btn-dl-cancel');

  btnCancel?.addEventListener('click', () => {
    // Cancel and go back to login
    showScreen('screen-login');
  });
}

async function startDownloadSequence() {
  const statusEl = document.getElementById('dl-status');
  const progressText = document.getElementById('dl-progress-text');
  const progressPercent = document.getElementById('dl-progress-percent');
  const progressFill = document.getElementById('dl-progress-fill');

  function updateProgress(text, percent, sizeText) {
    if (statusEl) statusEl.textContent = text;
    if (progressPercent) progressPercent.textContent = percent + '%';
    if (progressFill) progressFill.style.width = percent + '%';
    if (progressText && sizeText) progressText.textContent = sizeText;
  }

  try {
    // Step 1: Install Fabric
    updateProgress(
      window.i18n ? window.i18n.t('dl_installing_fabric') : 'Installing Fabric Loader...',
      10, ''
    );

    // Listen for progress events
    window.x3lanix.launcher.onProgress((data) => {
      if (data.stage === 'libraries') {
        updateProgress(data.message, Math.min(10 + (data.percent || 0) * 0.3, 40), '');
      }
    });

    const installResult = await window.x3lanix.launcher.install();

    if (!installResult.success) {
      console.error('[X3LANIX] Install failed:', installResult.error);
      // Continue anyway — might already be installed
    }

    // Step 2: Download mods
    updateProgress(
      window.i18n ? window.i18n.t('dl_downloading_mods') : 'Downloading mods...',
      40, ''
    );

    window.x3lanix.mods.onProgress((data) => {
      if (data.stage === 'downloading') {
        const percent = 40 + Math.round((data.overallPercent || 0) * 0.55);
        const sizeText = data.fileProgress ?
          `${data.fileProgress.downloadedMB || '0'}MB / ${data.fileProgress.totalMB || '?'}MB` :
          `${data.currentMod} (${data.modIndex + 1}/${data.totalMods})`;
        updateProgress(
          `${window.i18n ? window.i18n.t('dl_downloading') : 'Downloading'} ${data.modIndex + 1}/${data.totalMods}...`,
          Math.min(percent, 95),
          sizeText
        );
      }
    });

    await window.x3lanix.mods.downloadAll();

    // Step 3: Done
    updateProgress(
      window.i18n ? window.i18n.t('dl_complete') : 'Complete!',
      100, ''
    );

    // Brief delay to show 100%
    await new Promise(r => setTimeout(r, 800));

    // Transition to main menu
    showScreen('screen-main');
    onMainMenuReady();

  } catch (err) {
    console.error('[X3LANIX] Download sequence error:', err);
    updateProgress('Error: ' + err.message, 0, '');
  }
}

// ═══════════════════════════════════════════════════════
//  MAIN MENU
// ═══════════════════════════════════════════════════════
function bindMainMenu() {
  // Sidebar navigation
  const sidebarBtns = document.querySelectorAll('.sidebar-btn[data-tab]');

  sidebarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);

      // Update active state
      sidebarBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Quit button
  document.getElementById('nav-quit')?.addEventListener('click', () => {
    window.x3lanix.window.close();
  });

  // Launch button
  document.getElementById('btn-launch')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-launch');
    btn.disabled = true;

    // Clear console and get ready for logs
    const consoleEl = document.getElementById('console-output');
    const consoleWrap = document.getElementById('console-output-wrap');
    if (consoleEl) consoleEl.textContent = '';

    // Show progress screen
    showScreen('screen-downloading');
    const statusEl = document.getElementById('dl-status');
    const progressText = document.getElementById('dl-progress-text');
    const progressPercent = document.getElementById('dl-progress-percent');
    const progressFill = document.getElementById('dl-progress-fill');

    function updateProgress(text, percent) {
      if (statusEl) statusEl.textContent = text;
      if (progressPercent) progressPercent.textContent = percent + '%';
      if (progressFill) progressFill.style.width = percent + '%';
      if (progressText) progressText.textContent = 'Launch Sequence';
    }

    updateProgress(window.i18n ? window.i18n.t('play_launch') : 'Launching Game...', 10);

    // Listen to progress events during launch
    window.x3lanix.launcher.onProgress((data) => {
      if (data.type === 'download' || data.stage === 'libraries') {
         updateProgress(data.message || 'Verifying files...', Math.min(20 + (data.percent || 0) * 0.7, 95));
      } else if (data.type === 'native' || data.type === 'classes') {
         const progressVal = (data.task && data.total && typeof data.task === 'number') ? (data.task / data.total) * 20 : 10;
         updateProgress(typeof data.task === 'string' ? data.task : 'Launching...', Math.min(80 + progressVal, 100));
      }
    });

    // Wire up game logs — display live in Console tab
    window.x3lanix.launcher.onLog((line) => {
      if (!consoleEl) return;
      const span = document.createElement('span');
      // Colorize by log level
      const lower = line.toLowerCase();
      if (lower.includes('[warn]') || lower.includes('warn:')) {
        span.className = 'log-warn';
      } else if (lower.includes('[error]') || lower.includes('error:') || lower.includes('exception')) {
        span.className = 'log-error';
      } else if (lower.includes('successfully') || lower.includes('loaded') || lower.includes('ready')) {
        span.className = 'log-success';
      } else {
        span.className = 'log-info';
      }
      span.textContent = line;
      consoleEl.appendChild(span);
      consoleEl.appendChild(document.createTextNode('\n'));
      // Auto-scroll
      if (consoleWrap) consoleWrap.scrollTop = consoleWrap.scrollHeight;
    });

    const result = await window.x3lanix.launcher.launch();

    if (result.success) {
      updateProgress('Game launched successfully!', 100);
      // Switch to main and auto-open console tab to show logs
      setTimeout(() => {
        showScreen('screen-main');
        switchTab('tab-console');
        // Update active sidebar btn
        document.querySelectorAll('.sidebar-btn[data-tab]').forEach(b => b.classList.remove('active'));
        document.getElementById('nav-console')?.classList.add('active');
        btn.disabled = false;
      }, 800);
    } else {
      showScreen('screen-main');
      alert('Launch failed: ' + (result.error || 'Unknown error'));
      btn.disabled = false;
    }
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
  currentTab = tabId;

  // Load mods when switching to mods tab
  if (tabId === 'tab-mods') {
    loadModsList();
  }

  // Re-init account skin viewer when switching to account (canvas may have been 0-sized)
  if (tabId === 'tab-account' && window.skinViewerAPI) {
    requestAnimationFrame(() => {
      const username = appSettings.username || 'Player';
      const uuid = appSettings.uuid || '';
      const authType = appSettings.authType || 'offline';
      window.skinViewerAPI.initSkinViewer('account-skin-canvas', username, uuid, authType);
    });
  }
}

async function onMainMenuReady() {
  // Update nickname display immediately
  const nickname = appSettings.username || 'Player';
  const playNickname = document.getElementById('play-nickname');
  if (playNickname) playNickname.textContent = nickname;

  // Update account info
  updateAccountTab();

  // Init skin viewer with proper auth type
  try {
    initSkinPlaceholder();
  } catch (e) {
    console.warn('[X3LANIX] Skin viewer not available:', e);
  }

  updateI18n();
  
  // Init new x3lanix lancher ported features
  initNewFeatures();
}

function initSkinPlaceholder() {
  const username = appSettings.username || 'Player';
  const uuid = appSettings.uuid || '';
  const authType = appSettings.authType || 'offline';

  if (!window.skinViewerAPI) {
    console.warn('[X3LANIX] skinViewerAPI not available yet');
    return;
  }

  // Init play tab skin — rAF ensures container has real dimensions
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.skinViewerAPI.initSkinViewer('skin-canvas', username, uuid, authType);
    });
  });
  // Account tab skin NOT init here — it's init'd when the tab opens (switchTab)
}

// ═══════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════
function bindSettings() {
  // Language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lang = btn.getAttribute('data-lang');

      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (window.i18n) window.i18n.setLanguage(lang);
      await window.x3lanix.settings.set('language', lang);
      appSettings.language = lang;
      updateI18n();
    });
  });

  // Username — instant UI update on input, debounced save
  const usernameInput = document.getElementById('settings-username');
  let _nickSaveTimer = null;
  usernameInput?.addEventListener('input', () => {
    const val = usernameInput.value.trim() || 'Player';
    appSettings.username = val;

    // Update play tab nickname INSTANTLY
    const playNickname = document.getElementById('play-nickname');
    if (playNickname) playNickname.textContent = val;

    // Update account tab
    const accountUsername = document.getElementById('account-username');
    if (accountUsername) accountUsername.textContent = val;

    // Debounce the settings save (300ms) and skin refresh (500ms)
    clearTimeout(_nickSaveTimer);
    _nickSaveTimer = setTimeout(async () => {
      await window.x3lanix.settings.set('username', val);
      // Refresh skin with new username
      if (window.skinViewerAPI) {
        window.skinViewerAPI.updateSkin('skin-canvas', val, appSettings.uuid, appSettings.authType || 'offline');
        window.skinViewerAPI.updateSkin('account-skin-canvas', val, appSettings.uuid, appSettings.authType || 'offline');
      }
    }, 400);
  });

  // RAM slider
  const ramSlider = document.getElementById('settings-ram');
  const ramValue = document.getElementById('ram-value');
  ramSlider?.addEventListener('input', () => {
    if (ramValue) ramValue.textContent = ramSlider.value;
  });
  ramSlider?.addEventListener('change', async () => {
    await window.x3lanix.settings.set('ram', parseInt(ramSlider.value));
    appSettings.ram = parseInt(ramSlider.value);
  });

  // Window size
  const widthInput = document.getElementById('settings-width');
  const heightInput = document.getElementById('settings-height');
  widthInput?.addEventListener('change', async () => {
    await window.x3lanix.settings.set('windowWidth', parseInt(widthInput.value));
  });
  heightInput?.addEventListener('change', async () => {
    await window.x3lanix.settings.set('windowHeight', parseInt(heightInput.value));
  });

  // Game directory
  document.getElementById('btn-change-dir')?.addEventListener('click', async () => {
    const result = await window.x3lanix.dialog.selectDirectory();
    if (result.success) {
      document.getElementById('settings-game-dir').value = result.path;
      appSettings.gameDirectory = result.path;
    }
  });

  // Fullscreen toggle
  document.getElementById('settings-fullscreen')?.addEventListener('change', async (e) => {
    await window.x3lanix.settings.set('fullscreen', e.target.checked);
  });

  // Reinstall toggle (one-shot action)
  document.getElementById('settings-reinstall')?.addEventListener('change', async (e) => {
    if (e.target.checked) {
      e.target.checked = false;
      if (confirm(window.i18n ? window.i18n.t('settings_reinstall') + '?' : 'Reinstall client?')) {
        showScreen('screen-downloading');
        await startDownloadSequence();
      }
    }
  });

  // ZGC toggle
  document.getElementById('settings-zgc')?.addEventListener('change', async (e) => {
    await window.x3lanix.settings.set('zgcEnabled', e.target.checked);
    appSettings.zgcEnabled = e.target.checked;
  });
}

function applySettingsToUI() {
  // Language
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === appSettings.language);
  });

  // Username — pre-populate nick EVERYWHERE immediately
  const nickname = appSettings.username || 'Player';
  const usernameInput = document.getElementById('settings-username');
  if (usernameInput) usernameInput.value = nickname;

  // Pre-populate play tab nick instantly (task 6: faster nick detection)
  const playNickname = document.getElementById('play-nickname');
  if (playNickname) playNickname.textContent = nickname;

  // Pre-populate account tab nick
  const accountUsername = document.getElementById('account-username');
  if (accountUsername) accountUsername.textContent = nickname;

  // RAM
  const ramSlider = document.getElementById('settings-ram');
  const ramValue = document.getElementById('ram-value');
  if (ramSlider) ramSlider.value = appSettings.ram || 4028;
  if (ramValue) ramValue.textContent = appSettings.ram || 4028;

  // Window size
  const widthInput = document.getElementById('settings-width');
  const heightInput = document.getElementById('settings-height');
  if (widthInput) widthInput.value = appSettings.windowWidth || 1280;
  if (heightInput) heightInput.value = appSettings.windowHeight || 720;

  // Game directory
  const gameDirInput = document.getElementById('settings-game-dir');
  if (gameDirInput) gameDirInput.value = appSettings.gameDirectory || '';

  // Toggles
  const fullscreenToggle = document.getElementById('settings-fullscreen');
  if (fullscreenToggle) fullscreenToggle.checked = appSettings.fullscreen || false;

  const zgcToggle = document.getElementById('settings-zgc');
  if (zgcToggle) zgcToggle.checked = appSettings.zgcEnabled || false;
}

// ═══════════════════════════════════════════════════════
//  ACCOUNT TAB
// ═══════════════════════════════════════════════════════
function bindAccount() {
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await window.x3lanix.settings.setMultiple({
      username: 'Player',
      uuid: '',
      accessToken: '',
      authType: 'offline'
    });
    appSettings.username = 'Player';
    appSettings.uuid = '';

    // Go back to login
    isLoggedIn = false;
    showScreen('screen-login');
  });
}

function updateAccountTab() {
  const usernameEl = document.getElementById('account-username');
  const uuidEl = document.getElementById('account-uuid');
  const typeEl = document.getElementById('account-type');

  if (usernameEl) usernameEl.textContent = appSettings.username || 'Player';
  if (uuidEl) uuidEl.textContent = appSettings.uuid || '—';
  if (typeEl) typeEl.textContent = appSettings.authType === 'microsoft' ? 'Microsoft' : 'Offline';
}

// ═══════════════════════════════════════════════════════
//  MODS TAB
// ═══════════════════════════════════════════════════════
function bindMods() {
  const btnAdd = document.getElementById('btn-add-mod');
  btnAdd?.addEventListener('click', async () => {
    const result = await window.x3lanix.mods.add();
    if (result.success) {
      loadModsList(); // Refresh list after adding
    } else if (result.error) {
      alert('Błąd podczas dodawania moda: ' + result.error);
    }
  });

  // ── Drag & Drop support ──
  const dropZone = document.getElementById('mods-drop-zone');
  if (!dropZone) return;

  // Prevent default drag behavior on the whole window
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => e.preventDefault());

  dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only remove if we actually left the drop zone (not entering a child)
    if (!dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove('drag-over');
    }
  });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    // Collect .jar file paths
    const jarPaths = [];
    for (const file of files) {
      if (file.name.toLowerCase().endsWith('.jar')) {
        jarPaths.push(file.path);
      }
    }

    if (jarPaths.length === 0) {
      alert('Nie znaleziono plików .jar! Upewnij się, że przeciągasz pliki modów Minecraft (.jar).');
      return;
    }

    try {
      const result = await window.x3lanix.mods.addFiles(jarPaths);
      if (result.success) {
        loadModsList(); // Refresh
      } else if (result.error) {
        alert('Błąd: ' + result.error);
      }
    } catch (err) {
      alert('Błąd podczas dodawania modów: ' + err.message);
    }
  });

  // Clicking the drop zone also opens the file dialog
  dropZone.addEventListener('click', async () => {
    const result = await window.x3lanix.mods.add();
    if (result.success) {
      loadModsList();
    }
  });
}

async function loadModsList() {
  const container = document.getElementById('mods-list');
  if (!container) return;

  container.innerHTML = `<p class="mods-loading">${window.i18n ? window.i18n.t('mods_loading') : 'Loading mods...'}</p>`;

  try {
    const mods = await window.x3lanix.mods.list();

    if (!mods || mods.length === 0) {
      container.innerHTML = `<p class="mods-loading">${window.i18n ? window.i18n.t('mods_empty') : 'No mods installed.'}</p>`;
      return;
    }

    container.innerHTML = '';

    mods.forEach((mod, index) => {
      const card = document.createElement('div');
      card.className = 'mod-card';
      card.style.animationDelay = `${index * 0.05}s`;

      const iconHtml = mod.iconUrl
        ? `<img src="${mod.iconUrl}" alt="${mod.name}" onerror="this.parentElement.innerHTML='<span class=\\'mod-icon-placeholder\\'>📦</span>'">`
        : '<span class="mod-icon-placeholder">📦</span>';

      card.innerHTML = `
        <div class="mod-icon">${iconHtml}</div>
        <div class="mod-info">
          <div class="mod-name">${escapeHtml(mod.name)}</div>
          <div class="mod-description">${escapeHtml(mod.description || mod.filename)}</div>
        </div>
        <div class="mod-actions" style="display:flex; gap:10px; align-items:center;">
          <div class="mod-toggle">
            <label class="toggle-switch">
              <input type="checkbox" ${mod.enabled ? 'checked' : ''} data-mod-path="${escapeHtml(mod.path)}">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <button class="btn btn-icon btn-danger mod-delete-btn" data-mod-path="${escapeHtml(mod.path)}" title="Usuń" style="padding:4px; height:auto;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      `;

      // Toggle event
      const checkbox = card.querySelector('input[type="checkbox"]');
      checkbox?.addEventListener('change', async () => {
        const modPath = checkbox.getAttribute('data-mod-path');
        const result = await window.x3lanix.mods.toggle(modPath);
        if (result.newPath) {
          checkbox.setAttribute('data-mod-path', result.newPath);
          card.querySelector('.mod-delete-btn').setAttribute('data-mod-path', result.newPath);
        }
      });

      // Delete event
      const deleteBtn = card.querySelector('.mod-delete-btn');
      deleteBtn?.addEventListener('click', async () => {
        if (confirm('Do you want to delete this mod? Yes or No?')) {
          const modPath = deleteBtn.getAttribute('data-mod-path');
          const result = await window.x3lanix.mods.delete(modPath);
          if (result.success) {
            loadModsList(); // Refresh list after deleting
          } else {
            alert('Failed to delete mod: ' + result.error);
          }
        }
      });

      container.appendChild(card);
    });

  } catch (err) {
    console.error('[X3LANIX] Failed to load mods:', err);
    container.innerHTML = '<p class="mods-loading">Error loading mods.</p>';
  }
}

// ═══════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ═══════════════════════════════════════════════════════
//  CONSOLE TAB
// ═══════════════════════════════════════════════════════
function bindConsole() {
  document.getElementById('btn-clear-console')?.addEventListener('click', () => {
    const consoleEl = document.getElementById('console-output');
    if (consoleEl) {
      consoleEl.textContent = 'Konsola wyczyszczona.\n';
    }
  });
}

// ═══════════════════════════════════════════════════════
//  NEW FEATURES (ported from x3lanix lancher)
// ═══════════════════════════════════════════════════════
async function initNewFeatures() {
  console.log('[X3LANIX] Initializing new features...');
  bindNewSettings();
  
  // Wait for settings to load
  await applyNewSettingsToUI();

  // Load news
  loadNews();
  
  // Show first run if needed
  if (!appSettings.firstRunDismissed) {
    showFirstRunModal();
  }
}

function bindNewSettings() {
  // MC Version
  const mcVersionSelect = document.getElementById('settings-mc-version');
  mcVersionSelect?.addEventListener('change', async () => {
    const val = mcVersionSelect.value;
    await window.x3lanix.settings.set('mcVersion', val);
    appSettings.mcVersion = val;
    document.getElementById('play-mc-version').textContent = val;
  });

  // Version Select Modal
  const btnVersionSelect = document.getElementById('btn-version-select');
  const btnVersionClose = document.getElementById('btn-version-close');
  const modalVersionSelect = document.getElementById('modal-version-select');
  
  btnVersionSelect?.addEventListener('click', async () => {
    modalVersionSelect.style.display = 'flex';
    const list = document.getElementById('version-list');
    list.innerHTML = '<p style="color:var(--text-muted);font-size:12px;">Loading...</p>';
    
    try {
      const versions = await window.x3lanix.versions.getAll(false);
      list.innerHTML = '';
      
      versions.forEach(v => {
        const item = document.createElement('div');
        item.className = 'version-item' + (appSettings.mcVersion === v.id ? ' active' : '');
        item.innerHTML = `
          <div>
            <div class="version-item-name">${escapeHtml(v.id)}</div>
            <div class="version-item-date">${new Date(v.releaseTime).toLocaleDateString()}</div>
          </div>
          <div class="version-item-badge">${v.type === 'release' ? 'Release' : 'Snapshot'}</div>
        `;
        item.addEventListener('click', async () => {
          await window.x3lanix.settings.set('mcVersion', v.id);
          appSettings.mcVersion = v.id;
          document.getElementById('play-mc-version').textContent = v.id;
          modalVersionSelect.style.display = 'none';
        });
        list.appendChild(item);
      });
    } catch (err) {
      list.innerHTML = '<p style="color:#ff5555;font-size:12px;">Failed to load versions</p>';
    }
  });
  
  btnVersionClose?.addEventListener('click', () => {
    modalVersionSelect.style.display = 'none';
  });

  // Java Distribution
  const javaDistroSelect = document.getElementById('settings-java-distro');
  const customJavaContainer = document.getElementById('custom-java-container');
  javaDistroSelect?.addEventListener('change', async () => {
    const val = javaDistroSelect.value;
    await window.x3lanix.settings.set('javaDistribution', val);
    appSettings.javaDistribution = val;
    if (customJavaContainer) customJavaContainer.style.display = val === 'custom' ? 'block' : 'none';
  });

  // Custom Java Path
  const btnSelectJava = document.getElementById('btn-select-java');
  const customJavaInput = document.getElementById('settings-custom-java');
  btnSelectJava?.addEventListener('click', async () => {
    const res = await window.x3lanix.java.selectFile();
    if (res && res.success) {
      customJavaInput.value = res.path;
    }
  });

  // Concurrent Downloads
  const concurrentSlider = document.getElementById('settings-concurrent');
  const concurrentValue = document.getElementById('concurrent-value');
  concurrentSlider?.addEventListener('input', () => {
    if (concurrentValue) concurrentValue.textContent = concurrentSlider.value;
  });
  concurrentSlider?.addEventListener('change', async () => {
    await window.x3lanix.settings.set('concurrentDownloads', parseInt(concurrentSlider.value));
    appSettings.concurrentDownloads = parseInt(concurrentSlider.value);
  });

  // Keep Launcher Open
  const keepOpenToggle = document.getElementById('settings-keep-open');
  keepOpenToggle?.addEventListener('change', async () => {
    await window.x3lanix.settings.set('keepLauncherOpen', keepOpenToggle.checked);
    appSettings.keepLauncherOpen = keepOpenToggle.checked;
  });
  
  // First Run Modal
  document.getElementById('btn-first-run-dismiss')?.addEventListener('click', async () => {
    document.getElementById('modal-first-run').style.display = 'none';
    await window.x3lanix.settings.set('firstRunDismissed', true);
    appSettings.firstRunDismissed = true;
  });
}

async function applyNewSettingsToUI() {
  const mcVersion = appSettings.mcVersion || '1.21.1';
  document.getElementById('play-mc-version').textContent = mcVersion;

  const javaDistroSelect = document.getElementById('settings-java-distro');
  if (javaDistroSelect) javaDistroSelect.value = appSettings.javaDistribution || 'automatic';
  
  const customJavaContainer = document.getElementById('custom-java-container');
  if (customJavaContainer) customJavaContainer.style.display = (appSettings.javaDistribution === 'custom') ? 'block' : 'none';
  
  const customJavaInput = document.getElementById('settings-custom-java');
  if (customJavaInput) customJavaInput.value = appSettings.customJavaPath || '';

  const concurrentSlider = document.getElementById('settings-concurrent');
  const concurrentValue = document.getElementById('concurrent-value');
  if (concurrentSlider) {
    const val = appSettings.concurrentDownloads || 5;
    concurrentSlider.value = val;
    if (concurrentValue) concurrentValue.textContent = val;
  }

  const keepOpenToggle = document.getElementById('settings-keep-open');
  if (keepOpenToggle) keepOpenToggle.checked = appSettings.keepLauncherOpen !== false;
}

async function loadNews() {
  const container = document.getElementById('news-cards');
  if (!container) return;
  
  try {
    const news = await window.x3lanix.news.getAll();
    container.innerHTML = '';
    
    // Show up to 4 news cards
    news.slice(0, 4).forEach(item => {
      const card = document.createElement('div');
      card.className = 'news-card';
      if (item.url) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => window.open(item.url, '_blank'));
      }
      card.innerHTML = `
        <div class="news-card-icon" style="color: ${item.color}">${item.icon}</div>
        <div class="news-card-info">
          <div class="news-card-title">${escapeHtml(item.title)}</div>
          <div class="news-card-desc">${escapeHtml(item.description)}</div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('[X3LANIX] Failed to load news UI:', err);
  }
}

function showFirstRunModal() {
  const modal = document.getElementById('modal-first-run');
  if (modal) modal.style.display = 'flex';
}

