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
    populateWildcardsTable(wildcards);
    showStatus('Comodines actualizados correctamente.', 'success');
  } catch (error) {
    console.error('Error al obtener comodines:', error);
    showErrorAlert(`Error al obtener comodines: ${error.message}`);
  }
}

function populateWildcardsTable(wildcards) {
  const wildcardsTable = document.getElementById('wildcardsTable');
  const tbody = wildcardsTable.querySelector('tbody');
  tbody.innerHTML = '';
  if (wildcards.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="1" style="text-align:center;color:#999;">No hay comodines disponibles</td>';
    tbody.appendChild(row);
  } else {
    wildcards.forEach(wildcard => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${wildcard.name}</td>`;
      tbody.appendChild(row);
    });
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
