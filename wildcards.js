// ========================================
// wildcards.js - Gestión de comodines
// ========================================

const WILDCARDS_STORAGE_KEY = 'wildcardsDataV1';

async function fetchWildcards() {
  try {
    showStatus('Obteniendo comodines...', '');
    const url = `${serverConfig.url.replace(/\/$/, '')}/wildcards`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-apikey': `${serverConfig.key}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener comodines: ${response.statusText}`);
    }

    const wildcards = await response.json();
    safeSetItem(WILDCARDS_STORAGE_KEY, JSON.stringify(wildcards));
    populateWildcardsTable(wildcards.sort((a,b) => a.name.localeCompare(b.name)));
    showStatus('Comodines actualizados correctamente.', 'success');
  } catch (error) {
    console.error('Error al obtener comodines:', error);
    showErrorAlert(`Error al obtener comodines: ${error.message}`);
  }
}

function populateWildcardsTable(wildcards) {
  const wildcardsContainer = document.getElementById('wildcardsContainer');
  wildcardsContainer.innerHTML = '';
  if (wildcards.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-message';
    emptyMsg.textContent = 'No hay comodines disponibles';
    wildcardsContainer.appendChild(emptyMsg);
  } else {
    const tagsWrapper = document.createElement('div');
    tagsWrapper.className = 'tags-wrapper';
    wildcards.forEach((wildcard, index) => {
      const tag = document.createElement('span');
      tag.className = 'tag tag-wildcard';
      tag.textContent = wildcard.name || wildcard;
      tagsWrapper.appendChild(tag);
    });
    wildcardsContainer.appendChild(tagsWrapper);
  }
}

function loadWildcardsFromStorage() {
  const stored = safeGetItem(WILDCARDS_STORAGE_KEY);
  if (stored) {
    try {
      const wildcards = JSON.parse(stored);
      populateWildcardsTable(wildcards);
    } catch (e) {
      console.warn('Error al cargar comodines desde storage:', e);
    }
  }
}

function getStoredWildcards() {
  const storedWildcards = safeGetItem(WILDCARDS_STORAGE_KEY);
  let validWildcards = [];
  
  if (storedWildcards) {
    try {
      validWildcards = JSON.parse(storedWildcards);
    } catch (e) {
      console.warn('Error al parsear comodines:', e);
    }
  }
  
  return validWildcards;
}
