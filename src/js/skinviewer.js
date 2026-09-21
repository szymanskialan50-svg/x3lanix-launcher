/**
 * X3LANIX LAUNCHER — 3D Skin Viewer (skinview3d)
 * Full animation system: Idle, Walk, Run, Wave
 * Handles Microsoft (Crafatar UUID) + Offline (Minotar username).
 */

// Instances map — one per canvas container
const _viewers = new Map();
const _animations = new Map(); // track current animation per viewer

const ANIM_TYPES = {
  idle: 'IdleAnimation',
  walk: 'WalkingAnimation',
  run: 'RunningAnimation',
  wave: 'WaveAnimation'
};

const API = {
  initSkinViewer,
  updateSkin,
  setAnimation,
  getAnimationType,
  disposeSkinViewer,
  disposeAll
};

window.skinViewerAPI = API;

const _activeRequests = new Map();

// ─────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────
async function initSkinViewer(containerId, username, uuid, authType) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const reqId = Date.now() + Math.random();
  _activeRequests.set(containerId, reqId);

  // Kill existing viewer if any
  if (_viewers.has(containerId)) {
    try { _viewers.get(containerId).dispose(); } catch (_) {}
    _viewers.delete(containerId);
    _animations.delete(containerId);
  }

  // Clear container
  container.innerHTML = '';

  // Ensure skinview3d is available (loaded via <script> tag)
  if (typeof skinview3d === 'undefined') {
    console.error('[SkinViewer] skinview3d not loaded!');
    showFallback(container, username);
    return;
  }

  // Container sizing — wait for layout
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  if (_activeRequests.get(containerId) !== reqId) {
    return; // A newer request started
  }

  const rect = container.getBoundingClientRect();
  const w = Math.max(rect.width, 180);
  const h = Math.max(rect.height, 260);

  // Create viewer
  let viewer;
  try {
    viewer = new skinview3d.SkinViewer({
      width: w,
      height: h,
      renderPaused: false,
      fov: 50,
      zoom: 0.9
    });
  } catch (err) {
    console.error('[SkinViewer] Failed to create viewer:', err);
    showFallback(container, username);
    return;
  }

  // Style the canvas
  viewer.canvas.style.width = '100%';
  viewer.canvas.style.height = '100%';
  viewer.canvas.style.display = 'block';
  viewer.canvas.style.borderRadius = 'inherit';
  container.appendChild(viewer.canvas);

  // Transparent background
  viewer.renderer.setClearColor(0x000000, 0);

  // Camera position — centered on the player model
  viewer.camera.position.set(0, 16, 55);
  viewer.camera.lookAt(0, 16, 0);

  // Default animation: Walk
  applyAnimation(viewer, containerId, 'walk');

  // Mouse drag to rotate
  try {
    const control = skinview3d.createOrbitControls
      ? skinview3d.createOrbitControls(viewer)
      : new skinview3d.OrbitControls(viewer.playerObject, viewer.renderer.domElement);

    if (control.target) control.target.set(0, 16, 0);
    if (typeof control.enableZoom !== 'undefined') control.enableZoom = false;
    if (typeof control.enablePan !== 'undefined') control.enablePan = false;
    if (typeof control.minPolarAngle !== 'undefined') control.minPolarAngle = Math.PI / 3;
    if (typeof control.maxPolarAngle !== 'undefined') control.maxPolarAngle = Math.PI / 1.5;
  } catch (e) {
    console.warn('[SkinViewer] OrbitControls not available:', e.message);
  }

  // Store
  _viewers.set(containerId, viewer);

  // Load skin async
  await loadSkinForViewer(viewer, username, uuid, authType, containerId);

  // Auto-resize on container size change
  setupResizeObserver(containerId, viewer);
}

// ─────────────────────────────────────────────────────────
//  ANIMATION SYSTEM
// ─────────────────────────────────────────────────────────
function applyAnimation(viewer, containerId, type) {
  if (!viewer || !skinview3d) return;

  // Remove previous animation
  viewer.animation = null;

  let anim = null;
  try {
    anim = new skinview3d.WalkingAnimation();
    anim.speed = 0.6;
  } catch (e) {
    console.warn('[SkinViewer] Animation fallback:', e.message);
  }

  if (anim) {
    viewer.animation = anim;
    _animations.set(containerId, 'walk');
  }
}

