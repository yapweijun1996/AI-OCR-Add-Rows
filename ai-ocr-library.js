/*!
 * AI OCR Library Loader (serverless, browser-only)
 * Loads component scripts in order and ensures initialization.
 */
(() => {
  const g = (typeof window !== 'undefined') ? window : globalThis;
  if (g.AI_OCR && g.AI_OCR._loader) return;

  // Resolve base path from the current script tag so relative files work anywhere.
  function getBase() {
    const cs = document.currentScript || Array.from(document.scripts).find(s => /ai-ocr-library\.js(?:$|\?)/.test(s.src));
    if (!cs || !cs.src) return '';
    return cs.src.replace(/[^/]*$/, '');
  }
  const base = getBase();

  const files = [
    'ocr-utils.js',
    'csv-import.js',
    'add_rows.js',
    'ocr.js'
  ];

  function toUrl(src) {
    if (/^(?:https?:)?\/\//.test(src) || src.startsWith('/')) return src;
    return base + src;
  }

  function loadScript(src) {
    const url = toUrl(src);
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[data-ai-ocr-src="${url}"], script[src="${url}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = url;
      // Keep execution order deterministic
      s.async = false;
      s.defer = false;
      s.dataset.aiOcrSrc = url;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${url}`));
      document.head.appendChild(s);
    });
  }

  let inited = false;
  function autoInit() {
    if (inited) return;
    if (typeof g.initAiOcr === 'function') {
      try {
        g.initAiOcr();
        inited = true;
      } catch (e) {
        console.error('AI OCR init error:', e);
      }
    }
  }

  async function loadAll() {
    for (const f of files) {
      await loadScript(f);
    }
    // Try to init immediately after scripts have loaded
    autoInit();
    // If DOM is still loading and init hasn't run, bind a one-time fallback
    if (!inited && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoInit, { once: true });
    }
  }

  const _loader = loadAll();

  // Early-click fallback: if user clicks the Upload button before init,
  // wait for loader, initialize, then re-dispatch the click.
  (function setupEarlyClickFallback() {
    function isUploadBtnClick(evt) {
      try {
        const t = evt.target;
        if (!t) return false;
        if (typeof t.closest === 'function') {
          return !!t.closest('#ai-ocr-UploadBtn');
        }
        return (t.id === 'ai-ocr-UploadBtn');
      } catch (_) {
        return false;
      }
    }
    async function onEarlyClick(evt) {
      if (inited) {
        document.removeEventListener('click', onEarlyClick, true);
        return;
      }
      if (!isUploadBtnClick(evt)) return;
      evt.preventDefault();
      evt.stopPropagation();
      try {
        await _loader;
        autoInit();
      } catch (e) {
        console.error('AI OCR loader failed during early-click:', e);
      } finally {
        // Ensure modal is visible immediately on the user's first click
        try {
          const modal = document.getElementById('ai-ocr-modal');
          if (modal) modal.style.display = 'block';
        } catch (_) {}
        // Also re-dispatch the click after init so bound handlers run normally
        setTimeout(() => {
          const btn = document.getElementById('ai-ocr-UploadBtn');
          if (btn) btn.click();
        }, 0);
        document.removeEventListener('click', onEarlyClick, true);
      }
    }
    document.addEventListener('click', onEarlyClick, true);
  })();
  
  g.AI_OCR = Object.assign({}, g.AI_OCR, {
    version: '0.1.0',
    _loader,
    init: () => autoInit()
  });
})();