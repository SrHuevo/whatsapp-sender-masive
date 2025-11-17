
    const STORAGE_KEY = 'excelTableStateV2';
    const CONFIG_STORAGE_KEY = 'serverConfigV1';

    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const browseButton = document.getElementById('browseButton');
    const dataTable = document.getElementById('dataTable');
    const thead = dataTable.querySelector('thead');
    const tbody = dataTable.querySelector('tbody');
    const tableWrapper = document.getElementById('tableWrapper');
    const noData = document.getElementById('noData');
    const sendButton = document.getElementById('sendButton');
    const statusMessage = document.getElementById('statusMessage');
    const clearAllButton = document.getElementById('clearAllButton');
    const clearSentButton = document.getElementById('clearSentButton');
    const errorAlert = document.getElementById('errorAlert');
    const errorAlertText = document.getElementById('errorAlertText');
    const errorAlertClose = document.getElementById('errorAlertClose');

    // --------- Configuración del servidor ---------
    let serverConfig = {
      url: '',
      key: ''
    };

    // --------- Helpers de localStorage ---------
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

    function loadFromLocalStorage() {
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

    function saveToLocalStorage() {
      const dataToSave = JSON.stringify(tableData);
      safeSetItem(STORAGE_KEY, dataToSave);
    }

    // --------- Estado principal ---------
    let tableData = loadFromLocalStorage() || {
      headers: [],
      // rows: [{ values: [...], status: 'pending'|'sent'|'error' }]
      rows: []
    };

    // --------- Subida de archivo ---------
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

        tableData.headers = headers;
        tableData.rows = dataRows.map(r => ({
          values: r,
          status: 'pending'
        }));

        saveToLocalStorage();
        buildTable();
        showStatus('Archivo cargado correctamente.', 'success');
      };

      reader.onerror = () => {
        showStatus('Error al leer el archivo.', 'error');
      };

      reader.readAsArrayBuffer(file);
    }

    // --------- Tabla ---------
    function buildTable() {
      thead.innerHTML = '';
      tbody.innerHTML = '';

      if (!tableData.rows.length) {
        tableWrapper.style.display = 'none';
        noData.style.display = 'block';
        sendButton.disabled = true;
        return;
      }

      tableWrapper.style.display = 'block';
      noData.style.display = 'none';
      sendButton.disabled = false;

      const headerRow = document.createElement('tr');
      tableData.headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText || '';
        headerRow.appendChild(th);
      });
      const statusTh = document.createElement('th');
      statusTh.textContent = 'Estado';
      headerRow.appendChild(statusTh);
      const actionsTh = document.createElement('th');
      actionsTh.textContent = 'Acciones';
      headerRow.appendChild(actionsTh);
      thead.appendChild(headerRow);

      tableData.rows.forEach((rowObj, rowIndex) => {
        const tr = document.createElement('tr');
        tr.dataset.rowIndex = String(rowIndex);

        const row = rowObj.values || [];
        tableData.headers.forEach((_, colIndex) => {
          const td = document.createElement('td');
          td.textContent = row[colIndex] !== undefined ? row[colIndex] : '';
          tr.appendChild(td);
        });

        const statusTd = document.createElement('td');
        statusTd.dataset.statusCell = 'true';
        statusTd.appendChild(
          createStatusPill(
            rowObj.status === 'sent' ? 'Enviado'
              : rowObj.status === 'error' ? 'Error'
              : 'Pendiente',
            rowObj.status || 'pending'
          )
        );
        tr.appendChild(statusTd);

        // Acciones: eliminar fila
        const actionsTd = document.createElement('td');
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'delete-icon';
        delBtn.title = 'Eliminar fila';
        delBtn.setAttribute('aria-label', 'Eliminar fila');
        delBtn.textContent = '✖';
        // Borrar directamente sin confirmación
        delBtn.addEventListener('click', () => deleteRow(rowIndex));
        actionsTd.appendChild(delBtn);
        tr.appendChild(actionsTd);

        tbody.appendChild(tr);
      });
    }

    function createStatusPill(text, status) {
      const span = document.createElement('span');
      span.textContent = text;
      span.classList.add('status-pill');
      if (status === 'pending') span.classList.add('status-pending');
      if (status === 'sent') span.classList.add('status-sent');
      if (status === 'error') span.classList.add('status-error');
      return span;
    }

    function updateRowStatus(rowIndex, status) {
      const row = tbody.querySelector(`tr[data-row-index="${rowIndex}"]`);
      if (!row) return;

      const statusTd = row.querySelector('td[data-status-cell="true"]');
      if (!statusTd) return;

      statusTd.innerHTML = '';
      if (status === 'sent') {
        statusTd.appendChild(createStatusPill('Enviado', 'sent'));
      } else if (status === 'error') {
        statusTd.appendChild(createStatusPill('Error', 'error'));
      } else {
        statusTd.appendChild(createStatusPill('Pendiente', 'pending'));
      }

      if (tableData.rows[rowIndex]) {
        tableData.rows[rowIndex].status = status;
      }
      saveToLocalStorage();
    }

    // Eliminar una fila por índice
    function deleteRow(rowIndex) {
      if (rowIndex < 0 || rowIndex >= tableData.rows.length) return;
      tableData.rows.splice(rowIndex, 1);
      // Reguardar y reconstruir la tabla
      saveToLocalStorage();
      buildTable();
      showStatus('Fila eliminada.', 'success');
    }

    // --------- Envío ----------
    sendButton.addEventListener('click', async () => {
      const pendingRows = tableData.rows
        .map((row, index) => ({ row, index }))
        .filter(item => item.row.status === 'pending' || item.row.status === 'error');

      if (!pendingRows.length) {
        showStatus('No hay filas pendientes o con error para enviar.', 'info');
        return;
      }

      hideErrorAlert();
      sendButton.disabled = true;
      showStatus('Enviando datos…', '');

      try {
        const result = await sendAllRowsToServer(pendingRows);
        
        let successCount = 0;
        let errorCount = 0;

        // Procesar resultados y actualizar estados
        if (result.successful) {
          result.successful.forEach(id => {
            const rowIndex = pendingRows.findIndex(item => item.index === id);
            if (rowIndex !== -1) {
              updateRowStatus(pendingRows[rowIndex].index, 'sent');
              successCount++;
            }
          });
        }

        if (result.failed) {
          result.failed.forEach(id => {
            const rowIndex = pendingRows.findIndex(item => item.index === id);
            if (rowIndex !== -1) {
              updateRowStatus(pendingRows[rowIndex].index, 'error');
              errorCount++;
            }
          });
        }

        const totalAttempted = pendingRows.length;
        showStatus(
          `Envío completado. Enviadas: ${successCount}/${totalAttempted}. Con error: ${errorCount}.`,
          successCount > 0 ? 'success' : 'error'
        );
      } catch (error) {
        console.error('Error en envío:', error);
        showStatus('Error al enviar los datos.', 'error');
        showErrorAlert(error.message || 'Error desconocido');
      } finally {
        sendButton.disabled = false;
      }
    });

    // Enviar todas las filas en una sola petición
    async function sendAllRowsToServer(pendingRows) {
      if (!serverConfig.url || !serverConfig.key) {
        throw new Error('Configuración del servidor incompleta.');
      }

      const payload = pendingRows.map(item => ({
        id: item.index,
        ...Object.fromEntries(
          item.row.values.map((val, i) => [tableData.headers[i] || `col_${i}`, val])
        )
      }));

      const response = await fetch(serverConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-apikey': `${serverConfig.key}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error ${response.status}: ${errorData}`);
      }

      return await response.json();
    }

    // --------- Botones limpiar ----------
    clearAllButton.addEventListener('click', () => {
      const ok = confirm('¿Seguro que quieres borrar todos los datos? Esta acción no se puede deshacer.');
      if (!ok) return;

      tableData.headers = [];
      tableData.rows = [];
      saveToLocalStorage();
      buildTable();
      hideErrorAlert();
      showStatus('Se han borrado todos los datos.', 'success');
    });

    clearSentButton.addEventListener('click', () => {
      if (!tableData.rows.length) return;
      tableData.rows = tableData.rows.filter(row => row.status !== 'sent');
      saveToLocalStorage();
      buildTable();
      hideErrorAlert();
      showStatus('Se han eliminado las filas enviadas.', 'success');
    });

    // --------- Alerta de error ----------
    function showErrorAlert(message) {
      errorAlertText.textContent = message;
      errorAlert.style.display = 'block';
    }

    function hideErrorAlert() {
      errorAlert.style.display = 'none';
      errorAlertText.textContent = '';
    }

    errorAlertClose.addEventListener('click', hideErrorAlert);

    // --------- Status helper ----------
    function showStatus(message, type) {
      statusMessage.textContent = message || '';
      statusMessage.classList.remove('error', 'success');
      if (type === 'error') statusMessage.classList.add('error');
      if (type === 'success') statusMessage.classList.add('success');
    }

    // --------- Inicialización ----------
    window.addEventListener('load', () => {
      // Cargar o solicitar configuración del servidor
      const config = loadServerConfig();
      if (config && config.url && config.key) {
        serverConfig = config;
      } else {
        promptServerConfig();
      }

      if (tableData.rows.length) {
        buildTable();
        showStatus('Datos cargados desde este navegador.', 'success');
      } else {
        buildTable(); // para que deje la vista en "no data"
      }
    });