function setAnimation(containerId, type) {
  // Animations disabled per user request, always use walk
  const viewer = _viewers.get(containerId);
  if (!viewer) return;
  applyAnimation(viewer, containerId, 'walk');
}

function getAnimationType(containerId) {
  return 'walk';
}

// ─────────────────────────────────────────────────────────
//  SKIN LOADING
// ─────────────────────────────────────────────────────────
async function loadSkinForViewer(viewer, username, uuid, authType, containerId) {
  const skinUrls = buildSkinUrls(username, uuid, authType);

  for (const url of skinUrls) {
    try {
      console.log(`[SkinViewer] Trying skin: ${url}`);
      await viewer.loadSkin(url);

      // Try loading cape (optional — silent fail)
      if (authType === 'microsoft' && uuid && uuid.length > 8) {
        try {
          await viewer.loadCape(`https://crafatar.com/capes/${uuid}`);
        } catch (_) { /* no cape — fine */ }
      }
      return; // Success — stop trying
    } catch (err) {
      console.warn('[SkinViewer] Skin URL failed:', url, err.message);
    }
  }

  // All URLs failed — try absolute last resort Steve
  try {
    await viewer.loadSkin('https://minotar.net/skin/MHF_Steve');
  } catch (_) {
    console.error('[SkinViewer] ALL skin loading failed');
  }
}

// ─────────────────────────────────────────────────────────
//  URL HELPERS — multiple fallback URLs
// ─────────────────────────────────────────────────────────
function buildSkinUrls(username, uuid, authType) {
  const urls = [];
  const name = (username && username !== 'Player' && username.length >= 3)
    ? encodeURIComponent(username)
    : 'MHF_Steve';

  if (authType === 'microsoft' && uuid && uuid.length > 8) {
    // Microsoft: Minotar username first, then mc-heads, then Crafatar
    urls.push(`https://minotar.net/skin/${name}`);
    urls.push(`https://mc-heads.net/skin/${name}`);
    urls.push(`https://crafatar.com/skins/${uuid}`);
  } else {
    // Offline: Use various APIs that resolve username to skin
    urls.push(`https://minotar.net/skin/${name}`);
    urls.push(`https://mc-heads.net/skin/${name}`);
    urls.push(`https://starlightskins.lunareclipse.studio/skin/${name}`);
    urls.push(`https://mineskin.eu/skin/${name}`);
    urls.push(`https://crafatar.com/skins/c06f8906-4c8a-4911-9c29-ea1dbd1aab82`);
  }

  return urls;
}

// ─────────────────────────────────────────────────────────
//  RESIZE OBSERVER
// ─────────────────────────────────────────────────────────
function setupResizeObserver(containerId, viewer) {
  const container = document.getElementById(containerId);
  if (!container || !window.ResizeObserver) return;

  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0 && viewer.renderer) {
        viewer.setSize(width, height);
      }
    }
  });
  observer.observe(container);
}

// ─────────────────────────────────────────────────────────
//  FALLBACK (no skinview3d)
// ─────────────────────────────────────────────────────────
function showFallback(container, username) {
  const name = (username && username.length >= 3) ? encodeURIComponent(username) : 'MHF_Steve';
  container.style.backgroundImage = `url('https://minotar.net/armor/body/${name}/300.png')`;
  container.style.backgroundSize = 'contain';
  container.style.backgroundPosition = 'center';
  container.style.backgroundRepeat = 'no-repeat';
}

// ─────────────────────────────────────────────────────────
//  PUBLIC API
// ─────────────────────────────────────────────────────────
function updateSkin(containerId, username, uuid, authType) {
  initSkinViewer(containerId, username, uuid, authType);
}

function disposeSkinViewer(containerId) {
  if (_viewers.has(containerId)) {
    try { _viewers.get(containerId).dispose(); } catch (_) {}
    _viewers.delete(containerId);
    _animations.delete(containerId);
  }
}

function disposeAll() {
  _viewers.forEach((v) => { try { v.dispose(); } catch (_) {} });
  _viewers.clear();
  _animations.clear();
}
