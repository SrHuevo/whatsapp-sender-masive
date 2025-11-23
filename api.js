// ========================================
// api.js - Comunicación con el servidor
// ========================================

const BATCH_SIZE = 50;

// Variable para controlar si hay un envío en progreso
let sendingInProgress = false;

function buildMessagesFromRows(pendingRows) {
  // Obtener mappings de wildcards y stages (name -> id), normalizados en lowercase
  const storedWildcards = getStoredWildcards() || [];
  const wildcardNameToId = {};
  const wildcardNameToObj = {}; // También guardamos el objeto completo {id, name, type}
  storedWildcards.forEach(w => {
    if (!w) return;
    const name = (typeof w === 'string' ? w : w.name) || null;
    if (name) {
      wildcardNameToId[name.toString().trim().toLowerCase()] = w.id || w._id || w.name || name;
      wildcardNameToObj[name.toString().trim().toLowerCase()] = w;
    }
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

  // Detectar índice de columna stage (header literal 'stage' o header que coincida con un stage name)
  const headersNormalized = headers.map(h => (h || '').toString().trim().toLowerCase());
  const stageColumnIndex = headersNormalized.findIndex(h => h === 'stage' || Object.prototype.hasOwnProperty.call(stageNameToId, h));

  // Recolectar wildcards únicos usados en los headers (id, name, type)
  const usedWildcardsSet = new Set();
  headers.forEach(h => {
    const hn = (h || '').toString().trim().toLowerCase();
    if (wildcardNameToObj[hn]) {
      const obj = wildcardNameToObj[hn];
      usedWildcardsSet.add(JSON.stringify({
        id: obj.id,
        name: obj.name,
        type: obj.type || ''
      }));
    }
  });
  const wildcardsList = Array.from(usedWildcardsSet).map(s => JSON.parse(s));

  // Construir array de mensajes con la estructura solicitada:
  // { phone: string, stage: number, wildcard: [{id,name,type}] }
  const headersNormalizedLower = headers.map(h => (h || '').toString().trim().toLowerCase());
  const phoneColumnIndex = headersNormalizedLower.findIndex(h => h === 'phone' || h === 'teléfono' || h === 'telefono' || h === 'phone');

  return pendingRows.map(item => {
    const rowVals = item.row.values || [];
    // Obtener phone
    const phoneRaw = phoneColumnIndex !== -1 ? rowVals[phoneColumnIndex] : undefined;
    const phone = phoneRaw !== undefined && phoneRaw !== null ? String(phoneRaw).trim() : '';

    // Obtener stage id
    let stageId = null;
    if (stageColumnIndex !== -1) {
      const stageRaw = rowVals[stageColumnIndex];
      const stageNorm = stageRaw !== undefined && stageRaw !== null ? String(stageRaw).trim().toLowerCase() : '';
      stageId = stageNameToId[stageNorm] || null;
    }

    // Construir array de wildcards usados en esta fila (si el header es un wildcard y el valor no está vacío)
    const wildcardsArr = [];
    headers.forEach((h, i) => {
      const hn = (h || '').toString().trim().toLowerCase();
      const wObj = wildcardNameToObj[hn];
      const cell = rowVals[i];
      const hasValue = cell !== undefined && cell !== null && String(cell).trim() !== '';
      if (wObj && hasValue) {
        wildcardsArr.push({ 
          id: wObj.id, 
          name: wObj.name, 
          type: wObj.type || '',
          value: String(cell).trim()
        });
      }
    });

    return {
      id: item.index,
      phone: phone,
      stage: stageId,
      wildcards: wildcardsArr
    };
  });
}

async function sendBatchToServer(batchMessages) {
  if (!serverConfig.url || !serverConfig.key) {
    throw new Error('Configuración del servidor incompleta.');
  }

  const url = `${serverConfig.url.replace(/\/$/, '')}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-apikey': `${serverConfig.key}`
    },
    body: JSON.stringify(batchMessages)
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Error ${response.status}: ${errorData}`);
  }

  return await response.json();
}

async function sendAllRowsToServer(pendingRows, onProgress) {
  if (!serverConfig.url || !serverConfig.key) {
    throw new Error('Configuración del servidor incompleta.');
  }

  // Construir todos los mensajes primero
  const messages = buildMessagesFromRows(pendingRows);

  // Dividir en lotes
  const batches = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    batches.push(messages.slice(i, i + BATCH_SIZE));
  }

  const totalBatches = batches.length;
  let successCount = 0;
  let errorCount = 0;
  const allSuccessful = [];
  const allFailed = [];

  // Enviar cada lote
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    // Actualizar progreso
    if (onProgress) {
      onProgress(i + 1, totalBatches, successCount + errorCount, messages.length);
    }

    try {
      const result = await sendBatchToServer(batch);
      
      if (result.successful) {
        allSuccessful.push(...result.successful);
        successCount += result.successful.length;
      }
      if (result.failed) {
        allFailed.push(...result.failed);
        errorCount += result.failed.length;
      }
    } catch (error) {
      // Si falla un lote, marcar todos los mensajes del lote como error
      batch.forEach(msg => allFailed.push(msg.id));
      errorCount += batch.length;
    }
  }

  // Progreso final
  if (onProgress) {
    onProgress(totalBatches, totalBatches, messages.length, messages.length);
  }

  return {
    successful: allSuccessful,
    failed: allFailed
  };
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
    showProgressBar(true);
    showStatus('Preparando envío…', '');
    sendingInProgress = true;

    try {
      const result = await sendAllRowsToServer(pendingRows, (currentBatch, totalBatches, processedMessages, totalMessages) => {
        updateProgressBar(currentBatch, totalBatches, processedMessages, totalMessages);
      });
      
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
      showProgressBar(false);
      sendingInProgress = false;
    }
  });
}

// Prevenir cierre de pestaña durante el envío
window.addEventListener('beforeunload', (event) => {
  if (sendingInProgress) {
    const message = '¡Hay un envío en progreso! Si cierras esta pestaña, el proceso se detendrá y algunos mensajes pueden no enviarse.';
    event.preventDefault();
    event.returnValue = message; // Para navegadores antiguos
    return message;
  }
});
