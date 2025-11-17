// ========================================
// storage.js - Utilidades de localStorage
// ========================================

function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn('No se puede leer localStorage:', e);
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('No se puede escribir en localStorage:', e);
  }
}
