// ========================================
// api.js - Comunicación con el servidor
// ========================================

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
