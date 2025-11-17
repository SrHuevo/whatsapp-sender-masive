// ========================================
// tableState.js - Gestión del estado de la tabla
// ========================================

const STORAGE_KEY = 'excelTableStateV2';

let tableData = null;

function loadTableData() {
  const raw = safeGetItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.headers) || !Array.isArray(parsed.rows)) {
      return null;
    }

    const normalizedRows = parsed.rows.map((row) => {
      if (Array.isArray(row)) {
        return { values: row, status: 'pending' };
      }
      return {
        values: row.values || [],
        status: row.status || 'pending'
      };
    });

    return {
      headers: parsed.headers,
      rows: normalizedRows
    };
  } catch (e) {
    console.warn('Error al parsear localStorage:', e);
    return null;
  }
}

function initializeTableData() {
  tableData = loadTableData() || {
    headers: [],
    rows: []
  };
}

function saveTableData() {
  const dataToSave = JSON.stringify(tableData);
  safeSetItem(STORAGE_KEY, dataToSave);
}

function updateRowStatus(rowIndex, status) {
  if (tableData.rows[rowIndex]) {
    tableData.rows[rowIndex].status = status;
  }
  saveTableData();
}

function deleteRow(rowIndex) {
  if (rowIndex < 0 || rowIndex >= tableData.rows.length) return;
  tableData.rows.splice(rowIndex, 1);
  saveTableData();
}

function clearAllData() {
  tableData.headers = [];
  tableData.rows = [];
  saveTableData();
}

function clearSentData() {
  tableData.rows = tableData.rows.filter(row => row.status !== 'sent');
  saveTableData();
}
