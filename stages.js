// ========================================
// stages.js - Gestión de stages
// ========================================

const STAGES_STORAGE_KEY = 'stagesDataV1';

async function fetchStages() {
  try {
    showStatus('Obteniendo stages...', '');
    const url = `${serverConfig.url.replace(/\/$/, '')}/stages`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-apikey': `${serverConfig.key}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener stages: ${response.statusText}`);
    }

    const stages = await response.json();
    safeSetItem(STAGES_STORAGE_KEY, JSON.stringify(stages));
    populateStagesTable(stages);
    showStatus('Stages actualizados correctamente.', 'success');
  } catch (error) {
    console.error('Error al obtener stages:', error);
    showErrorAlert(`Error al obtener stages: ${error.message}`);
  }
}

function populateStagesTable(stages) {
  const stagesTable = document.getElementById('stagesTable');
  const tbody = stagesTable.querySelector('tbody');
  tbody.innerHTML = '';
  if (stages.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="1" style="text-align:center;color:#999;">No hay stages disponibles</td>';
    tbody.appendChild(row);
  } else {
    stages.forEach(stage => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${stage.name}</td>`;
      tbody.appendChild(row);
    });
  }
}

function loadStagesFromStorage() {
  const stored = safeGetItem(STAGES_STORAGE_KEY);
  if (stored) {
    try {
      const stages = JSON.parse(stored);
      populateStagesTable(stages);
    } catch (e) {
      console.warn('Error al cargar stages desde storage:', e);
    }
  }
}

function getStoredStages() {
  const storedStages = safeGetItem(STAGES_STORAGE_KEY);
  let validStages = [];
  
  if (storedStages) {
    try {
      validStages = JSON.parse(storedStages);
    } catch (e) {
      console.warn('Error al parsear stages:', e);
    }
  }
  
  return validStages;
}
