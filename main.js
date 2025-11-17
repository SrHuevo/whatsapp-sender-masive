
    const STORAGE_KEY = 'excelTableStateV2';

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

    // --------- Envío ----------
    sendButton.addEventListener('click', async () => {
      if (!tableData.rows.length) {
        showStatus('No hay datos para enviar.', 'error');
        return;
      }

      hideErrorAlert();
      sendButton.disabled = true;
      showStatus('Enviando datos…', '');

      const payload = {
        rows: tableData.rows.map((row, index) => ({
          index,
          values: row.values
        }))
      };

      try {
        const result = await sendDataToServerSimulado(payload);

        if (result && result.error) {
          throw new Error(result.error);
        }

        const successful = new Set(result.successfulIndexes || []);
        tableData.rows.forEach((_, index) => {
          if (successful.has(index)) {
            updateRowStatus(index, 'sent');
          } else {
            updateRowStatus(index, 'error');
          }
        });

        showStatus(
          `Envío completado. Filas enviadas correctamente: ${successful.size}/${tableData.rows.length}.`,
          'success'
        );
      } catch (error) {
        console.error(error);
        showStatus('Ocurrió un error al enviar los datos.', 'error');
        showErrorAlert(error && error.message ? error.message : 'Error desconocido al enviar los datos.');
      } finally {
        sendButton.disabled = false;
      }
    });

    // Simulación de servidor
    function sendDataToServerSimulado(payload) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() < 0.2) {
            return reject(new Error('Error simulado del servidor. Inténtalo de nuevo más tarde.'));
          }
          const successfulIndexes = payload.rows
            .filter(() => Math.random() > 0.3)
            .map(r => r.index);
          resolve({ successfulIndexes });
        }, 800);
      });
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
      if (tableData.rows.length) {
        buildTable();
        showStatus('Datos cargados desde este navegador.', 'success');
      } else {
        buildTable(); // para que deje la vista en "no data"
      }
    });