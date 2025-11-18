// ========================================
// fileHandler.js - Gestión de carga de archivos
// ========================================

function handleFile(file) {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  const extension = file.name.split('.').pop().toLowerCase();

  if (!allowedTypes.includes(file.type) && !['xls', 'xlsx'].includes(extension)) {
    showStatus('El archivo debe ser un Excel (.xls o .xlsx).', 'error');
    return;
  }

  hideErrorAlert();
  showStatus('Leyendo archivo…', '');

  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!rows || rows.length === 0) {
      showStatus('El archivo está vacío o no se pudo leer.', 'error');
      return;
    }

    const headers = rows[0];
    const dataRows = rows.slice(1).filter(
      row => row.some(cell => cell !== null && cell !== undefined && cell !== '')
    );

    // Validar encabezados con comodines
    try {
      validateHeadersWithWildcards(headers);
    } catch (error) {
      showErrorAlert(`Error en encabezados: ${error.message}`);
      return;
    }

    // Validar valores de la columna stage
    try {
      // Normalizar headers
      const headersNormalized = headers.map(h => (h || '').toString().trim().toLowerCase());

      // Construir set de nombres de stages almacenados (aceptar strings u objetos {name})
      const storedStages = getStoredStages() || [];
      const stageNamesSet = new Set(storedStages.map(s => {
        if (!s && s !== '') return null;
        return typeof s === 'string' ? s.trim().toLowerCase() : (s && s.name ? String(s.name).trim().toLowerCase() : null);
      }).filter(Boolean));

      const stageColumnIndex = headersNormalized.findIndex(h => h === 'stage' || stageNamesSet.has(h));
      if (stageColumnIndex !== -1) {
        validateStageValues(stageColumnIndex, dataRows);
      }
    } catch (error) {
      showErrorAlert(`Error en valores de stage: ${error.message}`);
      return;
    }

    tableData.headers = headers;
    tableData.rows = dataRows.map(r => ({
      values: r,
      status: 'pending'
    }));

    saveTableData();
    buildTable();
    showStatus('Archivo cargado correctamente.', 'success');
  };

  reader.onerror = () => {
    showStatus('Error al leer el archivo.', 'error');
  };

  reader.readAsArrayBuffer(file);
}

function setupFileUploadListeners() {
  const browseButton = document.getElementById('browseButton');
  const fileInput = document.getElementById('fileInput');
  const uploadArea = document.getElementById('uploadArea');

  browseButton.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) handleFile(file);
  });

  uploadArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', (event) => {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (event) => {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = event.dataTransfer.files[0];
    if (file) handleFile(file);
  });
}
