// ========================================
// utils.js - Utilidades compartidas
// ========================================

const TAG_COLOR_COUNT = 6;

function copyTextToClipboard(text) {
  return new Promise(async (resolve, reject) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        resolve();
        return;
      }

      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('execCommand copy failed'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Crea un elemento tag con clases y comportamiento de copiar.
 * @param {string} text - Texto a mostrar y copiar
 * @param {string} baseClass - Clase base como 'tag-wildcard' o 'tag-stage'
 * @param {number} index - Índice para seleccionar color
 */
function makeTag(text, baseClass, index) {
  const tag = document.createElement('span');
  const colorClass = `tag-color-${(index % TAG_COLOR_COUNT) + 1}`;
  tag.className = `tag ${baseClass} ${colorClass}`;
  tag.textContent = text;

  tag.addEventListener('click', async () => {
    try {
      await copyTextToClipboard(text);
      if (typeof showStatus === 'function') showStatus(`Copiado: ${text}`, 'success');
    } catch (err) {
      console.error('Error copiando al portapapeles', err);
      if (typeof showStatus === 'function') showStatus('No se pudo copiar al portapapeles', 'error');
    }
  });

  return tag;
}
