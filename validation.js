// ========================================
// validation.js - Validación de datos
// ========================================

function validateHeadersWithWildcards(headers) {
  const validWildcards = getStoredWildcards();

  // Headers obligatorios: phone (o Teléfono) y stage
  const hasPhone = headers.some(h => h === 'phone' || h === 'Teléfono' || h === 'Phone' || h === 'PHONE');
  const hasStage = headers.some(h => h === 'stage' || h === 'Stage' || h === 'STAGE');

  if (!hasPhone) {
    throw new Error('El archivo debe contener una columna "phone" (o "Teléfono")');
  }

  if (!hasStage) {
    throw new Error('El archivo debe contener una columna "stage"');
  }

  // Validar que los demás headers coincidan con los comodines
  const validHeaders = [...validWildcards, 'phone', 'Phone', 'PHONE', 'Teléfono', 'stage', 'Stage', 'STAGE'];
  const invalidHeaders = headers.filter(header => !validHeaders.includes(header));
  
  if (invalidHeaders.length > 0) {
    throw new Error(`Encabezados no válidos (no coinciden con comodines): ${invalidHeaders.join(', ')}`);
  }
}

function validateStageValues(stageColumnIndex, rows) {
  const validStages = getStoredStages();

  if (validStages.length === 0) {
    throw new Error('No hay stages disponibles. Por favor, actualiza los stages primero.');
  }

  const invalidRows = [];
  rows.forEach((row, rowIndex) => {
    const stageValue = row[stageColumnIndex];
    if (stageValue && !validStages.includes(stageValue)) {
      invalidRows.push({
        rowNumber: rowIndex + 2, // +2 porque Excel empieza en 1 y la fila 1 es header
        value: stageValue
      });
    }
  });

  if (invalidRows.length > 0) {
    const details = invalidRows.slice(0, 5).map(r => `fila ${r.rowNumber}: "${r.value}"`).join(', ');
    const moreText = invalidRows.length > 5 ? ` (y ${invalidRows.length - 5} más)` : '';
    throw new Error(`Valores de stage inválidos${moreText}: ${details}`);
  }
}
