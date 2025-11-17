// ========================================
// config.js - Gestión de configuración
// ========================================

const CONFIG_STORAGE_KEY = 'serverConfigV1';

let serverConfig = {
  url: '',
  key: ''
};

function loadServerConfig() {
  const raw = safeGetItem(CONFIG_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Error al parsear configuración:', e);
    return null;
  }
}

function saveServerConfig(config) {
  safeSetItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

function promptServerConfig() {
  let url = '';
  let key = '';
  let valid = false;

  while (!valid) {
    url = prompt('Ingresa la URL del servidor:');
    if (url === null) {
      alert('Debes ingresar la URL del servidor para continuar.');
      continue;
    }
    if (url.trim() === '') {
      alert('La URL no puede estar vacía.');
      continue;
    }

    key = prompt('Ingresa la clave/token del servidor:');
    if (key === null) {
      alert('Debes ingresar la clave para continuar.');
      continue;
    }
    if (key.trim() === '') {
      alert('La clave no puede estar vacía.');
      continue;
    }

    valid = true;
  }

  serverConfig = { url: url.trim(), key: key.trim() };
  saveServerConfig(serverConfig);
}

function initializeConfig() {
  const config = loadServerConfig();
  if (config && config.url && config.key) {
    serverConfig = config;
  } else {
    promptServerConfig();
  }
}
