// ========================================
// ui.js - Gestión de interfaz de usuario
// ========================================

function buildTable() {
  const dataTable = document.getElementById('dataTable');
  const thead = dataTable.querySelector('thead');
  const tbody = dataTable.querySelector('tbody');
  const tableWrapper = document.getElementById('tableWrapper');
  const noData = document.getElementById('noData');
  const sendButton = document.getElementById('sendButton');

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
    delBtn.addEventListener('click', () => {
      deleteRow(rowIndex);
      buildTable();
      showStatus('Fila eliminada.', 'success');
    });
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

function updateRowStatusUI(rowIndex, status) {
  const dataTable = document.getElementById('dataTable');
  const tbody = dataTable.querySelector('tbody');
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

  updateRowStatus(rowIndex, status);
}

let statusHideTimeout = null;
let errorHideTimeout = null;

function hideStatus() {
  const statusMessage = document.getElementById('statusMessage');
  if (!statusMessage) return;
  if (statusHideTimeout) {
    clearTimeout(statusHideTimeout);
    statusHideTimeout = null;
  }
  statusMessage.textContent = '';
  statusMessage.classList.remove('error', 'success');
  // Ocultar visualmente el contenedor cuando no hay contenido
  statusMessage.style.display = 'none';
}

function showStatus(message, type) {
  const statusMessage = document.getElementById('statusMessage');
  if (!statusMessage) return;

  // Contenido: texto + botón cerrar
  statusMessage.innerHTML = '';
  const span = document.createElement('span');
  span.className = 'status-text';
  span.textContent = message || '';
  statusMessage.appendChild(span);

  const close = document.createElement('button');
  close.className = 'status-close';
  close.title = 'Cerrar';
  close.textContent = '×';
  close.addEventListener('click', hideStatus);
  statusMessage.appendChild(close);

  statusMessage.classList.remove('error', 'success');
  if (type === 'error') statusMessage.classList.add('error');
  if (type === 'success') statusMessage.classList.add('success');

  // Asegurar que el contenedor sea visible
  statusMessage.style.display = 'block';

  // Auto-hide después de 5 segundos
  if (statusHideTimeout) clearTimeout(statusHideTimeout);
  statusHideTimeout = setTimeout(() => {
    hideStatus();
  }, 5000);
}

function showErrorAlert(message) {
  const errorAlert = document.getElementById('errorAlert');
  const errorAlertText = document.getElementById('errorAlertText');
  errorAlertText.textContent = message;
  errorAlert.style.display = 'block';

  if (errorHideTimeout) clearTimeout(errorHideTimeout);
  errorHideTimeout = setTimeout(() => {
    hideErrorAlert();
  }, 5000);
}

function hideErrorAlert() {
  const errorAlert = document.getElementById('errorAlert');
  const errorAlertText = document.getElementById('errorAlertText');
  if (errorHideTimeout) {
    clearTimeout(errorHideTimeout);
    errorHideTimeout = null;
  }
  errorAlert.style.display = 'none';
  errorAlertText.textContent = '';
}

function setupUIListeners() {
  const errorAlertClose = document.getElementById('errorAlertClose');
  const clearAllButton = document.getElementById('clearAllButton');
  const clearSentButton = document.getElementById('clearSentButton');

  errorAlertClose.addEventListener('click', hideErrorAlert);

  // permitir que el usuario cierre el status (click en la X también lo cierra)
  const statusMessage = document.getElementById('statusMessage');
  // clicking on the text area should close status too
  statusMessage.addEventListener('click', hideStatus);

  clearAllButton.addEventListener('click', () => {
    const ok = confirm('¿Seguro que quieres borrar todos los datos? Esta acción no se puede deshacer.');
    if (!ok) return;

    clearAllData();
    buildTable();
    hideErrorAlert();
    showStatus('Se han borrado todos los datos.', 'success');
  });

  clearSentButton.addEventListener('click', () => {
    if (!tableData.rows.length) return;
    clearSentData();
    buildTable();
    hideErrorAlert();
    showStatus('Se han eliminado las filas enviadas.', 'success');
  });
}
