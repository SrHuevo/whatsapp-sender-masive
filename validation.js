// ========================================
// validation.js - Validación de datos
// ========================================

function validateHeadersWithWildcards(headers) {
  const validWildcards = getStoredWildcards();
  const validStages = getStoredStages();

  // Normalizar y extraer nombres (aceptar strings o { name })
  const wildcardNames = (validWildcards || []).map(w => {
    if (!w && w !== '') return null;
    return typeof w === 'string' ? w.trim() : (w && w.name ? String(w.name).trim() : null);
  }).filter(Boolean).map(s => s.toLowerCase());

  const stageNames = (validStages || []).map(s => {
    if (!s && s !== '') return null;
    return typeof s === 'string' ? s.trim() : (s && s.name ? String(s.name).trim() : null);
  }).filter(Boolean).map(s => s.toLowerCase());

  // Normalizar headers entrantes
  const headersNormalized = (headers || []).map(h => (h || '').toString().trim().toLowerCase());

  // Headers obligatorios: phone (o Teléfono) y stage (o un header que coincida con algún stage)
  const hasPhone = headersNormalized.some(h => h === 'phone' || h === 'teléfono' || h === 'phone');
  const hasStage = headersNormalized.some(h => h === 'stage') || headersNormalized.some(h => stageNames.includes(h));

  if (!hasPhone) {
    throw new Error('El archivo debe contener una columna "phone" (o "Teléfono")');
  }

  if (!hasStage) {
    throw new Error('El archivo debe contener una columna "stage" o un header que coincida con algún stage disponible');
  }

  // Validar que los demás headers coincidan con los comodines o stages
  const validHeaders = new Set([
    ...wildcardNames,
    ...stageNames,
    'phone', 'teléfono', 'stage'
  ]);

  const invalidHeaders = headers.filter(header => {
    const h = (header || '').toString().trim().toLowerCase();
    return !validHeaders.has(h);
  });

  if (invalidHeaders.length > 0) {
    throw new Error(`Encabezados no válidos (no coinciden con comodines o stages): ${invalidHeaders.join(', ')}`);
  }
}

function validateStageValues(stageColumnIndex, rows) {
  const validStages = getStoredStages() || [];

  // Extraer nombres de stages (aceptar strings u objetos {name})
  const stageNames = validStages.map(s => {
    if (!s && s !== '') return null;
    return typeof s === 'string' ? s.trim() : (s && s.name ? String(s.name).trim() : null);
  }).filter(Boolean).map(s => s.toLowerCase());

  if (stageNames.length === 0) {
    throw new Error('No hay stages disponibles. Por favor, actualiza los stages primero.');
  }

  const invalidRows = [];
  rows.forEach((row, rowIndex) => {
    const stageValueRaw = row[stageColumnIndex];
    const stageValue = stageValueRaw !== undefined && stageValueRaw !== null ? String(stageValueRaw).trim() : '';
    const stageValueNorm = stageValue.toLowerCase();

    // Requerimos que esté presente y coincida con un stage conocido
    if (!stageValue || !stageNames.includes(stageValueNorm)) {
      invalidRows.push({
        rowNumber: rowIndex + 2, // +2 porque Excel empieza en 1 y la fila 1 es header
        value: stageValueRaw
      });
    }
  });

  if (invalidRows.length > 0) {
    const details = invalidRows.slice(0, 5).map(r => `fila ${r.rowNumber}: "${r.value}"`).join(', ');
    const moreText = invalidRows.length > 5 ? ` (y ${invalidRows.length - 5} más)` : '';
    throw new Error(`Valores de stage inválidos${moreText}: ${details}`);
  }
}
