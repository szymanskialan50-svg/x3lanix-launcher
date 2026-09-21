const Store = require('electron-store');

const schema = {
  firstLaunch: { type: 'boolean', default: true },
  firstRunDismissed: { type: 'boolean', default: false },
  languageConfigured: { type: 'boolean', default: false },
  appLoggedIn: { type: 'boolean', default: false },
  gameDirectory: { type: 'string', default: '' },
  language: { type: 'string', enum: ['PL', 'EN', 'RU'], default: 'PL' },
  username: { type: 'string', default: 'Player' },
  ram: { type: 'number', default: 4028, minimum: 1024, maximum: 32768 },
  windowWidth: { type: 'number', default: 1280 },
  windowHeight: { type: 'number', default: 720 },
  fullscreen: { type: 'boolean', default: false },
  jvmArgs: {
    type: 'string',
    default: '-XX:+UseZGC -XX:+ZGenerational -XX:+UnlockExperimentalVMOptions -XX:+AlwaysPreTouch -XX:+ParallelRefProcEnabled'
  },
  zgcEnabled: { type: 'boolean', default: false },
  authType: { type: 'string', enum: ['microsoft', 'offline'], default: 'offline' },
  authToken: { type: 'string', default: '' },
  uuid: { type: 'string', default: '' },
  accessToken: { type: 'string', default: '' },
  skinUrl: { type: 'string', default: '' },

  // ── New settings ported from x3lanix lancher ──
  mcVersion: { type: 'string', default: '1.21.1' },
  javaDistribution: { type: 'string', default: 'automatic' },  // automatic, temurin, graalvm, zulu, custom
  customJavaPath: { type: 'string', default: '' },
  concurrentDownloads: { type: 'number', default: 5, minimum: 1, maximum: 50 },
  keepLauncherOpen: { type: 'boolean', default: true },
  showSnapshots: { type: 'boolean', default: false },
  newsUrl: { type: 'string', default: '' },
  launcherVersion: { type: 'string', default: '1.1.0' }
};

const store = new Store({ schema, name: 'x3lanix-config' });

function getAll() {
  const result = {};
  for (const key of Object.keys(schema)) {
    result[key] = store.get(key);
  }
  return result;
}

function get(key) {
  return store.get(key);
}

function set(key, value) {
  store.set(key, value);
}

function setMultiple(obj) {
  for (const [key, value] of Object.entries(obj)) {
    store.set(key, value);
  }
}

function reset() {
  store.clear();
}

module.exports = { getAll, get, set, setMultiple, reset, store };
