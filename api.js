// ========================================
// api.js - Comunicación con el servidor
// ========================================

async function sendAllRowsToServer(pendingRows) {
  if (!serverConfig.url || !serverConfig.key) {
    throw new Error('Configuración del servidor incompleta.');
  }

  // Obtener mappings de wildcards y stages (name -> id), normalizados en lowercase
  const storedWildcards = getStoredWildcards() || [];
  const wildcardNameToId = {};
  storedWildcards.forEach(w => {
    if (!w) return;
    const name = (typeof w === 'string' ? w : w.name) || null;
    if (name) wildcardNameToId[name.toString().trim().toLowerCase()] = w.id || w._id || w.name || name;
  });

  const storedStages = getStoredStages() || [];
  const stageNameToId = {};
  storedStages.forEach(s => {
    if (!s) return;
    const name = (typeof s === 'string' ? s : s.name) || null;
    if (name) stageNameToId[name.toString().trim().toLowerCase()] = s.id || s._id || s.name || name;
  });

  // Normalizar headers y preparar las claves de payload: si header es un wildcard, usar su id como key
  const headers = Array.isArray(tableData.headers) ? tableData.headers.map(h => (h || '').toString()) : [];
  const headerKeys = headers.map(h => {
    const hn = (h || '').toString().trim().toLowerCase();
    if (wildcardNameToId[hn]) return wildcardNameToId[hn];
    return h || '';
  });

  // Detectar índice de columna stage (header literal 'stage' o header que coincide con un stage name)
  const headersNormalized = headers.map(h => (h || '').toString().trim().toLowerCase());
  const stageColumnIndex = headersNormalized.findIndex(h => h === 'stage' || Object.prototype.hasOwnProperty.call(stageNameToId, h));

  const payload = pendingRows.map(item => {
    const obj = { id: item.index };
    (item.row.values || []).forEach((val, i) => {
      const key = headerKeys[i] || `col_${i}`;
      // Si esta columna es la de stage, transformar el valor al stage id
      if (i === stageColumnIndex) {
        const valNorm = val !== undefined && val !== null ? String(val).trim().toLowerCase() : '';
        const stageId = stageNameToId[valNorm] || null;
        obj[key] = stageId !== null ? stageId : val;
      } else {
        obj[key] = val;
      }
    });
    return obj;
  });

  const url = `${serverConfig.url.replace(/\/$/, '')}/messages`;
  const response = await fetch(url, {
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

function setupSendListener() {
  const sendButton = document.getElementById('sendButton');

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
            updateRowStatusUI(pendingRows[rowIndex].index, 'sent');
            successCount++;
          }
        });
      }

      if (result.failed) {
        result.failed.forEach(id => {
          const rowIndex = pendingRows.findIndex(item => item.index === id);
          if (rowIndex !== -1) {
            updateRowStatusUI(pendingRows[rowIndex].index, 'error');
            errorCount++;
          }
        });
      }

      const totalAttempted = pendingRows.length;
      showStatus(
        `Envío completado. Enviadas: ${successCount}/${totalAttempted}. Con error: ${errorCount}/${totalAttempted}.`,
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
}
