// ========================================
// main.js - Punto de entrada principal
// ========================================

window.addEventListener('load', () => {
  // Inicializar configuración del servidor
  initializeConfig();

  // Inicializar estado de la tabla
  initializeTableData();

  // Configurar listeners de UI
  setupUIListeners();
  setupFileUploadListeners();
  setupSendListener();

  // Configurar botones de comodines y stages
  const updateWildcardsButton = document.getElementById('updateWildcardsButton');
  const updateStagesButton = document.getElementById('updateStagesButton');
  
  updateWildcardsButton.addEventListener('click', fetchWildcards);
  updateStagesButton.addEventListener('click', fetchStages);

  // Cargar comodines y stages desde storage
  loadWildcardsFromStorage();
  loadStagesFromStorage();

  // Construir tabla inicial
  if (tableData.rows.length) {
    buildTable();
    showStatus('Datos cargados desde este navegador.', 'success');
  } else {
    buildTable();
  }
});
